import { spawn, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

// This runner owns its container. It never reads .env or an application DB URI.
const name = `udaan-navigator-test-${randomUUID()}`;
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"] }).trim();
let started = false, client, child;
const interrupt = () => child?.kill("SIGINT");
process.once("SIGINT", interrupt); process.once("SIGTERM", interrupt);
try {
	docker("run", "--detach", "--rm", "--name", name, "--publish", "127.0.0.1::27017", "mongo:7", "--quiet", "--bind_ip_all");
	started = true;
	const address = docker("port", name, "27017/tcp");
	if (!/^127\.0\.0\.1:\d+$/.test(address)) throw new Error("Test MongoDB must bind only to loopback.");
	const uri = `mongodb://${address}/?directConnection=true`;
	client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 1000, connectTimeoutMS: 1000 });
	for (let attempt = 0; ; attempt++) {
		try { await client.connect(); await client.db("admin").command({ ping: 1 }); break; }
		catch (error) { if (attempt >= 25) throw error; await new Promise(resolve => setTimeout(resolve, 300)); }
	}
	await client.close(); client = null;
	console.log("Navigator durability checks: isolated MongoDB 7; scripted models; no application database or live provider.");
	child = spawn(process.execPath, ["--test", ...process.argv.slice(2), "test/durable/navigator-durable.test.mjs"], {
		stdio: "inherit", env: { ...process.env, NAVIGATOR_TEST_MONGO: uri, LANGSMITH_TRACING: "false", LANGCHAIN_TRACING: "false", LANGCHAIN_TRACING_V2: "false" },
	});
	process.exitCode = await new Promise((resolve, reject) => { child.on("error", reject); child.on("exit", code => resolve(code ?? 1)); });
} catch (error) {
	console.error(`Durability checks failed: ${error.message}. Docker with the mongo:7 image is required.`);
	process.exitCode = 1;
} finally {
	await client?.close();
	if (started) {
		try { docker("stop", "--timeout", "3", name); }
		catch { console.error(`Could not stop owned test container ${name}.`); process.exitCode = 1; }
	}
	process.removeListener("SIGINT", interrupt); process.removeListener("SIGTERM", interrupt);
}
