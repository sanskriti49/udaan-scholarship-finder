import { findingGroup } from './researchSummary.js';

export const STAGES = [
  { key: 'search', label: 'Search catalogue' }, { key: 'read', label: 'Read sources' },
  { key: 'check', label: 'Check rules' }, { key: 'notes', label: 'Prepare notes' },
];
const TOOL_STAGE = { searchScholarships: 0, findGuidelinePassages: 1, checkOfficialSource: 1, retrieveOfficialGuideline: 1, evaluateMatches: 2, finishInvestigation: 3 };
export function stageOf(event) { return ['prepare_notes', 'answer_evidence'].includes(event?.action) ? 3 : TOOL_STAGE[event?.tool] ?? -1; }
export function formatClock(value) {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function investigationActivity(run, busy = false) {
  const events = run?.events ?? [], last = events.at(-1);
  const working = !!run && (busy || run.status === 'running') && !['completed', 'cancelled', 'quota_exhausted', 'awaiting_input'].includes(run.status);
  const active = working && last?.type?.endsWith('started') ? last : null;
  const index = active ? stageOf(active) : -1;
  const reached = [...new Set(events.filter(event => event.type?.endsWith('completed')).map(stageOf).filter(value => value >= 0))];
  let mood = active?.type === 'model_started' ? 'planning' : index === 0 ? 'search' : index === 1 ? 'read' : index === 2 ? 'rules' : index === 3 ? 'read' : 'idle';
  if (run?.status === 'completed') mood = run.plan?.entries?.some(entry => findingGroup(entry) === 'promising'
    && (!run.plan.answer || run.plan.answer.status === 'answered')) ? 'done' : 'empty';
  else if (run?.status === 'quota_exhausted') mood = 'quota';
  else if (run?.status === 'cancelled') mood = 'cancelled';
  else if (!working || ['partial', 'interrupted'].includes(run?.status)) mood = 'paused';
  const label = active?.action === 'research_decision' ? 'Choosing which unanswered question to research next' : active?.action === 'answer_evidence' ? 'Answering from the source evidence' : active?.tool === 'retrieveOfficialGuideline' ? 'Opening the official guideline' : active?.type === 'model_started' ? 'Understanding your brief' : active ?
    (active.action === 'prepare_notes' ? 'Preparing notes from saved evidence' : ['Finding scholarships', 'Reading scholarship guidelines', 'Checking eligibility conditions', 'Preparing your findings'][index] ?? 'Checking what information is missing') :
    working ? 'Waiting for the next saved update' : null;
  const chips = [];
  if (run?.collectedPassageCount > 0) chips.push({ key: 'sources', label: `${run.collectedPassageCount} saved excerpts` });
  const tools = events.filter(event => event.type === 'tool_completed').length;
  if (tools) chips.push({ key: 'tools', label: `${tools} research steps saved` });
  return { mood, activeIndex: index, reached, label, working, chips };
}

