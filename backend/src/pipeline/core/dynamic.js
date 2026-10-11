import { FetchError, SafeFetcher, sha256 } from "./http.js";
import { hostMatches } from "./urls.js";

/**
 * Render public, allowlisted pages. The pipeline decides when rendering is needed.
 * Browser traffic follows the source's robots policy and host request budget.
 */
export async function fetchRendered(url, {
	allowedDomains, resourceDomains = [], timeoutMs = 30000, waitForSelector,
	fetcher = new SafeFetcher({ allowedDomains }), browserType,
	channel = process.env.PLAYWRIGHT_CHANNEL, maxRequests = 150,
} = {}) {
	const start = fetcher.assertAllowed(url);
	if (!(await fetcher.robotsAllowed(start))) {
		throw new FetchError("ROBOTS_DISALLOWED", `robots.txt disallows ${start.pathname}`, { url });
	}
	if (process.env.RENDER === "true") process.env.PLAYWRIGHT_BROWSERS_PATH ||= "0";
	if (!browserType) {
		try { ({ chromium: browserType } = await import("playwright")); }
		catch { throw new FetchError("DYNAMIC_UNAVAILABLE", "Install Playwright and Chromium to render JavaScript sources"); }
	}
	return (async () => {
		let browser;
		let blockedNavigation = null;
		try {
			try { browser = await browserType.launch({ headless: true, ...(channel ? { channel } : {}) }); }
			catch (error) {
				throw new FetchError("DYNAMIC_UNAVAILABLE", "Browser could not start. Run npm run pipeline:browser:install or configure PLAYWRIGHT_CHANNEL", { cause: error });
			}
			const context = await browser.newContext({ userAgent: fetcher.userAgent, serviceWorkers: "block", acceptDownloads: false });
			const page = await context.newPage();
			let requestCount = 0;
			let documentRequests = 0;
			// Chromium's Fetch domain pauses every redirect hop before the network
			// request. Native browser TLS also handles government certificate chains
			// without disabling certificate verification or weakening Node TLS.
			const session = await context.newCDPSession(page);
			const { frameTree } = await session.send("Page.getFrameTree");
			const mainFrameId = frameTree.frame.id;
			await session.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
			session.on("Fetch.requestPaused", async ({ requestId, request, resourceType, frameId }) => {
				const isDocument = resourceType === "Document";
				try {
					const parsed = new URL(request.url);
					const domains = isDocument ? allowedDomains : [...allowedDomains, ...resourceDomains];
					if (!["http:", "https:"].includes(parsed.protocol) || !hostMatches(parsed.hostname, domains) || request.method !== "GET" || ++requestCount > maxRequests) {
						throw new FetchError("DOMAIN_NOT_ALLOWED", "Browser request left the source allowlist or GET request budget", { url: request.url });
					}
					if (["Image", "Media", "Font"].includes(resourceType)) {
						await session.send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }); return;
					}
					if (isDocument) {
						if (++documentRequests > 12) throw new FetchError("REDIRECT_LIMIT", "Too many browser document navigations");
						fetcher.assertAllowed(request.url);
						if (!(await fetcher.robotsAllowed(parsed))) throw new FetchError("ROBOTS_DISALLOWED", `robots.txt disallows ${parsed.pathname}`, { url: request.url });
						await fetcher.throttle(parsed.host, () => session.send("Fetch.continueRequest", { requestId }));
					} else {
						await session.send("Fetch.continueRequest", { requestId });
					}
				} catch (error) {
					if (isDocument && frameId === mainFrameId) blockedNavigation = error;
					await session.send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }).catch(() => {});
				}
			});
			// Long-lived analytics connections must not block extraction.
			const response = await page.goto(url, { timeout: timeoutMs, waitUntil: "domcontentloaded" });
			if (blockedNavigation) throw blockedNavigation;
			if (!response || response.status() < 200 || response.status() >= 300) {
				throw new FetchError("HTTP_STATUS", `HTTP ${response?.status() ?? "no response"}`, { url, status: response?.status(), retryable: false });
			}
			if (waitForSelector) await page.locator(waitForSelector).first().waitFor({ state: "attached", timeout: timeoutMs });
			else await page.waitForLoadState("load", { timeout: timeoutMs });
			if (blockedNavigation) throw blockedNavigation;
			fetcher.assertAllowed(page.url());
			const body = Buffer.from(await page.content(), "utf8");
			if (body.length > fetcher.maxBytes) throw new FetchError("TOO_LARGE", `Rendered page exceeded ${fetcher.maxBytes} bytes`);
			return {
				url, finalUrl: page.url(), status: response.status(), notModified: false,
				contentType: "text/html; rendered", body, byteLength: body.length,
				sha256: sha256(body), fetchedAt: new Date(fetcher.now()), attempts: 1, fetchMethod: "dynamic",
			};
		} catch (error) {
			if (blockedNavigation) throw blockedNavigation;
			if (error instanceof FetchError) throw error;
			throw new FetchError(error.name === "TimeoutError" ? "TIMEOUT" : "DYNAMIC_FAILED", error.message, { url });
		} finally { await browser?.close(); }
	})();
}
