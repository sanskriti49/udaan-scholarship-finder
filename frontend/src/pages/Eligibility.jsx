import { useState, useEffect, useRef } from "react";
import {
	ShieldCheck,
	CheckCircle2,
	XCircle,
	FileText,
	HelpCircle,
	ArrowUpRight,
	Sparkles,
	Check,
	AlertCircle,
} from "lucide-react";
import {
	evaluateProfile,
	getUserProfile,
} from "../services/scholarshipService";
import EvidenceModal from "../components/EvidenceModal";
import { formatGrant } from "../utils/formatGrant";
import { PageStyles, Stamp } from "../components/PageKit";
import headerImg from "../assets/images/edu.jpg";

const COMMON_DOCUMENTS = [
	{ code: "INCOME_CERT", name: "Family Income Certificate" },
	{ code: "MARKSHEET", name: "10th / 12th / Semester Marksheet" },
	{ code: "DOMICILE_CERT", name: "State Domicile (Residence) Certificate" },
	{ code: "AADHAAR", name: "Aadhaar Card" },
	{ code: "BANK_PASSBOOK", name: "Bank Passbook / Account Proof" },
	{ code: "CASTE_CERT", name: "Caste Certificate (OBC / SC / ST)" },
	{ code: "ADMISSION_PROOF", name: "College Admission Letter / ID Card" },
	{ code: "BONAFIDE_CERT", name: "College Bonafide Certificate" },
];

const EDUCATION_LEVELS = [
	{ value: "UG", label: "Undergraduate" },
	{ value: "PG", label: "Postgraduate" },
	{ value: "Diploma", label: "Diploma" },
	{ value: "Class 12", label: "Class 12th" },
	{ value: "Class 10", label: "Class 10th" },
	{ value: "PhD", label: "PhD" },
];

const STREAMS = [
	{ value: "Engineering", label: "Engineering" },
	{ value: "Medical", label: "Medical" },
	{ value: "Science", label: "Science" },
	{ value: "Commerce", label: "Commerce" },
	{ value: "Arts", label: "Arts" },
	{ value: "Other", label: "Other" },
];

const GENDERS = ["Female", "Male", "Other"];

const CATEGORIES = [
	{ value: "General", label: "General" },
	{ value: "OBC", label: "OBC" },
	{ value: "SC", label: "SC" },
	{ value: "ST", label: "ST" },
	{ value: "EWS", label: "EWS" },
];

const STATES = [
	{ value: "All India", label: "Any state (Central)" },
	{ value: "UP", label: "Uttar Pradesh" },
	{ value: "Maharashtra", label: "Maharashtra" },
	{ value: "Karnataka", label: "Karnataka" },
	{ value: "West Bengal", label: "West Bengal" },
	{ value: "Bihar", label: "Bihar" },
	{ value: "Delhi", label: "Delhi NCR" },
	{ value: "Tamil Nadu", label: "Tamil Nadu" },
];

function getChecks(formData, documentsHeld) {
	return [
		{
			label: "Entered family income and CGPA",
			done:
				formData.familyIncome !== "" &&
				Number(formData.familyIncome) >= 0 &&
				formData.cgpa !== "" &&
				Number(formData.cgpa) > 0,
		},
		{
			label: "Chose level, stream and category",
			done: !!(
				formData.educationLevel &&
				formData.courseStream &&
				formData.casteCategory
			),
		},
		{
			label: "Marked the certificates you hold",
			done: documentsHeld.length > 0,
		},
	];
}

const inputCls =
	"w-full rounded-lg border-[1.5px] border-emerald-950/40 bg-white px-3.5 py-2.5 text-[15px] text-emerald-950 placeholder:text-emerald-950/40 transition-colors hover:border-emerald-950 focus:border-emerald-950 focus:outline-none focus:ring-4 focus:ring-yellow-200";

function Field({ label, hint, children }) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="flex items-baseline justify-between text-sm font-bold text-emerald-950">
				{label}
			</span>
			{children}
			{hint && (
				<span className="text-xs font-medium text-emerald-950/55">{hint}</span>
			)}
		</label>
	);
}

