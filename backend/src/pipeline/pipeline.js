import crypto from "crypto";
import { ruleTreeSchema } from "../engine/ruleSchema.js";
import { prepareEligibilityVersion } from "./core/eligibilityVersions.js";
import { SafeFetcher, FetchError } from "./core/http.js";
import { fetchRendered } from "./core/dynamic.js";
import { toDocument, assessTextQuality } from "./core/documents.js";
import { createGazetteClient } from "./core/gazetteClient.js";
import { enrichSourceLinks } from "./core/sourceLinks.js";
import { dedupeCandidates } from "./core/dedupe.js";
import { assembleRecord, selectCurrentCycle } from "./core/assemble.js";
import {
	classifyFieldDeltas,
	classifySemanticChange,
	cycleDataHash,
	diffCycle,
	mergeRecordFields,
	recordDataHash,
	publicPolicyVersion,
} from "./core/changes.js";
import { computeStatus, sortDeadline } from "./core/status.js";
import { slugify } from "./core/dedupe.js";
import { issueKey } from "./store/memoryStore.js";
import { rootLogger } from "./core/logger.js";
import { ADAPTERS } from "./sources.js";

/**
 * Pipeline:
 *   Source Registry → Discovery → Fetch → Extract → Normalize → Validate →
 *   Deduplicate → Verify → Change Detect → Upsert → Freshness/Expiry
 *
 * Failure policy: any failure before the upsert stage aborts the source run
 * without touching stored scholarships. Stored data is only ever replaced by
 * newer *cited* values; it is never deleted by a crawl.
 */

const MIN_TEXT_CHARS = { html: 400, pdf: 200, json: 2, text: 100 };
const GUIDELINE_FIELDS = new Set(["amount", "eligibility.familyIncome", "eligibility.minDisabilityPercent"]);

function stripSnapshotText(snapshot) {
	const { text, pages, html, ...meta } = snapshot;
	return meta;
}

function docFromSnapshot(snapshot, artifact = null) {
	return {
		url: snapshot.url,
		finalUrl: snapshot.finalUrl,
		kind: snapshot.kind,
		text: snapshot.text,
		pages: snapshot.pages,
		json: snapshot.kind === "json" ? JSON.parse(snapshot.text) : null,
		textHash: snapshot.textHash,
		quality: { ...(snapshot.quality || assessTextQuality(snapshot.text)), ...(artifact ? { requiresManualReview: artifact.data.requires_review } : {}) },
		documentDate: snapshot.documentDate,
		html: snapshot.html || null,
		documentIntelligence: artifact?.data || null,
		extractionMethod: artifact?.extractionMethod || snapshot.extractionMethod || null,
	};
}

export function createDefaultFetcher(source, overrides = {}) {
	return new SafeFetcher({
		allowedDomains: source.allowedDomains,
		minIntervalMs: source.rateLimit?.minIntervalMs,
		...source.http,
		...overrides,
	});
}

export class Pipeline {
	/**
	 * @param {object} opts
	 * @param {object} opts.store            store implementing the contract in store/memoryStore.js
	 * @param {Function} [opts.fetcherFactory] (source) => SafeFetcher
	 * @param {Function} [opts.now]          clock (for tests)
	 * @param {Function} [opts.onDataChange] async ({ record, changeType, summary, deltas, isNew })
	 */
	constructor({ store, fetcherFactory = createDefaultFetcher, renderer = fetchRendered, gazetteClient = createGazetteClient(), now = () => new Date(), onDataChange = null, logger } = {}) {
		this.store = store;
		this.fetcherFactory = fetcherFactory;
		this.renderer = renderer;
		this.gazetteClient = gazetteClient;
		this.now = now;
		this.onDataChange = onDataChange;
		this.logger = logger || rootLogger;
	}

