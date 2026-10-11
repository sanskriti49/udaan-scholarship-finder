import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SOURCE_REGISTRY, ADAPTERS } from "../../src/pipeline/sources.js";
import { toDocument } from "../../src/pipeline/core/documents.js";
import { assembleRecord } from "../../src/pipeline/core/assemble.js";
import { evaluateEligibility } from "../../src/engine/ruleEvaluator.js";
import { verifyEvidence } from "../../src/pipeline/core/evidence.js";
import { computeStatus } from "../../src/pipeline/core/status.js";
import { isWithinAcademicYearWindow } from "../../src/pipeline/core/time.js";

// Public HTML/JSON excerpts fetched on 2026-10-11; these are actual page
// structures, not invented normalized portal feeds. See fixture README.
const fixtures = [
	["up_state_scholarship", "up.html", 4],
	["karnataka_ssp_scholarship", "karnataka.html", 54],
	["wb_svmcm_scholarship", "wb.json", 1],
	["bihar_pms_scholarship", "bihar.html", 1],
	["dst_inspire_scholarship", "inspire.html", 1],
	["aicte_ugc_national", "aicte.html", 10],
	["premier_foundations_csr", "ongc.html", 3],
	["reliance_foundation", "reliance-ug.html", 1],
	["reliance_foundation", "reliance-pg.html", 1],
	["lic_golden_jubilee", "lic.html", 1],
];

async function extract(id,file) {
	const source=SOURCE_REGISTRY.find(s=>s.id===id);
	const entry=source.entries[file==="reliance-pg.html"?1:0];
	const doc=await toDocument({url:entry.url,finalUrl:entry.url,contentType:file.endsWith(".json")?"application/json":"text/html",body:fs.readFileSync(new URL(`../fixtures/official-portals/${file}`,import.meta.url))});
	const snapshot={...doc,id:"public-fixture",sourceId:id,fetchedAt:new Date("2026-10-11T08:00:00Z"),sha256:"fixture"};
	return { source, snapshot, out:ADAPTERS[entry.adapter].extract(doc,snapshot,{source,entry}) };
}

for(const[id,file,count]of fixtures) test(`official ${file}: real page structure, exact citations and provisional matching`,async()=>{
	const{source,snapshot,out}=await extract(id,file);
	assert.equal(out.records.length,count,JSON.stringify(out.issues));
	for(const candidate of out.records){
		const{record,issues}=assembleRecord(candidate,{source});
		assert.equal(issues.filter(i=>i.severity==="blocking").length,0);
		for(const ev of record.fieldEvidence)assert.equal(verifyEvidence(ev,snapshot).ok,true,ev.field);
		const match=evaluateEligibility({educationLevel:record.level||"UG"},record);
		assert.equal(match.isEligible,false);
		assert.ok(match.unknownRules.some(r=>r.ruleId==="official_manual_review"));
		assert.ok(match.matchConfidence<100);
	}
});

test("Bihar: dated window beats open banner; opening dates and deadline are IST",async()=>{
	const{out,source}=await extract("bihar_pms_scholarship","bihar.html");
	const{record}=assembleRecord(out.records[0],{source});
	assert.equal(record.currentCycle.academicYear,"2026-27");
	assert.equal(record.currentCycle.closesAt.toISOString(),"2026-09-30T18:29:59.999Z");
	assert.equal(computeStatus(record,new Date("2026-10-11T00:00Z")).status,"closed");
});

test("LIC: latest notice, not archived scheme; calendar year is not invented academic year",async()=>{
	const{out,source}=await extract("lic_golden_jubilee","lic.html");
	const{record}=assembleRecord(out.records[0],{source});
	assert.match(record.title,/2026$/);
	assert.equal(record.currentCycle.academicYear,"2026");
	assert.equal(record.currentCycle.closesAt.toISOString(),"2026-10-15T18:29:59.999Z");
	assert.equal(record.currentCycle.opensAt,null);
	assert.equal(isWithinAcademicYearWindow(new Date("2027-01-02"),"2026"),false);
});

test("Reliance: total degree awards and SPA application links retain program choice",async()=>{
	for(const[file,total,hash]of[["reliance-ug.html",200000,"#ug"],["reliance-pg.html",600000,"#pg"]]){
		const{out}=await extract("reliance_foundation",file);
		assert.equal(out.records[0].fields.amount.value,total);
		assert.equal(out.records[0].fields.amount.period,"total");
		assert.equal(out.records[0].cycles[0].academicYear,"2026-27");
		assert.equal(out.records[0].cycles[0].closesAt,null);
		assert.ok(out.records[0].links.applyUrl.endsWith(hash));
	}
});

test("WB: course rates stay variable and income-proof exception is not converted to a blanket rejection",async()=>{
	const{out}=await extract("wb_svmcm_scholarship","wb.json");
	assert.equal(out.records[0].fields.familyIncome,undefined);
	assert.equal(out.records[0].fields.amount.value,null);
	assert.equal(out.records[0].fields.amount.period,"monthly");
	assert.match(out.records[0].fields.description,/Kanyashree/);
});

test("all portal adapters reject a changed layout instead of a false successful empty crawl",async()=>{
	for(const[id,file]of fixtures){
		const source=SOURCE_REGISTRY.find(s=>s.id===id),entry=source.entries[0];
		const out=ADAPTERS[entry.adapter].extract({html:"<html><body>Maintenance</body></html>",text:"Maintenance",json:{}},{text:"Maintenance"},{source,entry});
		assert.equal(out.records.length,0);
		assert.ok(out.issues.some(i=>i.severity==="blocking"));
	}
});

 test("INSPIRE: expanded SHE section supplies its annual award, not the school-child award",async()=>{
	const{out}=await extract("dst_inspire_scholarship","inspire.html");
	assert.equal(out.records[0].fields.amount.value,80000);
	assert.match(out.records[0].fields.description,/17-22/);
	assert.doesNotMatch(out.records[0].fields.description,/Rs 5000/);
});
