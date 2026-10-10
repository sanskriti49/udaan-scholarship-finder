import { useState } from "react";
import { Link } from "react-router-dom";
import {
	ShieldCheck,
	AlertTriangle,
	CheckCircle2,
	Circle,
	ArrowUpRight,
	FileText,
	FileCheck2,
	LockKeyhole,
	Sparkles,
} from "lucide-react";

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

/**
 * Builds dynamic checklist items tailored specifically to the given scholarship's
 * statutory criteria, current academic cycle, required documents, and common portal rejection traps.
 */
export function buildDynamicChecklist(scholarship) {
	if (!scholarship) return [];

	const items = [];
	const cycleYear = scholarship.currentCycle?.academicYear || "2024-25";
	const cycleStartYear = cycleYear.split("-")[0] || "2024";
	const id = scholarship._id || scholarship.id || "";
	const incomeMax = scholarship.eligibility?.familyIncome?.max;
	const casteCategories = scholarship.eligibility?.casteCategories || [];
	const isCentral =
		scholarship.state === "All India" ||
		scholarship.sourceType === "Government" ||
		/central|national|nsp/i.test(scholarship.title);

	// 1. Family Income Certificate Check
	const hasIncomeRule =
		incomeMax !== undefined ||
		scholarship.rules?.some((r) => r.field === "familyIncome") ||
		scholarship.requiredDocuments?.some((d) =>
			/income/i.test(typeof d === "string" ? d : d.name),
		);

	if (hasIncomeRule) {
		const ceilingStr = incomeMax
			? `≤ ₹${Number(incomeMax).toLocaleString("en-IN")}`
			: "within official ceiling";
		items.push({
			id: "income",
			documentName: "Family Income Certificate",
			scannerType: "income",
			criteria: `Family income must be ${ceilingStr} per annum.`,
			rejectionTrap: `Must be issued on or after 1 April ${cycleStartYear} (Financial Year ${cycleYear}). State revenue certificates from prior financial years are automatically rejected during portal scrutiny. Must be from Tehsildar/SDO (Notary affidavits disqualified).`,
			tag: "High Rejection Risk",
		});
	}

	// 2. Caste / Category Certificate Check
	const hasCasteRule =
		casteCategories.length > 0 ||
		scholarship.requiredDocuments?.some((d) =>
			/caste|category|community/i.test(typeof d === "string" ? d : d.name),
		) ||
		/obc|sc|st|ews/i.test(scholarship.category || "");

	if (hasCasteRule) {
		const targetCats =
			casteCategories.length > 0
				? casteCategories.join(" / ")
				: "OBC / SC / ST / EWS";
		items.push({
			id: "caste",
			documentName: "Caste / Category Certificate",
			scannerType: "caste",
			criteria: `Recognized certificate for ${targetCats} category.`,
			rejectionTrap: isCentral
				? `Central NSP schemes strictly require the Central Government Non-Creamy Layer format referencing DoPT OM 36012/22/93-Estt.(SCT). State-only format certificates without the Central clause are disqualified.`
				: `Must be digitally signed with a verifiable barcode/QR code from the competent district magistrate or sub-divisional authority.`,
			tag: isCentral ? "Central Format Trap" : "Digital Stamp Required",
		});
	}

	// 3. College Bonafide Certificate Check
	const hasBonafideRule =
		scholarship.requiredDocuments?.some((d) =>
			/bonafide|enrollment|college|study/i.test(
				typeof d === "string" ? d : d.name,
			),
		) ||
		scholarship.eligibility?.courses?.length > 0 ||
		true; // Universal for student scholarships

	if (hasBonafideRule) {
		items.push({
			id: "bonafide",
			documentName: "College Bonafide Certificate",
			scannerType: "bonafide",
			criteria: `Certifies current full-time enrollment for session ${cycleYear}.`,
			rejectionTrap: `Must state the institution's official 6-digit AISHE Code (e.g., C-12345) and active semester. Plain college letterheads lacking the AISHE code and institutional seal fail at the Institute Nodal Officer verification stage.`,
			tag: "AISHE Code Required",
		});
	}

	// 4. Marksheet / Academic Records
	const marksRule = scholarship.rules?.find(
		(r) => r.field === "cgpa" || r.field === "percentage" || r.field === "marks",
	);
	const minMarksDesc = marksRule
		? marksRule.description || `Minimum ${marksRule.value}% aggregate`
		: "Qualifying marks / top 20th percentile as per scheme circular.";

	items.push({
		id: "marksheet",
		documentName: "Previous Exam / 12th Marksheet",
		scannerType: null,
		criteria: minMarksDesc,
		rejectionTrap: `Student name, parent name, and date of birth must match your Aadhaar card letter-by-letter. Spelling variations (e.g. initials vs expanded names) cause PFMS bank validation failures.`,
		tag: "Name-Match Gate",
	});

	// 5. Bank Account & Aadhaar NPCI Seeding
	items.push({
		id: "bank",
		documentName: "Aadhaar-Seeded Bank Passbook",
		scannerType: null,
		criteria: "Active individual savings account in student's own name.",
		rejectionTrap: `Must be linked with Aadhaar and mapped with NPCI DBT (Direct Benefit Transfer). Minor accounts, joint accounts, or wallets (Paytm/Airtel Payments Bank) are rejected by PFMS central disbursement.`,
		tag: "DBT / NPCI Trap",
	});

	return items;
}

