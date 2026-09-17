import { Pipeline } from "../src/pipeline/pipeline.js";
import { MemoryStore } from "../src/pipeline/store/memoryStore.js";
import { SafeFetcher, createRecordedTransport, resetHostState } from "../src/pipeline/core/http.js";
import { loadRecordings } from "../src/pipeline/recordings.js";
import { SOURCE_REGISTRY } from "../src/pipeline/sources.js";

process.env.PIPELINE_LOG_LEVEL = process.env.PIPELINE_LOG_LEVEL || "silent";

export const LISTING_URL = "https://scholarships.gov.in/All-Scholarships";
export const HOME_URL = "https://scholarships.gov.in/";
export const NSP = SOURCE_REGISTRY.find((s) => s.id === "nsp_central_sector");
export const CAPTURED_AT = new Date("2026-09-17T06:00:00.000Z");

export const KEYS = {
	csss: "nsp:department-of-higher-education:pm-usp-central-sector-scheme-of-scholarship-for-college-and-university-students-csss",
	pragatiDegree: "nsp:all-india-council-for-technical-education:aicte-pragati-scholarship-scheme-for-girl-students-technical-degree",
	pragatiDiploma: "nsp:all-india-council-for-technical-education:aicte-pragati-scholarship-scheme-for-girl-students-technical-diploma",
	sakshamDegree: "nsp:all-india-council-for-technical-education:aicte-saksham-scholarship-scheme-for-specially-abled-student-technical-degree",
	swanathDegree: "nsp:all-india-council-for-technical-education:aicte-swanath-scholarship-scheme-technical-degree",
	ishan: "nsp:ugc:ishan-uday-special-scholarship-scheme-for-ner",
	nspg: "nsp:ugc:national-scholarship-for-post-graduate-studies",
	nmmss: "nsp:department-of-school-education-and-literacy:national-means-cum-merit-scholarship",
	nref: "nsp:ministry-of-new-and-renewable-energy:national-renewable-energy-fellowship-scheme",
	jkl: "nsp:all-india-council-for-technical-education:pm-usp-special-scholarship-scheme-for-jammu-kashmir-and-ladakh",
	depwdPre: "nsp:department-of-empowerment-of-persons-with-disabilities:pre-matric-scholarship-for-students-with-disabilities",
};

export const recordings = loadRecordings();
export const listingText = recordings.records.find((r) => r.url === LISTING_URL).text;

export const textResponse = (text, sourceType = "text/html", capturedAt = CAPTURED_AT.toISOString()) => async () => ({
	status: 200,
	headers: {
		get: (name) =>
			({
				"content-type": "text/x-captured-text",
				"x-captured-source-type": sourceType,
				"x-captured-at": capturedAt,
			})[name.toLowerCase()] ?? null,
	},
	body: Buffer.from(text, "utf8"),
});

export const failing = (code = "ECONNRESET") => async () => {
	const e = new Error(`simulated ${code}`);
	e.code = code;
	throw e;
};

/**
 * Build a pipeline over recorded captures. `overrides` maps URL → transport fn
 * and can be swapped between runs via the returned setter.
 */
export function makeHarness({ now = new Date("2026-09-17T08:00:00.000Z"), store = new MemoryStore(), onDataChange } = {}) {
	resetHostState();
	const state = { overrides: {}, now };
	const transport = createRecordedTransport(recordings.records, { overrides: new Proxy({}, { get: (_, k) => state.overrides[k] }) });
	const pipeline = new Pipeline({
		store,
		now: () => state.now,
		onDataChange,
		fetcherFactory: (source) =>
			new SafeFetcher({
				allowedDomains: source.allowedDomains,
				transport,
				minIntervalMs: 0,
				retries: 1,
				backoffBaseMs: 1,
				sleep: async () => {},
			}),
	});
	return {
		pipeline,
		store,
		run: (source = NSP) => pipeline.runSource(source),
		setOverrides: (o) => {
			state.overrides = o;
		},
		setNow: (d) => {
			state.now = d;
		},
	};
}