function Chip({ active, onClick, children }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={`cursor-pointer rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-semibold transition-colors ${
				active
					? "border-emerald-950 bg-emerald-950 text-white"
					: "border-emerald-950/30 bg-white text-emerald-950 hover:border-emerald-950"
			}`}
		>
			{children}
		</button>
	);
}

function ChipGroup({ label, options, value, onChange }) {
	return (
		<div>
			<p className="mb-2 text-sm font-bold text-emerald-950">{label}</p>
			<div className="flex flex-wrap gap-2">
				{options.map((o) => {
					const opt = typeof o === "string" ? { value: o, label: o } : o;
					return (
						<Chip
							key={opt.value}
							active={value === opt.value}
							onClick={() => onChange(opt.value)}
						>
							{opt.label}
						</Chip>
					);
				})}
			</div>
		</div>
	);
}

function DocChip({ doc, checked, onToggle }) {
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-pressed={checked}
			className={`flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] p-3.5 text-left text-sm transition-colors ${
				checked
					? "border-emerald-950 bg-emerald-50 font-bold text-emerald-950"
					: "border-emerald-950/25 bg-white font-medium text-emerald-950/80 hover:border-emerald-950"
			}`}
		>
			<span
				className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-[1.5px] border-emerald-950 transition-colors ${
					checked ? "bg-emerald-900 text-white" : "bg-white"
				}`}
			>
				{checked && <Check size={11} strokeWidth={3.5} />}
			</span>
			<span className="leading-snug">{doc.name}</span>
		</button>
	);
}

function ResultTab({ active, onClick, tone, children }) {
	const activeCls =
		tone === "bad"
			? "z-10 border-emerald-950 bg-white text-rose-800"
			: "z-10 border-emerald-950 bg-white text-emerald-950";
	return (
		<button
			type="button"
			role="tab"
			aria-selected={active}
			onClick={onClick}
			className={`relative -mb-[1.5px] flex cursor-pointer items-center gap-2 rounded-t-xl border-[1.5px] border-b-0 px-4 py-2.5 text-sm font-bold transition-colors sm:px-5 ${
				active
					? activeCls
					: "border-emerald-950/35 bg-emerald-100/70 text-emerald-950/70 hover:bg-emerald-100"
			}`}
		>
			{children}
		</button>
	);
}

export default function EligibilityPage() {
	const [formData, setFormData] = useState({
		fullName: "",
		educationLevel: "UG",
		courseStream: "Engineering",
		familyIncome: 250000,
		gender: "Female",
		casteCategory: "General",
		state: "All India",
		cgpa: 8.0,
		hasDisability: false,
	});

	const [documentsHeld, setDocumentsHeld] = useState([
		"MARKSHEET",
		"AADHAAR",
		"BANK_PASSBOOK",
	]);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [resultsVisible, setResultsVisible] = useState(false);
	const [activeTab, setActiveTab] = useState("eligible");
	const [evaluationData, setEvaluationData] = useState({
		matched: [],
		ineligible: [],
		summary: { totalEvaluated: 0, eligibleCount: 0, ineligibleCount: 0 },
	});

	const [evidenceScholarship, setEvidenceScholarship] = useState(null);
	const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

	const resultsRef = useRef(null);

	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) return;
		getUserProfile()
			.then((res) => {
				if (res.success && res.data) {
					const p = res.data;
					setFormData((prev) => ({
						fullName: p.fullName || prev.fullName,
						educationLevel: p.educationLevel || prev.educationLevel,
						courseStream: p.courseStream || p.stream || prev.courseStream,
						familyIncome:
							p.familyIncome !== undefined
								? p.familyIncome
								: p.income !== undefined
									? p.income
									: prev.familyIncome,
						gender: p.gender || prev.gender,
						casteCategory:
							p.casteCategory || p.caste_category || prev.casteCategory,
						state: p.state || prev.state,
						cgpa: p.cgpa !== undefined ? p.cgpa : prev.cgpa,
						hasDisability:
							p.hasDisability !== undefined
								? p.hasDisability
								: prev.hasDisability,
					}));
					if (Array.isArray(p.documentsHeld) && p.documentsHeld.length > 0) {
						setDocumentsHeld(p.documentsHeld);
					}
				}
			})
			.catch(() => {});
	}, []);

	const toggleDocument = (code) => {
		setDocumentsHeld((prev) =>
			prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
		);
	};

	const handleInputChange = (field, value) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleCheckEligibility = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);
		setResultsVisible(false);

		try {
			const payload = {
				...formData,
				familyIncome: Number(formData.familyIncome),
				cgpa: Number(formData.cgpa),
				documentsHeld,
			};

			const response = await evaluateProfile(payload);
			if (response.success) {
				setEvaluationData({
					matched: response.data.matched || [],
					ineligible: response.data.ineligible || [],
					summary: response.summary || {},
				});
				setResultsVisible(true);
				setTimeout(() => {
					resultsRef.current?.scrollIntoView({
						behavior: "smooth",
						block: "start",
					});
				}, 100);
			}
		} catch (err) {
			console.error("Eligibility evaluation failed:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	const checks = getChecks(formData, documentsHeld);
	const score = checks.filter((c) => c.done).length;

	return (
		<main className="ud-root min-h-screen bg-[#E9F0EA] font-sans text-emerald-950">
			<PageStyles />

			<section className="mx-auto max-w-7xl px-5 pb-10 pt-12 sm:px-8 md:pb-14 md:pt-16 lg:pt-18">
				<div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_550px] lg:gap-12">
					<div>
						<h1 className="font-georgia max-w-2xl text-5xl font-medium leading-[0.98] sm:text-6xl md:text-7xl">
							Find out what you actually qualify for.
						</h1>

						<p className="mt-6 max-w-xl text-base leading-relaxed text-emerald-950/75 sm:text-lg">
							Answer a few questions about your course, family income and state.
							We compare your details against verified government circulars and
							trust policies.
						</p>
					</div>

					<div className="flex justify-center lg:justify-end">
						<div className="relative w-full max-w-lg">
							<div className="overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(2,44,34,1)]">
								<img
									src={headerImg}
									alt="Eligibility preview"
									className="w-full rounded-lg object-cover"
								/>
							</div>

							<Stamp
								slam
								delay={0.6}
								tilt={-8}
								className="absolute -bottom-0 -left-3 border-emerald-700 bg-white/70 text-2xl text-emerald-700 sm:-left-6"
							>
								Verified
							</Stamp>
						</div>
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-7xl px-5 pb-20 mt-10 sm:px-8 md:pb-28">
				<form
					onSubmit={handleCheckEligibility}
					className="relative grid overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white lg:grid-cols-[minmax(0,1fr)_360px]"
				>
					<div className="space-y-10 p-6 sm:p-8">
						<div>
							<div className="mb-6 flex items-start gap-3.5">
								<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-emerald-950 bg-yellow-200">
									<ShieldCheck size={18} />
								</span>
								<div>
									<h2 className="ud-display text-2xl font-bold leading-tight">
										Academic & background details
									</h2>
									<p className="mt-1 text-sm leading-relaxed text-emerald-950/70">
										Used to verify state quotas, income thresholds and degree
										levels.
									</p>
								</div>
							</div>

							<div className="space-y-6">
								<ChipGroup
									label="Current level of study"
									options={EDUCATION_LEVELS}
									value={formData.educationLevel}
									onChange={(v) => handleInputChange("educationLevel", v)}
								/>
								<ChipGroup
									label="Field / stream of study"
									options={STREAMS}
									value={formData.courseStream}
									onChange={(v) => handleInputChange("courseStream", v)}
								/>

								<div className="grid gap-4 sm:grid-cols-2">
									<Field
										label="Annual family income (₹)"
										hint="As stated on your official income certificate"
									>
										<input
											type="number"
											min="0"
											step="10000"
											value={formData.familyIncome}
											onChange={(e) =>
												handleInputChange("familyIncome", e.target.value)
											}
											className={inputCls}
											placeholder="e.g. 250000"
											required
										/>
									</Field>
									<Field
										label="Academic score (CGPA / 10)"
										hint="Latest semester CGPA or board percentage equivalent"
									>
										<input
											type="number"
											min="0"
											max="10"
											step="0.1"
											value={formData.cgpa}
											onChange={(e) =>
												handleInputChange("cgpa", e.target.value)
											}
											className={inputCls}
											placeholder="e.g. 8.0"
											required
										/>
									</Field>
								</div>

								<ChipGroup
									label="Gender"
									options={GENDERS}
									value={formData.gender}
									onChange={(v) => handleInputChange("gender", v)}
								/>
								<ChipGroup
									label="Social category"
									options={CATEGORIES}
									value={formData.casteCategory}
									onChange={(v) => handleInputChange("casteCategory", v)}
								/>
								<ChipGroup
									label="Domicile / home state"
									options={STATES}
									value={formData.state}
									onChange={(v) => handleInputChange("state", v)}
								/>

								<button
									type="button"
									onClick={() =>
										handleInputChange("hasDisability", !formData.hasDisability)
									}
									aria-pressed={formData.hasDisability}
									className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border-[1.5px] p-3.5 text-left text-sm transition-colors ${
										formData.hasDisability
											? "border-emerald-950 bg-emerald-50 font-bold"
											: "border-emerald-950/25 bg-white font-medium hover:border-emerald-950"
									}`}
								>
									<span
										className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-[1.5px] border-emerald-950 transition-colors ${
											formData.hasDisability
												? "bg-emerald-900 text-white"
												: "bg-white"
										}`}
									>
										{formData.hasDisability && (
											<Check size={11} strokeWidth={3.5} />
										)}
									</span>
									I have a documented PwD disability certificate (40%+)
								</button>
							</div>
						</div>

						<div className="border-t-[1.5px] border-dashed border-emerald-950/25 pt-8">
							<div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
								<div className="flex items-start gap-3.5">
									<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-emerald-950 bg-yellow-200">
										<FileText size={18} />
									</span>
									<div>
										<h2 className="ud-display text-2xl font-bold leading-tight">
											Certificates you have ready
										</h2>
										<p className="mt-1 text-sm leading-relaxed text-emerald-950/70">
											We calculate your exact document readiness so there are no
											surprises.
										</p>
									</div>
								</div>
								<span className="w-fit shrink-0 rounded-full border-[1.5px] border-emerald-950 bg-emerald-50 px-3 py-1 text-sm font-bold">
									{documentsHeld.length} selected
								</span>
							</div>

							<div className="grid gap-2.5 sm:grid-cols-2">
								{COMMON_DOCUMENTS.map((doc) => (
									<DocChip
										key={doc.code}
										doc={doc}
										checked={documentsHeld.includes(doc.code)}
										onToggle={() => toggleDocument(doc.code)}
									/>
								))}
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-4">
							<button
								type="submit"
								disabled={isSubmitting}
								className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-emerald-800 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-900 active:translate-y-px disabled:cursor-wait disabled:opacity-70"
							>
								{isSubmitting ? (
									<>
										<span className="ud-spin" />
										Evaluating against verified rules
									</>
								) : (
									<>
										<Sparkles size={16} />
										Check my eligibility
									</>
								)}
							</button>
							<span className="text-sm text-emerald-950/60">
								Takes a few seconds
							</span>
						</div>
					</div>

					<aside className="relative flex flex-col gap-8 border-t-[1.5px] border-dashed border-emerald-950 bg-emerald-50 p-6 sm:p-8 lg:border-l-[1.5px] lg:border-t-0">
						<span
							aria-hidden
							className="absolute -left-3 -top-3 h-6 w-6 rounded-full border-[1.5px] border-emerald-950 bg-[#E9F0EA]"
						/>
						<span
							aria-hidden
							className="absolute -top-3 right-[-12px] h-6 w-6 rounded-full border-[1.5px] border-emerald-950 bg-[#E9F0EA] lg:bottom-[-12px] lg:left-[-12px] lg:right-auto lg:top-auto"
						/>

						<div className="-rotate-1 rounded-md bg-yellow-200 p-5 shadow-[0_6px_0_-3px_rgba(2,44,34,0.15)]">
							<div className="flex items-center justify-between">
								<p className="ud-display text-lg font-bold">Sharper results</p>
								<span className="text-sm font-bold">{score}/3</span>
							</div>
							<div className="mt-3 flex gap-1.5" aria-hidden>
								{checks.map((c, i) => (
									<span
										key={i}
										className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
											c.done ? "bg-emerald-900" : "bg-emerald-950/15"
										}`}
									/>
								))}
							</div>
							<ul className="mt-4 space-y-2.5">
								{checks.map((c) => (
									<li
										key={c.label}
										className="flex items-start gap-2.5 text-sm leading-snug"
									>
										<span
											className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-emerald-950 transition-colors ${
												c.done ? "bg-emerald-900 text-white" : "bg-white/60"
											}`}
										>
											{c.done && <Check size={11} strokeWidth={3.5} />}
										</span>
										<span className={c.done ? "font-semibold" : ""}>
											{c.label}
										</span>
									</li>
								))}
							</ul>
							<p className="mt-4 text-sm font-semibold">
								{score === 3
									? "That's everything we need."
									: "Fill these in and the match will be much more accurate."}
							</p>
						</div>

						<div className="space-y-4">
							<p className="ud-display text-lg font-bold">How it works</p>
							{[
								"We read your profile against each scheme's official rules.",
								"Every pass or fail is tied to a clause from the circular.",
								"You see exactly which certificates you still need.",
							].map((line, i) => (
								<div key={i} className="flex items-start gap-3.5">
									<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-emerald-950 bg-white text-sm font-bold">
										{i + 1}
									</span>
									<p className="pt-1 text-sm leading-snug text-emerald-950/80">
										{line}
									</p>
								</div>
							))}
						</div>
					</aside>
				</form>
			</section>

			<section
				ref={resultsRef}
				className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-24 sm:px-8 md:pb-32"
			>
				{resultsVisible && (
					<div className="ud-fade-in">
						<h2 className="ud-display max-w-2xl text-4xl font-extrabold leading-[1.02] sm:text-5xl">
							Your eligibility report
						</h2>
						<p className="mt-4 max-w-xl text-base leading-relaxed text-emerald-950/75">
							Checked against {evaluationData.summary.totalEvaluated || 0}{" "}
							verified government, state and foundation schemes.
						</p>

						<div className="mt-10 overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white">
							<div
								role="tablist"
								className="flex items-end gap-2 border-b-[1.5px] border-emerald-950 bg-emerald-50 px-4 pt-4 sm:px-6 sm:pt-5"
							>
								<ResultTab
									active={activeTab === "eligible"}
									onClick={() => setActiveTab("eligible")}
								>
									<CheckCircle2 size={16} className="text-emerald-700" />
									Eligible ({evaluationData.matched.length})
								</ResultTab>
								<ResultTab
									tone="bad"
									active={activeTab === "ineligible"}
									onClick={() => setActiveTab("ineligible")}
								>
									<XCircle size={16} className="text-rose-600" />
									Not eligible ({evaluationData.ineligible.length})
								</ResultTab>
							</div>

							<div key={activeTab} className="ud-fade-in space-y-5 p-4 sm:p-8">
								{activeTab === "eligible" &&
									(evaluationData.matched.length === 0 ? (
										<div className="flex flex-col items-start gap-4 p-4 sm:p-6">
											<span className="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-emerald-950 bg-yellow-200">
												<AlertCircle size={24} />
											</span>
											<p className="text-sm text-emerald-950/75">
												No matching scholarships found for your criteria.
											</p>
										</div>
									) : (
										<div className="grid gap-4"></div>
									))}
							</div>
						</div>
					</div>
				)}
			</section>
		</main>
	);
}
