import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizeProfile } from "../../engine/ruleEvaluator.js";
import { evaluateResearchEligibility } from './researchEligibility.js';
import { evaluationProfileSchema } from "../../engine/ruleSchema.js";
import { computeStatus } from "../../pipeline/core/status.js";
import { verifyEvidence } from "../../pipeline/core/evidence.js";
import { NavigatorError, parseToolArguments, CLARIFICATION_FIELDS, sourceCheckSchema } from "./contracts.js";
import { findPassages, isIntactSnapshot, safeSourceUrl, schemeEvidenceReferences } from "./passages.js";
import { qualifyCandidate, prioritizeCandidates, ruleReasons, candidateRelevance, matchingProfile } from './candidateQualification.js';
import { assessRetrieval, evidenceQueries, evidenceTargets } from './retrievalCoverage.js';
import { sourceSpanEdges } from './quotationSpan.js';
import { inspectCandidateEvidence } from './candidateResearch.js';
import { validatedJsonPolicyEdges } from '../../pipeline/adapters/mySchemeEvidence.js';
import { mySchemePolicyEvidence } from '../../pipeline/adapters/mySchemeEvidence.js';
import { makeEvidence } from '../../pipeline/core/evidence.js';
import { withinTargetScope, targetIds, balanceTargets, targetResults, preferredTargetCandidates } from './researchTargets.js';

const idOf = scheme => String(scheme._id ?? scheme.id);
const published = scheme => scheme?.publication?.state === "published" && scheme.legacy !== true;
const isoDate = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : null;
// Invalidate summaries from before discovery's shared evaluator refinements.
// Exact quotations and source checks remain reusable across this upgrade.
const MATCH_POLICY_VERSION = 4;
const revisionOf = scheme => createHash("sha256").update(JSON.stringify({ dataHash: scheme.dataHash, level: scheme.level, state: scheme.state, title: scheme.title, officialTitle: scheme.officialTitle, organization: scheme.organization, applicationLink: scheme.applicationLink, ruleTree: scheme.ruleTree, rules: scheme.rules, eligibility: scheme.eligibility,
	currentCycle: scheme.currentCycle, requiredDocuments: scheme.requiredDocuments, fieldEvidence: scheme.fieldEvidence, dataQuality: scheme.dataQuality, officialLinks: scheme.officialLinks })).digest("hex");

function schemeCard(scheme, now) {
	const cycle = scheme.currentCycle;
	const safeCycle = cycle ? { ...cycle, opensAt: isoDate(cycle.opensAt), closesAt: isoDate(cycle.closesAt), latestPossibleClosesAt: isoDate(cycle.latestPossibleClosesAt) } : null;
	const recordedVerification = isoDate(scheme.freshness?.lastVerifiedAt);
	const lastVerifiedAt = recordedVerification && new Date(recordedVerification) <= now ? recordedVerification : null;
	const status = computeStatus({ ...scheme, currentCycle: safeCycle, freshness: { ...scheme.freshness, lastVerifiedAt } }, now);
	if (cycle?.hasConflict || cycle?.conflicts?.length) Object.assign(status, { status: "unknown", reason: "Recorded sources disagree about this application window. Confirm the current dates with the provider." });
	return { schemeId: idOf(scheme), title: scheme.title, organization: scheme.organization ?? null, region: typeof scheme.state === 'string' ? scheme.state : null,
		academicYear: cycle?.academicYear ?? null, applicationType: cycle?.applicationType ?? null,
		deadline: safeCycle?.closesAt ?? null, applicationLink: safeSourceUrl(scheme.applicationLink),
		status: status.status, statusReason: status.reason, stale: status.stale,
		lastVerifiedAt };
}