	async fetchDocument(source, entry, fetcher, run) {
		const previous = await this.store.getLatestSnapshot(entry.url);
		const started = Date.now();
		const page = { url: entry.url, role: entry.role, adapter: entry.adapter };
		run.pages.push(page);
		const onDocumentIssue = async issue => {
			const full = { ...issue, details: { ...issue.details, url: entry.url, label: entry.url } };
			(page.documentIssues ||= []).push(full);
			await this.store.upsertIssue({ ...full, sourceId: source.id, seenAt: this.now(), runId: run.runId });
			this.logger.warn("PDF extraction issue", { sourceId: source.id, code: issue.code, reason: issue.details?.reason, url: entry.url });
		};
		const parseDocument = result => toDocument(result, { gazetteClient: this.gazetteClient, ocrLanguages: entry.gazette?.ocrLanguages || source.gazette?.ocrLanguages, onIssue: onDocumentIssue });
		try {
			const strategy = entry.strategy || source.strategy || "static";
			if (!["static", "auto", "dynamic"].includes(strategy)) throw new FetchError("SOURCE_CONFIG", `Unknown strategy: ${strategy}`);
			const render = () => this.renderer(entry.url, {
				allowedDomains: source.allowedDomains, fetcher,
				...source.rendering, ...entry.rendering, waitForSelector: entry.waitForSelector || entry.rendering?.waitForSelector || source.rendering?.waitForSelector,
			});
			const dynamic = strategy === "dynamic" && fetcher.allowRendering !== false;
			// An HTTP 304 only covers the HTML shell, not data populated by JavaScript.
			const conditional = previous && previous.fetchMethod !== "dynamic" && !previous.contentType?.includes("rendered");
			let result;
			try {
				result = dynamic ? await render() : await fetcher.fetch(entry.url, {
						etag: conditional ? previous.etag : undefined,
						lastModified: conditional ? previous.lastModified : undefined,
					});
			} catch (error) {
				// Opt in only for a transport failure. HTTP refusals and robots rules
				// remain failures; Chromium still validates TLS normally.
				if (strategy !== "auto" || !source.allowNetworkRendering || fetcher.allowRendering === false || !["NETWORK", "TIMEOUT"].includes(error.code)) throw error;
				page.fallbackReason = "network_transport_failed";
				page.transportError = { code: error.code };
				result = await render();
			}
			const previousArtifact = result.notModified && previous?.kind === "pdf" ? await this.store.getLatestDocumentExtraction(entry.url, previous.textHash) : null;
			let doc = result.notModified && previous ? docFromSnapshot(previous, previousArtifact) : await parseDocument(result);
			let fallbackReason = null;
			if (doc.kind === "html") {
				if (doc.text.length < MIN_TEXT_CHARS.html) fallbackReason = "thin_content";
				else if (entry.role === "listing" || entry.role === "announcements") {
					const adapter = ADAPTERS[entry.adapter];
					if (!adapter) throw new FetchError("SOURCE_CONFIG", `Unknown adapter: ${entry.adapter}`);
					const preview = adapter.extract(doc, { ...doc, id: "preview", sourceId: source.id, fetchedAt: result.fetchedAt }, { source, entry });
					fallbackReason = preview.issues?.find((issue) => issue.severity === "blocking" &&
						["page_structure_changed", "too_few_schemes", "academic_year_not_stated"].includes(issue.code))?.code || null;
				}
			}
			if (strategy === "auto" && fallbackReason && result.fetchMethod !== "dynamic" && fetcher.allowRendering !== false && !result.capturedSourceType) {
				page.fallbackReason = fallbackReason;
				result = await render();
				doc = await parseDocument(result);
			}
			page.fetchMethod = result.fetchMethod || (dynamic ? "dynamic" : "static");
			page.httpStatus = result.status;
			page.attempts = result.attempts;
			page.durationMs = Date.now() - started;

			if (result.notModified && previous) {
				await this.store.touchSnapshot(previous.id, result.fetchedAt);
				page.pageChanged = false;
				page.notModified = true;
				page.documentExtractionId = previousArtifact?.id || previous.documentExtractionId;
				return { doc, snapshot: { ...previous, fetchedAt: result.fetchedAt } };
			}

			// A degraded parser must not silently clear a previously known layout/OCR safeguard.
			if (doc.extractionMethod === "baseline" && previous) {
				const knownArtifact = await this.store.getLatestDocumentExtraction(entry.url, previous.textHash);
				if (previous.quality?.requiresManualReview || knownArtifact?.data?.requires_review) doc.quality.requiresManualReview = true;
			}
			let artifact = null;
			if (doc.documentIntelligence) {
				const payload = JSON.stringify(doc.documentIntelligence);
				artifact = await this.store.saveDocumentExtraction({ key: crypto.createHash("sha256").update(`${entry.url}\n${payload}`).digest("hex"), sourceId: source.id, url: entry.url,
					sourceSha256: doc.documentIntelligence.source_sha256, canonicalTextHash: doc.textHash, extractionMethod: doc.extractionMethod, data: doc.documentIntelligence, seenAt: result.fetchedAt });
				page.documentExtractionId = artifact.id;
			}
			page.extractionMethod = doc.extractionMethod;
			if (doc.text.length < (MIN_TEXT_CHARS[doc.kind] ?? 100)) {
				throw new FetchError("THIN_CONTENT", `Only ${doc.text.length} characters of text; page may require rendering or be broken`);
			}
			const snapshot = await this.store.saveSnapshot({
				sourceId: source.id,
				url: entry.url,
				finalUrl: result.finalUrl,
				fetchedAt: result.fetchedAt,
				httpStatus: result.status,
				contentType: result.contentType,
				fetchMethod: page.fetchMethod,
				// Public HTML is required to replay structural HTML adapters on a 304.
				html: (ADAPTERS[entry.adapter]?.needsHtml || entry.adapter.startsWith("mahadbt")) ? doc.html : undefined,
				capturedSourceType: result.capturedSourceType || null,
				kind: doc.kind,
				sha256: result.sha256,
				textHash: doc.textHash,
				byteLength: result.byteLength,
				etag: result.etag || null,
				lastModified: result.lastModified || null,
				text: doc.text,
				pages: doc.pages,
				quality: doc.quality,
				documentExtractionId: artifact?.id,
				extractionMethod: doc.extractionMethod,
				documentDate: doc.documentDate,
				authorityTier: source.authorityTier,
			});
			// Snapshot text identical to what we stored before → reuse (stable evidence offsets).
			snapshot.fetchedAt = result.fetchedAt;
			snapshot.authorityTier = source.authorityTier;
			page.pageChanged = !previous || previous.textHash !== doc.textHash;
			page.snapshotId = snapshot.id;
			page.textHash = doc.textHash;
			return { doc, snapshot };
		} catch (error) {
			page.error = { code: error.code || "ERROR", message: error.message };
			page.durationMs = Date.now() - started;
			throw error;
		}
	}

