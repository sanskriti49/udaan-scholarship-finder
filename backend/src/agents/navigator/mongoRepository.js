import { discoveryFilters } from "./retrievalCoverage.js";
import { queryTerms } from "./passages.js";
import Scholarship from "../../models/Scholarship.js";
import SourceSnapshot from "../../models/SourceSnapshot.js";
import { targetName, withinTargetScope } from './researchTargets.js';

const PUBLIC = { "publication.state": "published", legacy: { $ne: true } };
const SCHEME_FIELDS = "title officialTitle organization applicationLink officialLinks publication legacy level state eligibility ruleTree rules requiredDocuments currentCycle freshness fieldEvidence dataQuality dataHash provenanceQuotes";
const SNAPSHOT_FIELDS = "sourceId url kind fetchedAt textHash sha256 text pages quality documentDate fetchMethod capturedSourceType authorityTier";
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const FILLERS = new Set("a an and are as at be been being by can could do does for from had has have help how i im in into is it its me my of on or our please scholarship scholarships search show some student students tell than that the their them there these they this those to us was we were what when where which who will with would you your find finding looking want need s".split(" "));
const wordsOf = query => [...new Set(query.normalize("NFKC").toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) || [])].filter(word => !FILLERS.has(word)).slice(0, 12);
// Unicode boundaries prevent short terms such as "art" from matching "department".
const wordPattern = words => `(?<![\\p{L}\\p{M}\\p{N}])(?:${words.map(escape).join("|")})(?![\\p{L}\\p{M}\\p{N}])`;
const projection = Object.fromEntries(SCHEME_FIELDS.split(" ").map(field => [field, 1]));

