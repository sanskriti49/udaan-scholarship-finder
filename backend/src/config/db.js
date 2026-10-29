import dns from 'node:dns';
import { isIP } from 'node:net';
import mongoose from 'mongoose';

const DNS_TRANSIENT = new Set(['ESERVFAIL', 'ECONNREFUSED', 'ETIMEOUT', 'ETIMEDOUT', 'EAI_AGAIN']);
const NETWORK_TRANSIENT = new Set(['ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'EHOSTUNREACH', 'EPIPE']);
const RETRYABLE = new Set(['dns', 'network', 'timeout']);
function failureKind(error) {
  const chain = [error];
  let kind = 'configuration';
  const seen = new Set();
  for (let i = 0; i < chain.length && i < 32; i++) {
    const item = chain[i];
    if (!item || typeof item !== 'object' || seen.has(item)) continue;
    seen.add(item);
    if (item.code === 18 || item.codeName === 'AuthenticationFailed') return 'authentication';
    if (item.code === 'STARTUP_CANCELLED') return 'cancelled';
    if (item.code === 'STARTUP_CLEANUP_FAILED') return 'cleanup';
    if (item.name === 'MongoParseError' || item.name === 'MongoInvalidArgumentError') return 'configuration';
    if (/querySrv|queryTxt/.test(item.syscall ?? '')) {
      if (!DNS_TRANSIENT.has(item.code)) return 'dns_configuration';
      kind = 'dns';
    } else if (kind !== 'dns') {
      if (['STARTUP_TIMEOUT', 'ETIMEDOUT', 'ETIMEOUT'].includes(item.code) || ['MongoNetworkTimeoutError', 'MongoTimeoutError'].includes(item.name)) kind = 'timeout';
      else if (kind !== 'timeout' && (NETWORK_TRANSIENT.has(item.code) || ['MongoNetworkError', 'MongoServerSelectionError', 'MongooseServerSelectionError'].includes(item.name))) kind = 'network';
    }
    if (item.cause) chain.push(item.cause);
    if (item.reason) chain.push(item.reason);
    if (item.error) chain.push(item.error);
    if (item.servers instanceof Map) for (const server of item.servers.values()) { if (chain.length < 32) chain.push(server); }
  }
  return kind;
}
const wait = (ms, signal) => new Promise((resolve, reject) => {
  const cancel = () => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); reject(Object.assign(new Error('Startup cancelled'), { code: 'STARTUP_CANCELLED' })); };
  const timer = setTimeout(() => { signal?.removeEventListener('abort', cancel); resolve(); }, ms);
  if (signal?.aborted) cancel(); else signal?.addEventListener('abort', cancel, { once: true });
});

/** One finite recovery window shared by callers. Three quick attempts, then
 * slower backoff. Requests never initialize/retry it or replay application work.
 * The driver reconnects established connections after successful startup. */
