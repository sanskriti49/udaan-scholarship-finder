import crypto from "crypto";

/**
 * Store contract used by the pipeline (implemented by MemoryStore and MongoStore):
 *
 *   getSourceState(sourceId) / saveSourceState(state)
 *   getLatestSnapshot(url) / getSnapshot(id) / saveSnapshot(snapshot) / touchSnapshot(id, at)
 *   getScholarship(schemeKey) / findByLegacySlug(slug) / listScholarships({ primarySourceId })
 *   saveScholarship(record)
 *   getCycle(schemeKey, academicYear, applicationType) / listCycles(schemeKey) / saveCycle(cycle)
 *   addVersion(version) / listVersions(schemeKey)
 *   upsertIssue(issue) / resolveIssues({ sourceId, schemeKey, keepKeys }) / listIssues(filter)
 *   saveRun(run) / listRuns(sourceId)
 *
 * All methods return plain objects. Nothing in the contract deletes records.
 */
const clone = (v) => (v === undefined ? undefined : structuredClone(v));
const newId = () => crypto.randomBytes(12).toString("hex");

export function issueKey(issue) {
	return [issue.sourceId || "", issue.schemeKey || "", issue.code, issue.details?.label || ""].join("|");
}

export class MemoryStore {
	constructor() {
		this.sourceStates = new Map();
		this.snapshots = new Map();
		this.scholarships = new Map();
		this.cycles = new Map();
		this.versions = [];
		this.issues = new Map();
		this.runs = [];
	}

	async getSourceState(sourceId) {
		return clone(this.sourceStates.get(sourceId)) || null;
	}
	async saveSourceState(state) {
		this.sourceStates.set(state.sourceId, clone(state));
	}

	async getLatestSnapshot(url) {
		let latest = null;
		for (const s of this.snapshots.values()) {
			if (s.url === url && (!latest || s.lastSeenAt > latest.lastSeenAt)) latest = s;
		}
		return clone(latest);
	}
	async getSnapshot(id) {
		return clone(this.snapshots.get(String(id))) || null;
	}
	async saveSnapshot(snapshot) {
		for (const s of this.snapshots.values()) {
			if (s.url === snapshot.url && s.textHash === snapshot.textHash) {
				s.lastSeenAt = snapshot.fetchedAt;
				s.etag = snapshot.etag ?? s.etag;
				s.lastModified = snapshot.lastModified ?? s.lastModified;
				return { ...clone(s), reused: true };
			}
		}
		const saved = { ...clone(snapshot), id: newId(), firstSeenAt: snapshot.fetchedAt, lastSeenAt: snapshot.fetchedAt };
		this.snapshots.set(saved.id, saved);
		return { ...clone(saved), reused: false };
	}
	async touchSnapshot(id, at) {
		const s = this.snapshots.get(String(id));
		if (s) s.lastSeenAt = at;
	}

	async getScholarship(schemeKey) {
		return clone(this.scholarships.get(schemeKey)) || null;
	}
	async findByLegacySlug(slug) {
		for (const s of this.scholarships.values()) if (s.slug === slug && s.legacy) return clone(s);
		return null;
	}
	async listScholarships({ primarySourceId } = {}) {
		return [...this.scholarships.values()]
			.filter((s) => !primarySourceId || s.primarySourceId === primarySourceId)
			.map(clone);
	}
	async saveScholarship(record) {
		const saved = { ...clone(record), id: record.id || newId() };
		if (record.legacySchemeKeyFrom) this.scholarships.delete(record.legacySchemeKeyFrom);
		delete saved.legacySchemeKeyFrom;
		this.scholarships.set(saved.schemeKey, saved);
		return clone(saved);
	}

	cycleId(schemeKey, ay, type) {
		return `${schemeKey}|${ay}|${type}`;
	}
	async getCycle(schemeKey, academicYear, applicationType) {
		return clone(this.cycles.get(this.cycleId(schemeKey, academicYear, applicationType))) || null;
	}
	async listCycles(schemeKey) {
		return [...this.cycles.values()].filter((c) => c.schemeKey === schemeKey).map(clone);
	}
	async saveCycle(cycle) {
		const id = this.cycleId(cycle.schemeKey, cycle.academicYear, cycle.applicationType);
		const saved = { ...clone(cycle), id };
		this.cycles.set(id, saved);
		return clone(saved);
	}

	async addVersion(version) {
		this.versions.push({ ...clone(version), id: newId() });
	}
	async listVersions(schemeKey) {
		return this.versions.filter((v) => v.schemeKey === schemeKey).map(clone);
	}

	async upsertIssue(issue) {
		const key = issueKey(issue);
		const existing = this.issues.get(key);
		if (existing) {
			Object.assign(existing, clone(issue), {
				status: "open",
				lastSeenAt: issue.seenAt,
				occurrences: existing.occurrences + 1,
			});
		} else {
			this.issues.set(key, { ...clone(issue), key, status: "open", firstSeenAt: issue.seenAt, lastSeenAt: issue.seenAt, occurrences: 1 });
		}
	}
	async resolveIssues({ sourceId, schemeKey, keepKeys, at }) {
		for (const issue of this.issues.values()) {
			if (issue.sourceId !== sourceId || issue.status !== "open") continue;
			if (schemeKey !== undefined && (issue.schemeKey || null) !== schemeKey) continue;
			if (!keepKeys.has(issue.key)) {
				issue.status = "resolved";
				issue.resolvedAt = at;
			}
		}
	}
	async listIssues(filter = {}) {
		return [...this.issues.values()]
			.filter((i) => Object.entries(filter).every(([k, v]) => i[k] === v))
			.map(clone);
	}

	async saveRun(run) {
		this.runs.push(clone(run));
	}
	async listRuns(sourceId) {
		return this.runs.filter((r) => !sourceId || r.sourceId === sourceId).map(clone);
	}
}