	async recordIssues(source, issues, at, runId) {
		for (const issue of issues) {
			await this.store.upsertIssue({ ...issue, sourceId: source.id, seenAt: at, runId });
		}
	}

	async runSource(source) {
		const primary = await this.runSourceAttempt(source);
		if (!["failed", "rejected"].includes(primary.status) || !source.fallbackEntries?.length || source.ingestionStatus === "needs_adapter") return primary;
		const fallback = await this.runSourceAttempt({
			...source, name: `${source.name} - Government myScheme fallback`,
			authorityTier: 2, strategy: "static", allowNetworkRendering: false,
			entries: source.fallbackEntries, fallbackEntries: null, minExpectedSchemes: 1,
			followUps: { maxPerRun: 0 }, isFallback: true,
		});
		fallback.primaryErrors = primary.errors;
		fallback.errors = [...primary.errors.map((e) => ({ ...e, primaryAttempt: true })), ...fallback.errors];
		fallback.fallbackUsed = ["success", "partial"].includes(fallback.status) && fallback.counts.published > 0;
		if (fallback.fallbackUsed) fallback.status = "partial";
		const state = await this.store.getSourceState(source.id);
		state.lastStatus = fallback.status;
		state.lastError = fallback.fallbackUsed ? primary.errors[0] : fallback.errors.at(-1);
		state.fallbackUsed = fallback.fallbackUsed;
		await this.store.saveSourceState(state);
		await this.store.saveRun(fallback);
		return fallback;
	}