export default function PreFlightChecklist({ scholarship }) {
	const items = buildDynamicChecklist(scholarship);
	const [checked, setChecked] = useState(() => new Set());

	if (!scholarship || items.length === 0) return null;

	const toggleItem = (id) => {
		setChecked((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const completedCount = checked.size;
	const totalCount = items.length;
	const progressPct = Math.round((completedCount / totalCount) * 100);

	return (
		<div className="rounded-2xl border-[1.5px] border-emerald-950/20 bg-white p-5 shadow-sm space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-emerald-950/15 pb-4">
				<div>
					<div className="flex items-center gap-2 mb-1">
						<span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-950 text-white">
							<ShieldCheck size={13} strokeWidth={2.8} />
						</span>
						<h3 className="ud-display text-lg font-bold text-emerald-950">
							Pre-Flight Readiness Checklist
						</h3>
					</div>
					<p className="text-xs text-emerald-950/70 font-medium">
						Demystifying bureaucratic rejection rules for this specific scheme.
					</p>
				</div>

				<div className="text-right">
					<span className="ud-display text-base font-extrabold text-emerald-950">
						{completedCount} of {totalCount} ready
					</span>
					<div className="w-28 h-2 rounded-full bg-emerald-950/10 mt-1 overflow-hidden">
						<div
							className="h-full bg-emerald-800 transition-all duration-300"
							style={{ width: `${progressPct}%` }}
						/>
					</div>
				</div>
			</div>

			<ul className="space-y-3.5">
				{items.map((item) => {
					const isChecked = checked.has(item.id);
					const schemeId = scholarship._id || scholarship.id || "";
					const scannerUrl = item.scannerType
						? `/scanner?scholarship=${encodeURIComponent(schemeId)}&type=${item.scannerType}`
						: null;

					return (
						<li
							key={item.id}
							className={`rounded-xl border-[1.5px] p-3.5 transition-colors ${
								isChecked
									? "border-emerald-800/40 bg-emerald-50/70"
									: "border-emerald-950/15 bg-[#FAF9F6] hover:border-emerald-950/30"
							}`}
						>
							<div className="flex items-start gap-3">
								<button
									type="button"
									onClick={() => toggleItem(item.id)}
									className={`mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border-[1.5px] border-emerald-950 transition-colors ${
										isChecked ? "bg-emerald-900 text-white" : "bg-white hover:bg-emerald-50"
									} ${focusRing}`}
									aria-label={`Mark ${item.documentName} as ready`}
								>
									{isChecked ? (
										<CheckCircle2 size={13} strokeWidth={3} />
									) : (
										<Circle size={10} className="text-emerald-950/30" />
									)}
								</button>

								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<span className="text-sm font-bold text-emerald-950">
											{item.documentName}
										</span>
										<span className="rounded-full bg-amber-100 border border-amber-300/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
											{item.tag}
										</span>
									</div>

									<p className="mt-1 text-xs font-semibold text-emerald-900/85">
										✓ {item.criteria}
									</p>

									<div className="mt-2 rounded-lg bg-white/90 border border-emerald-950/10 p-2 text-xs leading-relaxed text-emerald-950/75">
										<span className="font-bold text-rose-800">
											⚠️ Rejection Trap:{" "}
										</span>
										{item.rejectionTrap}
									</div>

									{scannerUrl && (
										<div className="mt-2.5 flex items-center justify-end">
											<Link
												to={scannerUrl}
												className={`inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline decoration-yellow-400 decoration-2 underline-offset-4 hover:text-emerald-950 ${focusRing}`}
											>
												<FileCheck2 size={13} />
												<span>Test in Zero-PII Pre-check</span>
												<ArrowUpRight size={12} />
											</Link>
										</div>
									)}
								</div>
							</div>
						</li>
					);
				})}
			</ul>

			<div className="rounded-xl border border-emerald-800/20 bg-emerald-50/60 p-3 flex items-start gap-2.5 text-xs text-emerald-950/75">
				<LockKeyhole size={15} className="text-emerald-800 shrink-0 mt-0.5" />
				<div>
					<strong>Zero-Knowledge Guarantee:</strong> Document tests run in-memory inside your browser Web Worker. No Aadhaar numbers or personal certificates are ever uploaded or saved.
				</div>
			</div>
		</div>
	);
}
