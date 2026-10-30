import { Annotation, StateGraph, START, END, interrupt } from "@langchain/langgraph";
import { z } from "zod";
import { NavigatorError, CLARIFICATION_FIELDS } from "./contracts.js";
import { createResearchTools } from "./researchTools.js";
import { INTENT_PROMPT, intentMessages, parseResearchIntent, validateResearchIntent, compileResearchIntent, uninterpretedRequest, intentFailureMessage } from "./researchIntent.js";
import { answerContext, applyEvidenceAnswer, cachedAnswerResponse } from './evidenceAnswer.js';
import { answerablePassage } from './passages.js';
import { providedApplicantFields, needsEligibilityClarification } from './retrievalCoverage.js';
import { balanceTargets } from './researchTargets.js';
import { initialResearch, observeResearch, researchActions, researchSelections, decisionMessages, parseDecision, researchReport, canPrepareFindings } from './adaptiveResearch.js';

export const CATALOGUE_WORKFLOW = "catalogue_v1";
const State = Annotation.Root({ session: Annotation({ reducer: (_, update) => update, default: () => null }) });
const recoverable = new Set(["PROVIDER_QUOTA", "QUOTA_EXHAUSTED", "MODEL_LIMIT", "MODEL_PROTOCOL", "INVALID_RESEARCH_INTENT", "INVALID_TOOL_ARGUMENTS", "PROVIDER_AUTH", "PROVIDER_REQUEST_REJECTED", "PROVIDER_TIMEOUT", "PROVIDER_UNAVAILABLE", "PROVIDER_RESPONSE_INVALID"]);
const call = (name, args) => ({ name, args });

export const initialCatalogueSession = (goal, conversation = [], intent = null) => ({ goal, conversation, intent, intentReport: null, context: { version: 1, evaluations: [], passages: [] },
	status: "ready", plan: null, clarification: null, pending: null, candidates: [], selections: [], cursor: 0, searches: 0, planner: "not_requested" });

