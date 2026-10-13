import { explainEligibilityImpact, eligibilityImpactMessage } from "../engine/eligibilityImpact.js";
import { verifyEvidence } from "../pipeline/core/evidence.js";

export async function processEligibilityChange(job, { Scholarship, EligibilityRuleVersion, SourceSnapshot, Bookmark, UserProfile, notificationService }) {
	const { scholarshipId, previousVersionId, currentVersionId } = job.data;
	const [scholarship, previous, current] = await Promise.all([
		Scholarship.findById(scholarshipId).lean(), EligibilityRuleVersion.findById(previousVersionId).lean(),
		EligibilityRuleVersion.findById(currentVersionId).lean(),
	]);
	const finish = async (status, result) => {
		await EligibilityRuleVersion.updateOne({ _id: currentVersionId, "alert.status": { $in: ["pending", "queued"] } },
			{ $set: { "alert.status": status, "alert.completedAt": new Date(), "alert.result": result } });
		return result;
	};
	if (!previous || !current || String(current.scholarship) !== String(scholarshipId) ||
		String(previous.scholarship) !== String(scholarshipId) || String(current.previousVersion) !== String(previousVersionId) ||
		!previous.verified || !current.verified) return { status: "SKIPPED", reason: "Unverified or mismatched rule versions" };
	if (!scholarship || scholarship.legacy || scholarship.publication?.state !== "published" ||
		String(scholarship.eligibilityVersion) !== String(currentVersionId)) {
		return finish("suppressed", { status: "SKIPPED", reason: "Scheme unavailable or version superseded" });
	}
	for (const version of [previous, current]) {
		for (const evidence of version.evidence) {
			const snapshot = await SourceSnapshot.findById(evidence.snapshotId).lean();
			if (!snapshot || !verifyEvidence(evidence, { ...snapshot, id: String(snapshot._id || snapshot.id) }).ok)
				return finish("suppressed", { status: "SKIPPED", reason: "Source evidence failed verification" });
		}
		if (!version.snapshot.rules.length || version.snapshot.rules.some(r => !version.evidence.some(e => e.ruleId === r.id)))
			return finish("suppressed", { status: "SKIPPED", reason: "Incomplete rule evidence" });
	}
	let recipients = 0, dispatched = 0, unchanged = 0, skipped = 0;
	const errors = [];
	async function recipient(bookmark) {
		const prefs = await notificationService.getPreferences(bookmark.user);
		if (prefs.eligibilityChanges !== true || (prefs.channels?.inApp === false && prefs.channels?.email === false)) { skipped++; return; }
		const profile = await UserProfile.findOne({ user: bookmark.user }).lean();
		if (!profile || !(await Bookmark.exists({ user: bookmark.user, scholarship: scholarshipId }))) { skipped++; return; }
		const impact = explainEligibilityImpact(profile, previous, current);
		if (!impact) { unchanged++; return; }
		const notification = await notificationService.createNotification(bookmark.user, {
			type: "ELIGIBILITY_CHANGED", title: `Eligibility check changed: ${scholarship.title}`,
			message: eligibilityImpactMessage(impact), scholarship: scholarshipId, scholarshipTitle: scholarship.title,
			priority: impact.changes.some(c => c.currentStatus !== "passed") ? "high" : "medium",
			data: impact, evidence: { eligibilityReason: "You enabled eligibility-change alerts for saved scholarships." },
			link: "/eligibility", dedupKey: `eligibility_change:${bookmark.user}:${scholarshipId}:${currentVersionId}`,
		});
		if (notification) dispatched++;
	}
	let batch = [];
	async function flush() {
		for (const result of await Promise.allSettled(batch.map(recipient))) if (result.status === "rejected") errors.push(result.reason);
		batch = [];
	}
	for await (const bookmark of Bookmark.find({ scholarship: scholarshipId }).lean().cursor()) {
		recipients++; batch.push(bookmark);
		if (batch.length === 10) await flush();
	}
	if (batch.length) await flush();
	// Never swallow failures: BullMQ retries the event; permanent receipts skip prior deliveries.
	if (errors.length) throw new AggregateError(errors, `${errors.length} eligibility alert deliveries failed; retry required`);
	return finish("completed", { status: "COMPLETED", recipients, dispatched, unchanged, skipped });
}
