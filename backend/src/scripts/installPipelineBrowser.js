import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

// Render's build filesystem is persisted into the runtime; keep the matching
// browser with the installed package instead of an ephemeral home cache.
if (process.env.RENDER === "true") {
	process.env.PLAYWRIGHT_BROWSERS_PATH ||= "0";
	const require = createRequire(import.meta.url);
	const cli = path.join(path.dirname(require.resolve("playwright/package.json")), "cli.js");
	const result = spawnSync(process.execPath, [cli, "install", "chromium", "--only-shell"], { stdio: "inherit", env: process.env });
	if (result.status !== 0) process.exit(result.status || 1);
	const { chromium } = await import("playwright");
	const browser = await chromium.launch({ headless: true });
	console.log(`[Browser setup] Chromium ${browser.version()} starts successfully.`);
	await browser.close();
}
