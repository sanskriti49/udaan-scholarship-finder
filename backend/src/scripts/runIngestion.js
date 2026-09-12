import mongoose from "mongoose";
import dotenv from "dotenv";
import { sourceRegistry } from "../ingestion/SourceRegistry.js";

dotenv.config();

async function runPipeline() {
	try {
		await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/udaan");
		console.log("Connected to MongoDB for Source Registry Pipeline Crawl.");

		const summary = await sourceRegistry.runAll();

		console.log("\n=== Full Ingestion Pipeline Summary ===");
		console.log(JSON.stringify(summary, null, 2));

		process.exit(0);
	} catch (err) {
		console.error("Ingestion failed:", err);
		process.exit(1);
	}
}

runPipeline();
