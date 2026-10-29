import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createOfficialSourceChecker } from '../../src/agents/navigator/officialSource.js';
import { resetHostState } from '../../src/pipeline/core/http.js';
import { adaptiveFixture, memoryJourney } from '../adaptiveFixture.js';
import { createResearchTools } from '../../src/agents/navigator/researchTools.js';
import { compileResearchIntent } from '../../src/agents/navigator/researchIntent.js';
import { admissionIntent } from '../admissionIntentFixture.js';
import { SCHEME_ID, FIXTURE_NOW } from '../navigatorHelpers.js';

beforeEach(resetHostState);
const sources = [{ id: 'fixture_official', authorityTier: 1, enabled: true, allowedDomains: ['example.invalid'] }];
const res = (status, text, headers = {}) => ({ status, body: Buffer.from(text), headers: { get: name => headers[name] ?? null } });
test('registered HTML capture reuses ingestion extraction, immutable hashes, quality checks and bounded source access', async () => {
  const requests = [], body = '<main><h2>Eligibility</h2><p>Applicants must be enrolled in an accredited course. Annual income must not exceed the stated ceiling; all exceptions remain applicable.</p><script>HIDDEN_SCRIPT</script></main>';
  const checker = createOfficialSourceChecker({ sources, now: () => FIXTURE_NOW, sleep: async () => {}, transport: async url => { requests.push(url); return url.endsWith('/robots.txt') ? res(404, '') : res(200, body, { 'content-type': 'text/html' }); } });
  let reserved = 0; const scheme = { officialLinks: { guidelinesUrl: 'https://example.invalid/guidelines', listingUrl: 'https://example.invalid/list' } };
  assert.equal(checker.canAcquire(scheme, 'guidelines'), true);
  const result = await checker.acquire({ scheme, role: 'guidelines', reserve: async () => reserved++ });
  assert.equal(result.status, 'captured'); assert.equal(reserved, 1); assert.ok(requests.length <= 4);
  assert.match(result.snapshot.text, /all exceptions remain applicable/); assert.doesNotMatch(result.snapshot.text, /HIDDEN_SCRIPT/);
  assert.equal(result.snapshot.textHash, createHash('sha256').update(result.snapshot.text).digest('hex'));
  assert.equal(result.snapshot.sourceId, sources[0].id); assert.equal(result.snapshot.authorityTier, 1);
});

test('URL normalization stays consistent across registration, capture, storage and scheme-scoped retrieval', async () => {
  const f = adaptiveFixture({ missing: true }); f.scheme.officialLinks.guidelinesUrl = 'https://EXAMPLE.invalid:443/grant rules';
  const checker = createOfficialSourceChecker({ sources, now: () => FIXTURE_NOW, sleep: async () => {}, transport: async url => url.endsWith('/robots.txt') ? res(404, '') : res(200, `<h2>Eligibility</h2><p>${f.clause}</p>`, { 'content-type': 'text/html' }) });
  const { retrieval } = compileResearchIntent(admissionIntent);
  const tools = createResearchTools({ repository: f.repository, sourceChecker: checker, reserveSourceCheck: async () => {}, retrieval, includeContext: true, now: () => FIXTURE_NOW });
  assert.equal((await tools.execute('retrieveOfficialGuideline', { schemeId: SCHEME_ID, role: 'guidelines' })).status, 'captured');
  const read = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'admission', focus: ['c1'] });
  assert.ok(read.passages.some(p => p.evidence.quote.includes(f.clause)));
  assert.ok(read.passages.every(p => p.evidence.url === 'https://example.invalid/grant%20rules'));
});

test('arbitrary URLs, shared listings and unregistered hosts never reach acquisition transport', async () => {
  let calls = 0, reserved = 0;
  const checker = createOfficialSourceChecker({ sources, transport: async () => { calls++; throw new Error(); } });
  for (const url of ['http://example.invalid/a', 'https://evil.invalid/a', 'https://user:pass@example.invalid/a', 'https://example.invalid:444/a', 'https://example.invalid/a#fragment', 'https://example.invalid/list', 'https://EXAMPLE.invalid:443/list']) {
    const result = await checker.acquire({ scheme: { officialLinks: { guidelinesUrl: url, listingUrl: 'https://example.invalid/list' } }, role: 'guidelines', reserve: async () => reserved++ });
    assert.equal(result.status, 'unavailable');
  }
  assert.equal(calls, 0); assert.equal(reserved, 0);
});

test('a recent registered immutable capture is reused, while expired captures require a fresh bounded fetch', async () => {
  const f = adaptiveFixture({ missing: true }); let requests = 0, reserved = 0, recent;
  const checker = createOfficialSourceChecker({ sources, now: () => FIXTURE_NOW, sleep: async () => {}, transport: async url => {
    requests++; return url.endsWith('/robots.txt') ? res(404, '') : res(200, `<main><h2>Eligibility</h2><p>${f.clause}</p></main>`, { 'content-type': 'text/html' });
  } });
  const save = f.repository.saveSnapshot;
  f.repository.saveSnapshot = async snapshot => recent = await save(snapshot);
  f.repository.getRecentSnapshot = async (url, since) => recent?.url === url && new Date(recent.fetchedAt) >= since ? recent : null;
  const create = () => createResearchTools({ repository: f.repository, sourceChecker: checker, reserveSourceCheck: async () => reserved++, now: () => FIXTURE_NOW });
  assert.equal((await create().execute('retrieveOfficialGuideline', { schemeId: SCHEME_ID, role: 'guidelines' })).status, 'captured');
  const before = requests;
  assert.equal((await create().execute('retrieveOfficialGuideline', { schemeId: SCHEME_ID, role: 'guidelines' })).status, 'cached');
  assert.equal(requests, before); assert.equal(reserved, 1);
  recent.fetchedAt = new Date(FIXTURE_NOW.getTime() - 7 * 3600000);
  assert.equal((await create().execute('retrieveOfficialGuideline', { schemeId: SCHEME_ID, role: 'guidelines' })).status, 'captured');
  assert.equal(reserved, 2);
});

