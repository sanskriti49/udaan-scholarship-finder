import { CanceledError } from 'axios';
import { waitForReadiness } from './navigatorReadiness.js';

const delays = [1000, 2000, 4000, 6000, 6000];
const budgetMs = 20000;
const isRead = config => (config.method || 'get').toLowerCase() === 'get';

/** Retry only GETs explicitly rejected before execution by the database gate.
 * Six attempts / twenty seconds maximum; no network, provider or write retry.
 * Existing callers keep their loading state until recovery succeeds or stops. */
export function installDatabaseReadRecovery(api, { wait = waitForReadiness, now = Date.now, getSession = () => null } = {}) {
  let session = getSession(), sessionVersion = 0;
  const version = () => {
    const current = getSession();
    if (current !== session) { session = current; sessionVersion++; }
    return sessionVersion;
  };
  const cancelIfChanged = config => {
    if (config.signal?.aborted || config.cancelToken?.reason || config.__udaanStartupRead.session !== version()) {
      throw new CanceledError('The startup read was cancelled.', config);
    }
  };
  const request = api.interceptors.request.use(config => {
    if (isRead(config)) {
      config.__udaanStartupRead ??= { retries: 0, startedAt: now(), session: version() };
      cancelIfChanged(config);
    }
    return config;
  });
  const response = api.interceptors.response.use(value => value, async error => {
    const config = error.config, result = error.response;
    if (!config || !isRead(config) || result?.status !== 503 || result.data?.error?.code !== 'DATABASE_INITIALIZING') throw error;
    const state = config.__udaanStartupRead;
    if (!state || state.retries >= delays.length) throw error;
    cancelIfChanged(config);
    let delay = delays[state.retries];
    const header = result.headers?.get?.('retry-after') ?? result.headers?.['retry-after'];
    if (header !== undefined && header !== null && String(header).trim() !== '') {
      const seconds = Number(header);
      const after = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - now();
      if (Number.isFinite(after)) delay = Math.max(delay, after);
    }
    if (now() + delay >= state.startedAt + budgetMs) throw error;
    try { await wait(delay, config.signal); }
    catch (waitError) { cancelIfChanged(config); throw waitError; }
    cancelIfChanged(config);
    const remaining = state.startedAt + budgetMs - now();
    if (remaining <= 0) throw error;
    state.retries++;
    config.timeout = Math.min(config.timeout > 0 ? config.timeout : remaining, remaining);
    return api.request(config);
  });
  return () => { api.interceptors.request.eject(request); api.interceptors.response.eject(response); };
}
