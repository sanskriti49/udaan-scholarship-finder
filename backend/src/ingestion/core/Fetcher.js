import { chromium } from "playwright";

const USER_AGENTS = [
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
];

export class Fetcher {
	static getRandomUserAgent() {
		const idx = Math.floor(Math.random() * USER_AGENTS.length);
		return USER_AGENTS[idx];
	}

	/**
	 * Fast HTTP Fetcher with retries and exponential backoff
	 */
	static async fetchHttp(url, options = {}) {
		const maxRetries = options.retries || 2;
		const timeoutMs = options.timeoutMs || 8000;
		let attempt = 0;
		let lastError = null;

		while (attempt <= maxRetries) {
			try {
				const controller = new AbortController();
				const timer = setTimeout(() => controller.abort(), timeoutMs);

				const res = await fetch(url, {
					method: options.method || "GET",
					headers: {
						"User-Agent": this.getRandomUserAgent(),
						Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
						"Accept-Language": "en-US,en;q=0.9",
						...(options.headers || {}),
					},
					signal: controller.signal,
					redirect: "follow",
				});

				clearTimeout(timer);

				if (!res.ok && res.status >= 500 && attempt < maxRetries) {
					throw new Error(`HTTP Server Error ${res.status}`);
				}

				return await res.text();
			} catch (err) {
				lastError = err;
				attempt++;
				if (attempt <= maxRetries) {
					const delay = Math.pow(2, attempt) * 500;
					await new Promise((r) => setTimeout(r, delay));
				}
			}
		}

		throw lastError;
	}

	/**
	 * Playwright Dynamic Headless Fetcher for JS-rendered portals
	 */
	static async fetchDynamic(url, options = {}) {
		const timeout = options.timeout || 15000;
		let browser = null;

		try {
			browser = await chromium.launch({
				headless: true,
				args: [
					"--no-sandbox",
					"--disable-setuid-sandbox",
					"--disable-dev-shm-usage",
					"--disable-gpu",
				],
			});

			const context = await browser.newContext({
				userAgent: this.getRandomUserAgent(),
				viewport: { width: 1280, height: 800 },
			});

			const page = await context.newPage();
			await page.goto(url, {
				timeout,
				waitUntil: options.waitUntil || "domcontentloaded",
			});

			if (options.selector) {
				await page.waitForSelector(options.selector, { timeout: 5000 }).catch(() => {});
			}

			const content = await page.content();
			await browser.close();
			browser = null;
			return content;
		} catch (err) {
			if (browser) await browser.close().catch(() => {});
			throw err;
		}
	}
}

export default Fetcher;
