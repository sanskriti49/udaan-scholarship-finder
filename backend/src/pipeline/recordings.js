import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_RECORDING_DIR = path.resolve(here, "../../test/fixtures/recorded/2026-09-17");

/**
 * Loads captures of official pages (see manifest.json in the directory) for
 * replay runs. Replays use the capture timestamp as `fetchedAt`, so evidence
 * never claims to be fresher than it is.
 */
export function loadRecordings(dir = DEFAULT_RECORDING_DIR) {
	const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
	return {
		manifest,
		records: manifest.entries.map((entry) => ({
			url: entry.url.replace(/ /g, "%20"),
			text: fs.readFileSync(path.join(dir, entry.file), "utf8"),
			sourceContentType: entry.sourceContentType,
			capturedAt: entry.capturedAt || manifest.capturedAt,
			isExcerpt: Boolean(entry.isExcerpt),
		})),
	};
}
