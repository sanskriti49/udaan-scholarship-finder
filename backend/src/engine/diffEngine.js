import ScholarshipVersion from "../models/ScholarshipVersion.js";

/**
 * Diff Engine for Udaan
 * Computes deep semantic differences between existing scholarship snapshots and newly ingested data.
 * Records atomic version diffs without overwriting historical auditability.
 */
export async function detectAndApplyChanges(existingScholarship, incomingData) {
	const deltas = [];
	let primaryChangeType = null;
	let summary = "";

	// 1. Deadline Change Detection
	if (incomingData.deadline && existingScholarship.deadline) {
		const oldDate = new Date(existingScholarship.deadline).getTime();
		const newDate = new Date(incomingData.deadline).getTime();
		const diffDays = Math.round((newDate - oldDate) / (1000 * 60 * 60 * 24));

		if (Math.abs(diffDays) >= 2) {
			if (diffDays > 0) {
				primaryChangeType = "DEADLINE_EXTENSION";
				summary = `Application deadline extended by ${diffDays} calendar days.`;
			} else {
				primaryChangeType = "DEADLINE_SHORTENED";
				summary = `Application closing date moved earlier by ${Math.abs(diffDays)} days.`;
			}

			deltas.push({
				field: "deadline",
				oldValue: existingScholarship.deadline,
				newValue: incomingData.deadline,
				humanReadable: summary,
			});
		}
	}

	// 2. Income Ceiling Change Detection
	const oldIncomeRule = existingScholarship.rules?.find((r) => r.field === "familyIncome");
	const newIncomeRule = incomingData.rules?.find((r) => r.field === "familyIncome");

	if (oldIncomeRule && newIncomeRule && oldIncomeRule.targetValue !== newIncomeRule.targetValue) {
		const oldLimit = Number(oldIncomeRule.targetValue);
		const newLimit = Number(newIncomeRule.targetValue);
		const diff = newLimit - oldLimit;

		primaryChangeType = "INCOME_CEILING_CHANGE";
		summary = `Family income ceiling updated from ₹${oldLimit.toLocaleString("en-IN")} to ₹${newLimit.toLocaleString("en-IN")}.`;

		deltas.push({
			field: "familyIncome",
			oldValue: oldLimit,
			newValue: newLimit,
			humanReadable: summary,
		});
	}

	// 3. Award Amount Change Detection
	if (
		incomingData.amount?.value &&
		existingScholarship.amount?.value &&
		incomingData.amount.value !== existingScholarship.amount.value
	) {
		const oldVal = existingScholarship.amount.value;
		const newVal = incomingData.amount.value;

		if (!primaryChangeType) primaryChangeType = "AWARD_UPDATE";
		const awardSummary = `Award amount updated from ₹${oldVal.toLocaleString("en-IN")} to ₹${newVal.toLocaleString("en-IN")}.`;
		if (!summary) summary = awardSummary;

		deltas.push({
			field: "amount.value",
			oldValue: oldVal,
			newValue: newVal,
			humanReadable: awardSummary,
		});
	}

	// If meaningful changes detected, record version snapshot
	if (deltas.length > 0 && primaryChangeType) {
		const versionRecord = await ScholarshipVersion.create({
			scholarship: existingScholarship._id,
			observedAt: new Date(),
			changeType: primaryChangeType,
			summary,
			deltas,
			sourceSnapshotUrl: incomingData.sourceUrl || existingScholarship.sourceUrl,
			contentHash: incomingData.contentHash || existingScholarship.contentHash,
		});

		// Update canonical scholarship with latest change flag and summary
		existingScholarship.hasChanges = true;
		existingScholarship.latestChangeSummary = summary;
		if (incomingData.deadline) existingScholarship.deadline = incomingData.deadline;
		if (incomingData.amount) existingScholarship.amount = incomingData.amount;
		if (incomingData.rules) existingScholarship.rules = incomingData.rules;
		existingScholarship.lastScrapedAt = new Date();
		await existingScholarship.save();

		return {
			hasChanges: true,
			changeType: primaryChangeType,
			summary,
			deltas,
			version: versionRecord,
		};
	}

	// No deltas -> just update timestamp
	existingScholarship.lastScrapedAt = new Date();
	await existingScholarship.save();

	return { hasChanges: false };
}
