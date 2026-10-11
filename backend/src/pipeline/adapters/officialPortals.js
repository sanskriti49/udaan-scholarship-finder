import * as cheerio from "cheerio";
import { makeEvidence } from "../core/evidence.js";
import { buildSchemeKey } from "../core/dedupe.js";
import { validateOfficialUrl } from "../core/urls.js";
import { normalizeAcademicYear, parseOfficialDate } from "../core/time.js";
import { htmlToText } from "../core/documents.js";

const tidy = (s) => String(s || "").replace(/\s+/g, " ").trim().replace(/^[\u200B-\u200D\uFEFF]+|[\u200B-\u200D\uFEFF]+$/g, "").trim();
const missing = () => ({ records: [], issues: [{ code: "page_structure_changed", severity: "blocking", message: "Expected official scholarship content is missing. Stored records are preserved." }] });
const link = (raw, doc, source) => {
	const checked = validateOfficialUrl(raw, source.allowedDomains, { base: doc.finalUrl || doc.url, allowRoot: true, preserveHash: true });
	return checked.ok ? checked.url : null;
};

function candidate(title, description, doc, snapshot, source, { key, organization, applyUrl, guidelinesUrl, cycles = [] } = {}) {
	const evidence = [makeEvidence(snapshot, title, { field: "title", locator: "official program title" })].filter(Boolean);
	if (!evidence.length) return null;
	const org = organization || source.publisher;
	const orgEvidence = makeEvidence(snapshot, org, { field: "organization" });
	if (orgEvidence) evidence.push(orgEvidence);
	return {
		sourceId: source.id, schemeKey: buildSchemeKey(source.id, org, key || title.replace(/\s+20\d{2}(?:-\d{2})?(?:\s+scheme)?$/i, "")),
		fields: { title, officialTitle: title, organization: org, description: description || title }, evidence, cycles,
		links: { listingUrl: doc.url, applyUrl: applyUrl || doc.url, guidelinesUrl: guidelinesUrl || null }, followUps: [],
		// Course, merit, residence, competing-award and other conditions are not
		// completely representable by the current profile. Preserve the actual text.
		eligibilityReview: true,
		issues: [{ code: "eligibility_manual_review", severity: "info", message: "Additional official eligibility conditions require review; matching is provisional." }],
	};
}

function statedCycle(label, quote, snapshot, dates = {}) {
	const ev = makeEvidence(snapshot, quote, { field: "cycle", locator: "stated application cycle" });
	return ev ? [{ academicYear: label, applicationType: "general", opensAt: null, closesAt: null, ...dates, evidence: [ev] }] : [];
}

function annualGrant(item, clause, snapshot) {
	const match = clause?.match(/Rs\.?\s*([\d,]+(?:\.\d+)?)\s*(lakh)?\s*(?:each\s+on\s+an\s+annual\s+basis|per\s+year)/i);
	if (!match) return;
	const value = Number(match[1].replaceAll(",", "")) * (match[2] ? 100000 : 1);
	const ev = makeEvidence(snapshot,match[0],{field:"amount",locator:"program-specific annual grant"});
	if (ev && value >= 1000 && value <= 500000) {
		item.fields.amount={value,currency:"INR",period:"yearly",displayString:`₹${value.toLocaleString("en-IN")} per year`};
		item.evidence.push(ev);
	}
}

export const upPortalAdapter = {
	id: "upPortal", needsHtml: true,
	extract(doc, snapshot, { source }) {
		if (!doc.html) return missing();
		const $ = cheerio.load(doc.html), records = [];
		$("h5").each((_, node) => {
			const title = tidy($(node).text());
			if (!/^(Pre Matric Class 9-10|Post Matric Inter Class 11-12|Post Matric Other than Inter|Post Matric Out Side State)$/i.test(title)) return;
			const row = $("tr").toArray().map((e) => tidy($(e).find("td").toArray().map((e)=>$(e).text()).join(" "))).find((s) => /Pre/i.test(title) ? /Prematric\s*\(20\d{2}-\d{2}\)/.test(s) : /Postmatric\s*\(20\d{2}-\d{2}\)/.test(s));
			const year = normalizeAcademicYear(row);
			const cycleQuote = row?.match(/(?:Pre|Post)matric\s*\(20\d{2}-\d{2}\)/)?.[0];
			const item = candidate(title, title, doc, snapshot, source, { cycles: year ? statedCycle(year, cycleQuote, snapshot) : [] });
			if (item) records.push(item);
		});
		return records.length >= 4 ? { records, issues: [] } : missing();
	},
};

