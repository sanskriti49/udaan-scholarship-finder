export const browserHealth = { available: null, checkedAt: null };

export async function checkBrowserHealth() {
	if (process.env.RENDER === "true") process.env.PLAYWRIGHT_BROWSERS_PATH ||= "0";
	let browser;
	try {
		const { chromium } = await import("playwright");
		browser = await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {})});
		Object.assign(browserHealth, { available: true, version: browser.version() });
	} catch {
		Object.assign(browserHealth, { available: false, note: "Chromium is unavailable; install the matching browser and system dependencies." });
	} finally {
		await browser?.close();
		browserHealth.checkedAt=new Date().toISOString();
	}
	return browserHealth;
}
