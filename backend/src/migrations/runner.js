import mongoose from "mongoose";
import Scholarship from "../models/Scholarship.js";
import ScholarshipCycle from "../models/ScholarshipCycle.js";
import ScholarshipVersion from "../models/ScholarshipVersion.js";
import SourceSnapshot from "../models/SourceSnapshot.js";
import SourceState from "../models/SourceState.js";
import CrawlRun from "../models/CrawlRun.js";
import IngestionIssue from "../models/IngestionIssue.js";
import * as m001 from "./001-provenance-pipeline.js";
import * as m002 from "./002-populate-required-documents.js";
import * as m003 from "./003-seed-recent-updates.js";

export const MIGRATIONS = [m001, m002, m003];
export const PIPELINE_MODELS = [Scholarship, ScholarshipCycle, ScholarshipVersion, SourceSnapshot, SourceState, CrawlRun, IngestionIssue];

/** Applies pending migrations in order and records them in `migrations`. */
export async function runMigrations({ log = console.log } = {}) {
	const db = mongoose.connection.db;
	const applied = db.collection("migrations");
	const results = [];
	for (const migration of MIGRATIONS) {
		if (await applied.findOne({ _id: migration.id })) continue;
		log(`[migrations] applying ${migration.id}`);
		const result = await migration.up({ db, models: PIPELINE_MODELS, log });
		await applied.insertOne({ _id: migration.id, appliedAt: new Date(), result });
		results.push({ id: migration.id, result });
	}
	return results;
}
