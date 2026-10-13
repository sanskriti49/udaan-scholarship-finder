export const id = "006-eligibility-alert-indexes";

export async function up({ models, log = console.log }) {
	const created = [];
	for (const model of models.filter(m => ["EligibilityRuleVersion", "EligibilityAlertDelivery"].includes(m.modelName))) {
		await model.createIndexes();
		created.push(model.modelName);
		log(`[${id}] created additive indexes for ${model.modelName}`);
	}
	return { created };
}
