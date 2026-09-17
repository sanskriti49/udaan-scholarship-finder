import "dotenv/config";
import mongoose from "mongoose";
import { runMigrations } from "../migrations/runner.js";

await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/udaan");
const applied = await runMigrations();
console.log(applied.length ? `Applied: ${applied.map((m) => m.id).join(", ")}` : "No pending migrations.");
await mongoose.disconnect();