/** One semantic extraction attempt; the existing bounded executor remains separate. */
export function createCatalogueGraph({ store, lease, provider, repository, sourceChecker, checkpointer, signal, allowances, noAI = false, adaptive = false, maxResearchDecisions = 1, maxResearchCandidates = 5, answerContextChars = 16000, now = () => new Date() }) {
	const active = async () => { if (signal.aborted) throw new NavigatorError("CANCELLED", "This execution stopped."); return store.readControl ? store.readControl(lease) : store.readLease(lease); };
	const event = async (type, extra = {}) => { await active(); await store.appendEvent(lease, type, extra); };
	const model = async ({ session }) => {
		const run = await active(), messages = intentMessages(session.goal, session.conversation ?? []);
		let interpreted = uninterpretedRequest(session.goal, noAI ? "NOT_REQUESTED" : "ATTEMPT_NOT_REPEATED", session.conversation), intent = null, planner = "not_requested";
		// Ambiguous/crashed attempts stay charged and are never repeated for this workflow.
		if (session.intent) {
			intent = validateResearchIntent(session.intent, messages); interpreted = compileResearchIntent(intent); planner = "search_planning";
		} else if (!noAI && run.usage.modelCalls === 0) {
			let reserved = false;
			const reserveCall = async () => { await active(); if (!reserved) { await store.reserveModel(lease, allowances); reserved = true; } };
			try {
				await reserveCall(); await event("model_started");
				const result = await provider.complete({ messages: [{ role: "system", content: INTENT_PROMPT }, ...messages], mode: "research_intent", reserveCall, signal });
				await active(); await store.recordUsage(lease, result.usage ?? null);
				intent = parseResearchIntent(result, messages);
				interpreted = compileResearchIntent(intent);
				planner = "search_planning"; await event("model_completed");
			} catch (error) {
				await active();
				if (!(error instanceof NavigatorError) || !recoverable.has(error.code)) throw error;
				await event("model_failed", { code: error.code, ...(error.intentDiagnostics ? { validation: error.intentDiagnostics } : {}), ...(error.providerDiagnostics ? { provider: error.providerDiagnostics } : {}) });
                // An uninterpreted literal search cannot honor the request's exclusions
                // or audience. Stop; only the explicit catalogue action may bypass AI.
                const message = error.code === 'INVALID_RESEARCH_INTENT' ? intentFailureMessage(error) : ['MODEL_PROTOCOL', 'INVALID_TOOL_ARGUMENTS', 'PROVIDER_RESPONSE_INVALID'].includes(error.code) ? 'AI could not produce a usable interpretation.' : error.message;
                const recovery = ['PROVIDER_TIMEOUT', 'PROVIDER_UNAVAILABLE'].includes(error.code)
                    ? 'Your question is saved. Review and retry keeps the same question ready for an explicit new attempt; you do not need to rewrite it. You can also browse the catalogue without AI.'
                    : 'You can explicitly browse the catalogue without AI, or review your question before retrying.';
                throw new NavigatorError(error.code, `${message} No catalogue search ran and your conditions have not been applied. ${recovery}`,
                    error.retryAfterSeconds != null ? { retryAfterSeconds: error.retryAfterSeconds } : {});
			}
		} else if (!noAI) throw new NavigatorError('INVALID_RESEARCH_INTENT', 'The previous AI attempt did not produce a usable interpretation. Choose catalogue browsing without AI, or cancel and start a revised brief.');
		return { session: { ...session, planner, intent, intentReport: interpreted.report, retrieval: interpreted.retrieval ?? null,
			pending: interpreted.report.status === "needs_clarification" ? call("finishInvestigation", { selections: [] }) : call("searchScholarships", interpreted.search) } };
	};
	const tool = async ({ session }) => {
		const run = await active(), { name, args } = session.pending;
		const interruptedAcquisition = adaptive && name === 'retrieveOfficialGuideline' && run.events.some(event => event.type === 'tool_started' && event.tool === name && event.actionId === session.actionKey);
		if (!noAI && !interruptedAcquisition) await store.reserveTool(lease);
		await event("tool_started", { tool: name, ...(adaptive && session.actionKey ? { actionId: session.actionKey } : {}) });
		const tools = createResearchTools({ repository, profile: run.privateProfile, checkpoint: session.context, includeContext: true, retrieval: session.retrieval, signal, now,
			sourceChecker, reserveSourceCheck: () => store.reserveSourceCheck(lease) });
		let output;
		try { output = interruptedAcquisition ? { kind: 'tool_error', code: 'SOURCE_ATTEMPT_INTERRUPTED' } : await tools.execute(name, args); }
		catch (error) {
			if (adaptive && session.retrieval && error instanceof NavigatorError && ['SOURCE_CHECK_LIMIT', 'SOURCE_CHECK_UNAVAILABLE', 'SOURCE_TIMEOUT', 'TOOL_UNAVAILABLE'].includes(error.code)) output = { kind: 'tool_error', code: error.code };
			else {
			await event("tool_failed", { tool: name });
			if (error instanceof NavigatorError) throw error;
			throw new NavigatorError("TOOL_UNAVAILABLE", "A catalogue tool could not finish. Saved progress can be refreshed.");
			}
		}
		await active();
		await event(output.kind === 'tool_error' ? 'tool_failed' : "tool_completed", { tool: name, ...(name === "findGuidelinePassages" && output.passages ? { resultCount: output.passages.length } : {}) });
		const next = { ...session, context: tools.exportState() };
		if (name === "finishInvestigation") return { session: { ...next, status: "ready", pending: null,
				plan: { ...output, preparation: "catalogue", aiAssistance: session.planner, intent: session.intentReport ?? null,
					...(adaptive && session.research ? { research: researchReport(session, await active()) } : {}),
					...(session.targetResults ? { targets: session.targetResults.map(target => ({ ...target, status: target.candidateIds.some(id => output.entries.some(entry => entry.schemeId === id)) ? 'reviewed' : target.status })) } : {}),
					...(session.coverage ? { coverage: session.coverage } : {}) } } };
		if (adaptive && session.retrieval) {
			next.research = observeResearch({ ...next, research: session.research ?? initialResearch() }, name, args, output);
			if (name === 'searchScholarships' && output.kind === 'search') {
				if (output.targets) next.targetResults = output.targets;
				next.coverage = { reviewed: next.research.cards.filter(card => next.context.passages.some(([, p]) => p.schemeId === card.schemeId)).map(card => ({ schemeId: card.schemeId, title: card.title, ...card.retrieval, qualification: card.qualification, examined: true })),
					deferred: next.research.cards.filter(card => !next.context.passages.some(([, p]) => p.schemeId === card.schemeId)).map(card => ({ schemeId: card.schemeId, title: card.title, reason: card.research?.identityUnresolved ? 'scheme_identity_unconfirmed' : 'research_pending' })),
					excluded: output.excluded.map(card => ({ schemeId: card.schemeId, title: card.title, region: card.region, ...card.retrieval, qualification: card.qualification, examined: false })), discovery: output.discovery };
			} else if (name === 'findGuidelinePassages' && output.kind === 'passages') {
				next.coverage = { ...next.coverage, reviewed: next.research.cards.filter(card => next.context.passages.some(([, p]) => p.schemeId === card.schemeId)).map(card => ({ schemeId: card.schemeId, title: card.title, ...card.retrieval, qualification: card.qualification, examined: true })),
					deferred: next.coverage.deferred.filter(card => !next.context.passages.some(([, p]) => p.schemeId === card.schemeId)) };
			}
			next.selections = researchSelections(next);
			if (name === 'requestClarification') return { session: { ...next, status: 'awaiting_input', clarification: output } };
			if (name === 'evaluateMatches') {
				const known = new Set(providedApplicantFields(next.retrieval)), fields = [...new Set(output.matches.flatMap(match => match.missingFields))].filter(field => !known.has(field)).slice(0, 1);
				return { session: { ...next, pending: needsEligibilityClarification(next.retrieval) && !next.research.clarified && fields.length && !canPrepareFindings(next) && (await active()).limits.maxToolCalls - (await active()).usage.toolCalls >= 2 ? call('requestClarification', { fields }) : call('finishInvestigation', { selections: next.selections }) } };
			}
			return { session: { ...next, pending: null } };
		}
		if (name === "evaluateMatches") {
			const provided = new Set(providedApplicantFields(session.retrieval));
			const fields = [...new Set(output.matches.flatMap(match => match.missingFields))].filter(field => !provided.has(field)).slice(0, 3);
			const current = await active();
			return { session: { ...next, pending: needsEligibilityClarification(session.retrieval) && fields.length && (noAI || current.limits.maxToolCalls - current.usage.toolCalls >= 2) ? call("requestClarification", { fields }) : call("finishInvestigation", { selections: session.selections }) } };
		}
		if (name === "requestClarification") return { session: { ...next, status: "awaiting_input", clarification: output } };
		if (name === "searchScholarships") {
			next.searches++;
			// Empty results must not silently broaden or discard validated exclusions.
			// Leave room for finalization within the existing lifetime tool allowance.
			const current = await active();
			const available = current.limits.maxToolCalls - current.usage.toolCalls;
			// Preflight located useful policy locally, before allocating research
			// actions. Identity-only records cannot exhaust the research allowance.
			const researchable = output.schemes.filter(scheme => !session.retrieval || scheme.research?.evidenceAvailable !== false);
			const freshnessMatters = session.retrieval?.requirements.some(r => ['academicYear', 'applicationType'].includes(r.field)) || researchable[0]?.stale;
			const sourceAllowance = !noAI && sourceChecker && freshnessMatters && available >= 4 ? 1 : 0;
			const remaining = noAI ? 4 : Math.max(0, available - (available >= 4 ? 2 : 1) - sourceAllowance);
			next.candidates = balanceTargets(researchable, session.retrieval?.targets, Math.min(5, remaining)).map(scheme => scheme.schemeId); next.cursor = 0;
			if (output.targets) next.targetResults = output.targets;
			next.candidateCards = output.schemes.map(({ schemeId, stale }) => ({ schemeId, stale }));
			if (session.retrieval) next.coverage = { reviewed: output.schemes.filter(scheme => next.candidates.includes(scheme.schemeId)).map(scheme => ({ schemeId: scheme.schemeId, title: scheme.title, ...scheme.retrieval, qualification: scheme.qualification, examined: false })),
				discovery: output.discovery,
				deferred: output.schemes.filter(scheme => !next.candidates.includes(scheme.schemeId)).map(({ schemeId, title, research }) => ({ schemeId, title, reason: research?.identityUnresolved ? 'scheme_identity_unconfirmed' : research?.preflightComplete === false ? 'source_budget' : research?.evidenceAvailable === false ? 'policy_evidence_unavailable' : 'research_budget' })),
				excluded: output.excluded.map(scheme => ({ schemeId: scheme.schemeId, title: scheme.title, region: scheme.region, ...scheme.retrieval, qualification: scheme.qualification, examined: false })) };
		} else if (name === 'findGuidelinePassages') {
			next.cursor++;
			if (next.coverage) next.coverage = { ...next.coverage, reviewed: next.coverage.reviewed.map(item => item.schemeId === output.schemeId ? { ...item, ...output.retrieval, qualification: output.qualification, examined: true } : item) };
		}
		if (next.cursor < next.candidates.length) return { session: { ...next, pending: call("findGuidelinePassages", { schemeId: next.candidates[next.cursor], query: (session.retrieval?.queries[0] || session.goal).slice(0, 300) }) } };
		const grouped = new Map();
		for (const [, passage] of next.context.passages) {
			if (!next.candidates.includes(passage.schemeId)) continue;
			if (session.retrieval && (!answerablePassage(passage) || next.coverage?.reviewed.some(c => c.schemeId === passage.schemeId && c.qualification?.status === 'excluded'))) continue;
			if (!grouped.has(passage.schemeId)) grouped.set(passage.schemeId, []);
			grouped.get(passage.schemeId).push(passage.id);
		}
		const selections = [...grouped].map(([schemeId, evidenceIds]) => ({ schemeId, evidenceIds: evidenceIds.slice(0, 5) }));
		const current = await active(), available = current.limits.maxToolCalls - current.usage.toolCalls;
		// Byte checks answer freshness only. They cannot supply missing policy or
		// turn a portal manual into eligibility evidence; no repeated failed fetches.
		const checked = new Set((next.context.sourceChecks ?? []).map(([, record]) => record.schemeId));
		const checkedSnapshots = new Set((next.context.sourceChecks ?? []).map(([, record]) => record.check.snapshotId));
		const freshnessMatters = session.retrieval?.requirements.some(r => ['academicYear', 'applicationType'].includes(r.field));
		const source = !noAI && sourceChecker && available >= 3 && checked.size < 2 && selections.map(selection => ({ ...selection,
			evidenceId: selection.evidenceIds.find(id => next.context.passages.some(([key, passage]) => key === id && !checkedSnapshots.has(String(passage.evidence.snapshotId)))) }))
			.find(selection => selection.evidenceId && !checked.has(selection.schemeId) && (freshnessMatters || next.candidateCards?.find(card => card.schemeId === selection.schemeId)?.stale));
		return { session: { ...next, selections, pending: source ? call('checkOfficialSource', { schemeId: source.schemeId, evidenceId: source.evidenceId })
			: selections.length && (noAI || available >= 2) ? call("evaluateMatches", { schemeIds: selections.map(selection => selection.schemeId) }) : call("finishInvestigation", { selections }) } };
	};
	const clarify = async ({ session }) => {
		const choice = interrupt({ fields: session.clarification.fields, optional: true });
		await active();
		const parsed = z.strictObject({ skip: z.boolean(), resolvedFields: z.array(z.enum(CLARIFICATION_FIELDS)).max(3) }).safeParse(choice);
		if (!parsed.success) throw new NavigatorError("INVALID_RUN_INPUT", "The clarification resume token is invalid.");
		return { session: { ...session, ...(adaptive ? { research: { ...session.research, clarified: true } } : {}), status: "ready", clarification: null, context: { ...session.context, evaluations: [] }, pending: call("finishInvestigation", { selections: session.selections }) } };
	};
	const decide = async ({ session }) => {
		const run = await active(), research = { ...initialResearch(), ...session.research }, next = { ...session, research };
		const finish = reason => { research.stopReason = reason; const selections = researchSelections(next); return { session: { ...next, selections, pending: call(selections.length && run.limits.maxToolCalls - run.usage.toolCalls >= 2 ? 'evaluateMatches' : 'finishInvestigation', selections.length && run.limits.maxToolCalls - run.usage.toolCalls >= 2 ? { schemeIds: selections.map(s => s.schemeId) } : { selections }) } }; };
		const menu = researchActions(next, run, { maxCandidates: maxResearchCandidates });
		if (!menu.length) return finish(run.limits.maxToolCalls - run.usage.toolCalls <= 1 ? 'budget_exhausted' : 'available_actions_exhausted');
		let action = menu[0];
		// An interrupted charged decision is never regenerated. Reserve synthesis
		// allowance, and use deterministic actions when semantic guidance is unavailable.
		const semanticChoice = session.context.passages.some(([, passage]) => answerablePassage(passage)) || menu.some(action => action.tool === 'searchScholarships');
		if (semanticChoice && menu.length > 1 && !research.providerBlocked && !research.plannerUnavailable && research.decisions < maxResearchDecisions && run.usage.modelCalls === 1 + research.decisions && run.limits.maxModelCalls - run.usage.modelCalls > 1) {
			const messages = decisionMessages(next, menu, run);
			if (messages.length) {
				let reserved = false; const reserveCall = async () => { await active(); if (!reserved) { await store.reserveModel(lease, { ...allowances, keepRemaining: 1 }); reserved = true; } };
				try {
					await reserveCall(); research.decisions++; await event('model_started', { action: 'research_decision' });
					const result = await provider.complete({ mode: 'research_decision', messages, reserveCall, signal });
					await active(); await store.recordUsage(lease, result.usage ?? null); action = parseDecision(result, menu, session.retrieval.requirements);
					await event('model_completed', { action: 'research_decision' });
				} catch (error) {
					await active(); if (!(error instanceof NavigatorError) || (!recoverable.has(error.code) && error.code !== 'RESEARCH_HEADROOM')) throw error;
					if (error.code === 'RESEARCH_HEADROOM') research.plannerUnavailable = true;
					else await event('model_failed', { action: 'research_decision', code: error.code, ...(error.providerDiagnostics ? { provider: error.providerDiagnostics } : {}) });
					if (['PROVIDER_QUOTA', 'QUOTA_EXHAUSTED', 'PROVIDER_TIMEOUT', 'PROVIDER_UNAVAILABLE'].includes(error.code)) research.providerBlocked = error.code;
					if (error.code === 'PROVIDER_QUOTA') await store.cooldown(provider.name, error.retryAfterSeconds ?? 60);
				}
			}
		}
		if (!action) return finish('model_stopped');
		return { session: { ...next, actionKey: action.id, actionGeneration: action.generation, pending: call(action.tool, action.args) } };
	};
	const answer = async ({ session }) => {
		const run = await active();
		// Revalidate every cited revision and snapshot immediately before inference.
		const tools = createResearchTools({ repository, profile: run.privateProfile, checkpoint: session.context, retrieval: session.retrieval, signal, now });
		const verified = await tools.execute('finishInvestigation', { selections: session.selections });
		const plan = { ...session.plan, ...verified }, packetFor = plan => answerContext(session, plan, { maxCharacters: answerContextChars }), packet = packetFor(plan);
		const complete = result => ({ session: { ...session, status: 'completed', plan: result } });
		if (session.plan.answer?.fingerprint === packet.fingerprint) return complete(session.plan);
		if (session.research?.providerBlocked) return complete(applyEvidenceAnswer(plan, packet, null, session.research.providerBlocked));
		if (noAI || !session.intent || !packet.context.candidates.length || !packet.context.requirements.length) {
			return complete(applyEvidenceAnswer(plan, packet, null, noAI ? 'NOT_REQUESTED' : packet.omittedCandidates ? 'CONTEXT_LIMIT' : plan.research?.gaps.some(gap => ['missing_source', 'catalogue_coverage', 'unreliable_extraction'].includes(gap.kind)) ? 'SOURCE_COVERAGE_GAP' : 'INSUFFICIENT_EVIDENCE'));
		}
		if (plan.entries.every(candidate => candidate.retrieval?.conditions.every(condition => condition.status !== 'unknown'))) {
			return complete(applyEvidenceAnswer(plan, packet, null, 'RECORDED_CHECKS'));
		}
		const cached = await store.findCachedAnswer?.(lease, packet.fingerprint);
		if (cached) {
			const result = applyEvidenceAnswer(plan, packet, cachedAnswerResponse(cached));
			if (result.answer.acceptedAssessments > 0) return complete({ ...result, answer: { ...result.answer, cacheHit: true } });
		}
		// An ambiguous charged attempt is not repeated after a process restart.
		if (run.usage.modelCalls >= run.limits.maxModelCalls) return complete(applyEvidenceAnswer(plan, packet, null, 'MODEL_LIMIT'));
		let reserved = false;
		const reserveCall = async () => { await active(); if (!reserved) { await store.reserveModel(lease, allowances); reserved = true; } };
		try {
			await reserveCall(); await event('model_started', { action: 'answer_evidence' });
			const result = await provider.complete({ mode: 'evidence_answer', messages: packet.messages, reserveCall, signal });
			await active(); await store.recordUsage(lease, result.usage ?? null);
			// Recheck after inference too: cached source interpretations never outlive their proofs.
			const refreshed = await tools.execute('finishInvestigation', { selections: session.selections });
			const freshPlan = { ...plan, ...refreshed };
			if (packetFor(freshPlan).fingerprint !== packet.fingerprint) throw new NavigatorError('SOURCE_CHANGED', 'Source information changed while preparing the answer. Retrieve it again.');
			const answered = applyEvidenceAnswer(freshPlan, packet, result);
			await event('model_completed', { action: 'answer_evidence', validation: { accepted: answered.answer.acceptedAssessments, rejected: answered.answer.rejectedAssessments,
				codes: [...new Set(answered.answer.diagnostics.map(d => d.code))] } });
			return complete(answered);
		} catch (error) {
			await active();
			if (!(error instanceof NavigatorError) || (!recoverable.has(error.code) && error.code !== 'INVALID_EVIDENCE_ANSWER')) throw error;
			if (error.code === 'PROVIDER_QUOTA') await store.cooldown(provider.name, error.retryAfterSeconds ?? 60);
			await event('model_failed', { action: 'answer_evidence', code: error.code, ...(error.providerDiagnostics ? { provider: error.providerDiagnostics } : {}) });
			return complete(applyEvidenceAnswer(plan, packet, null, error.code));
		}
	};
	return new StateGraph(State).addNode("model", model, { retryPolicy: { maxAttempts: 1 } }).addNode("tool", tool, { retryPolicy: { maxAttempts: 1 } }).addNode("clarify", clarify, { retryPolicy: { maxAttempts: 1 } }).addNode('answer', answer, { retryPolicy: { maxAttempts: 1 } }).addNode('decide', decide, { retryPolicy: { maxAttempts: 1 } })
		.addEdge(START, "model").addEdge("model", "tool").addConditionalEdges("tool", ({ session }) => session.plan ? 'answer' : session.status === "awaiting_input" ? "clarify" : adaptive && session.retrieval && !session.pending ? 'decide' : "tool").addEdge("clarify", adaptive ? 'decide' : "tool").addEdge('decide', 'tool').addEdge('answer', END)
		.compile({ checkpointer, interruptAfter: ["model", "tool", 'decide', 'answer'] });
}