	async runSourceAttempt(source) {
		const at = this.now();
		const runId = crypto.randomBytes(8).toString("hex");
		const log = this.logger.child({ sourceId: source.id, runId });
		const run = {
			runId,
			sourceId: source.id,
			startedAt: at,
			status: "running",
			pages: [],
			counts: {
				discovered: 0,
				published: 0,
				needsReview: 0,
				created: 0,
				updated: 0,
				unchanged: 0,
				dataChanged: 0,
				newCycles: 0,
				missingFromSource: 0,
			},
			pageChanged: false,
			errors: [],
		};
		const state = (await this.store.getSourceState(source.id)) || { sourceId: source.id, consecutiveFailures: 0 };
		state.lastAttemptAt = at;
		const fetcher = this.fetcherFactory(source);
		// Persist active work before network requests so an interrupted process is
		// distinguishable from a source that has never been attempted.
		await this.store.saveRun(run);
		log.info("source run started", { entries: source.entries.length });

		const finish = async (status, error) => {
			run.status = status;
			run.finishedAt = this.now();
			if (error) run.errors.push({ code: error.code || "ERROR", message: error.message });
			if (status === "success" || status === "partial") {
				state.lastSuccessAt = run.finishedAt;
				state.consecutiveFailures = 0;
				state.lastError = null;
			} else {
				state.consecutiveFailures = (state.consecutiveFailures || 0) + 1;
				state.lastError = run.errors[run.errors.length - 1] || null;
			}
			state.lastRunId = runId;
			state.fallbackUsed = Boolean(source.isFallback && run.counts.published > 0);
			state.lastStatus = status;
			await this.store.saveSourceState(state);
			await this.store.saveRun(run);
			log[status === "failed" || status === "rejected" ? "warn" : "info"]("source run finished", {
				status,
				counts: run.counts,
				errors: run.errors,
			});
			return run;
		};

		if (source.ingestionStatus === "needs_adapter") {
			return finish("rejected", new FetchError("SOURCE_NOT_READY", source.ingestionNote || "A verified live parser is not configured for this source"));
		}

		// ---- Discovery + Fetch + Extract (listing & cross-check pages) ----
		const candidates = [];
		const assertions = [];
		const pageIssues = [];
		let academicYear = null;
		for (const entry of source.entries) {
			const adapter = ADAPTERS[entry.adapter];
			let fetched;
			try {
				fetched = await this.fetchDocument(source, entry, fetcher, run);
			} catch (error) {
				if (entry.optional) {
					run.errors.push({ code: error.code || "ERROR", message: `${entry.url}: ${error.message}`, optional: true });
					continue;
				}
				return finish("failed", error);
			}
			if (run.pages.at(-1).pageChanged) run.pageChanged = true;
			const out = adapter.extract(fetched.doc, fetched.snapshot, { source, entry });
			const blocking = (out.issues || []).filter((i) => i.severity === "blocking");
			pageIssues.push(...(out.issues || []).map((i) => ({ ...i, details: { ...i.details, url: entry.url } })));
			if (blocking.length && !entry.optional) {
				await this.recordIssues(source, pageIssues, at, runId);
				const error = new Error(blocking.map((b) => b.message).join(" "));
				error.code = blocking[0].code;
				return finish("rejected", error);
			}
			if (entry.role === "listing") {
				candidates.push(...enrichSourceLinks(out.records, fetched.doc, source));
				academicYear = out.pageFacts?.academicYear || academicYear;
			}
			assertions.push(...(out.assertions || []));
		}

		// ---- Deduplicate ----
		const { records: unique, issues: dedupeIssues } = dedupeCandidates(candidates);
		run.counts.discovered = unique.length;
		if (unique.length < (source.minExpectedSchemes ?? 1)) {
			return finish("rejected", new FetchError("EMPTY_CATALOGUE", `Expected at least ${source.minExpectedSchemes ?? 1} schemes; found ${unique.length}. Stored records are preserved.`));
		}

		// ---- Follow-up documents (guidelines) ----
		const linkedBy = new Map();
		for (const c of unique) {
			for (const f of c.followUps || []) {
				if (!linkedBy.has(f.url)) linkedBy.set(f.url, { adapter: f.adapter, keys: [] });
				linkedBy.get(f.url).keys.push(c.schemeKey);
			}
		}
		const guidelineByKey = new Map();
		const maxFollowUps = source.followUps?.maxPerRun ?? 20;
		let processed = 0;
		for (const [url, { adapter: adapterId, keys }] of linkedBy) {
			const assign = (value) => keys.forEach((k) => guidelineByKey.set(k, value));
			if (keys.length > 1) {
				// Shared document: we would not attribute its figures anyway, so skip the fetch.
				assign({
					facts: {},
					issues: [
						{
							code: "shared_guideline_document",
							severity: "info",
							message: `This guideline document is shared by ${keys.length} schemes; its figures are not attributed to any single scheme.`,
						},
					],
				});
				continue;
			}
			if (processed >= maxFollowUps) {
				assign({ facts: {}, issues: [], error: "follow-up budget exhausted" });
				continue;
			}
			processed += 1;
			try {
				const { doc, snapshot } = await this.fetchDocument(source, { url, adapter: adapterId, role: "guidelines" }, fetcher, run);
				const out = ADAPTERS[adapterId].extract(doc, snapshot, { source, linkedSchemeKeys: keys, academicYear });
				assign({ ...out, fetched: true });
			} catch (error) {
				assign({ facts: {}, issues: [], error: error.code || error.message });
			}
		}

		// ---- Normalize + Validate + Verify + Change detect + Upsert ----
		const seen = new Set();
		const keepIssueKeys = new Map();
		const noteIssue = (schemeKey, issue) => {
			const full = { ...issue, schemeKey, sourceId: source.id };
			if (!keepIssueKeys.has(schemeKey)) keepIssueKeys.set(schemeKey, new Set());
			keepIssueKeys.get(schemeKey).add(issueKey(full));
			return full;
		};

		for (const candidate of unique) {
			const guideline = guidelineByKey.get(candidate.schemeKey);
			const { record: incoming, issues } = assembleRecord(candidate, { source, guideline, assertions });
			const allIssues = [
				...issues,
				...dedupeIssues.filter((i) => i.schemeKey === candidate.schemeKey),
			];
			if (candidate.blocked) {
				allIssues.push({ code: "duplicate_key_conflict", severity: "blocking", message: "Conflicting duplicate entries on source." });
			}
			const blocking = allIssues.some((i) => i.severity === "blocking");
			seen.add(candidate.schemeKey);

			try {
				const result = await this.upsert(source, incoming, { blocking, guideline, at, runId, allIssues });
				for (const issue of [...allIssues, ...result.extraIssues]) {
					await this.store.upsertIssue({ ...noteIssue(candidate.schemeKey, issue), seenAt: at, runId });
				}
				run.counts[result.outcome] += 1;
				if (result.dataChanged) run.counts.dataChanged += 1;
				run.counts.newCycles += result.newCycles;
				if (result.publication === "published") run.counts.published += 1;
				else run.counts.needsReview += 1;
			} catch (error) {
				log.error("upsert failed", { schemeKey: candidate.schemeKey, error: error.message });
				run.errors.push({ code: "UPSERT_FAILED", schemeKey: candidate.schemeKey, message: error.message });
			}
		}

		if (run.counts.published === 0) {
			return finish("rejected", new FetchError("EMPTY_CATALOGUE", "No scholarships could be published. Previous published records are preserved."));
		}

		// Page-level issues (no schemeKey)
		for (const issue of pageIssues) {
			await this.store.upsertIssue({ ...noteIssue(null, issue), seenAt: at, runId });
		}
		// These were persisted during fetching, including failed optional PDFs.
		// Keep their keys open without counting the same occurrence twice.
		for (const issue of run.pages.flatMap(page => page.documentIssues || [])) noteIssue(null, issue);

		// ---- Freshness: records that disappeared from the source ----
		const stored = await this.store.listScholarships({ primarySourceId: source.id });
		for (const record of stored) {
			// A limited alternative catalogue cannot establish that a record has
			// disappeared from the administering portal.
			if (source.isFallback || /Government myScheme fallback/.test(record.sourceSite || "")) continue;
			if (seen.has(record.schemeKey) || record.legacy) continue;
			record.freshness = record.freshness || {};
			record.freshness.missingRunCount = (record.freshness.missingRunCount || 0) + 1;
			record.freshness.missingSince = record.freshness.missingSince || at;
			const status = computeStatus(record, at);
			Object.assign(record, { status: status.status, statusReason: status.reason, stale: status.stale, statusComputedAt: at });
			await this.store.saveScholarship(record);
			run.counts.missingFromSource += 1;
			if (record.freshness.missingRunCount >= (source.missingRunsBeforeReview ?? 3)) {
				await this.store.upsertIssue({
					...noteIssue(record.schemeKey, {
						code: "disappeared_from_source",
						severity: "warning",
						message: `Not listed on the source for ${record.freshness.missingRunCount} consecutive successful runs. Kept (not deleted); needs review.`,
					}),
					seenAt: at,
					runId,
				});
			}
		}

		// Auto-resolve issues that no longer occur for records seen this run.
		for (const key of seen) {
			await this.store.resolveIssues({ sourceId: source.id, schemeKey: key, keepKeys: keepIssueKeys.get(key) || new Set(), at });
		}
		await this.store.resolveIssues({ sourceId: source.id, schemeKey: null, keepKeys: keepIssueKeys.get(null) || new Set(), at });

		return finish(run.errors.some((e) => !e.optional) ? "partial" : "success");
	}

