import { Command } from "@langchain/langgraph";
import { NavigatorError } from "./contracts.js";
import { startRunSchema, advanceRunSchema, prepareNotesSchema, ownerSchema, runIdSchema, parseContract, publicRun } from "./durableContracts.js";
import { NavigatorMongoCheckpointer } from "./mongoCheckpointer.js";
import { createDurableGraph, initialSession } from "./durableGraph.js";
import { createResearchTools } from "./researchTools.js";
import { CATALOGUE_WORKFLOW, createCatalogueGraph, initialCatalogueSession } from "./catalogueWorkflow.js";
import { intentMessages, validateResearchIntent } from "./researchIntent.js";
import { ADAPTIVE_WORKFLOW } from './adaptiveResearch.js';
import { MAX_ADVANCE_MS } from './executionBudgets.js';

/** Owner-scoped service. HTTP obtains owner IDs exclusively from authentication. */
export function createDurableNavigator({ store, repository, provider, sourceChecker, config, maxAdvanceMs = 40000, env = process.env, workflow = config?.adaptiveResearch ? ADAPTIVE_WORKFLOW : CATALOGUE_WORKFLOW, now = () => new Date() } = {}) {
	if (!config?.enabled) throw new NavigatorError("NAVIGATOR_DISABLED", "Navigator is disabled.");
	if (!store?.readLease || !repository?.getPublished || typeof provider?.complete !== "function" || !provider.name || !provider.model || typeof now !== 'function') throw new NavigatorError("INVALID_CONFIGURATION", "Configure durable storage, research tools and a pinned provider.");
	if (!Number.isInteger(maxAdvanceMs) || maxAdvanceMs < 1 || maxAdvanceMs > MAX_ADVANCE_MS || maxAdvanceMs >= store.leaseMs * 0.8
		|| (config.timeoutMs != null && (!Number.isInteger(config.timeoutMs) || config.timeoutMs < 1 || maxAdvanceMs < config.timeoutMs + 10000))) throw new NavigatorError("INVALID_CONFIGURATION", "Each advancement must outlast its provider window and finish before its execution lease expires.");
	const { maxModelCalls, maxToolCalls, globalDailyLimit, userDailyLimit } = config;
	if (config.adaptiveResearch && ((!Number.isInteger(config.maxResearchDecisions ?? 1) || (config.maxResearchDecisions ?? 1) < 0 || (config.maxResearchDecisions ?? 1) > 2) || !Number.isInteger(config.maxResearchCandidates ?? 5) || (config.maxResearchCandidates ?? 5) < 1 || (config.maxResearchCandidates ?? 5) > 5)) throw new NavigatorError('INVALID_CONFIGURATION', 'Configure bounded research decisions and candidates.');
	if (!Number.isInteger(maxModelCalls) || maxModelCalls < 1 || maxModelCalls > 6 || !Number.isInteger(maxToolCalls) || maxToolCalls < 1 || maxToolCalls > 12
		|| !Number.isInteger(globalDailyLimit) || globalDailyLimit < 1 || globalDailyLimit > 10000 || !Number.isInteger(userDailyLimit) || userDailyLimit < 1 || userDailyLimit > globalDailyLimit) throw new NavigatorError("INVALID_CONFIGURATION", "Configure bounded per-run and daily allowances.");
	// No accidental export of model inputs through ambient LangSmith configuration.
	if ([env.LANGSMITH_TRACING, env.LANGCHAIN_TRACING_V2, env.LANGCHAIN_TRACING].some(value => ["true", "1"].includes(String(value).toLowerCase()))) throw new NavigatorError("TRACING_NOT_ALLOWED", "Disable ambient model tracing before using Navigator's private research context.");
	const controllers = new Map();
	const allowances = { globalDailyLimit, userDailyLimit };
	const identity = (ownerId, runId) => { parseContract(ownerSchema, ownerId); parseContract(runIdSchema, runId); };
	const service = {
		async list(ownerId) { parseContract(ownerSchema, ownerId); return (await store.listOwned(ownerId)).map(publicRun); },
		async forget(ownerId, runId) {
			identity(ownerId, runId);
			await store.forget(ownerId, runId);
			controllers.get(runId)?.abort();
		},
		async start(ownerId, input) {
			parseContract(ownerSchema, ownerId);
			const request = parseContract(startRunSchema, input);
			return publicRun(await store.create({ ...request, ownerId, provider: provider.name, model: provider.model, limits: { maxModelCalls: workflow === CATALOGUE_WORKFLOW ? Math.min(2, maxModelCalls) : workflow === ADAPTIVE_WORKFLOW ? Math.min(2 + (config.maxResearchDecisions ?? 1), maxModelCalls) : maxModelCalls, maxToolCalls }, workflow }));
		},
		async get(ownerId, runId) {
			identity(ownerId, runId); const run = await store.getOwned(ownerId, runId);
			// Old runs predate the count field. Read their actual checkpoint rather than guessing from events.
			if (run.collectedPassageCount == null && run.checkpoints?.[0]) {
				const inspector = new NavigatorMongoCheckpointer({ store, lease: { ownerId, runId } });
				const checkpoint = await inspector.decode(run.checkpoints[0].checkpoint);
				run.collectedPassageCount = checkpoint?.channel_values?.session?.context?.passages?.length ?? 0;
			}
			return publicRun(run);
		},
		async cancel(ownerId, runId) {
			identity(ownerId, runId);
			const run = await store.cancel(ownerId, runId);
			controllers.get(runId)?.abort();
			return publicRun(run);
		},
		async prepareNotes(ownerId, input, { signal } = {}) {
			return service.advance(ownerId, parseContract(prepareNotesSchema, input), { signal, notesOnly: true });
		},
		async researchCatalogue(ownerId, input, { signal } = {}) {
			return service.advance(ownerId, parseContract(prepareNotesSchema, input), { signal, catalogueOnly: true });
		},
		async advance(ownerId, input, { signal, notesOnly = false, catalogueOnly = false } = {}) {
			parseContract(ownerSchema, ownerId);
			const request = parseContract(advanceRunSchema, input);
			const before = await store.getOwned(ownerId, request.runId);
			if (!notesOnly && !catalogueOnly && !before.catalogueNoAI && (before.provider !== provider.name || before.model !== provider.model)) throw new NavigatorError("MODEL_CHANGED", "Resume with the provider and model pinned when this investigation was started.");
			if (notesOnly) {
				// A failed zero-call action must not overwrite the existing quota/error state.
				const record = before.checkpoints?.[0];
				const inspector = new NavigatorMongoCheckpointer({ store, lease: { ownerId, runId: before._id }, signal });
				const checkpoint = record ? await inspector.decode(record.checkpoint) : null;
				if (!checkpoint?.channel_values?.session?.context?.passages?.length) throw new NavigatorError("NO_COLLECTED_EVIDENCE", "No source excerpts were collected yet. Open the scholarship catalogue, or continue AI research when allowance is available.");
			}
			let resume = null;
			if (request.clarification) {
				const { skip, answers } = request.clarification;
				const fields = Object.keys(answers);
				if (before.status !== "awaiting_input" || (skip && fields.length) || (!skip && !fields.length)
					|| fields.some(field => !before.clarification?.fields.includes(field))) throw new NavigatorError("INVALID_CLARIFICATION", "Answer only the requested fields, or explicitly skip without answers.");
				resume = { skip, answers };
			}
			if (signal?.aborted) throw new NavigatorError("CANCELLED", "This advancement was cancelled before it started.");
			const { lease, run } = await store.acquire({ ownerId, runId: request.runId, revision: request.revision, resume });
			const controller = new AbortController(), runSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
			controllers.set(run._id, controller);
			const saver = new NavigatorMongoCheckpointer({ store, lease, signal: runSignal });
			const catalogue = catalogueOnly || [CATALOGUE_WORKFLOW, ADAPTIVE_WORKFLOW].includes(run.workflow);
			const graphOptions = { store, lease, provider, repository, sourceChecker, checkpointer: saver, signal: runSignal, allowances, answerContextChars: config.answerContextChars ?? 16000, now };
			const graph = notesOnly ? null : catalogue ? createCatalogueGraph({ ...graphOptions, noAI: catalogueOnly || run.catalogueNoAI, adaptive: run.workflow === ADAPTIVE_WORKFLOW && !catalogueOnly && !run.catalogueNoAI,
				maxResearchDecisions: config.maxResearchDecisions ?? 1, maxResearchCandidates: config.maxResearchCandidates ?? 5 }) : createDurableGraph(graphOptions);
			const graphConfig = { configurable: { thread_id: run._id }, durability: "sync", recursionLimit: 30, signal: runSignal, callbacks: [] };
			let timer, abort;
			const stop = new Promise((_, reject) => {
				timer = setTimeout(() => { controller.abort(new NavigatorError("ADVANCE_TIMEOUT", "This advancement reached its time budget. Its saved progress can be resumed.")); }, maxAdvanceMs);
				abort = () => reject(controller.signal.reason instanceof NavigatorError ? controller.signal.reason : new NavigatorError("CANCELLED", "This advancement was interrupted."));
				runSignal.addEventListener("abort", abort, { once: true });
				if (runSignal.aborted) abort();
			});
			const work = async () => {
				let cachedIntent = null;
				if (catalogueOnly) {
					const saved = await saver.getTuple(graphConfig), intent = saved?.checkpoint?.channel_values?.session?.intent;
					if (intent) {
						try { cachedIntent = validateResearchIntent(intent, intentMessages(run.goal, run.conversation)); }
						catch (error) { if (!(error instanceof NavigatorError) || error.code !== "INVALID_RESEARCH_INTENT") throw error; }
					}
					// Explicitly restart only the local read workflow, preserving private inputs and the AI ledger.
					await store.mutate(lease, () => ({ workflow: CATALOGUE_WORKFLOW, catalogueNoAI: true, collectedPassageCount: 0, checkpoints: [], pendingCheckpointWrites: [], pendingResume: null }));
				}
				const previous = await saver.getTuple(graphConfig);
				if (notesOnly) {
					await store.readLease(lease);
					const context = previous?.checkpoint?.channel_values?.session?.context;
					const savedSession = previous?.checkpoint?.channel_values?.session;
					const tools = createResearchTools({ repository, profile: run.privateProfile, checkpoint: context, retrieval: savedSession?.retrieval, signal: runSignal, now });
					const collected = new Map();
					for (const [, passage] of tools.exportState().passages) {
						if (!collected.has(passage.schemeId) && collected.size < 5) collected.set(passage.schemeId, []);
						const ids = collected.get(passage.schemeId);
						if (ids && ids.length < 5 && !ids.includes(passage.id)) ids.push(passage.id);
					}
					if (!collected.size) throw new NavigatorError("NO_COLLECTED_EVIDENCE", "No source excerpts are available to prepare notes.");
					const plan = await tools.execute("finishInvestigation", { selections: [...collected].map(([schemeId, evidenceIds]) => ({ schemeId, evidenceIds })) });
					if (runSignal.aborted) throw new NavigatorError("CANCELLED", "Preparing notes was interrupted.");
					await store.appendEvent(lease, "tool_started", { tool: "finishInvestigation", action: "prepare_notes" });
					await store.appendEvent(lease, "tool_completed", { tool: "finishInvestigation", action: "prepare_notes" });
					if (runSignal.aborted) throw new NavigatorError("CANCELLED", "Preparing notes was interrupted.");
					return store.release(lease, { status: "completed", plan: { ...plan, preparation: "collected_evidence", intent: savedSession?.intentReport ?? null, ...(savedSession?.coverage ? { coverage: savedSession.coverage } : {}),
						caveat: `These notes use up to five schemes with already collected excerpts, without another AI call. They are not a completed AI investigation or a relevance ranking. ${plan.caveat}` } });
				}
				const state = previous ? await graph.getState(graphConfig) : null;
				// A crash after accepting answers must retain the resume choice. If the
				// clarification already checkpointed, continue from its next node instead.
				const waiting = state?.tasks?.some(task => task.interrupts?.length);
				const value = run.pendingResume && waiting ? new Command({ resume: run.pendingResume }) : previous ? null : { session: catalogue ? initialCatalogueSession(run.goal, run.conversation, cachedIntent) : initialSession(run.goal) };
				await graph.invoke(value, graphConfig);
				const snapshot = await graph.getState(graphConfig);
				const session = snapshot.values.session;
				if (!session) throw new NavigatorError("CHECKPOINT_INVALID", "The graph did not produce a valid research state.");
				// A per-tool checkpoint may precede the interrupt node. Advance to the
				// durable question before accepting any private clarification answers.
				const questionPending = catalogue && session.status === "awaiting_input" && !snapshot.tasks?.some(task => task.interrupts?.length);
				return store.release(lease, { status: questionPending ? "ready" : session.status, plan: session.plan, clarification: questionPending ? null : session.clarification });
			};
			try { return publicRun(await Promise.race([work(), stop])); }
			catch (error) {
				controller.abort();
				const current = await store.getOwned(ownerId, run._id);
				if (current.status === "cancelled") return publicRun(current);
				if (current.lease?.token !== lease.token) {
					if (!current.lease) return publicRun(current);
					throw new NavigatorError("LEASE_LOST", "Another execution now owns the investigation.");
				}
				const known = error instanceof NavigatorError;
				const code = known ? error.code : "ADVANCE_UNAVAILABLE";
				const status = ["QUOTA_EXHAUSTED", "PROVIDER_QUOTA"].includes(code) ? "quota_exhausted" : runSignal.aborted && ["CANCELLED", "ADVANCE_TIMEOUT"].includes(code) ? "interrupted" : "partial";
				const message = known ? error.message : "This advancement could not finish. Saved progress can be resumed.";
				const retryAfterSeconds = ["PROVIDER_QUOTA", "QUOTA_EXHAUSTED"].includes(code) ? error.retryAfterSeconds ?? 60 : null;
				const retryAt = code === "PROVIDER_QUOTA" ? await store.cooldown(provider.name, retryAfterSeconds) : retryAfterSeconds != null ? new Date(Date.now() + retryAfterSeconds * 1000) : null;
				return publicRun(await store.release(lease, { status, error: { code, message,
					...(retryAt != null ? { retryAt: retryAt.toISOString() } : {}) } }));
			} finally {
				clearTimeout(timer); runSignal.removeEventListener("abort", abort);
				if (controllers.get(run._id) === controller) controllers.delete(run._id);
				controller.abort();
			}
		},
	};
	return service;
}
