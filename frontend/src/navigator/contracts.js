export const FIELDS = {
	educationLevel: { label: "Education level", options: ["Class 10", "Class 12", "Diploma", "UG", "PG", "PhD"] },
	state: { label: "Domicile state" }, familyIncome: { label: "Annual family income (₹)", max: Number.MAX_SAFE_INTEGER },
	percentage: { label: "Previous result (%)", max: 100 }, cgpa: { label: "CGPA", max: 10 },
	stream: { label: "Course / stream" }, gender: { label: "Gender", options: ["Male", "Female", "Other"] },
	casteCategory: { label: "Category", options: ["General", "SC", "ST", "OBC", "EWS"] },
	hasDisability: { label: "Disability status", options: [["true", "Yes"], ["false", "No"]] },
};
export const PROMPTS = [
	{ label: "Help with hostel costs", goal: "Find scholarships that could help with tuition and hostel costs." },
	{ label: "Understand the fine print", goal: "Help me find scholarship guidelines and the conditions I should check." },
	{ label: "Build an application plan", goal: "Help me make a scholarship shortlist and work out what to prepare next." },
];
export const validRunId = id => typeof id === "string" && /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(id);
export function researchQuotaNotice(run) {
	if (run?.status !== "quota_exhausted") return null;
	if (run.error?.code === "QUOTA_EXHAUSTED") return {
		label: "Today’s research allowance is used up",
		message: "Udaan’s shared daily research allowance has been used. Your progress is saved. Starting another question does not reset this allowance.",
	};
	if (run.error?.code === "PROVIDER_QUOTA") return {
		label: "Research needs a short pause",
		message: "The AI service has temporarily reached its allowance. Your progress is saved. Continue after the time shown, or use the sources already collected.",
	};
	return null;
}
export function researchRetryTime(value) {
	return typeof value === "string" && Number.isFinite(Date.parse(value))
		? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata", timeZoneName: "short" }).format(new Date(value)) : null;
}
const integer = value => Number.isSafeInteger(value) && value >= 0;
const string = (value, max = 3000) => typeof value === "string" && value.length <= max;
const date = value => typeof value === "string" && Number.isFinite(Date.parse(value));
const nullableString = value => value == null || string(value);
const invalid = () => { throw new Error("The server returned an unsupported research result. Refresh to recover saved progress."); };
const validRetrieval = value => value && ['match', 'mismatch', 'unknown'].includes(value.status)
	&& Array.isArray(value.conditions) && value.conditions.length <= 19 && value.conditions.every(item => /^(c\d|c1[01]|q[0-5]|t0)$/.test(item.id)
		&& string(item.label, 1000) && (item.explanation == null || string(item.explanation, 2400)) && ['metadata', 'ranking', 'evidence', 'rules'].includes(item.stage) && ['match', 'mismatch', 'unknown'].includes(item.status)
		&& ['recorded_metadata', 'metadata_missing_or_conflicting', 'requires_evidence_review', 'recorded_rules'].includes(item.reason)
		&& Array.isArray(item.evidenceIds) && item.evidenceIds.length <= 4 && item.evidenceIds.every(id => /^ev_[a-f\d]{40}$/.test(id))
		&& (item.ruleRequirements == null || (Array.isArray(item.ruleRequirements) && item.ruleRequirements.length <= 3 && item.ruleRequirements.every(text => string(text, 1000))))
		&& (item.status === 'unknown' || ((item.stage === 'metadata' && item.reason === 'recorded_metadata') || (item.stage === 'rules' && item.reason === 'recorded_rules'))))
	&& new Set(value.conditions.map(item => item.id)).size === value.conditions.length
	&& value.status === (value.conditions.some(item => item.status === 'mismatch') ? 'mismatch' : !value.conditions.length || value.conditions.some(item => item.status === 'unknown') ? 'unknown' : 'match');