test('slow acquisition, cancellation and malformed/oversized extracted documents stop without an unbounded retry', async () => {
  const checker = createOfficialSourceChecker({ sources, timeoutMs: 10, transport: async () => new Promise(() => {}) });
  const scheme = { officialLinks: { guidelinesUrl: 'https://example.invalid/slow' } };
  assert.equal((await checker.acquire({ scheme, role: 'guidelines', reserve: async () => {} })).reason, 'timeout');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(checker.acquire({ scheme, role: 'guidelines', signal: controller.signal, reserve: async () => { throw new Error('Must not reserve'); } }));
  resetHostState();
  const big = createOfficialSourceChecker({ sources, sleep: async () => {}, transport: async url => url.endsWith('/robots.txt') ? res(404, '') : res(200, '<p>' + 'Long public text '.repeat(9000) + '</p>', { 'content-type': 'text/html' }) });
  assert.equal((await big.acquire({ scheme, role: 'guidelines', reserve: async () => {} })).reason, 'unusable_document');
});

test('a fresh conflicting document is archived and re-examined without overriding old recorded eligibility or hiding version disagreement', async () => {
  const f = adaptiveFixture(), { retrieval } = compileResearchIntent(admissionIntent), original = JSON.stringify(f.scheme);
  const modified = f.snapshot.text.replace('650000', '450000');
  f.sourceChecker.acquire = async ({ reserve }) => { await reserve(); return { status: 'captured', snapshot: { ...f.snapshot, text: modified, textHash: createHash('sha256').update(modified).digest('hex'), sha256: createHash('sha256').update(modified).digest('hex') } }; };
  const tools = createResearchTools({ repository: f.repository, sourceChecker: f.sourceChecker, reserveSourceCheck: async () => {}, retrieval, includeContext: true, now: () => FIXTURE_NOW });
  const old = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'income' });
  await tools.execute('retrieveOfficialGuideline', { schemeId: SCHEME_ID, role: 'guidelines' });
  const restored = createResearchTools({ repository: f.repository, sourceChecker: f.sourceChecker, reserveSourceCheck: async () => { throw new Error('Do not fetch twice'); }, retrieval, includeContext: true, now: () => FIXTURE_NOW, checkpoint: tools.exportState() });
  const fresh = await restored.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'income', focus: ['c2'] });
  assert.ok(fresh.passages.some(p => p.evidence.quote.includes('450000')));
  const plan = await restored.execute('finishInvestigation', { selections: [{ schemeId: SCHEME_ID, evidenceIds: [...old.passages, ...fresh.passages].map(p => p.id).slice(0, 5) }] });
  assert.equal(plan.entries[0].stale, true); assert.ok(plan.entries[0].sourceChecks.some(c => c.status === 'changed'));
  assert.equal(f.scheme.rules.find(rule => rule.field === 'familyIncome').targetValue, 650000);
  assert.equal(JSON.stringify(f.scheme), original);
});

test('uncertain extraction cannot become a source-supported eligibility recommendation', async () => {
  const f = adaptiveFixture({ missing: true });
  const acquire = f.sourceChecker.acquire;
  f.sourceChecker.acquire = async args => { const result = await acquire(args); result.snapshot.quality = { requiresManualReview: true }; return result; };
  const result = await memoryJourney(f);
  assert.equal(result.session.plan.entries.length, 0);
  assert.ok(result.session.plan.research.gaps.some(gap => gap.kind === 'unreliable_extraction'));
  assert.ok(!result.provider.calls.includes('evidence_answer'));
});

test('cached or fetched acquisitions cannot overflow the two-document checkpoint contract', async () => {
  const f = adaptiveFixture({ missing: true, twoSources: true }); f.state.schemes.push(f.other);
  let reservations = 0;
  const create = checkpoint => createResearchTools({ repository: f.repository, sourceChecker: f.sourceChecker, reserveSourceCheck: async () => reservations++, checkpoint });
  const tools = create();
  await tools.execute('retrieveOfficialGuideline', { schemeId: SCHEME_ID, role: 'guidelines' });
  await tools.execute('retrieveOfficialGuideline', { schemeId: SCHEME_ID, role: 'detail' });
  const before = tools.exportState(), resumed = create(before);
  const blocked = await resumed.execute('retrieveOfficialGuideline', { schemeId: String(f.other._id), role: 'guidelines' });
  assert.equal(blocked.reason, 'source_limit'); assert.equal(reservations, 2);
  assert.equal(resumed.exportState().acquiredSources.length, 2);
});