export const karnatakaPortalAdapter = {
	id: "karnatakaPortal", needsHtml: true,
	extract(doc, snapshot, { source }) {
		if (!doc.html) return missing();
		const $ = cheerio.load(doc.html), records = [];
		$(".ssp-acc-item .scheme-li[data-scheme-id]").each((_, node) => {
			const title = tidy($(node).text()), id = $(node).attr("data-scheme-id");
			const organization = tidy($(node).closest(".ssp-acc-item").find(".ssp-acc-btn span").first().text());
			const item = candidate(title, title, doc, snapshot, source, { key: `scheme-${$(node).attr("data-metric-type")}-${id}`, organization });
			if (item) records.push(item);
		});
		return records.length >= 10 ? { records, issues: [] } : missing();
	},
};

export const biharPortalAdapter = {
	id: "biharPortal", needsHtml: true,
	extract(doc, snapshot, { source }) {
		if (!doc.html) return missing();
		const $ = cheerio.load(doc.html);
		const title = "Bihar Post Matric Scholarship";
		if (!snapshot.text.includes(title) || !/BC.?EBC/i.test(snapshot.text)) return missing();
		const windows = [...snapshot.text.matchAll(/(20\d{2}-\d{2}):\s*(\d{2}\.\d{2}\.20\d{2})\s*[–—-]\s*(\d{2}\.\d{2}\.20\d{2})/g)];
		const cycles = windows.flatMap((m) => statedCycle(m[1], m[0], snapshot, { opensAt: parseOfficialDate(m[2].replaceAll(".", "-")), closesAt: parseOfficialDate(m[3].replaceAll(".", "-"), { endOfDay: true }) }));
		const apply = $("a").toArray().find((e) => /new registration/i.test($(e).text()) && /2026|26-27/.test($(e).attr("href") || ""));
		const item = candidate(title, htmlToText($.html($("main").length ? $("main") : $("body")), doc.finalUrl || doc.url).slice(0,10000), doc, snapshot, source, { cycles, applyUrl: apply ? link($(apply).attr("href"), doc, source) : null });
		if (!item || !cycles.length) return missing();
		return { records: [item], issues: [] };
	},
};

export const aictePortalAdapter = {
	id: "aictePortal", needsHtml: true,
	extract(doc, snapshot, { source }) {
		if (!doc.html) return missing();
		const $ = cheerio.load(doc.html), records = [];
		$(".schemeListItem").each((_, node) => {
			const title = tidy($(node).find(".headingText").text());
			if (!/scholarship|fellowship/i.test(title)) return;
			const description = tidy($(node).find(".schemeDetailsText").text());
			const anchors = $(node).find("a").toArray();
			const guideline = anchors.find((a) => /scheme guidelines|read more/i.test($(a).text()));
			const apply = anchors.find((a) => /register|registration|login|portal link/i.test($(a).text()));
			const item = candidate(title, description, doc, snapshot, source, { applyUrl: apply ? link($(apply).attr("href"),doc,source) : null, guidelinesUrl: guideline ? link($(guideline).attr("href"),doc,source) : null });
			if (!item) return;
			if (item.links.guidelinesUrl?.match(/\.pdf(?:$|\?)/i)) item.followUps.push({url:item.links.guidelinesUrl,adapter:"guidelinePdf",role:"guidelines"});
			records.push(item);
		});
		return records.length >= 5 ? { records, issues: [] } : missing();
	},
};