export const providerLabel = provider => ({ groq: 'Groq', gemini: 'Google Gemini' })[provider] ?? 'the configured AI service';
export const retrievalLabel = status => ({ match: 'Requested conditions match our records', mismatch: 'Does not fit your request', unknown: 'Important details still need checking' })[status];
export const qualificationLabel = status => ({ supported: 'Promising candidate', needs_verification: 'Needs verification', excluded: 'Not suitable for this request' })[status];
export const candidateStatus = entry => entry.matching?.status === 'failed' ? 'excluded' : entry.qualification?.status ?? 'needs_verification';
const validQualification = value => value && ['supported', 'needs_verification', 'excluded'].includes(value.status)
    && ['supported', 'unresolved', 'reasons'].every(key => Array.isArray(value[key]) && value[key].length <= 32 && value[key].every(text => string(text, 3000)))
    && (value.status !== 'excluded' || value.reasons.length > 0)
    && (value.status !== 'supported' || (!value.unresolved.length && !value.reasons.length));
export function safeSourceUrl(value) {
	try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}

const SOURCE_REASONS = {
	same_bytes: "Source bytes unchanged. Current applicability still needs review.",
	different_bytes: "Source content changed. Recorded conditions and dates need review.",
	unregistered_source: "Not checked: this snapshot has no enabled, registered official source.",
	unsupported_snapshot: "Not checked: this capture cannot be compared with a static download.",
	blocked: "Could not check: source access or redirect was blocked.",
	timeout: "Could not check: the source exceeded the time limit.",
	fetch_failed: "Could not check: the source did not return a comparable document.",
};
export const sourceCheckText = check => check ? SOURCE_REASONS[check.reason] : "Not performed by this investigation";
const validSourceCheck = check => check && /^[a-f\d]{24}$/i.test(check.snapshotId) && safeSourceUrl(check.url) && date(check.checkedAt)
	&& Object.hasOwn(SOURCE_REASONS, check.reason) && check.status === (check.reason === "same_bytes" ? "unchanged" : check.reason === "different_bytes" ? "changed" : "unavailable");

/** Blank is unknown; zero and false are deliberately retained. No implicit saved-profile access. */
export function selectedProfile(values, fields = Object.keys(FIELDS)) {
	const result = {};
	for (const key of fields) {
		if (!Object.hasOwn(FIELDS, key)) continue;
		const value = values[key];
		if (value == null || String(value).trim() === "") continue;
		if (FIELDS[key].max !== undefined) {
			const number = Number(value);
			if (!Number.isFinite(number) || number < 0 || number > FIELDS[key].max) throw new Error(`Review ${FIELDS[key].label.toLowerCase()}.`);
			result[key] = number;
		} else if (key === "hasDisability") {
			if (![true, false, "true", "false"].includes(value)) throw new Error("Review disability status.");
			result[key] = value === true || value === "true";
		} else {
			if (!string(value, 200)) throw new Error(`Review ${FIELDS[key].label.toLowerCase()}.`);
			result[key] = value.trim();
		}
	}
	return result;
}

