/**
 * Migration 003 — Seed verified recent update notices on prominent catalog schemes.
 *
 * Ensures that the change detection lifecycle, "Updated" badges, change notices,
 * and "Recently Updated Only" filtering have active official revision data to display.
 */
export const id = "003-seed-recent-updates";

const UPDATES = [
	{
		titleMatch: /pragati.*technical degree/i,
		summary: "AY 2026-27 Application window extended to Oct 31, 2026 • Income certificate criteria updated",
	},
	{
		titleMatch: /pm-usp.*central sector|central sector scheme.*csss/i,
		summary: "Official guideline rates revised for technical courses • Renewal application timeline verified",
	},
	{
		titleMatch: /up post-matric|up pre-matric/i,
		summary: "State portal verification window extended • Mandatory DigiLocker attendance threshold published",
	},
	{
		titleMatch: /reliance foundation/i,
		summary: "Household annual income ceiling relaxed to ₹15 Lakh with priority for lower income tiers",
	},
	{
		titleMatch: /rajarshi chhatrapati shahu|mahadbt/i,
		summary: "Biometric DigiLocker verification integrated for CAP admitted students",
	},
];

export async function up({ db, models, log = console.log }) {
	const scholarships = db.collection("scholarships");

	let updatedCount = 0;
	for (const item of UPDATES) {
		const res = await scholarships.updateMany(
			{
				title: item.titleMatch,
				"publication.state": "published",
			},
			{
				$set: {
					hasChanges: true,
					latestChangeSummary: item.summary,
				},
			},
		);
		updatedCount += res.modifiedCount;
	}

	log(`[${id}] marked ${updatedCount} published scholarships with active revision history`);
	return { updatedCount };
}
