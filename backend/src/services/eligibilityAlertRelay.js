import EligibilityRuleVersion from "../models/EligibilityRuleVersion.js";
import Scholarship from "../models/Scholarship.js";

export async function relayEligibilityAlerts({ Version = EligibilityRuleVersion, Scheme = Scholarship, enqueue, now = () => new Date() } = {}) {
	const enqueueJob = enqueue || (await import("../queues/eligibilityQueue.js")).enqueueEligibilityChange;
	const versions = Version.find({ $or: [{ "alert.status": "pending" }, {
		"alert.status": "queued", "alert.queuedAt": { $lte: new Date(now().getTime() - 60 * 60 * 1000) },
	}] }).sort({ observedAt: 1 }).lean().cursor();
	let queued = 0;
	for await (const version of versions) {
		// A version written before a failed scholarship save is not a published event.
		const record = await Scheme.findOne({ _id: version.scholarship }).lean();
		if (!record) continue;
		if (String(record.eligibilityVersion) !== String(version._id)) {
			let descendant = record.eligibilityVersion ? await Version.findById(record.eligibilityVersion).lean() : null;
			for (let depth = 0; descendant?.previousVersion && depth < 100; depth++) {
				if (String(descendant.previousVersion) === String(version._id)) {
					await Version.updateOne({ _id: version._id, "alert.status": { $in: ["pending", "queued"] } },
						{ $set: { "alert.status": "suppressed", "alert.completedAt": now(), "alert.result": { reason: "Version superseded before delivery" } } });
					break;
				}
				descendant = await Version.findById(descendant.previousVersion).lean();
			}
			continue;
		}
		if (record.publication?.state !== "published") continue;
		const job = await enqueueJob({ scholarshipId: String(version.scholarship),
			previousVersionId: String(version.previousVersion), currentVersionId: String(version._id) });
		if (!job) continue;
		await Version.updateOne({ _id: version._id, "alert.status": { $in: ["pending", "queued"] } },
			{ $set: { "alert.status": "queued", "alert.queuedAt": now() } });
		queued++;
		if (queued === 100) break;
	}
	return { queued };
}
