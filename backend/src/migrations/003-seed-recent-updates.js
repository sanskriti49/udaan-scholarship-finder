/**
 * Retained migration ID for existing installations. Canned change notices are
 * not official evidence and must never be seeded into a user's catalogue.
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

export const UNVERIFIED_UPDATE_SUMMARIES = UPDATES.map((item) => item.summary);

export async function up({ log = console.log }) {
	log(`[${id}] skipped unverified canned update notices`);
	return { updatedCount: 0, skippedUnverifiedNotices: true };
}
