/** Single startup initialization. HTTP reads observe it; they never initialize,
 * retry initialization, or reserve inference. Failure details stay off the wire. */
export function createNavigatorReadiness() {
  let runtime = null, state = 'initializing', initialization;
  return {
    getRuntime: () => runtime,
    status() {
      const available = Boolean(runtime?.service && runtime.ready());
      return { available, state: state === 'ready' && !available ? 'unavailable' : state, retryable: state === 'initializing', retentionDays: 7,
        ...(['groq', 'gemini'].includes(runtime?.provider) ? { provider: runtime.provider } : {}) };
    },
    initialize(factory) {
      if (!initialization) initialization = Promise.resolve().then(factory).then(value => {
        runtime = value; state = value ? 'ready' : 'disabled'; return value;
      }).catch(() => { state = 'failed'; return null; });
      return initialization;
    },
  };
}
