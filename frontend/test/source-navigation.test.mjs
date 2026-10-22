import test from "node:test";
import assert from "node:assert/strict";
import { citationLink, publicScholarshipUrl, scholarshipSourceLinks } from "../src/utils/sourceNavigation.js";

test("myScheme citations open the exact scholarship and retain the raw evidence source", () => {
	const url = "https://www.myscheme.gov.in/api/apisetu/schemes?slug=svmcms&lang=en";
	assert.deepEqual(citationLink({ url }), { href: "https://www.myscheme.gov.in/schemes/svmcms", label: "Scholarship page", rawUrl: url });
	assert.equal(publicScholarshipUrl("https://example.gov.in/api/schemes?id=42"), "https://example.gov.in/api/schemes?id=42");
});

test("PDF citations open the cited page without losing query parameters", () => {
	assert.equal(citationLink({ url: "https://example.gov.in/guideline.pdf?revision=3#zoom=125", page: 7 }).href, "https://example.gov.in/guideline.pdf?revision=3#zoom=125&page=7");
});

test("shared listings target the scholarship and cited passage in any language", () => {
	const evidence = { url: "https://example.gov.in/All-Scholarships", quote: "ఆదాయం 250000", page: null };
	const link = citationLink(evidence, { title: "తెలుగు పథకం" });
	assert.ok(link.href.startsWith(`${evidence.url}#:~:text=`));
	assert.match(decodeURIComponent(link.href), /తెలుగు పథకం&text=ఆదాయం 250000/);
	assert.equal(evidence.url, "https://example.gov.in/All-Scholarships");
	assert.equal(citationLink({ url: "https://example.gov.in/#/scheme/42", quote: "Hello" }).href, "https://example.gov.in/#/scheme/42");
	assert.doesNotThrow(() => citationLink({ url: evidence.url, quote: "a".repeat(299) + "🎓" }));
});

test("legacy portal links recover a scheme page from evidence without relabelling a homepage as guidelines", () => {
	const scholarship = { title: "SVMCM", sourceUrl: "https://svmcm.wb.gov.in/", officialLinks: { guidelinesUrl: "https://svmcm.wb.gov.in/" } };
	const result = scholarshipSourceLinks(scholarship, { data: [{ url: "https://www.myscheme.gov.in/api/apisetu/schemes?slug=svmcms&lang=en" }] });
	assert.equal(new URL(result.sourceUrl).pathname, "/schemes/svmcms");
	assert.equal(result.guidelinesLabel, "Provider portal");
	assert.equal(citationLink({ url: "javascript:alert(1)" }).href, null);
});