export function createDatabaseConnection({ connect = (uri, options) => mongoose.connect(uri, options), dnsApi = dns,
  sleep = wait, logger = console, env = process.env, maxAttempts = 8, selectionTimeoutMs = 5000, attemptTimeoutMs = 8000,
  close = connection => connection?.disconnect?.(), now = Date.now } = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 12 || !Number.isInteger(selectionTimeoutMs) || selectionTimeoutMs < 1 || selectionTimeoutMs > 10000 || !Number.isInteger(attemptTimeoutMs) || attemptTimeoutMs < 1 || attemptTimeoutMs > 15000) throw new Error('Invalid database startup bounds');
  let state = 'idle', attempt = 0, initialization, inFlight = null, cleanupFailed = false, lastFailure = null, nextRetryAt = null;
  const boundedConnect = async (uri, signal) => {
    // SRV resolution precedes the driver's server-selection timer. A stalled
    // lookup must not leave startup waiting forever. Never overlap a timed-out
    // connection with another attempt; close any eventual late connection.
    let timer, cancel, expired = false;
    const pending = Promise.resolve().then(() => connect(uri, { serverSelectionTimeoutMS: selectionTimeoutMs, connectTimeoutMS: selectionTimeoutMs }));
    // A DNS lookup can outlive the driver's timer. Its eventual result must be
    // disposed before another connect may touch the shared Mongoose instance.
    const drain = pending.then(async value => { if (expired) await close(value); }, () => {}).catch(() => { cleanupFailed = true; });
    inFlight = drain;
    void drain.then(() => { if (inFlight === drain) inFlight = null; });
    const stopped = new Promise((_, reject) => {
      cancel = () => { expired = true; reject(Object.assign(new Error('Startup cancelled'), { code: 'STARTUP_CANCELLED' })); };
      timer = setTimeout(() => { expired = true; reject(Object.assign(new Error('Startup timed out'), { code: 'STARTUP_TIMEOUT' })); }, attemptTimeoutMs);
      signal?.addEventListener('abort', cancel, { once: true });
      if (signal?.aborted) cancel();
    });
    try { return await Promise.race([pending, stopped]); }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  };
  return {
    status: () => ({ state, attempt, retryable: ['connecting', 'retrying'].includes(state), lastFailure, nextRetryAt }),
    connect(uri, { signal } = {}) {
      if (initialization) return initialization;
      initialization = (async () => {
        let parsed, originalDns, changedDns = false;
        const unavailable = () => Object.assign(new Error('Database connection is unavailable. Check database configuration and network access.'), { code: 'DATABASE_UNAVAILABLE' });
        try {
          const limit = env.MONGO_STARTUP_ATTEMPTS === undefined ? maxAttempts : Number(env.MONGO_STARTUP_ATTEMPTS);
          if (!Number.isInteger(limit) || limit < 1 || limit > 12 || typeof uri !== 'string' || !/^mongodb(?:\+srv)?:\/\//.test(uri)) throw unavailable();
          // Non-SRV replica-set URIs can contain several host:port pairs and
          // are intentionally left to the driver's connection-string parser.
          if (uri.startsWith('mongodb+srv:')) { try { parsed = new URL(uri); } catch { throw unavailable(); } }
          const configuredDns = env.MONGO_DNS_SERVERS?.split(',').map(s => s.trim()).filter(Boolean);
          if (configuredDns?.some(server => !isIP(server))) throw unavailable();
          // Local public-Atlas recovery retains the existing DNS workaround.
          // Production/private/custom hosts keep their configured resolver.
          const publicAtlas = parsed?.protocol === 'mongodb+srv:' && parsed.hostname.endsWith('.mongodb.net');
          const fallback = configuredDns ?? (env.NODE_ENV !== 'production' && publicAtlas ? ['1.1.1.1', '8.8.8.8'] : []);
          for (let slot = 1; slot <= limit; slot++) {
            if (signal?.aborted) throw Object.assign(unavailable(), { code: 'STARTUP_CANCELLED' });
            state = 'connecting';
            nextRetryAt = null;
            try {
              if (cleanupFailed) throw Object.assign(unavailable(), { code: 'STARTUP_CLEANUP_FAILED' });
              if (inFlight) throw Object.assign(unavailable(), { code: 'STARTUP_TIMEOUT' });
              attempt++;
              const connection = await boundedConnect(uri, signal);
              if (signal?.aborted) { await Promise.resolve(close(connection)).catch(() => {}); throw Object.assign(unavailable(), { code: 'STARTUP_CANCELLED' }); }
              state = 'ready'; logger.log('MongoDB Connected'); return connection;
            } catch (error) {
              const kind = failureKind(error);
              lastFailure = kind;
              if (signal?.aborted || !RETRYABLE.has(kind) || slot === limit) throw error;
              state = 'retrying';
              const delay = slot < 3 ? 500 * slot : Math.min(30000, 5000 * (2 ** (slot - 3)));
              nextRetryAt = new Date(now() + delay).toISOString();
              logger.warn(`[Database] Temporary ${kind} connection failure; recovery step ${slot + 1}/${limit} in ${delay}ms${inFlight ? ' (waiting for the previous attempt to settle)' : ''}.`);
              if (kind === 'dns' && !changedDns && fallback.length) {
                try { originalDns = dnsApi.getServers(); dnsApi.setServers(fallback); changedDns = true; }
                catch { logger.warn('[Database] Alternate DNS could not be selected; continuing with the configured resolver.'); }
              }
              await sleep(delay, signal);
            }
          }
        } catch (error) {
          if (changedDns) { try { dnsApi.setServers(originalDns); } catch { /* Never replace the safe startup error with resolver details. */ } }
          lastFailure = signal?.aborted ? 'cancelled' : failureKind(error);
          nextRetryAt = null;
          state = 'failed'; logger.error(`[Database] Startup unavailable (${lastFailure}; ${attempt} connection attempts). HTTP health remains available. Check connectivity/configuration; recovery budget is exhausted or the failure requires attention.`);
          throw unavailable();
        }
      })();
      return initialization;
    },
  };
}

export const databaseConnection = createDatabaseConnection();
export default (options) => databaseConnection.connect(process.env.MONGO_URI, options);

/** Never queue/retry application writes while the database is unavailable. */
export function databaseGate({ ready, status = databaseConnection.status } = {}) {
  const connected = ready ?? (() => mongoose.connection.readyState === 1 && status().state === 'ready');
  return (req, res, next) => {
    if (connected() || req.path === '/health' || req.path.startsWith('/navigator')) return next();
    const initializing = status().retryable;
    res.set('Cache-Control', 'no-store');
    if (initializing) res.set('Retry-After', '1');
    return res.status(503).json({ success: false, error: { code: initializing ? 'DATABASE_INITIALIZING' : 'DATABASE_UNAVAILABLE',
      message: initializing ? 'Udaan is connecting. Please try again shortly.' : 'Udaan cannot reach its database right now. Please try again later.' } });
  };
}