export const inspirePortalAdapter = {
	id: "inspirePortal", needsHtml: true,
	extract(doc, snapshot, { source }) {
		const title = "Scholarship for Higher Education (SHE)";
		// Isolate SHE: awards for school children and PhD fellowships are different programs.
		const m = [...snapshot.text.matchAll(/\(ii\)\s*Scholarship for Higher Education \(SHE\)[\s\S]*?(?=\(iii\))/g)].find((m)=>/providing scholarships and mentorship/i.test(m[0]));
		if (!m) return missing();
		const item = candidate(title, tidy(m[0]),doc,snapshot,source);
		if (!item) return missing();
		annualGrant(item,m[0],snapshot);
		item.links.faqUrl="https://online-inspire.gov.in/Content/SHEFAQs2024.pdf";
		return {records:[item],issues:[]};
	},
};

export const reliancePortalAdapter = {
	id: "reliancePortal", needsHtml: true,
	extract(doc, snapshot, { source }) {
		if (!doc.html) return missing();
		const $ = cheerio.load(doc.html), title = tidy($("main h1").first().text());
		if (!/^Reliance Foundation (Undergraduate|Postgraduate) Scholarships$/.test(title) || !$("#eligibility-criteria").length) return missing();
		const introduction = $("main h1").first().parent();
		const description = `${tidy(introduction.find("p").text())}\n\n${tidy($("#lnkScholarships").text())}\n\nEligibility: ${tidy($("#eligibility-criteria").text())}`;
		const apply = $("a").toArray().find((e) => /scholarshipportal\.reliancefoundation\.org\/RegisterScholar/.test($(e).attr("href")||""));
		const faq = $("a").toArray().find((e)=>/Frequently Asked Questions/i.test($(e).text()));
		const yearMatch = snapshot.text.match(/(?:academic year|Scholarships)\s+(20\d{2}-\d{2})/i);
		const item = candidate(title,description,doc,snapshot,source,{guidelinesUrl:doc.url,applyUrl:apply?link($(apply).attr("href"),doc,source):null,cycles:yearMatch?statedCycle(yearMatch[1],yearMatch[0],snapshot):[]});
		if (!item) return missing();
		item.fields.level=/Undergraduate/.test(title)?"UG":"PG";
		item.evidence.push({...item.evidence[0],field:"level"});
		item.links.faqUrl=faq?link($(faq).attr("href"),doc,source):null;
		const grant = snapshot.text.match(/scholarship of up to ([\d.]+) lakhs over the duration of their degree programme/i)
			|| snapshot.text.match(/scholarship available over the duration of the degree programme, will be up to Rs\/INR ([\d.]+) Lakhs/i);
		if (grant) {
			const ev = makeEvidence(snapshot,grant[0],{field:"amount",locator:"total degree grant"});
			if(ev){item.fields.amount={value:Number(grant[1])*100000,currency:"INR",period:"total",displayString:`Up to ₹${(Number(grant[1])*100000).toLocaleString("en-IN")} over the degree duration`};item.evidence.push(ev);}
		}
		return item ? {records:[item],issues:[]} : missing();
	},
};

export const ongcPortalAdapter = {
	id: "ongcPortal", needsHtml: true,
	extract(doc,snapshot,{source}) {
		if(!doc.html) return missing();
		const $=cheerio.load(doc.html),records=[];
		$("mat-expansion-panel").each((_,node)=>{
			const title=tidy($(node).find("mat-panel-title").text() || $(node).find("mat-expansion-panel-header").text());
			if(!/^ONGC Scholarship to Meritorious/i.test(title))return;
			const year=normalizeAcademicYear(title);
			const description=tidy($(node).text());
			const item=candidate(title,description,doc,snapshot,source,{applyUrl:link("#/schemeAndRules/apply",doc,source),cycles:year?statedCycle(year,title,snapshot):[]});
			if(item){
				annualGrant(item,htmlToText($.html($(node)),doc.finalUrl||doc.url),snapshot);
				records.push(item);
			}
		});
		return records.length>=3?{records,issues:[]}:missing();
	},
};

