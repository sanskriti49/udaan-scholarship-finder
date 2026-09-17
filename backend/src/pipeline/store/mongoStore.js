import Scholarship from "../../models/Scholarship.js";
import ScholarshipCycle from "../../models/ScholarshipCycle.js";
import ScholarshipVersion from "../../models/ScholarshipVersion.js";
import SourceSnapshot from "../../models/SourceSnapshot.js";
import SourceState from "../../models/SourceState.js";
import CrawlRun from "../../models/CrawlRun.js";
import IngestionIssue from "../../models/IngestionIssue.js";
import { issueKey } from "./memoryStore.js";

/**
 * MongoDB implementation of the pipeline store contract (see memoryStore.js).
 * Returns plain objects with `id` as a string. Never deletes documents.
 */
const plain = (doc) => {
	if (!doc) return null;
	const { _id, __v, ...rest } = doc;
	return { ...rest, id: String(_id) };
};

const SCHOLARSHIP_TRANSIENT = ["id", "legacySchemeKeyFrom", "adoptedFromLegacy", "createdAt", "updatedAt"];

export class MongoStore {
	async getSourceState(sourceId) {
		return plain(await SourceState.findOne({ sourceId }).lean());
	}
	async saveSourceState(state) {
		const { id, ...rest } = state;
		await SourceState.updateOne({ sourceId: state.sourceId }, { $set: rest }, { upsert: true });
	}

	async getLatestSnapshot(url) {
		return plain(await SourceSnapshot.findOne({ url }).sort({ lastSeenAt: -1 }).lean());
	}
	async getSnapshot(id) {
		return plain(await SourceSnapshot.findById(id).lean());
	}
	async saveSnapshot(snapshot) {
		const existing = await SourceSnapshot.findOneAndUpdate(
			{ url: snapshot.url, textHash: snapshot.textHash },
			{
				$set: {
					lastSeenAt: snapshot.fetchedAt,
					...(snapshot.etag ? { etag: snapshot.etag } : {}),
					...(snapshot.lastModified ? { lastModified: snapshot.lastModified } : {}),
				},
			},
			{ returnDocument: "after", lean: true },
		);
		if (existing) return { ...plain(existing), reused: true };
		const created = await SourceSnapshot.create({
			...snapshot,
			firstSeenAt: snapshot.fetchedAt,
			lastSeenAt: snapshot.fetchedAt,
		});
		return { ...plain(created.toObject()), reused: false };
	}
	async touchSnapshot(id, at) {
		await SourceSnapshot.updateOne({ _id: id }, { $set: { lastSeenAt: at } });
	}

	async getScholarship(schemeKey) {
		return plain(await Scholarship.findOne({ schemeKey }).lean());
	}
	async findByLegacySlug(slug) {
		return plain(await Scholarship.findOne({ slug, legacy: true }).lean());
	}
	async listScholarships({ primarySourceId } = {}) {
		const filter = primarySourceId ? { primarySourceId } : {};
		return (await Scholarship.find(filter).lean()).map(plain);
	}
	async saveScholarship(record) {
		const data = { ...record };
		for (const k of SCHOLARSHIP_TRANSIENT) delete data[k];
		const filter = record.id ? { _id: record.id } : { schemeKey: record.schemeKey };
		const saved = await Scholarship.findOneAndUpdate(
			filter,
			{ $set: data },
			{ upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true, lean: true },
		);
		return plain(saved);
	}

	async getCycle(schemeKey, academicYear, applicationType) {
		return plain(await ScholarshipCycle.findOne({ schemeKey, academicYear, applicationType }).lean());
	}
	async listCycles(schemeKey) {
		return (await ScholarshipCycle.find({ schemeKey }).lean()).map(plain);
	}
	async saveCycle(cycle) {
		const { id, createdAt, updatedAt, ...data } = cycle;
		const saved = await ScholarshipCycle.findOneAndUpdate(
			{ schemeKey: cycle.schemeKey, academicYear: cycle.academicYear, applicationType: cycle.applicationType },
			{ $set: data },
			{ upsert: true, returnDocument: "after", runValidators: true, lean: true },
		);
		return plain(saved);
	}

	async addVersion(version) {
		const { scholarshipId, ...rest } = version;
		await ScholarshipVersion.create({ ...rest, scholarship: scholarshipId });
	}
	async listVersions(schemeKey) {
		return (await ScholarshipVersion.find({ schemeKey }).sort({ observedAt: 1 }).lean()).map(plain);
	}

	async upsertIssue(issue) {
		const key = issueKey(issue);
		const { seenAt, ...rest } = issue;
		await IngestionIssue.updateOne(
			{ key },
			{
				$set: { ...rest, key, status: "open", lastSeenAt: seenAt },
				$setOnInsert: { firstSeenAt: seenAt },
				$inc: { occurrences: 1 },
			},
			{ upsert: true },
		);
	}
	async resolveIssues({ sourceId, schemeKey, keepKeys, at }) {
		await IngestionIssue.updateMany(
			{ sourceId, schemeKey: schemeKey ?? null, status: "open", key: { $nin: [...keepKeys] } },
			{ $set: { status: "resolved", resolvedAt: at } },
		);
	}
	async listIssues(filter = {}) {
		return (await IngestionIssue.find(filter).sort({ severity: 1, lastSeenAt: -1 }).lean()).map(plain);
	}

	async saveRun(run) {
		const { errors, ...rest } = run;
		await CrawlRun.updateOne({ runId: run.runId }, { $set: { ...rest, failures: errors } }, { upsert: true });
	}
	async listRuns(sourceId, limit = 20) {
		const filter = sourceId ? { sourceId } : {};
		return (await CrawlRun.find(filter).sort({ startedAt: -1 }).limit(limit).lean()).map(plain);
	}
}
