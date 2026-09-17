/**
 * Migration 001 — provenance-first scholarship pipeline.
 *
 * What it does (idempotent, never deletes a document):
 *  1. Marks every scholarship created by the old hardcoded "crawlers" as legacy:
 *     - moves its unverified values (amount, deadline, rules, citations, …) into
 *       `legacySnapshot` for audit;
 *     - clears those fields so nothing invented is served;
 *     - sets publication.state = "retired" (hidden from the public API; bookmarks
 *       still resolve).
 *     Records whose slug is in a source's `legacyAliases` are later adopted by the
 *     pipeline, which re-populates them from official evidence and republishes them
 *     under the same _id.
 *  2. Flags version-history entries written by the old bootstrap as
 *     `legacyUnverified` (they described changes that never happened).
 *  3. Syncs indexes for the new and changed collections (drops the old
 *     single-field indexes that no longer exist in the schema).
 */
export const id = "001-provenance-pipeline";

const LEGACY_FIELDS = [
	"amount",
	"deadline",
	"applicationOpenDate",
	"rules",
	"requiredDocuments",
	"provenanceQuotes",
	"eligibility",
	"description",
	"summary",
	"category",
	"level",
	"tags",
	"applicationLink",
	"contentHash",
	"trustScore",
	"hasChanges",
	"latestChangeSummary",
	"verified",
	"popular",
	"lastScrapedAt",
	"rawData",
];

export async function up({ db, models, log = console.log }) {
	const scholarships = db.collection("scholarships");
	const legacyCursor = scholarships.find({ schemeKey: { $exists: false }, legacy: { $ne: true } });
	let retired = 0;
	for await (const doc of legacyCursor) {
		const snapshot = {};
		for (const field of LEGACY_FIELDS) if (doc[field] !== undefined) snapshot[field] = doc[field];
		const reset = {
			legacy: true,
			legacySnapshot: { ...snapshot, migratedAt: new Date(), reason: "values were hardcoded, not extracted from official sources" },
			publication: {
				state: "retired",
				updatedAt: new Date(),
				note: "Pre-provenance record. Hidden until re-verified from an official source.",
			},
			status: "unknown",
			stale: true,
			verified: false,
			popular: false,
			hasChanges: false,
			deadline: null,
			sortDeadline: null,
			currentCycle: null,
			amount: null,
			rules: [],
			requiredDocuments: [],
			provenanceQuotes: [],
			fieldEvidence: [],
			tags: [],
		};
		// Everything else that was invented is removed; $set and $unset must not overlap.
		const unset = Object.fromEntries(LEGACY_FIELDS.filter((f) => !(f in reset)).map((f) => [f, ""]));
		await scholarships.updateOne({ _id: doc._id }, { $set: reset, $unset: unset });
		retired += 1;
	}
	log(`[${id}] retired ${retired} legacy scholarship records (kept, hidden, values moved to legacySnapshot)`);

	const versions = db.collection("scholarshipversions");
	const flagged = await versions.updateMany(
		{ runId: { $exists: false }, legacyUnverified: { $ne: true } },
		{ $set: { legacyUnverified: true } },
	);
	log(`[${id}] flagged ${flagged.modifiedCount} legacy version entries as unverified`);

	for (const model of models) {
		const dropped = await model.syncIndexes();
		log(`[${id}] indexes synced for ${model.modelName}${dropped?.length ? ` (dropped: ${dropped.join(", ")})` : ""}`);
	}
	return { retired, flaggedVersions: flagged.modifiedCount };
}