/** Fixed query construction: models never receive model-authored Mongo filters. */
export function createMongoResearchRepository({ ScholarshipModel = Scholarship, SnapshotModel = SourceSnapshot } = {}) {
	async function searchTargets(retrieval, limit) {
		const targets = retrieval.targets.filter(target => target.operator === 'include');
		const perTarget = Math.max(1, Math.floor(limit / targets.length));
		const queues = await Promise.all(targets.map(async target => {
			const name = targetName(target.name);
			if (!name.core.length) return [];
			const matchesName = { $or: ['title', 'officialTitle'].map(field => ({ $and: name.core.map(word => ({ [field]: { $regex: wordPattern([word]), $options: 'i' } })) })) };
			const rows = await ScholarshipModel.aggregate([
				{ $match: { $and: [PUBLIC, matchesName] } },
				{ $set: { _targetAudience: name.audience.length ? { $cond: [{ $regexMatch: { input: { $concat: [{ $ifNull: ['$title', ''] }, ' ', { $ifNull: ['$officialTitle', ''] }] }, regex: wordPattern(name.audience), options: 'i' } }, 1, 0] } : 0 } },
				{ $sort: { _targetAudience: -1, authorityTier: 1, _id: 1 } }, { $limit: perTarget }, { $project: projection },
			]).option({ maxTimeMS: 3000 });
			return rows.filter(row => withinTargetScope(row, retrieval));
		}));
		const result = [], seen = new Set();
		for (let depth = 0; result.length < limit && queues.some(queue => depth < queue.length); depth++) for (const queue of queues) {
			const row = queue[depth], id = String(row?._id);
			if (row && !seen.has(id) && result.length < limit) { seen.add(id); result.push(row); }
		}
		return result;
	}
	return {
		async getRecentSnapshot(url, since) {
			return SnapshotModel.findOne({ url, fetchedAt: { $gte: since }, fetchMethod: 'static', capturedSourceType: null }).sort({ fetchedAt: -1 }).maxTimeMS(3000).lean();
		},
		async saveSnapshot(snapshot) {
			const { _id: ignoredId, id: ignoredAlias, ...capture } = snapshot;
			try { return await SnapshotModel.findOneAndUpdate({ url: snapshot.url, textHash: snapshot.textHash }, { $setOnInsert: { ...capture, firstSeenAt: snapshot.fetchedAt, lastSeenAt: snapshot.fetchedAt } }, { upsert: true, returnDocument: 'after', lean: true, maxTimeMS: 3000 }); }
			catch (error) { if (error.code !== 11000) throw error; return SnapshotModel.findOne({ url: snapshot.url, textHash: snapshot.textHash }).maxTimeMS(3000).lean(); }
		},
		async searchPublished({ query = "", level, state, incomeCeiling, levels, states, excludeLevels, excludeStates, limit = 8, retrieval = null }) {
			if (retrieval?.targets?.some(target => target.operator === 'include')) return searchTargets(retrieval, Math.max(1, Math.min(Number.isInteger(limit) ? limit : 8, 48)));
			const conditions = [PUBLIC];
			const words = retrieval ? [...new Set(retrieval.discovery.flatMap(queryTerms))] : wordsOf(query);
			if (!retrieval && query.trim()) {
				if (!words.length) return [];
				conditions.push({ $or: ["title", "organization", "description", "tags"].map(field => ({ [field]: { $regex: wordPattern(words), $options: "i" } })) });
			}
			if (level) conditions.push({ $or: [{ level }, { level: null }] });
			if (state) conditions.push({ state: { $in: [state, "All India", null] } });
			if (!retrieval && levels) conditions.push({ level: { $in: levels } });
			if (!retrieval && states) conditions.push({ state: { $in: states } });
			// Unknown metadata cannot establish that an explicitly excluded category is absent.
			if (!retrieval && excludeLevels) conditions.push({ level: { $exists: true, $ne: null, $nin: excludeLevels } });
			if (!retrieval && excludeStates) conditions.push({ state: { $exists: true, $ne: null, $nin: excludeStates } });
			if (retrieval) conditions.push(...discoveryFilters(retrieval));
			const boundedLimit = Math.max(1, Math.min(Number.isInteger(limit) ? limit : 8, retrieval ? 48 : 8));
			if (!retrieval && !words.length && !level && !incomeCeiling) return ScholarshipModel.find({ $and: conditions }).select(SCHEME_FIELDS).sort({ sortDeadline: 1, _id: 1 }).limit(boundedLimit).maxTimeMS(3000).lean();
			const groups = retrieval ? [...new Set(retrieval.discovery)].map(queryTerms).filter(terms => terms.length) : [];
            const countGroups = field => ({ $sum: groups.map(terms => ({ $cond: [{ $regexMatch: { input: field, regex: wordPattern(terms), options: 'i' } }, 1, 0] })) });
            const countMatches = field => ({ $sum: words.map(word => ({ $cond: [{ $regexMatch: { input: field, regex: wordPattern([word]), options: "i" } }, 1, 0] })) });
			// Rank the full filtered set BEFORE limiting, rather than reranking eight deadline-sorted records.
			const genders = retrieval?.requirements.filter(r => r.field === 'gender' && r.operator === 'include').flatMap(r => Array.isArray(r.value) ? r.value : [r.value]) ?? [];
			const fundedLevels = retrieval?.requirements.filter(r => r.field === 'educationLevel' && r.role === 'funding' && r.operator === 'include').flatMap(r => Array.isArray(r.value) ? r.value : [r.value]) ?? [];
			const pipeline = [
				{ $match: { $and: conditions } },
				{ $set: { _navigatorText: { $concat: [
					...["title", "organization", "description"].flatMap(field => [{ $ifNull: [`$${field}`, ""] }, " "]),
					{ $reduce: { input: { $ifNull: ["$fieldEvidence", []] }, initialValue: "", in: { $concat: ["$$value", " ", { $ifNull: ["$$this.quote", ""] }] } } },
					{ $reduce: { input: { $ifNull: ["$tags", []] }, initialValue: "", in: { $concat: ["$$value", " ", "$$this"] } } },
				] } } },
				{ $set: { _navigatorRequirements: groups.length ? countGroups("$_navigatorText") : 0, _navigatorCoverage: words.length ? countMatches("$_navigatorText") : 0, _navigatorTitleMatches: words.length ? countMatches({ $ifNull: ["$title", ""] }) : 0,
					_navigatorKnownLevel: level ? { $cond: [{ $eq: ["$level", level] }, 1, 0] } : 0,
					// This ranks a requested ceiling; it never supplies a student's income to matching.
					_navigatorIncomeMatch: incomeCeiling ? { $cond: [{ $isNumber: "$eligibility.familyIncome.max" },
						{ $cond: [{ $eq: ["$eligibility.familyIncome.max", incomeCeiling] }, 3, { $cond: [{ $gte: ["$eligibility.familyIncome.max", incomeCeiling] }, 2, 1] }] }, 0] } : 0 } },
			];
			const topical = { _navigatorRequirements: -1, _navigatorCoverage: -1, _navigatorTitleMatches: -1, _navigatorKnownLevel: -1, _navigatorIncomeMatch: -1, sortDeadline: 1, _id: 1 };
			if (retrieval) {
				// Two independent admission paths stop lexical matches monopolizing
				// the finite horizon. Neither audience hints nor links certify eligibility.
				pipeline.push({ $set: {
					_navigatorAudience: { $add: [{ $cond: [{ $in: ['$eligibility.gender', genders] }, 1, 0] }, { $cond: [{ $in: ['$level', fundedLevels] }, 1, 0] }] },
					_navigatorPolicy: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$officialLinks.guidelinesUrl', ''] } }, 0] }, 1, 0] },
				} }, { $facet: {
					topical: [{ $sort: topical }, { $limit: Math.ceil(boundedLimit / 2) }],
					structured: [{ $sort: { _navigatorAudience: -1, _navigatorPolicy: -1, ...topical } }, { $limit: Math.max(1, Math.floor(boundedLimit / 2)) }],
				} }, { $project: { pool: { $concatArrays: ['$topical', '$structured'] } } },
				{ $unwind: '$pool' }, { $replaceRoot: { newRoot: '$pool' } }, { $group: { _id: '$_id', candidate: { $first: '$$ROOT' } } },
				{ $replaceRoot: { newRoot: '$candidate' } }, { $sort: { _navigatorAudience: -1, _navigatorPolicy: -1, ...topical } });
			} else pipeline.push({ $sort: topical });
			pipeline.push({ $limit: boundedLimit }, { $project: projection });
			return ScholarshipModel.aggregate(pipeline).option({ maxTimeMS: 3000 });
		},
		async getPublished(ids) {
			return ScholarshipModel.find({ ...PUBLIC, _id: { $in: ids.slice(0, 5) } }).select(SCHEME_FIELDS).maxTimeMS(3000).lean();
		},
		async getSnapshots(ids) {
			return SnapshotModel.find({ _id: { $in: ids.slice(0, 12) } }).select(SNAPSHOT_FIELDS).maxTimeMS(3000).lean();
		},
	};
}