/** Per-investigation context. The repository contract contains read methods only. */
export function createResearchTools({ repository, profile = {}, checkpoint = null, sourceChecker, reserveSourceCheck, signal, includeContext = false, retrieval = null, now = () => new Date() } = {}) {
	if (!["searchPublished", "getPublished", "getSnapshots"].every(name => typeof repository?.[name] === "function")) throw new NavigatorError("INVALID_CONFIGURATION", "Navigator needs a read-only research repository.");
	const parsedProfile = evaluationProfileSchema.safeParse(profile);
	if (!parsedProfile.success) throw new NavigatorError("INVALID_PROFILE", "Review the profile inputs before matching.");
	// Copy selected inputs and never attach them to model-facing results or events.
	const privateProfile = matchingProfile(normalizeProfile(structuredClone(parsedProfile.data)), retrieval);
	const evaluations = new Map(), passages = new Map(), sourceChecks = new Map(), acquiredSources = new Map();
	if (checkpoint != null) {
		const parsed = z.strictObject({ version: z.literal(1), evaluations: z.array(z.tuple([z.string(), z.object({ revision: z.string().regex(/^[a-f\d]{64}$/), summary: z.object({ schemeId: z.string(), status: z.enum(["passed", "failed", "unknown"]), missingFields: z.array(z.enum(CLARIFICATION_FIELDS)) }).passthrough() }).strict()])).max(60),
			passages: z.array(z.tuple([z.string(), z.object({ id: z.string(), schemeId: z.string(), revision: z.string().regex(/^[a-f\d]{64}$/), evidence: z.object({ quote: z.string(), snapshotId: z.unknown() }).passthrough() }).passthrough()])).max(48),
			sourceChecks: z.array(z.tuple([z.string(), z.strictObject({ schemeId: z.string().regex(/^[a-f\d]{24}$/i), revision: z.string().regex(/^[a-f\d]{64}$/), textHash: z.string(), sha256: z.string().nullable(), check: sourceCheckSchema })])).max(12).optional(),
			acquiredSources: z.array(z.tuple([z.string(), z.strictObject({ schemeId: z.string().regex(/^[a-f\d]{24}$/i), revision: z.string().regex(/^[a-f\d]{64}$/), snapshotId: z.string().regex(/^[a-f\d]{24}$/i), role: z.enum(['guidelines', 'detail']) })])).max(2).optional() }).safeParse(checkpoint);
		if (!parsed.success || JSON.stringify(checkpoint).length > 160000) throw new NavigatorError("CHECKPOINT_INVALID", "Research context is invalid or exceeds its size budget.");
		for (const [id, entry] of structuredClone(parsed.data.evaluations)) {
			if (id !== entry.summary.schemeId) throw new NavigatorError("CHECKPOINT_INVALID", "Matching context has an inconsistent scheme identity.");
			// Recompute legacy summaries under the current applicability policy;
			// retain all exact source proofs and never mutate saved private inputs.
			if (entry.summary.policyVersion === MATCH_POLICY_VERSION) evaluations.set(id, entry);
		}
		for (const [id, entry] of structuredClone(parsed.data.passages)) {
			if (id !== entry.id) throw new NavigatorError("CHECKPOINT_INVALID", "Evidence context has an inconsistent citation identity.");
			passages.set(id, entry);
		}
		for (const [key, entry] of structuredClone(parsed.data.sourceChecks ?? [])) {
			if (key !== `${entry.schemeId}:${entry.check.snapshotId}` || !safeSourceUrl(entry.check.url)) throw new NavigatorError("CHECKPOINT_INVALID", "Source-check context has an inconsistent identity.");
			sourceChecks.set(key, entry);
		}
		for (const [key, entry] of structuredClone(parsed.data.acquiredSources ?? [])) {
			if (key !== `${entry.schemeId}:${entry.role}`) throw new NavigatorError('CHECKPOINT_INVALID', 'Invalid acquired-source identity.');
			acquiredSources.set(key, entry);
		}
	}

	async function loadSchemes(ids) {
		const found = await repository.getPublished(ids);
		const map = new Map(found.filter(published).map(scheme => [idOf(scheme), scheme]));
		if (ids.some(id => !map.has(id))) throw new NavigatorError("SCHEME_UNAVAILABLE", "A selected scholarship is no longer published or available.");
		return ids.map(id => map.get(id));
	}

	async function execute(name, input) {
		const args = parseToolArguments(name, input);
		if (name === "searchScholarships") {
			const effective = retrieval && args.query && !retrieval.discovery.includes(args.query) ? { ...retrieval, discovery: [args.query, ...retrieval.discovery] } : retrieval;
			const schemes = (await repository.searchPublished({ ...args, ...(effective ? { retrieval: effective } : {}), limit: retrieval ? 48 : 8 })).filter(scheme => withinTargetScope(scheme, retrieval));
			const cards = schemes.filter(published).slice(0, retrieval ? 48 : 8).map(scheme => {
                const coverage = retrieval ? assessRetrieval(scheme, retrieval) : null;
                return { ...schemeCard(scheme, now()), ...(retrieval?.targets?.length ? { targetIds: targetIds(scheme, retrieval) } : {}), ...(coverage ? { retrieval: coverage, qualification: qualifyCandidate(scheme, privateProfile, coverage), relevance: candidateRelevance(scheme, retrieval) } : {}) };
            });
            let inspection = null;
            if (retrieval) {
                const preferred = preferredTargetCandidates(schemes.filter(published), retrieval);
                const viable = new Set(cards.filter(card => card.qualification.status !== 'excluded' && preferred.has(card.schemeId)).map(card => card.schemeId));
                inspection = await inspectCandidateEvidence(schemes.filter(scheme => viable.has(idOf(scheme))), repository, retrieval, { signal });
                for (const card of cards) card.research = inspection.candidates.get(card.schemeId) ?? { evidenceAvailable: false, addressable: [], preflightComplete: true, identityUnresolved: !preferred.has(card.schemeId) };
            }
			const excluded = cards.filter(card => card.qualification?.status === 'excluded').slice(0, 8);
			for (const card of cards) {
				const scheme = schemes.find(scheme => idOf(scheme) === card.schemeId);
				card.sourceRoles = typeof sourceChecker?.acquire === 'function' && typeof repository.saveSnapshot === 'function' ? ['guidelines', 'detail'].filter(role => sourceChecker.canAcquire?.(scheme, role)) : [];
				card.sourceLinks = Object.fromEntries(card.sourceRoles.map(role => [role, safeSourceUrl(scheme.officialLinks[role === 'guidelines' ? 'guidelinesUrl' : 'detailUrl'])]));
			}
			const ranked = retrieval ? prioritizeCandidates(cards) : cards;
			const selected = retrieval ? balanceTargets(ranked, retrieval.targets, 8) : cards;
			return { kind: "search", schemes: selected,
				...(retrieval?.targets?.length ? { targets: targetResults(retrieval.targets, [...selected, ...ranked.filter(card => !selected.includes(card))], cards.filter(card => card.qualification.status === 'excluded')) } : {}),
				...(inspection ? { discovery: inspection.diagnostics } : {}),
				...(retrieval ? { excluded } : {}), coverage: "Udaan's recorded catalogue; not every scholarship portal." };
		}
		if (name === "findGuidelinePassages") {
			const [scheme] = await loadSchemes([args.schemeId]);
			if (args.focus?.some(id => !retrieval?.requirements.some(requirement => requirement.id === id))) throw new NavigatorError('INVALID_TOOL_ARGUMENTS', 'Focus only on established research questions.');
			const acquired = [...acquiredSources.values()].filter(item => item.schemeId === args.schemeId);
			if (acquired.some(item => item.revision !== revisionOf(scheme))) throw new NavigatorError('SOURCE_CHANGED', 'The scheme changed after source acquisition.');
			const ids = [...new Set([...acquired.map(item => item.snapshotId), ...schemeEvidenceReferences(scheme).map(ref => String(ref.snapshotId)).filter(id => /^[a-f\d]{24}$/i.test(id))])].slice(0, 12);
			const snapshots = ids.length ? await repository.getSnapshots(ids) : [];
			const newRefs = acquired.flatMap(item => {
				const raw = snapshots.find(snapshot => String(snapshot._id ?? snapshot.id) === item.snapshotId);
				if (!raw) throw new NavigatorError('SOURCE_CHANGED', 'An acquired document is no longer available.');
				const snapshot = { ...raw, id: String(raw._id ?? raw.id) };
				return snapshot.kind === 'json' ? mySchemePolicyEvidence(snapshot, scheme.officialTitle || scheme.title) : [makeEvidence(snapshot, snapshot.text.slice(0, 1000), { field: 'navigator.document' })].filter(Boolean);
			});
			const scoped = { ...scheme, fieldEvidence: [...scheme.fieldEvidence ?? [], ...newRefs] };
			const targets = retrieval ? evidenceTargets(scheme, retrieval).filter(target => !args.focus?.length || args.focus.includes(target.id)) : null;
			const found = findPassages(scoped, snapshots, args.query, { includeContext, queries: retrieval ? [...(args.focus?.length ? [args.query] : []), ...evidenceQueries(scheme, retrieval, targets)] : null, targets, excludeEvidenceIds: args.excludeEvidenceIds });
			for (const passage of found) passages.set(passage.id, { ...passage, ...(acquired.some(item => item.snapshotId === String(passage.evidence.snapshotId)) ? { acquired: true } : {}), revision: revisionOf(scheme) });
			const coverage = retrieval ? assessRetrieval(scheme, retrieval, found) : null;
			return { kind: "passages", schemeId: args.schemeId, passages: found, ...(coverage ? { retrieval: coverage, qualification: qualifyCandidate(scheme, privateProfile, coverage, found) } : {}),
				caveat: "Quotes are checked against stored snapshots. Their applicability and interpretation still require review; missing results do not establish absence of a benefit." };
		}
		if (name === 'retrieveOfficialGuideline') {
			const [scheme] = await loadSchemes([args.schemeId]), key = `${args.schemeId}:${args.role}`;
			if (acquiredSources.has(key)) return { kind: 'acquired_source', schemeId: args.schemeId, status: 'unchanged', snapshotId: acquiredSources.get(key).snapshotId };
			if (acquiredSources.size >= 2) return { kind: 'acquired_source', schemeId: args.schemeId, status: 'unavailable', reason: 'source_limit' };
			if (typeof sourceChecker?.acquire !== 'function' || typeof repository.saveSnapshot !== 'function') return { kind: 'acquired_source', schemeId: args.schemeId, status: 'unavailable', reason: 'not_supported' };
			const expected = safeSourceUrl(scheme.officialLinks?.[args.role === 'guidelines' ? 'guidelinesUrl' : 'detailUrl']);
			const recent = expected && sourceChecker.canAcquire?.(scheme, args.role) && typeof repository.getRecentSnapshot === 'function' ? await repository.getRecentSnapshot(expected, new Date(now().getTime() - 6 * 3600000)) : null;
			const reusable = recent && sourceChecker.canReuse?.(scheme, args.role, recent) && isIntactSnapshot(recent) && Number.isFinite(new Date(recent.fetchedAt).getTime()) && new Date(recent.fetchedAt) <= now();
			const result = reusable ? { status: 'captured', snapshot: recent, cached: true } : await sourceChecker.acquire({ scheme, role: args.role, signal, reserve: reserveSourceCheck });
			if (signal?.aborted) throw new NavigatorError('CANCELLED', 'Official-source acquisition stopped.');
			if (result.status !== 'captured') return { kind: 'acquired_source', schemeId: args.schemeId, status: 'unavailable', reason: result.reason };
			if (!isIntactSnapshot(result.snapshot) || result.snapshot.url !== expected || result.snapshot.text.length > 120000 || !safeSourceUrl(result.snapshot.url)) throw new NavigatorError('INVALID_CITATION', 'The acquired document did not match the registered scheme link.');
			const snapshot = result.cached ? recent : await repository.saveSnapshot(result.snapshot);
			if (signal?.aborted) throw new NavigatorError('CANCELLED', 'Official-source acquisition stopped.');
			const snapshotId = String(snapshot._id ?? snapshot.id);
			if (!/^[a-f\d]{24}$/i.test(snapshotId)) throw new NavigatorError('INVALID_CITATION', 'The capture has no valid snapshot identity.');
			acquiredSources.set(key, { schemeId: args.schemeId, revision: revisionOf(scheme), snapshotId, role: args.role });
			const previousIds = [...new Set(schemeEvidenceReferences(scheme).filter(ref => safeSourceUrl(ref.url) === expected).map(ref => String(ref.snapshotId)))].slice(0, 12);
			for (const previous of previousIds.length ? await repository.getSnapshots(previousIds) : []) {
				if (!previous.sha256 || !result.snapshot.sha256) continue;
				const id = String(previous._id ?? previous.id), same = previous.sha256 === result.snapshot.sha256;
				sourceChecks.set(`${args.schemeId}:${id}`, { schemeId: args.schemeId, revision: revisionOf(scheme), textHash: previous.textHash, sha256: previous.sha256,
					check: { snapshotId: id, url: previous.url, checkedAt: new Date(result.snapshot.fetchedAt).toISOString(), status: same ? 'unchanged' : 'changed', reason: same ? 'same_bytes' : 'different_bytes' } });
			}
			return { kind: 'acquired_source', schemeId: args.schemeId, status: result.cached ? 'cached' : 'captured', snapshotId, changed: !scheme.fieldEvidence?.some(ref => String(ref.snapshotId) === snapshotId), extractionNeedsReview: Boolean(snapshot.quality?.requiresManualReview) };
		}
		if (name === "checkOfficialSource") {
			const [scheme] = await loadSchemes([args.schemeId]), passage = passages.get(args.evidenceId), revision = revisionOf(scheme);
			if (!passage || passage.schemeId !== args.schemeId) throw new NavigatorError("INVALID_CITATION", "Retrieve a source excerpt for this scholarship before checking its source.");
			if (passage.revision !== revision) throw new NavigatorError("SOURCE_CHANGED", "Scholarship information changed. Retrieve its evidence again.");
			const [original] = await repository.getSnapshots([String(passage.evidence.snapshotId)]);
			const snapshot = original && { ...original, id: String(original._id ?? original.id) };
			if (!isIntactSnapshot(snapshot) || !verifyEvidence(passage.evidence, snapshot).ok) throw new NavigatorError("SOURCE_CHANGED", "The stored source changed. Retrieve its evidence again.");
			const key = `${args.schemeId}:${snapshot.id}`, cached = sourceChecks.get(key);
			if (cached && (cached.revision !== revision || cached.textHash !== snapshot.textHash || cached.sha256 !== (snapshot.sha256 ?? null))) throw new NavigatorError("SOURCE_CHANGED", "The source baseline changed. Start a new investigation to check it.");
			if (!cached) {
				const shared = [...sourceChecks.values()].find(record => record.check.snapshotId === snapshot.id);
				if (shared && (shared.textHash !== snapshot.textHash || shared.sha256 !== (snapshot.sha256 ?? null) || shared.check.url !== snapshot.url)) throw new NavigatorError("SOURCE_CHANGED", "The shared source baseline changed. Start a new investigation to check it.");
				if (!shared && typeof sourceChecker?.check !== "function") throw new NavigatorError("SOURCE_CHECK_UNAVAILABLE", "Official-source checking is unavailable in this runtime.");
				const check = shared?.check ?? sourceCheckSchema.parse(await sourceChecker.check({ snapshot, signal, reserve: reserveSourceCheck }));
				if (check.snapshotId !== snapshot.id || check.url !== snapshot.url) throw new NavigatorError("SOURCE_CHANGED", "The source-check result does not match the stored source.");
				sourceChecks.set(key, { schemeId: args.schemeId, revision, textHash: snapshot.textHash, sha256: snapshot.sha256 ?? null, check });
			}
			return { kind: "source_check", schemeId: args.schemeId, check: sourceChecks.get(key).check,
				caveat: "Only the fetched bytes are compared. Content changes need ingestion and review; no new rules, dates or document requirements were adopted." };
		}
		if (name === "evaluateMatches") {
			const schemes = await loadSchemes(args.schemeIds);
			const matches = schemes.map(scheme => {
				const result = evaluateResearchEligibility(privateProfile, scheme);
				const missingFields = [...new Set(result.unknownRules.map(rule => rule.field).filter(field => CLARIFICATION_FIELDS.includes(field) && (privateProfile[field] == null || privateProfile[field] === "")))];
				const summary = { schemeId: idOf(scheme), policyVersion: MATCH_POLICY_VERSION, status: result.status, passedCount: result.passedRules.length, failedCount: result.failedRules.length, unknownCount: result.unknownRules.length, missingFields,
					requiresManualReview: result.unknownRules.some(rule => !missingFields.includes(rule.field)), reasons: ruleReasons(result) };
				evaluations.set(idOf(scheme), { revision: revisionOf(scheme), summary });
				return summary;
			});
			return { kind: "matches", matches, caveat: "Matching covers recorded rules only; it is not an official eligibility or award decision." };
		}
		if (name === "requestClarification") {
			const missing = new Set([...evaluations.values()].flatMap(value => value.summary.missingFields));
			if (args.fields.some(field => !missing.has(field))) throw new NavigatorError("INVALID_CLARIFICATION", "Only missing fields identified by matching may be requested.");
			return { kind: "clarification", fields: args.fields, optional: true, reason: "These missing inputs affect the recorded eligibility checks. Supply them in the separate profile form or skip." };
		}
		if (name === "finishInvestigation") {
			const schemes = args.selections.length ? await loadSchemes(args.selections.map(selection => selection.schemeId)) : [];
			// Matching is deterministic: do not spend another model call asking it to run a prerequisite.
			const unmatched = schemes.map(idOf).filter(id => !evaluations.has(id));
			if (unmatched.length) await execute("evaluateMatches", { schemeIds: unmatched });
			const selectedPassages = args.selections.flatMap(selection => selection.evidenceIds.map(id => passages.get(id))).filter(Boolean);
			const checkedRecords = [...sourceChecks.values()].filter(record => args.selections.some(selection => selection.schemeId === record.schemeId) || selectedPassages.some(passage => String(passage.evidence.snapshotId) === record.check.snapshotId));
			const snapshotIds = [...new Set([...selectedPassages.map(passage => String(passage.evidence.snapshotId)), ...checkedRecords.map(record => record.check.snapshotId)])];
			const sourceSnapshots = [];
			for (let start = 0; start < snapshotIds.length; start += 12) sourceSnapshots.push(...await repository.getSnapshots(snapshotIds.slice(start, start + 12)));
			const sources = new Map(sourceSnapshots.map(snapshot => [String(snapshot._id ?? snapshot.id), { ...snapshot, id: String(snapshot._id ?? snapshot.id) }]));
			const entries = schemes.map((scheme, index) => {
				const selection = args.selections[index], revision = revisionOf(scheme), evaluated = evaluations.get(selection.schemeId);
				if (!evaluated) throw new NavigatorError("MATCH_REQUIRED", "Evaluate each selection before preparing the plan.");
				if (evaluated.revision !== revision) throw new NavigatorError("SOURCE_CHANGED", "Scholarship information changed. Repeat matching and retrieval.");
				const citations = [...new Set(selection.evidenceIds)].map(id => {
					const passage = passages.get(id);
					if (!passage || passage.schemeId !== selection.schemeId) throw new NavigatorError("INVALID_CITATION", "Only excerpts retrieved for the selected scholarship may be cited.");
					if (passage.revision !== revision) throw new NavigatorError("SOURCE_CHANGED", "Scholarship information changed. Retrieve its evidence again.");
					const snapshot = sources.get(String(passage.evidence.snapshotId));
					if (!isIntactSnapshot(snapshot) || !verifyEvidence(passage.evidence, snapshot).ok) throw new NavigatorError("SOURCE_CHANGED", "A cited snapshot changed or is unavailable. Retrieve the evidence again.");
					const { revision: ignored, ...citation } = passage;
					const jsonEdges = citation.scope === 'scheme_json_policy' && citation.sourceEncoding === 'json'
						? validatedJsonPolicyEdges(scheme, snapshot, citation.evidence) : null;
					return { ...citation, sourceEdges: jsonEdges ?? sourceSpanEdges(snapshot.text, citation.evidence.charStart, citation.evidence.charEnd) };
				});
				const relevantChecks = checkedRecords.filter(record => record.schemeId === selection.schemeId || citations.some(citation => String(citation.evidence.snapshotId) === record.check.snapshotId));
				const checks = [...new Map(relevantChecks.map(record => [record.check.snapshotId, record])).values()].map(record => {
					const snapshot = sources.get(record.check.snapshotId);
					if ((record.schemeId === selection.schemeId && record.revision !== revision) || !isIntactSnapshot(snapshot) || record.textHash !== snapshot.textHash || record.sha256 !== (snapshot.sha256 ?? null) || record.check.url !== snapshot.url) throw new NavigatorError("SOURCE_CHANGED", "The source-check baseline changed. Start a new investigation.");
					return record.check;
				});
				const card = schemeCard(scheme, now());
				if (checks.some(check => check.status === "changed")) Object.assign(card, { status: "unknown", stale: true, statusReason: "An official source returned different content. Recorded conditions and dates need ingestion and review before relying on them." });
				const coverage = retrieval ? assessRetrieval(scheme, retrieval, citations) : null;
				if (coverage?.status === 'mismatch') throw new NavigatorError('SOURCE_CHANGED', 'Recorded metadata now contradicts the request. Retrieve the catalogue again.');
				return { ...card, ...(retrieval?.targets?.length ? { targetIds: targetIds(scheme, retrieval) } : {}), matching: evaluated.summary, citations, sourceChecks: checks, ...(coverage ? { retrieval: coverage } : {}), qualification: qualifyCandidate(scheme, privateProfile, coverage, citations),
					nextSteps: ["Review the cited official instructions and any unresolved conditions.", "Prepare documents explicitly required by the current provider instructions.", "Confirm the current application window on the official portal before applying."],
					sourceRevision: revision };
			});
			return { kind: "plan", generatedAt: now().toISOString(), entries, outcome: entries.some(entry => entry.qualification.status !== "excluded") ? "review_required" : "insufficient_evidence",
				caveat: "This is a research shortlist, not an eligibility certificate, application submission or award guarantee. No profile, bookmark or notification was changed." };
		}
	}
	return { execute: async (...args) => structuredClone(await execute(...args)),
		exportState: () => structuredClone({ version: 1, evaluations: [...evaluations], passages: [...passages], sourceChecks: [...sourceChecks], ...(acquiredSources.size ? { acquiredSources: [...acquiredSources] } : {}) }) };
}