/** Validate bounded responses before rendering. Unknown server fields never become profile state. */
export function parseRun(value) {
	const r = value;
	if (r?.provider != null && (!['groq', 'gemini'].includes(r.provider) || !string(r.model, 150) || !/^[a-zA-Z\d][a-zA-Z\d._/-]{0,149}$/.test(r.model))) invalid();
	if (!r || !validRunId(r.runId) || !integer(r.revision) || !["ready", "running", "awaiting_input", "completed", "cancelled", "partial", "interrupted", "quota_exhausted"].includes(r.status)
		|| !date(r.createdAt) || !date(r.expiresAt) || !string(r.goal, 1000) || !integer(r.limits?.maxModelCalls) || !integer(r.limits?.maxToolCalls)
		|| !["modelCalls", "toolCalls", "inputTokens", "outputTokens", "reportedModelCalls"].every(key => integer(r.usage?.[key])) || typeof r.usage.tokenUsageIncomplete !== "boolean"
		|| !Array.isArray(r.events) || r.events.length > 100 || r.events.some(e => !integer(e.sequence) || !["model_started", "model_completed", "model_failed", "tool_started", "tool_completed", "tool_failed"].includes(e.type) || (e.tool != null && !string(e.tool, 80)) || (e.resultCount != null && !integer(e.resultCount)))) invalid();
	if (r.collectedPassageCount != null && (!integer(r.collectedPassageCount) || r.collectedPassageCount > 48)) invalid();
	if (r.workflow != null && !["legacy", "catalogue_v1", 'adaptive_v2'].includes(r.workflow)) invalid();
	if (r.catalogueNoAI != null && typeof r.catalogueNoAI !== "boolean") invalid();
	if (r.clarification != null && (r.clarification.kind !== "clarification" || !Array.isArray(r.clarification.fields) || !r.clarification.fields.length || r.clarification.fields.length > 3 || r.clarification.fields.some(field => !Object.hasOwn(FIELDS, field)))) invalid();
	if (r.error != null && (!string(r.error.code, 80) || !string(r.error.message) || (r.error.retryAt != null && !date(r.error.retryAt)))) invalid();
	if (r.plan != null) {
		const p = r.plan;
		if (Array.isArray(p.research?.gaps) && p.research.gaps.some(gap => gap.missingFields != null && (!Array.isArray(gap.missingFields) || gap.missingFields.length > 9 || gap.missingFields.some(field => !Object.hasOwn(FIELDS, field))))) invalid();
		if (p.research != null && (p.research.version !== 1 || !['source_coverage_gap', 'available_actions_exhausted', 'budget_exhausted', 'model_stopped'].includes(p.research.stopReason)
			|| !integer(p.research.decisions) || p.research.decisions > 2 || !Array.isArray(p.research.actions) || p.research.actions.length > 12 || p.research.actions.some(action => !string(action.tool, 80) || !string(action.status, 50) || (action.schemeId != null && !/^[a-f\d]{24}$/.test(action.schemeId)) || (action.resultCount != null && (!integer(action.resultCount) || action.resultCount > 4)))
			|| !Array.isArray(p.research.gaps) || p.research.gaps.length > 8 || p.research.gaps.some(gap => (gap.schemeId != null && !/^[a-f\d]{24}$/.test(gap.schemeId)) || !string(gap.title) || !string(gap.message) || typeof gap.attemptedOfficialSource !== 'boolean' || !['missing_source', 'incomplete_source', 'outdated_source', 'interpretation_needed', 'uncertain_identity', 'conflicting_source', 'unreliable_extraction', 'unexamined', 'catalogue_coverage', 'missing_student'].includes(gap.kind) || !Array.isArray(gap.requirementIds) || gap.requirementIds.length > 19 || gap.requirementIds.some(id => !/^(?:c\d|c1[01]|q[0-5]|t0)$/.test(id))))) invalid();
		if (p.providedFields != null && (!Array.isArray(p.providedFields) || p.providedFields.length > 12 || p.providedFields.some(field => !Object.hasOwn(FIELDS, field)))) invalid();
		if (p.targets != null && (!Array.isArray(p.targets) || p.targets.length > 12 || new Set(p.targets.map(target => target.id)).size !== p.targets.length || p.targets.some(target => !/^s(?:\d|1[01])$/.test(target.id) || !string(target.name, 200) || !target.name.trim() || !['not_found', 'excluded', 'reviewed', 'needs_evidence'].includes(target.status) || ['candidateIds', 'excludedIds'].some(key => !Array.isArray(target[key]) || target[key].length > 8 || target[key].some(id => !/^[a-f\d]{24}$/.test(id)))))) invalid();
		if (p.answer?.diagnostics?.some(d => d.fields != null && (!Array.isArray(d.fields) || d.fields.length > 9 || d.fields.some(field => !['schemeId', 'requirementId', 'status', 'explanation', 'evidence', 'evidenceId', 'quote', 'relation', 'dependsOn'].includes(field))))) invalid();
		if (p.answer?.inputCharacters != null && (!integer(p.answer.inputCharacters) || p.answer.inputCharacters > 32000)) invalid();
		if (p.answer != null && (![1, 2].includes(p.answer.version) || !['answered', 'partial'].includes(p.answer.status) || !nullableString(p.answer.reason) || !string(p.answer.message) || !/^[a-f\d]{64}$/.test(p.answer.fingerprint) || !integer(p.answer.assessedConditions) || p.answer.assessedConditions > 30 || (p.answer.cacheHit != null && typeof p.answer.cacheHit !== 'boolean'))) invalid();
		if (p.answer?.version === 2 && (!integer(p.answer.acceptedAssessments) || !integer(p.answer.rejectedAssessments) || p.answer.acceptedAssessments + p.answer.rejectedAssessments > 30 || typeof p.answer.recoverable !== 'boolean' || !Array.isArray(p.answer.diagnostics) || p.answer.diagnostics.length > 60 || p.answer.diagnostics.some(d => !/^[A-Z_]{3,60}$/.test(d.code) || (d.index != null && (!integer(d.index) || d.index > 29)) || (d.schemeId != null && !/^[a-f\d]{24}$/.test(d.schemeId)) || (d.requirementId != null && !/^(?:c\d|c1[01]|q[0-5]|t0)$/.test(d.requirementId))))) invalid();
		if (p.preparation != null && !["collected_evidence", "catalogue"].includes(p.preparation)) invalid();
		if (p.aiAssistance != null && !["search_planning", "unavailable", "not_requested"].includes(p.aiAssistance)) invalid();
		if (p.intent != null && (!["interpreted", "unavailable", "needs_clarification"].includes(p.intent.status) || !nullableString(p.intent.reason)
			|| ["constraints", "questions", "unresolved", "ambiguities"].some(key => !Array.isArray(p.intent[key]) || p.intent[key].length > 12 || p.intent[key].some(item => !string(item, 1000))))) invalid();
		if (p.intent?.requirements != null && (!Array.isArray(p.intent.requirements) || p.intent.requirements.length > 19 || p.intent.requirements.some(item => !string(item.id, 4) || !string(item.label, 1000) || !['metadata', 'ranking', 'evidence', 'rules'].includes(item.stage)))) invalid();
		if (p.coverage != null) {
			if (['reviewed', 'excluded', 'deferred'].some(key => !Array.isArray(p.coverage[key]) || p.coverage[key].length > 8 || p.coverage[key].some(item => !/^[a-f\d]{24}$/.test(item.schemeId) || !string(item.title)))) invalid();
			if ([...p.coverage.reviewed, ...p.coverage.excluded].some(entry => entry.region != null && !string(entry.region, 200))) invalid();
			if ([...p.coverage.reviewed, ...p.coverage.excluded].some(item => !validRetrieval(item) || typeof item.examined !== 'boolean') || p.coverage.excluded.some(item => item.status !== 'mismatch' && item.qualification?.status !== 'excluded')) invalid();
		}
		if (p.coverage && [...p.coverage.reviewed, ...p.coverage.excluded].some(item => item.qualification != null && !validQualification(item.qualification))) invalid();
		if (p.kind !== "plan" || !date(p.generatedAt) || !string(p.caveat) || !["review_required", "insufficient_evidence"].includes(p.outcome) || !Array.isArray(p.entries) || p.entries.length > 5) invalid();
		if (p.answer?.version === 2 && p.answer.status === 'answered'
			&& (!p.entries.length || p.answer.diagnostics.length || p.answer.rejectedAssessments
				|| p.entries.some(e => e.answer?.conditions?.some(c => c.status === 'unknown')))) invalid();
		for (const e of p.entries) {
			if (e.region != null && !string(e.region, 200)) invalid();
			if (e.targetIds != null && (!Array.isArray(e.targetIds) || e.targetIds.length > 12 || e.targetIds.some(id => !p.targets?.some(target => target.id === id && target.candidateIds.includes(e.schemeId))))) invalid();
			if (e.answer?.fundingRelevance != null && !['supported', 'contradicted', 'unknown'].includes(e.answer.fundingRelevance)) invalid();
			if (e.answer?.conditions?.some(c => (c.validationCode != null && !/^[A-Z_]{3,60}$/.test(c.validationCode)) || (c.dependsOn != null && (!Array.isArray(c.dependsOn) || c.dependsOn.length > 19 || c.dependsOn.some(id => !e.retrieval?.conditions.some(r => r.id === id)))) || c.evidence?.some(proof => proof.span != null && (!integer(proof.span.charStart) || !integer(proof.span.charEnd) || !e.citations?.some(citation => citation.id === proof.evidenceId && proof.span.charStart >= citation.evidence.charStart && proof.span.charEnd <= citation.evidence.charEnd && citation.evidence.quote.slice(proof.span.charStart - citation.evidence.charStart, proof.span.charEnd - citation.evidence.charStart) === proof.quote))))) invalid();
			if (e.answer != null && (!p.answer || typeof e.answer.concern !== 'boolean' || !string(e.answer.limitation) || !Array.isArray(e.answer.conditions) || e.answer.conditions.length > 19 || new Set(e.answer.conditions.map(c => c.requirementId)).size !== e.answer.conditions.length || e.answer.conditions.some(c =>
				!e.retrieval?.conditions.some(r => r.id === c.requirementId) || !string(c.label, 1000) || !['supported', 'contradicted', 'unknown'].includes(c.status) || !['recorded_check', 'source_interpretation', 'unresolved'].includes(c.basis) || !string(c.explanation, 1000)
				|| !Array.isArray(c.evidence) || c.evidence.length > 3 || c.evidence.some(proof => !['supports', 'contradicts'].includes(proof.relation) || !string(proof.quote, 1400) || !proof.quote.trim() || !e.citations?.some(citation => citation.id === proof.evidenceId && citation.evidence.quote.includes(proof.quote)))
				|| (c.basis === 'source_interpretation' && c.status !== 'unknown' && !c.evidence.length)))) invalid();
			if (e.qualification != null && (!validQualification(e.qualification) || (e.matching?.status === 'failed' && e.qualification.status !== 'excluded') || (e.qualification.status === 'supported' && (e.matching?.status !== 'passed' || e.retrieval?.status !== 'match')))) invalid();
			if (e.retrieval != null && (!validRetrieval(e.retrieval) || e.retrieval.status === 'mismatch' || e.retrieval.conditions.some(item => item.evidenceIds.some(id => !e.citations?.some(c => c.id === id))))) invalid();
			if (!/^[a-f\d]{24}$/.test(e.schemeId) || !string(e.title) || !nullableString(e.organization) || !nullableString(e.academicYear)
				|| !["open", "closing_soon", "upcoming", "closed", "unknown"].includes(e.status) || !string(e.statusReason) || typeof e.stale !== "boolean"
				|| (e.deadline != null && !date(e.deadline)) || (e.lastVerifiedAt != null && !date(e.lastVerifiedAt))
				|| !["passed", "failed", "unknown"].includes(e.matching?.status) || !["passedCount", "failedCount", "unknownCount"].every(key => integer(e.matching[key]))
				|| !Array.isArray(e.matching.missingFields) || e.matching.missingFields.some(f => !Object.hasOwn(FIELDS, f))
				|| !Array.isArray(e.nextSteps) || e.nextSteps.length > 10 || e.nextSteps.some(step => !string(step))
				|| !Array.isArray(e.citations) || !e.citations.length || e.citations.length > 5) invalid();
			if (e.sourceChecks != null && (!Array.isArray(e.sourceChecks) || e.sourceChecks.length > 12 || e.sourceChecks.some(check => !validSourceCheck(check)) || new Set(e.sourceChecks.map(check => check.snapshotId)).size !== e.sourceChecks.length)) invalid();
			for (const c of e.citations) {
				if (c.relevance != null && !["query_match", "scheme_context"].includes(c.relevance)) invalid();
				if (!/^ev_[a-f\d]{40}$/.test(c.id) || c.schemeId !== e.schemeId || !string(c.evidence?.quote, 2000) || !safeSourceUrl(c.evidence.url)
					|| !integer(c.evidence.charStart) || !integer(c.evidence.charEnd) || c.evidence.charEnd <= c.evidence.charStart
					|| (c.evidence.page != null && (!integer(c.evidence.page) || c.evidence.page < 1))) invalid();
			}
		}
	}
	if (r.status === "completed" && !r.plan) invalid();
	if (r.status === "awaiting_input" && !r.clarification) invalid();
	return { runId: r.runId, revision: r.revision, goal: r.goal, status: r.status, createdAt: r.createdAt, expiresAt: r.expiresAt,
		...(r.provider ? { provider: r.provider, model: r.model } : {}),
		limits: r.limits, usage: r.usage, events: r.events, clarification: r.clarification, plan: r.plan, error: r.error,
		collectedPassageCount: r.collectedPassageCount ?? 0, workflow: r.workflow ?? "legacy", catalogueNoAI: r.catalogueNoAI ?? false };
}

