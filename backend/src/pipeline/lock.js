import mongoose from "mongoose";
import { sha256 } from "./core/http.js";

// Several Udaan environments can share Redis. A crawl for another database
// must not suppress this catalogue's refresh. Credentials are never in the key.
export function catalogueNamespace() {
	let host=mongoose.connection.host || "local";
	try {host=new URL(process.env.MONGO_URI).hostname;} catch {}
	const database=mongoose.connection.name || "default";
	return sha256(`${host}/${database}`).slice(0,16);
}

export function crawlerLockKey() { return `lock:crawler:${catalogueNamespace()}:run`; }
