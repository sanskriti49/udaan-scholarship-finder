const aborted = () => new DOMException('The read was cancelled.', 'AbortError');
export function waitForReadiness(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(aborted());
    const done = () => { signal?.removeEventListener('abort', cancel); resolve(); };
    const timer = setTimeout(done, ms);
    const cancel = () => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); reject(aborted()); };
    signal?.addEventListener('abort', cancel, { once: true });
  });
}

/** Called ONLY by explicit initial GET adapters. No write/inference adapter uses
 * this function. Three attempts max; cancellation interrupts reads and backoff. */
export async function initialNavigatorRead(read, signal, wait = waitForReadiness) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (signal?.aborted) throw aborted();
    let delay = [500, 1000][attempt];
    try {
      const value = await read();
      if (signal?.aborted) throw aborted();
      if (value?.state !== 'initializing' || value.retryable !== true || attempt === 2) return value;
    } catch (error) {
      if (signal?.aborted) throw aborted();
      if (attempt === 2 || error.response?.status !== 503 || error.response?.data?.error?.code !== 'NAVIGATOR_INITIALIZING') throw error;
      const header = error.response.headers?.['retry-after'], seconds = Number(header);
      const afterMs = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
      if (Number.isFinite(afterMs) && afterMs > 2000) throw error; // Show long waits; do not retry early.
      if (Number.isFinite(afterMs) && afterMs > 0) delay = Math.max(delay, afterMs);
    }
    await wait(delay, signal);
  }
}
