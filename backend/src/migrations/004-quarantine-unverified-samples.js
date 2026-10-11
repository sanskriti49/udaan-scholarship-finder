import { UNVERIFIED_UPDATE_SUMMARIES } from "./003-seed-recent-updates.js";


export const id = "004-quarantine-unverified-samples";

/** Only known sample captures and exact canned summaries are affected; nothing is deleted. */
export async function up({ db, log = console.log }) {
	const scholarships = db.collection("scholarships");
	const cleared = await scholarships.updateMany(
		{ latestChangeSummary: { $in: UNVERIFIED_UPDATE_SUMMARIES } },
		{ $set: { hasChanges: false, latestChangeSummary: "" } },
	);
	const sampleHomes = [
		"https://scholarship.up.gov.in/", "https://mahadbt.maharashtra.gov.in/",
		"https://ssp.postmatric.karnataka.gov.in/", "https://svmcm.wbhed.gov.in/",
		"https://pmsonline.bihar.gov.in/", "https://online-inspire.gov.in/",
		"https://www.aicte-india.org/", "https://www.ongcscholar.org/",
	];
	const sampleUrls = sampleHomes.flatMap((url) => [url, new URL("api/schemes", url).toString()]);
	const snapshots = await db.collection("sourcesnapshots").find({
		url: { $in: sampleUrls }, capturedSourceType: "application/json", contentType: /^text\/x-captured-text/,
	}).toArray();
	const ids = snapshots.flatMap((s) => [s._id, String(s._id)]);
	const keys = [];
	if (ids.length) {
		const cursor = scholarships.find({ "fieldEvidence.snapshotId": { $in: ids }, legacy: { $ne: true } });
		for await (const record of cursor) {
			const { _id, ...archive } = record;
			await scholarships.updateOne({ _id }, { $set: {
				legacy: true, legacySnapshot: { ...archive, reason: "unverified_normalized_feed_sample", quarantinedAt: new Date() },
				publication: { state: "needs_review", updatedAt: new Date(), note: "Based on an unverified normalized test sample. Hidden pending fresh official-source ingestion." },
				verified: false, stale: true, status: "unknown", deadline: null, sortDeadline: null, currentCycle: null,
				amount: null, eligibility: {}, rules: [], provenanceQuotes: [], fieldEvidence: [], requiredDocuments: [],
				hasChanges: false, latestChangeSummary: "",
			} });
			keys.push(record.schemeKey);
		}
	}
	if (keys.length) {
		await db.collection("scholarshipcycles").updateMany({ schemeKey: { $in: keys } }, { $set: { legacyUnverified: true } });
		await db.collection("scholarshipversions").updateMany({ schemeKey: { $in: keys } }, { $set: { legacyUnverified: true } });
	}
	const result = { clearedCannedNotices: cleared.modifiedCount, quarantinedSamples: keys.length };
	log(`[${id}] ${JSON.stringify(result)}; records and bookmarks retained`);
	return result;
}