	async resolveExisting(source, schemeKey) {
		const existing = await this.store.getScholarship(schemeKey);
		if (existing) return existing.legacy ? { ...existing, adoptedFromLegacy: true } : existing;
		for (const [slug, key] of Object.entries(source.legacyAliases || {})) {
			if (key !== schemeKey) continue;
			const legacy = await this.store.findByLegacySlug(slug);
			if (legacy) return { ...legacy, legacySchemeKeyFrom: legacy.schemeKey || null, adoptedFromLegacy: true };
		}
		return null;
	}

	async upsert(source, incoming, { blocking, guideline, at, runId }) {
		if (incoming.ruleTree != null) incoming = { ...incoming, ruleTree: ruleTreeSchema.parse(incoming.ruleTree) };
		const extraIssues = [];
		const existing = await this.resolveExisting(source, incoming.schemeKey);
		const listingEvidence = incoming.fieldEvidence.find((e) => e.field === "title");
		const verifiedAt = listingEvidence?.fetchedAt || at;

		// Blocked extraction never overwrites a stored record.
		if (blocking && existing && !existing.adoptedFromLegacy) {
			return { outcome: "unchanged", publication: existing.publication?.state, extraIssues, newCycles: 0, dataChanged: false };
		}

		let record;
		let deltas = [];
		let outcome;
		if (!existing || existing.adoptedFromLegacy) {
			record = {
				...incoming,
				id: existing?.id,
				legacySchemeKeyFrom: existing?.legacySchemeKeyFrom,
				slug: existing?.slug || `${slugify(incoming.title, 80)}-${crypto.createHash("sha1").update(incoming.schemeKey).digest("hex").slice(0, 6)}`,
				legacy: false,
				legacySnapshot: existing?.legacySnapshot || null,
				freshness: { firstSeenAt: verifiedAt },
			};
			delete record.cycles;
			outcome = "created";
		} else {
			const reconfirmedFields = guideline?.fetched ? GUIDELINE_FIELDS : new Set();
			const merged = mergeRecordFields(existing, incoming, { reconfirmedFields });
			record = merged.merged;
			delete record.cycles;
			deltas = merged.deltas;
			extraIssues.push(...merged.issues);
			if (merged.issues.some(issue => issue.severity === "blocking")) blocking = true;
			record.dataQuality = incoming.dataQuality;
			outcome = deltas.length ? "updated" : "unchanged";
		}

		// ---- Cycles (academic-year versioned) ----
		let newCycles = 0;
		const cycleChanges = [];
		for (const cycle of incoming.cycles) {
			const storedCycle = await this.store.getCycle(incoming.schemeKey, cycle.academicYear, cycle.applicationType);
			if (!storedCycle) {
				await this.store.saveCycle({
					...cycle,
					schemeKey: incoming.schemeKey,
					sourceId: source.id,
					firstSeenAt: verifiedAt,
					lastSeenAt: verifiedAt,
					dataHash: cycleDataHash(cycle),
				});
				newCycles += 1;
				if (existing && !existing.adoptedFromLegacy) {
					cycleChanges.push({
						changeType: "NEW_CYCLE",
						summary: `New AY ${cycle.academicYear} ${cycle.applicationType} application window published.`,
						deltas: [],
						academicYear: cycle.academicYear,
					});
				}
				continue;
			}
			const { deltas: cDeltas, changeType } = diffCycle(storedCycle, cycle);
			const updated = { ...storedCycle, lastSeenAt: verifiedAt };
			if (cDeltas.length) {
				for (const d of cDeltas) updated[d.field] = d.newValue;
				updated.evidence = cycle.evidence;
				updated.conflicts = cycle.conflicts || [];
				updated.dataHash = cycleDataHash(updated);
				cycleChanges.push({
					changeType,
					summary: `AY ${cycle.academicYear} ${cycle.applicationType}: ${cDeltas.map((d) => d.humanReadable).join("; ")}`,
					deltas: cDeltas,
					academicYear: cycle.academicYear,
				});
				if (changeType === "DEADLINE_SHORTENED") {
					extraIssues.push({
						code: "deadline_shortened",
						severity: "warning",
						message: `The official closing date moved earlier (${cDeltas.find((d) => d.field === "closesAt").humanReadable}). Applied, flagged for review.`,
					});
				}
			} else {
				updated.evidence = cycle.evidence;
				updated.conflicts = cycle.conflicts || [];
			}
			await this.store.saveCycle(updated);
		}

		const allCycles = await this.store.listCycles(incoming.schemeKey);
		const current = selectCurrentCycle(allCycles);
		record.currentCycle = current
			? {
					academicYear: current.academicYear,
					applicationType: current.applicationType,
					opensAt: current.opensAt || null,
					closesAt: current.closesAt || null,
					latestPossibleClosesAt: current.latestPossibleClosesAt || null,
					defectiveVerificationUntil: current.defectiveVerificationUntil || null,
					instituteVerificationUntil: current.instituteVerificationUntil || null,
					officerVerificationUntil: current.officerVerificationUntil || null,
					hasConflict: Boolean(current.conflicts?.length),
					evidence: current.evidence,
				}
			: null;
		record.deadline = current?.closesAt || null;
		record.applicationOpenDate = current?.opensAt || null;
		record.sortDeadline = sortDeadline(current);
		record.academicYears = [...new Set(allCycles.map((c) => c.academicYear))].sort();

		// ---- Freshness + status ----
		record.freshness = {
			...(record.freshness || {}),
			lastSeenAt: verifiedAt,
			lastVerifiedAt: blocking ? record.freshness?.lastVerifiedAt || null : verifiedAt,
			lastSuccessfulCrawlAt: at,
			staleAfterHours: source.staleAfterHours ?? 72,
			missingRunCount: 0,
			missingSince: null,
		};
		const dataChanged = deltas.length > 0 || cycleChanges.length > 0;
		if (dataChanged) record.freshness.lastChangedAt = verifiedAt;

		const status = computeStatus(record, this.now());
		record.status = status.status;
		record.statusReason = status.reason;
		record.stale = status.stale;
		record.statusComputedAt = status.computedAt;
		record.dataHash = recordDataHash(record);
		record.publication = {
			state: blocking ? "needs_review" : "published",
			updatedAt: at,
		};
		record.verified = !blocking && Boolean(current) && !status.stale;
		if (dataChanged && existing && !existing.adoptedFromLegacy) {
			const humanDelta = (d) => {
				if (d.field === "amount") return `Scholarship grant amount updated`;
				if (d.field === "level") return `Eligible course levels updated`;
				if (d.field.includes("familyIncome")) return `Family income criteria updated`;
				if (d.field.includes("guidelinesUrl")) return `Official guidelines document updated`;
				if (d.field.includes("applicationLink")) return `Official application link updated`;
				return `${d.field.split(".").pop().replace(/([A-Z])/g, " $1").trim()} updated`;
			};
			const summaries = [
				...cycleChanges.map((c) => c.summary),
				...deltas.map(humanDelta),
			];
			if (summaries.length > 0) {
				record.hasChanges = true;
				record.latestChangeSummary = summaries.join(" • ");
			}
		}
		// Older crawls mistook MongoDB defaults for changes. Repair derived badges
		// during the next normal refresh without rewriting immutable history.
		if (!dataChanged && existing?.hasChanges && !existing.adoptedFromLegacy) {
			const history = (await this.store.listVersions(record.schemeKey)).filter(version => !version.legacyUnverified && version.changeType !== "FIRST_OBSERVED");
			if (history.length) {
				const latest = history.map(publicPolicyVersion).filter(version => !version.routineRefresh)
					.sort((a, b) => new Date(b.observedAt) - new Date(a.observedAt))[0];
				record.hasChanges = Boolean(latest);
				record.latestChangeSummary = latest ? latest.summary : null;
				if (!latest) delete record.freshness.lastChangedAt;
			}
		}

		record.id ||= crypto.randomBytes(12).toString("hex");
		const eligibilityVersion = await prepareEligibilityVersion(record, existing, this.store, verifiedAt,
			Boolean(this.onDataChange) && record.publication.state === "published");
		record.eligibilityVersion = eligibilityVersion.id;
		const saved = await this.store.saveScholarship(record);
		if (this.onDataChange && eligibilityVersion.alert.status === "pending") {
			await this.onDataChange({ record: saved, changeType: "ELIGIBILITY_RULES_CHANGED",
				previousVersionId: eligibilityVersion.previousVersion, currentVersionId: eligibilityVersion.id }).catch(e =>
				this.logger.warn("eligibility alert enqueue failed; durable event remains pending", { error: e.message }));
		}

		// ---- Version history ----
		const versions = [];
		if (outcome === "created") {
			versions.push({ changeType: "FIRST_OBSERVED", summary: "First observed on the official source.", deltas: [] });
		}
		if (deltas.length) {
			const changeType = classifyFieldDeltas(deltas);
			versions.push({
				changeType,
				semanticCategory: classifySemanticChange(deltas, changeType),
				summary: `Official values changed: ${deltas.map((d) => d.field).join(", ")}`,
				deltas: deltas.map((d) => ({ ...d, humanReadable: `${d.field} updated from official source` })),
			});
		}
		versions.push(...cycleChanges);
		for (const v of versions) {
			await this.store.addVersion({
				...v,
				scholarshipId: saved.id,
				schemeKey: saved.schemeKey,
				sourceId: source.id,
				runId,
				observedAt: verifiedAt,
				evidence: incoming.fieldEvidence.filter((e) => e.field === "cycle" || deltas.some((d) => d.field.endsWith(e.field))),
			});
			if (this.onDataChange && saved.publication.state === "published" && v.changeType !== "FIRST_OBSERVED") {
				await this.onDataChange({ record: saved, ...v, isNew: false }).catch((e) =>
					this.logger.warn("onDataChange failed", { error: e.message }),
				);
			}
		}

		return { outcome, publication: saved.publication.state, extraIssues, newCycles, dataChanged: dataChanged && outcome !== "created" };
	}

	async runAll(sources) {
		const reports = [];
		for (const source of sources) {
			try {
				reports.push(await this.runSource(source));
			} catch (error) {
				// A bug in one source must not stop the others.
				this.logger.error("source run crashed", { sourceId: source.id, error: error.stack });
				reports.push({ sourceId: source.id, status: "failed", errors: [{ code: "CRASH", message: error.message }] });
			}
		}
		return reports;
	}

	/** Recompute status/stale flags for every stored record (cheap; run periodically). */
	async refreshStatuses() {
		const now = this.now();
		let changed = 0;
		for (const record of await this.store.listScholarships()) {
			if (record.legacy) continue;
			const s = computeStatus(record, now);
			if (s.status !== record.status || s.stale !== record.stale || s.reason !== record.statusReason) {
				Object.assign(record, {
					status: s.status,
					statusReason: s.reason,
					stale: s.stale,
					statusComputedAt: now,
					verified: record.publication?.state === "published" && Boolean(record.currentCycle) && !s.stale,
				});
				await this.store.saveScholarship(record);
				changed += 1;
			}
		}
		return { changed };
	}
}

export { stripSnapshotText };
