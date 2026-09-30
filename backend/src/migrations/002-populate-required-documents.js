import { buildRequiredDocuments } from "../pipeline/core/requiredDocuments.js";

/**
 * Migration 002 — Populate required documents on all scholarships.
 *
 * Scans for any scholarship records with empty or missing requiredDocuments
 * and populates them using the deterministic requiredDocuments engine.
 */
export const id = "002-populate-required-documents";

export async function up({ db, models, log = console.log }) {
	const scholarships = db.collection("scholarships");

	const cursor = scholarships.find({
		$or: [
			{ requiredDocuments: { $exists: false } },
			{ requiredDocuments: { $size: 0 } },
			{ requiredDocuments: null },
		],
	});

	let updated = 0;
	for await (const doc of cursor) {
		const facts = {
			gender: doc.eligibility?.gender || null,
			level: doc.level || null,
			disabilityRequired: Boolean(doc.eligibility?.disabilityRequired),
			casteGroups: doc.eligibility?.casteCategories || null,
			familyIncome: doc.eligibility?.familyIncome || null,
			minDisabilityPercent: doc.eligibility?.minDisabilityPercent
				? { value: doc.eligibility.minDisabilityPercent }
				: null,
		};
		const candidate = {
			fields: {
				title: doc.title || doc.officialTitle,
				tags: doc.tags || [],
				state: doc.state,
			},
		};
		const requiredDocuments = buildRequiredDocuments(facts, candidate, {}, doc.state);
		await scholarships.updateOne(
			{ _id: doc._id },
			{ $set: { requiredDocuments } },
		);
		updated++;
	}

	log(`[${id}] populated requiredDocuments for ${updated} scholarship records`);
	return { updated };
}
