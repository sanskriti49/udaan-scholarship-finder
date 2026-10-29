import { createHash } from 'node:crypto';
import { MemorySaver } from '@langchain/langgraph';
import { createCatalogueGraph, initialCatalogueSession } from '../src/agents/navigator/catalogueWorkflow.js';
import { admissionFixture, admissionIntent, admissionBrief } from './admissionIntentFixture.js';
import { FIXTURE_NOW } from './navigatorHelpers.js';
import { NavigatorError } from '../src/agents/navigator/contracts.js';

export function adaptiveFixture({ missing = false, twoSources = false, unavailable = false, investigativeGap = false } = {}) {
  const f = admissionFixture(); f.state.schemes = [f.scheme];
  if (missing) f.scheme.fieldEvidence = [];
  f.snapshot.sha256 = createHash('sha256').update(f.snapshot.text).digest('hex');
  f.scheme.officialLinks.listingUrl = 'https://example.invalid/list';
  if (twoSources) f.scheme.officialLinks.detailUrl = 'https://example.invalid/detail';
  const intent = structuredClone(admissionIntent), goal = investigativeGap ? admissionBrief + ' Can the award continue after a study break?' : admissionBrief;
  const renewalClause = "Renewal after an authorised study break requires the institution's approval.";
  if (investigativeGap) intent.questions.push({ text: 'Can the award continue after a study break?', source: { messageIndex: 0, quote: 'Can the award continue after a study break?' } });
  f.repository.saveSnapshot = async snapshot => {
    const id = createHash('sha256').update(snapshot.url + snapshot.textHash).digest('hex').slice(0, 24);
    const saved = { ...snapshot, id, _id: id };
    f.state.snapshots.push(saved); return saved;
  };
  const captures = [];
  const sourceChecker = { canAcquire: (scheme, role) => Boolean(scheme.officialLinks?.[role === 'guidelines' ? 'guidelinesUrl' : 'detailUrl']),
    async acquire({ scheme, role, reserve, signal }) {
      await reserve(); signal?.throwIfAborted(); captures.push(role);
      if (unavailable) return { status: 'unavailable', reason: 'blocked' };
      const snapshot = { ...structuredClone(f.snapshot), url: scheme.officialLinks[role === 'guidelines' ? 'guidelinesUrl' : 'detailUrl'] };
      if (investigativeGap && role === 'detail') { snapshot.text += '\n' + renewalClause; snapshot.textHash = createHash('sha256').update(snapshot.text).digest('hex'); snapshot.sha256 = snapshot.textHash; }
      return { status: 'captured', snapshot };
    } };
  return { ...f, sourceChecker, captures, intent, goal, investigativeGap, renewalClause };
}

export function adaptiveProvider(f, { failDecision = null, choose = null } = {}) {
  const calls = [];
  return { name: 'fixture', model: 'scripted', calls, async complete({ mode, messages }) {
    calls.push(mode);
    if (mode === 'research_intent') return { intentFormat: 'json_schema', message: { content: JSON.stringify(f.intent) } };
    if (mode === 'research_decision') {
      if (failDecision) throw new NavigatorError(failDecision, 'Synthetic decision failure');
      const packet = JSON.parse(messages.at(-1).content);
      const action = choose ? choose(packet) : packet.actions.find(action => action.tool === 'retrieveOfficialGuideline') || packet.actions[0];
      return { message: { content: JSON.stringify({ actionId: action?.id ?? 'stop', query: '', focus: [] }) } };
    }
    const packet = JSON.parse(messages.at(-1).content), candidate = packet.candidates[0], passage = candidate.passages.find(p => p.quote.includes(f.clause));
    if (!passage) throw new Error('The actual requested course clause is missing');
    const rows = [{ schemeId: candidate.schemeId, requirementId: 'c1', status: 'supported', dependsOn: [],
      explanation: 'The guideline includes undergraduate engineering admission. Approval of the institution and all additional requirements remain to be checked.', evidence: [{ evidenceId: passage.id, quote: f.clause, relation: 'supports' }] }];
    const renewal = candidate.passages.find(p => p.quote.includes(f.renewalClause));
    if (f.investigativeGap && renewal) rows.push({ schemeId: candidate.schemeId, requirementId: 'q0', status: 'unknown', dependsOn: [], explanation: 'The source permits renewal after an authorised break, subject to institution approval. Your approval has not been established.', evidence: [{ evidenceId: renewal.id, quote: f.renewalClause, relation: 'supports' }] });
    return { message: { content: JSON.stringify({ assessments: rows }) } };
  } };
}

export async function memoryJourney(f, options = {}) {
  const provider = options.provider ?? adaptiveProvider(f, options), run = { limits: { maxModelCalls: 3, maxToolCalls: options.tools ?? 10 }, sourceCheckAttempts: 0,
    privateProfile: {}, usage: { modelCalls: 0, toolCalls: 0 }, events: [] };
  const store = { async readLease() { return structuredClone(run); }, async reserveModel() { if (run.usage.modelCalls >= run.limits.maxModelCalls) throw new NavigatorError('MODEL_LIMIT', 'Fixture limit'); run.usage.modelCalls++; },
    async reserveTool() { if (run.usage.toolCalls >= run.limits.maxToolCalls) throw new NavigatorError('TOOL_LIMIT', 'Fixture limit'); run.usage.toolCalls++; },
    async reserveSourceCheck() { if (run.sourceCheckAttempts >= 2) throw new NavigatorError('SOURCE_CHECK_LIMIT', 'Fixture source limit'); run.sourceCheckAttempts++; },
    async appendEvent(lease, type, extra) { run.events.push({ type, ...extra }); }, async recordUsage() {}, async cooldown() {} };
  const checkpoint = new MemorySaver(), graphConfig = { configurable: { thread_id: 'adaptive-test' } };
  const build = () => createCatalogueGraph({ store, provider, repository: f.repository, sourceChecker: f.sourceChecker, checkpointer: checkpoint, lease: {},
    signal: new AbortController().signal, allowances: {}, adaptive: true, now: options.now ?? (() => FIXTURE_NOW) });
  let state, graph = build();
  for (let i = 0; i < 40; i++) {
    await graph.invoke(i ? null : { session: initialCatalogueSession(f.goal) }, graphConfig);
    state = await graph.getState(graphConfig);
    if (state.values.session.status === 'completed') break;
    graph = build(); // Reconstruct executor from durable graph state after every action.
  }
  return { session: state.values.session, run, provider };
}
