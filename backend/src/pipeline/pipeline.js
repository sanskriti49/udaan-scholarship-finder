import crypto from "crypto";
import { SafeFetcher, FetchError } from "./core/http.js";
import { fetchRendered } from "./core/dynamic.js";
import { toDocument, assessTextQuality } from "./core/documents.js";
import { dedupeCandidates } from "./core/dedupe.js";
import { assembleRecord, selectCurrentCycle } from "./core/assemble.js";
import {
	classifyFieldDeltas,
	cycleDataHash,
	diffCycle,
	mergeRecordFields,
	recordDataHash,
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
	const { text, pages, ...meta } = snapshot;
	return meta;
}

function docFromSnapshot(snapshot) {
	return {
		url: snapshot.url,
		finalUrl: snapshot.finalUrl,
		kind: snapshot.kind,
		text: snapshot.text,
		pages: snapshot.pages,
		json: snapshot.kind === "json" ? JSON.parse(snapshot.text) : null,
		textHash: snapshot.textHash,
		quality: snapshot.quality || assessTextQuality(snapshot.text),
		documentDate: snapshot.documentDate,
	};
}

export function createDefaultFetcher(source, overrides = {}) {
	return new SafeFetcher({
		allowedDomains: source.allowedDomains,
		minIntervalMs: source.rateLimit?.minIntervalMs,
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
	constructor({ store, fetcherFactory = createDefaultFetcher, now = () => new Date(), onDataChange = null, logger } = {}) {
		this.store = store;
		this.fetcherFactory = fetcherFactory;
		this.now = now;
		this.onDataChange = onDataChange;
		this.logger = logger || rootLogger;
	}

	async fetchDocument(source, entry, fetcher, run) {
		const previous = await this.store.getLatestSnapshot(entry.url);
		const started = Date.now();
		const page = { url: entry.url, role: entry.role, adapter: entry.adapter };
		run.pages.push(page);
		try {
			const dynamic = (entry.strategy || source.strategy) === "dynamic";
			const result = dynamic
				? await fetchRendered(entry.url, { allowedDomains: source.allowedDomains, fetcher, waitForSelector: entry.waitForSelector })
				: await fetcher.fetch(entry.url, {
						etag: previous?.etag,
						lastModified: previous?.lastModified,
					});
			page.httpStatus = result.status;
			page.attempts = result.attempts;
			page.durationMs = Date.now() - started;

			if (result.notModified && previous) {
				await this.store.touchSnapshot(previous.id, result.fetchedAt);
				page.pageChanged = false;
				page.notModified = true;
				return { doc: docFromSnapshot(previous), snapshot: { ...previous, fetchedAt: result.fetchedAt } };
			}

			const doc = await toDocument(result);
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
			const out = adapter.extract(fetched.doc, fetched.snapshot, { source });
			const blocking = (out.issues || []).filter((i) => i.severity === "blocking");
			pageIssues.push(...(out.issues || []).map((i) => ({ ...i, details: { ...i.details, url: entry.url } })));
			if (blocking.length && !entry.optional) {
				await this.recordIssues(source, pageIssues, at, runId);
				const error = new Error(blocking.map((b) => b.message).join(" "));
				error.code = blocking[0].code;
				return finish("rejected", error);
			}
			if (entry.role === "listing") {
				candidates.push(...out.records);
				academicYear = out.pageFacts?.academicYear || academicYear;
			}
			assertions.push(...(out.assertions || []));
		}

		// ---- Deduplicate ----
		const { records: unique, issues: dedupeIssues } = dedupeCandidates(candidates);
		run.counts.discovered = unique.length;

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

		// Page-level issues (no schemeKey)
		for (const issue of pageIssues) {
			await this.store.upsertIssue({ ...noteIssue(null, issue), seenAt: at, runId });
		}

		// ---- Freshness: records that disappeared from the source ----
		const stored = await this.store.listScholarships({ primarySourceId: source.id });
		for (const record of stored) {
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
		if (existing) return existing;
		for (const [slug, key] of Object.entries(source.legacyAliases || {})) {
			if (key !== schemeKey) continue;
			const legacy = await this.store.findByLegacySlug(slug);
			if (legacy) return { ...legacy, legacySchemeKeyFrom: legacy.schemeKey || null, adoptedFromLegacy: true };
		}
		return null;
	}

	async upsert(source, incoming, { blocking, guideline, at, runId }) {
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

		const saved = await this.store.saveScholarship(record);

		// ---- Version history ----
		const versions = [];
		if (outcome === "created") {
			versions.push({ changeType: "FIRST_OBSERVED", summary: "First observed on the official source.", deltas: [] });
		}
		if (deltas.length) {
			versions.push({
				changeType: classifyFieldDeltas(deltas),
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
