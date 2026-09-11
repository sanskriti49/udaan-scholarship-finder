import mongoose from "mongoose";
import dotenv from "dotenv";
import { AicteSource } from "../ingestion/sources/AicteSource.js";

dotenv.config();

async function runPipeline() {
	try {
		await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/udaan");
		console.log("Connected to MongoDB for Ingestion Pipeline Run.");

		const aicte = new AicteSource();
		const telemetry = await aicte.run();

		console.log("\n=== Ingestion Telemetry Summary ===");
		console.log(JSON.stringify(telemetry, null, 2));

		process.exit(0);
	} catch (err) {
		console.error("Ingestion failed:", err);
		process.exit(1);
	}
}

runPipeline();