export function planText(run) {
	return ["UDAAN NAVIGATOR — RESEARCH NOTES", `Question: ${run.goal}`, `Prepared: ${run.plan.generatedAt}`, run.plan.caveat,
		...(run.plan.answer ? [run.plan.answer.message] : []),
		...(run.plan.preparation === "collected_evidence" ? ["Preparation: collected evidence and deterministic rule checks; no further AI call. AI investigation did not finish."] : []),
		...(run.plan.preparation === "catalogue" ? [`Preparation: catalogue search, stored source retrieval and recorded rule checks. AI search planning: ${run.plan.aiAssistance === "search_planning" ? "used" : "not used"}.`] : []),
		"Coverage: Udaan's stored catalogue and source snapshots. Check current official instructions.",
		...(run.plan.research ? ['Research findings and remaining gaps', ...run.plan.research.gaps.map(gap => `${gap.title}: ${gap.message}`), ...(run.plan.research.stopReason === 'budget_exhausted' ? ['The research allowance was reached; some conditions remain unexamined.'] : [])] : []),
		...(run.plan.intent ? [`Request interpretation: ${run.plan.intent.status}${run.plan.intent.reason ? ` (${run.plan.intent.reason})` : ""}.`,
			...(run.plan.intent.requirements ?? []).map(item => `Requested: ${item.label}`),
			...(run.plan.intent.requirements?.length ? [] : run.plan.intent.constraints.map(text => `Requested condition: ${text}`)), ...run.plan.intent.questions.map(text => `Research question: ${text}`),
			...(run.plan.intent.requirements?.length ? [] : run.plan.intent.unresolved.map(text => `Condition not resolved by catalogue filters: ${text}`)), ...run.plan.intent.ambiguities.map(text => `Clarification needed: ${text}`)] : []),
		...(run.plan.targets ?? []).map(target => `Requested scheme: ${target.name}; ${target.status === 'reviewed' ? 'investigated; full eligibility not confirmed' : target.status === 'not_found' ? 'not located in the saved catalogue' : target.status === 'excluded' ? 'recorded restriction found; see the specific scheme/version below' : 'further evidence needed'}`),
		...(run.plan.coverage ? ["These checks use recorded conditions. Related excerpts alone do not confirm eligibility.",
			...[...run.plan.coverage.reviewed, ...run.plan.coverage.excluded].flatMap(item => [`${item.title}: ${item.qualification?.status === "excluded" ? qualificationLabel("excluded") : retrievalLabel(item.status)}; ${item.examined ? 'excerpts examined' : 'excerpts not examined'}`,
				...(item.qualification?.reasons ?? []).map(reason => `Not suitable: ${reason}`), ...item.conditions.map(condition => `- ${condition.label}: ${condition.status}${condition.evidenceIds.length ? '; related excerpts located, applicability unverified' : ''}`)]),
			...run.plan.coverage.deferred.map(item => `Not examined within this run's allowance: ${item.title}`)] : []),
		...run.plan.entries.flatMap(entry => ["", entry.title, qualificationLabel(candidateStatus(entry)), ...(entry.qualification?.supported ?? []).map(text => `Supported by records: ${text}`), ...(entry.qualification?.unresolved ?? []).map(text => `Still to check: ${text}`), ...(entry.qualification?.reasons ?? []).map(text => `Not suitable: ${text}`), `Recorded cycle: ${entry.academicYear ?? "Unknown"}`, `Recorded deadline: ${entry.deadline ?? "Unknown"}`,
			`Recorded rule check: ${entry.matching.status}; official eligibility not confirmed.`, entry.statusReason,
			...(entry.answer ? [entry.answer.limitation, ...entry.answer.conditions.flatMap(c => [`${c.label}: ${c.status} (${c.basis}). ${c.explanation}`, ...c.evidence.map(proof => `Quote: ${proof.quote}\nSource: ${entry.citations.find(c => c.id === proof.evidenceId).evidence.url}`)])] : []),
			...(entry.sourceChecks?.length ? entry.sourceChecks.map(check => `Official source check (${check.checkedAt}): ${sourceCheckText(check)} Source: ${check.url}`) : ["Official source check: Not performed by this investigation."]),
			...entry.citations.map(c => `Source: ${c.evidence.url}${c.evidence.page ? ` (page ${c.evidence.page})` : ""}\nQuote: ${c.evidence.quote}`),
			...entry.nextSteps.map(step => `- ${step}`)]), ...(run.plan.entries.length ? [] : ["No sufficiently supported shortlist could be prepared."]),
		...(run.plan.answer?.reason ? ['', 'Technical validation details', run.plan.answer.reason, ...(run.plan.answer.diagnostics ?? []).map(d => `${d.code}${d.requirementId ? ` (${d.requirementId})` : ''}`)] : [])].join("\n");
}
