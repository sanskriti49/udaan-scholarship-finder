import { FetchError, sha256 } from "./http.js";
import { hostMatches } from "./urls.js";

/**
 * Browser rendering for sources that genuinely need JavaScript. It is only used
 * when a source sets `strategy: "dynamic"`; none of the currently enabled
 * official sources do (the NSP listing is server-rendered). Playwright is
 * imported lazily so the API server and static crawls never load a browser.
 *
 * The rendered HTML is returned in the same shape as SafeFetcher results so the
 * rest of the pipeline is unchanged. Top-level navigations outside the
 * allowlist are blocked.
 */
export async function fetchRendered(url, { allowedDomains, timeoutMs = 30000, waitForSelector, fetcher } = {}) {
	if (fetcher) fetcher.assertAllowed(url);
	let chromium;
	try {
		({ chromium } = await import("playwright"));
	} catch {
		throw new FetchError("DYNAMIC_UNAVAILABLE", "Playwright is not installed; cannot render dynamic source");
	}

	const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
	try {
		const context = await browser.newContext({ userAgent: fetcher?.userAgent });
		const page = await context.newPage();
		await page.route("**/*", (route) => {
			const request = route.request();
			if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
				const host = new URL(request.url()).hostname;
				if (!hostMatches(host, allowedDomains)) return route.abort();
			}
			return route.continue();
		});
		const response = await page.goto(url, { timeout: timeoutMs, waitUntil: "networkidle" });
		if (!response || response.status() >= 400) {
			throw new FetchError("HTTP_STATUS", `HTTP ${response ? response.status() : "no response"}`, {
				url,
				status: response?.status(),
				retryable: false,
			});
		}
		if (waitForSelector) {
			// A missing selector means the page did not render what we expect: fail loudly.
			await page.waitForSelector(waitForSelector, { timeout: Math.min(timeoutMs, 15000) });
		}
		const html = await page.content();
		const body = Buffer.from(html, "utf8");
		return {
			url,
			finalUrl: page.url(),
			status: response.status(),
			notModified: false,
			contentType: "text/html; rendered",
			body,
			byteLength: body.length,
			sha256: sha256(body),
			fetchedAt: new Date(),
			attempts: 1,
		};
	} finally {
		await browser.close().catch(() => {});
	}
}
