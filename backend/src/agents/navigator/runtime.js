import { readNavigatorConfig } from "./config.js";
import { createMongoRunStore } from "./mongoRunStore.js";
import { createMongoResearchRepository } from "./mongoRepository.js";
import { createResearchProvider } from "./provider.js";
import { createDurableNavigator } from "./durableNavigator.js";
import { createOfficialSourceChecker } from "./officialSource.js";
import { researchExecutionBudgets } from './executionBudgets.js';

export async function initializeNavigator({ connection, env = process.env, fetchImpl }) {
	const config = readNavigatorConfig(env);
	if (!config.enabled) return null;
	const budgets = researchExecutionBudgets(config);
	const store = createMongoRunStore({ db: connection.db, leaseMs: budgets.leaseMs });
	await store.initialize();
	const service = createDurableNavigator({ store, repository: createMongoResearchRepository(), provider: createResearchProvider({ ...config, fetchImpl }), sourceChecker: createOfficialSourceChecker(), config, maxAdvanceMs: budgets.maxAdvanceMs, env });
	return { store, service, provider: config.provider, model: config.model, ready: () => connection.readyState === 1 };
}