export const licPortalAdapter = {
	id: "licPortal", needsHtml:true,
	extract(doc,snapshot,{source}) {
		if(!doc.html)return missing();
		const $=cheerio.load(doc.html);
		const anchors=$("a").toArray();
		const schemes=anchors.map((e)=>({el:e,title:tidy($(e).text())})).filter((e)=>/^Golden Jubilee Scholarship Scheme\s*-?\s*20\d{2}$/.test(e.title));
		const latest=schemes.sort((a,b)=>b.title.match(/20\d{2}/)[0].localeCompare(a.title.match(/20\d{2}/)[0]))[0];
		if(!latest)return missing();
		const year=latest.title.match(/20\d{2}/)[0];
		const notice=snapshot.text.match(/Last date[^\n]*?(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i);
		let closesAt=null;
		if(notice&&notice[3]===year){const month=["january","february","march","april","may","june","july","august","september","october","november","december"].indexOf(notice[2].toLowerCase())+1;closesAt=parseOfficialDate(`${notice[1].padStart(2,"0")}-${String(month).padStart(2,"0")}-${year}`,{endOfDay:true});}
		const apply=anchors.find((e)=>/APPLY HERE FOR SCHOLARSHIP SCHEME/.test($(e).text())&&$(e).text().includes(year));
		const item=candidate(latest.title, latest.title,doc,snapshot,source,{key:"golden-jubilee-scholarship",guidelinesUrl:link($(latest.el).attr("href"),doc,source),applyUrl:apply?link($(apply).attr("href"),doc,source):null,cycles:statedCycle(year,notice?.[0]||latest.title,snapshot,{closesAt})});
		if(item?.links.guidelinesUrl)item.followUps.push({url:item.links.guidelinesUrl,adapter:"guidelinePdf",role:"guidelines"});
		return item?{records:[item],issues:[]}:missing();
	},
};

function plain(nodes) {return (nodes||[]).map((n)=>n.text??plain(n.children)).join(" ");}
export const mySchemeAdapter = {
	id:"myScheme",
	extract(doc,snapshot,{source}) {
		const data=doc.json?.data, en=data?.en;
		if(doc.json?.statusCode!==200||!en?.basicDetails?.schemeName||!data.slug)return missing();
		const b=en.basicDetails,c=en.schemeContent,eligibility=plain(en.eligibilityCriteria?.eligibilityDescription);
		const title=b.schemeName,listing=`https://www.myscheme.gov.in/schemes/${data.slug}`;
		const description=[c.briefDescription,plain(c.detailedDescription),`Eligibility: ${eligibility}`,`Benefits: ${plain(c.benefits)}`].filter(Boolean).join("\n\n");
		const item=candidate(title,description,doc,snapshot,source,{organization:b.nodalDepartmentName?.label});
		if(!item)return missing();
		item.links.listingUrl=listing;
		const references=c.references||[];
		item.links.guidelinesUrl=references.map((r)=>link(r.url,doc,source)).find(Boolean)||listing;
		item.links.applyUrl=item.links.guidelinesUrl;
		// Rates vary by course. Preserve the table in description; never attribute
		// the largest rate to every applicant or annualize the monthly rates.
		const benefits=plain(c.benefits), rates=[...benefits.matchAll(/₹\s*([\d,]+)\s*\/-/g)].map((m)=>({value:Number(m[1].replaceAll(",","")),quote:m[0]}));
		const ev=rates.map((r)=>makeEvidence(snapshot,r.quote,{field:"amount",locator:"course-specific monthly rate table"}));
		if(/rate per month/i.test(benefits)&&rates.length&&ev.every(Boolean)){
			item.fields.amount={value:null,currency:"INR",period:"monthly",displayString:`₹${Math.min(...rates.map(r=>r.value)).toLocaleString("en-IN")}–₹${Math.max(...rates.map(r=>r.value)).toLocaleString("en-IN")} per month depending on course (see official rates)`};
			item.evidence.push(...ev);
		}
		return {records:[item],issues:[]};
	},
};

export const officialPortalAdapters=[upPortalAdapter,karnatakaPortalAdapter,biharPortalAdapter,aictePortalAdapter,inspirePortalAdapter,reliancePortalAdapter,ongcPortalAdapter,licPortalAdapter,mySchemeAdapter];
