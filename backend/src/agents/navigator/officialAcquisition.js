import { SafeFetcher } from '../../pipeline/core/http.js';
import { toDocument } from '../../pipeline/core/documents.js';
import { hostMatches } from '../../pipeline/core/urls.js';
import { NavigatorError } from './contracts.js';

/** Capture registered scheme-owned documents, never publish inferred policy. */
export function createOfficialAcquisition({ sources, transport, timeoutMs, now, sleep }) {
  const canonical = value => { try { return new URL(value).href; } catch { return null; } };
  const locate = (scheme, role) => {
    const raw = scheme.officialLinks?.[role === 'guidelines' ? 'guidelinesUrl' : 'detailUrl'];
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || url.href.length > 2048 || url.href === canonical(scheme.officialLinks?.listingUrl)) return null;
      const source = sources.find(source => source.enabled === true && hostMatches(url.hostname, source.allowedDomains));
      return source ? { url: url.href, source } : null;
    } catch { return null; }
  };
  return {
    canAcquire: (scheme, role) => Boolean(locate(scheme, role)),
    canReuse: (scheme, role, snapshot) => { const found = locate(scheme, role); return Boolean(found && snapshot.sourceId === found.source.id && snapshot.url === found.url && canonical(snapshot.finalUrl || snapshot.url) !== canonical(scheme.officialLinks?.listingUrl) && snapshot.fetchMethod === 'static' && !snapshot.capturedSourceType); },
    async acquire({ scheme, role, reserve, signal }) {
      const found = locate(scheme, role);
      if (!found) return { status: 'unavailable', reason: 'unregistered_source' };
      signal?.throwIfAborted();
      if (typeof reserve !== 'function') throw new NavigatorError('BUDGET_REQUIRED', 'Reserve official-source access before retrieval.');
      await reserve();
      const controller = new AbortController(), combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
      let abort, requests = 0;
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const cancelled = new Promise((_, reject) => {
        abort = () => reject(new NavigatorError(signal?.aborted ? 'CANCELLED' : 'SOURCE_TIMEOUT', 'Official-source retrieval stopped.'));
        combined.addEventListener('abort', abort, { once: true }); if (combined.aborted) abort();
      });
      const allowed = raw => { const url = new URL(raw); return url.protocol === 'https:' && !url.username && !url.password && !url.port && hostMatches(url.hostname, found.source.allowedDomains); };
      class Fetcher extends SafeFetcher {
        assertAllowed(raw) { const url = super.assertAllowed(raw); if (!allowed(url.href)) throw Object.assign(new Error(), { code: 'DOMAIN_NOT_ALLOWED' }); return url; }
      }
      const fetcher = new Fetcher({ allowedDomains: found.source.allowedDomains, retries: 0, timeoutMs: Math.min(timeoutMs, 5000), maxBytes: 2 * 1024 * 1024,
        minIntervalMs: Math.max(2000, found.source.rateLimit?.minIntervalMs ?? 2000), logger: { debug() {}, warn() {} }, ...(sleep ? { sleep } : {}),
        transport: (url, options) => {
          combined.throwIfAborted(); if (++requests > 4) throw Object.assign(new Error(), { code: 'DOMAIN_NOT_ALLOWED' });
          return transport(url, { ...options, signal: options.signal ? AbortSignal.any([combined, options.signal]) : combined });
        } });
      try {
        const work = async () => {
          const response = await fetcher.fetch(found.url); combined.throwIfAborted();
          if (response.status !== 200 || response.notModified || !allowed(response.finalUrl || found.url)) return { status: 'unavailable', reason: 'fetch_failed' };
          if (canonical(response.finalUrl || found.url) === canonical(scheme.officialLinks?.listingUrl)) return { status: 'unavailable', reason: 'shared_source' };
          const document = await toDocument(response); combined.throwIfAborted();
          if (!document.text?.trim() || document.text.length > 120000) return { status: 'unavailable', reason: 'unusable_document' };
          return { status: 'captured', snapshot: { sourceId: found.source.id, authorityTier: found.source.authorityTier,
            url: found.url, finalUrl: response.finalUrl || found.url, fetchedAt: now(), fetchMethod: 'static', kind: document.kind,
            sha256: response.sha256, textHash: document.textHash, text: document.text, pages: document.pages ?? [],
            quality: { ...document.quality, requiresManualReview: Boolean(document.quality?.ocrSuspect || document.quality?.requiresManualReview) },
            documentDate: document.documentDate, contentType: response.contentType, byteLength: response.body.length } };
        };
        return await Promise.race([work(), cancelled]);
      } catch (error) {
        if (signal?.aborted) throw new NavigatorError('CANCELLED', 'Official-source retrieval was cancelled.');
        return { status: 'unavailable', reason: controller.signal.aborted ? 'timeout' : ['DOMAIN_NOT_ALLOWED', 'ROBOTS_DISALLOWED'].includes(error.code) ? 'blocked' : 'fetch_failed' };
      } finally { clearTimeout(timer); combined.removeEventListener('abort', abort); controller.abort(); }
    },
  };
}
