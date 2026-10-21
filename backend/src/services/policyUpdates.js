import Scholarship from "../models/Scholarship.js";
import ScholarshipVersion from "../models/ScholarshipVersion.js";
import { publicPolicyVersion } from "../pipeline/core/changes.js";

// Correct old derived badges at read time. Stored versions remain immutable;
// the next normal ingestion also repairs the persisted flags.
export function createPublicUpdateIndex({
	loadFlagged = () => Scholarship.find({ "publication.state": "published", hasChanges: true }).select("_id latestChangeSummary").lean(),
	loadVersions = ids => ScholarshipVersion.find({ scholarship: { $in: ids }, legacyUnverified: { $ne: true }, changeType: { $ne: "FIRST_OBSERVED" } })
		.select("scholarship changeType semanticCategory summary deltas observedAt academicYear").sort({ observedAt: -1 }).lean(),
	ttlMs = 60000, now = Date.now,
} = {}) {
	let cached, expiresAt = 0, pending;
	return async () => {
		if (cached && expiresAt > now()) return cached;
		if (pending) return pending;
		pending = (async () => {
			const flagged = await loadFlagged();
			const versions = flagged.length ? await loadVersions(flagged.map(record => record._id)) : [];
			const grouped = new Map();
			for (const version of versions) {
				const id = String(version.scholarship);
				if (!grouped.has(id)) grouped.set(id, []);
				grouped.get(id).push(publicPolicyVersion(version));
			}
			const states = new Map(), ids = [];
			for (const record of flagged) {
				const history = grouped.get(String(record._id)) || [];
				const latest = history.filter(version => !version.routineRefresh).sort((a, b) => new Date(b.observedAt) - new Date(a.observedAt))[0];
				// Missing history is unknown, not proof of unchanged terms.
				const hasChanges = !history.length || Boolean(latest);
				states.set(String(record._id), { hasChanges, latestChangeSummary: hasChanges ? latest?.summary || record.latestChangeSummary : null });
				if (hasChanges) ids.push(record._id);
			}
			cached = { ids, states, count: ids.length };
			expiresAt = now() + ttlMs;
			return cached;
		})().finally(() => { pending = null; });
		return pending;
	};
}

export const getPublicUpdateIndex = createPublicUpdateIndex();
export const withPublicUpdateState = (record, index) => ({ ...record, ...(index.states.get(String(record._id || record.id)) || {}) });
