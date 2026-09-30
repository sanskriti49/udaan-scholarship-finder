import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
	CheckCircle2,
	XCircle,
	HelpCircle,
	ArrowUpRight,
	ArrowLeft,
	ArrowRight,
	Sparkles,
	Check,
	AlertCircle,
	Pencil,
} from "lucide-react";
import { evaluateProfile, getUserProfile } from "../services/scholarshipService";
import EvidenceModal from "../components/EvidenceModal";
import { cleanOfficialUrl } from "../utils/formatEvidence";
import { PageStyles, Stamp, Confetti } from "../components/PageKit";
import { MotionStyles, CountUp, ProgressRing, VerifyingCard } from "../components/MotionKit";
import { GrantAmount, DeadlineMeter, focusRing } from "../components/ScholarshipKit";
import { CheeringStudent, ConfusedDetective } from "../components/AnimatedIllustrations";
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

const STEPS = [
	{ id: "study", label: "Studies", title: "What are you studying?", sub: "Most schemes are tied to a course level." },
	{ id: "you", label: "About you", title: "A little about you", sub: "Some schemes reserve seats by gender, category or state." },
	{ id: "money", label: "Income & marks", title: "Family income and marks", sub: "The two numbers that decide most schemes. We never store them without an account." },
	{ id: "docs", label: "Papers", title: "Which certificates do you already have?", sub: "We'll tell you exactly what's still missing for each scheme." },
];

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function Chip({ active, onClick, children }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={`sk-chip min-h-[44px] cursor-pointer rounded-full border-[1.5px] px-4 text-sm font-semibold ${focusRing} ${
				active
					? "border-emerald-950 bg-emerald-950 text-white"
					: "border-emerald-950/25 bg-white text-emerald-950 hover:border-emerald-950"
			}`}
		>
			{children}
		</button>
	);
}

function ChipGroup({ label, options, value, onChange }) {
	return (
		<fieldset>
			<legend className="mb-2.5 text-sm font-bold text-emerald-950">{label}</legend>
			<div className="flex flex-wrap gap-2">
				{options.map((o) => {
					const opt = typeof o === "string" ? { value: o, label: o } : o;
					return (
						<Chip key={opt.value} active={value === opt.value} onClick={() => onChange(opt.value)}>
							{opt.label}
						</Chip>
					);
				})}
			</div>
		</fieldset>
	);
}

function CheckTile({ checked, onToggle, children }) {
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-pressed={checked}
			className={`sk-chip flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-xl border-[1.5px] p-3.5 text-left text-sm ${focusRing} ${
				checked
					? "border-emerald-950 bg-emerald-50 font-bold text-emerald-950"
					: "border-emerald-950/25 bg-white font-medium text-emerald-950/80 hover:border-emerald-950"
			}`}
		>
			<span
				className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] border-emerald-950 transition-colors ${
					checked ? "bg-emerald-900 text-white" : "bg-white"
				}`}
			>
				{checked && <Check size={12} strokeWidth={3.5} className="sk-pop" />}
			</span>
			<span className="leading-snug">{children}</span>
		</button>
	);
}

/* Slider + exact-number input for the same value. */
function DualNumber({ id, label, value, onChange, min, max, step, display, hint }) {
	const pct = Math.min(100, (Number(value) / max) * 100);
	return (
		<div>
			<div className="flex items-end justify-between gap-3">
				<label htmlFor={id} className="text-sm font-bold">
					{label}
				</label>
				<span key={value} className="ud-display sk-pop rounded-full bg-emerald-950 px-3 py-1 text-lg font-extrabold text-white">
					{display(value)}
				</span>
			</div>
			<input
				id={id}
				type="range"
				min={min}
				max={max}
				step={step}
				value={Math.min(Number(value) || 0, max)}
				onChange={(e) => onChange(e.target.value)}
				className="hs-range mt-4"
				style={{ background: `linear-gradient(to right,#95d5b2 0 ${pct}%,#fff ${pct}% 100%)` }}
			/>
			<div className="mt-3 flex items-center gap-2">
				<span className="text-xs font-semibold text-emerald-950/55">Exact:</span>
				<input
					type="number"
					inputMode="decimal"
					min={min}
					step={step}
					value={value}
					aria-label={`${label}, exact value`}
					onChange={(e) => onChange(e.target.value)}
					className={`w-36 rounded-lg border-[1.5px] border-emerald-950/30 bg-white px-3 py-2 text-sm font-semibold hover:border-emerald-950 ${focusRing}`}
					required
				/>
				{hint && <span className="text-xs text-emerald-950/55">{hint}</span>}
			</div>
		</div>
	);
}

function ResultCard({ s, tone, index, onWhy }) {
	const ev = s.evaluation || {};
	const audit = ev.documentAudit || {};
	const missing = audit.missing || [];
	const link = cleanOfficialUrl(s.applicationLink || s.sourceUrl);
	const firstFail = ev.failedRules?.[0];
	const firstUnknown = ev.unknownRules?.[0];
	const stamp = {
		good: { text: "Eligible", tilt: -4, cls: "text-sm" },
		bad: { text: "Not this time", tilt: 3, cls: "border-rose-700 bg-white/70 text-sm text-rose-700" },
		unknown: { text: "Need info", tilt: -2, cls: "border-amber-700 bg-white/70 text-sm text-amber-800" },
	}[tone];

	return (
		<article
			className={`sk-card sk-in relative grid gap-5 rounded-2xl border-[1.5px] bg-white p-5 sm:grid-cols-[1fr_auto] sm:p-6 ${
				tone === "good" ? "border-emerald-950" : "border-emerald-950/30"
			}`}
			style={{ "--d": `${Math.min(index, 8) * 60}ms` }}
		>
			<span className="ud-fold" aria-hidden />
			<div className="min-w-0">
				<div className="flex flex-wrap items-center gap-3">
					<Stamp slam delay={0.1 + Math.min(index, 8) * 0.06} tilt={stamp.tilt} className={stamp.cls}>
						{stamp.text}
					</Stamp>
					{s.category && <span className="text-xs font-bold text-emerald-950/55">{s.category}</span>}
				</div>
				<h3 className="ud-display mt-3 pr-8 text-xl font-bold leading-tight">{s.title || s.name}</h3>
				{s.organization && <p className="mt-1 text-sm text-emerald-950/60">{s.organization}</p>}

				<div className="mt-4 grid gap-4 sm:grid-cols-2">
					<GrantAmount amount={s.amount} />
					<DeadlineMeter deadline={s.deadline} status={s.status} />
				</div>

				{tone === "bad" && firstFail && (
					<p className="mt-4 rounded-lg border-l-4 border-rose-400 bg-rose-50 px-3 py-2 text-sm leading-snug text-rose-900">
						{firstFail.failMessage}
					</p>
				)}
				{tone === "unknown" && firstUnknown && (
					<p className="mt-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm leading-snug text-amber-900">
						We couldn't check: {firstUnknown.description || firstUnknown.required}
					</p>
				)}
				{tone === "good" && missing.length > 0 && (
					<div className="mt-4">
						<p className="text-xs font-bold text-emerald-950/60">Still to arrange</p>
						<ul className="mt-1.5 flex flex-wrap gap-1.5">
							{missing.map((d) => (
								<li key={d.code || d.name} className="rounded-md border border-dashed border-emerald-950/30 bg-[#FAF9F6] px-2 py-0.5 text-xs font-semibold">
									{d.name}
								</li>
							))}
						</ul>
					</div>
				)}

				<div className="mt-5 flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={onWhy}
						className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950 px-4 text-sm font-bold hover:bg-yellow-200 ${focusRing}`}
					>
						<HelpCircle size={15} /> {tone === "good" ? "Why am I eligible?" : "See the rules"}
					</button>
					{tone === "good" && link && (
						<a
							href={link}
							target="_blank"
							rel="noopener noreferrer"
							className={`inline-flex min-h-[44px] items-center gap-1 rounded-full bg-emerald-800 px-4 text-sm font-bold text-white hover:bg-emerald-900 ${focusRing}`}
						>
							Apply <ArrowUpRight size={14} />
							<span className="sr-only">(opens official site)</span>
						</a>
					)}
				</div>
			</div>

			{tone === "good" && typeof ev.readinessScore === "number" && (
				<div className="flex items-center gap-3 border-t border-dashed border-emerald-950/20 pt-4 sm:flex-col sm:justify-center sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
					<ProgressRing percent={ev.readinessScore} size={76} />
					<p className="max-w-[9rem] text-xs font-semibold leading-snug text-emerald-950/65 sm:text-center">
						Ready to apply
						{audit.total > 0 && (
							<span className="block font-medium">
								{audit.heldCount} of {audit.total} documents in hand
							</span>
						)}
					</p>
				</div>
			)}
			{tone === "bad" && typeof ev.matchConfidence === "number" && (
				<p className="self-center text-sm font-semibold text-emerald-950/60 sm:text-right">
					<span className="ud-display block text-3xl font-extrabold text-emerald-950/80">{ev.matchConfidence}%</span>
					of rules met
				</p>
			)}
		</article>
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
	const [documentsHeld, setDocumentsHeld] = useState(["MARKSHEET", "AADHAAR", "BANK_PASSBOOK"]);

	const [step, setStep] = useState(0);
	const [dir, setDir] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [resultsVisible, setResultsVisible] = useState(false);
	const [activeTab, setActiveTab] = useState("eligible");
	const [burst, setBurst] = useState(0);
	const [evaluationData, setEvaluationData] = useState({
		matched: [],
		ineligible: [],
		missing: [],
		summary: { totalEvaluated: 0, eligibleCount: 0, ineligibleCount: 0 },
	});

	const [evidenceScholarship, setEvidenceScholarship] = useState(null);
	const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

	const resultsRef = useRef(null);
	const formRef = useRef(null);
	const headingRef = useRef(null);
	const moved = useRef(false);

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
						casteCategory: p.casteCategory || p.caste_category || prev.casteCategory,
						state: p.state || prev.state,
						cgpa: p.cgpa !== undefined ? p.cgpa : prev.cgpa,
						hasDisability: p.hasDisability !== undefined ? p.hasDisability : prev.hasDisability,
					}));
					if (Array.isArray(p.documentsHeld) && p.documentsHeld.length > 0) {
						setDocumentsHeld(p.documentsHeld);
					}
				}
			})
			.catch(() => {});
	}, []);

	// Move focus to the new step's heading so keyboard and screen-reader users follow along.
	useEffect(() => {
		if (!moved.current) return;
		headingRef.current?.focus({ preventScroll: true });
	}, [step]);

	const goTo = (n) => {
		moved.current = true;
		setDir(n > step ? 1 : -1);
		setStep(n);
		if (formRef.current && formRef.current.getBoundingClientRect().top < 0) {
			formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	const toggleDocument = (code) =>
		setDocumentsHeld((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
	const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

	const handleCheckEligibility = async () => {
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
				const matched = response.data.matched || [];
				setEvaluationData({
					matched,
					ineligible: response.data.ineligible || [],
					missing: response.data.missingProfileData || [],
					summary: response.summary || {},
				});
				setActiveTab(matched.length ? "eligible" : response.data.missingProfileData?.length ? "missing" : "ineligible");
				setResultsVisible(true);
				if (matched.length) setBurst((b) => b + 1);
				setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
			} else {
				toast.error("We couldn't run the check. Please try again.");
			}
		} catch (err) {
			console.error("Eligibility evaluation failed:", err);
			toast.error("The eligibility service didn't respond. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const last = STEPS.length - 1;
	const onSubmit = (e) => {
		e.preventDefault();
		if (step < last) goTo(step + 1);
		else handleCheckEligibility();
	};

	const levelLabel = EDUCATION_LEVELS.find((l) => l.value === formData.educationLevel)?.label;
	const stateLabel = STATES.find((l) => l.value === formData.state)?.label;
	const profileLines = [
		[0, `${levelLabel || formData.educationLevel} · ${formData.courseStream}`],
		[1, `${formData.gender} · ${formData.casteCategory} · ${stateLabel || formData.state}${formData.hasDisability ? " · PwD" : ""}`],
		[2, `${inr(formData.familyIncome)} / yr · CGPA ${formData.cgpa}`],
		[3, `${documentsHeld.length} of ${COMMON_DOCUMENTS.length} certificates`],
	];

	const tabs = [
		{ id: "eligible", label: "Eligible", list: evaluationData.matched, tone: "good" },
		{ id: "missing", label: "Need more info", list: evaluationData.missing, tone: "unknown" },
		{ id: "ineligible", label: "Not eligible", list: evaluationData.ineligible, tone: "bad" },
	].filter((t) => t.id !== "missing" || t.list.length > 0);
	const current = tabs.find((t) => t.id === activeTab) || tabs[0];
	const eligibleCount = evaluationData.matched.length;
	const cur = STEPS[step];

	return (
		<main className="ud-root min-h-screen bg-[#E9F0EA] font-sans text-emerald-950">
			<PageStyles />
			<MotionStyles />
			<Confetti burst={burst} />

			<section className="mx-auto max-w-7xl px-5 pb-8 pt-10 sm:px-8 md:pt-14">
				<div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
					<div>
						<h1 className="font-georgia max-w-2xl text-[2.6rem] font-medium leading-[0.98] sm:text-6xl md:text-7xl">
							Find out what you actually qualify for.
						</h1>
						<p className="mt-5 max-w-xl text-base leading-relaxed text-emerald-950/75 sm:text-lg">
							Four quick steps. We compare your answers against each scheme's official rules and show
							which clause decided every result.
						</p>
					</div>
					<div className="relative mx-auto hidden w-full max-w-sm lg:block">
						<div className="overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white p-3 shadow-[4px_4px_0_0_#022c22]">
							<img src={headerImg} alt="" className="w-full rounded-lg object-cover" />
						</div>
						<Stamp slam delay={0.5} tilt={-8} className="absolute -bottom-3 -left-5 border-emerald-700 bg-white/70 text-2xl text-emerald-700">
							Verified
						</Stamp>
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-16 sm:px-8" ref={formRef}>
				<form
					onSubmit={onSubmit}
					className="grid overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white shadow-[5px_5px_0_0_#022c22] lg:grid-cols-[minmax(0,1fr)_340px]"
				>
					<div className="flex min-w-0 flex-col p-5 sm:p-8">
						{/* Progress */}
						<ol className="grid grid-cols-4 gap-2" aria-label="Progress">
							{STEPS.map((st, i) => {
								const state = i < step ? "done" : i === step ? "now" : "todo";
								return (
									<li key={st.id}>
										<button
											type="button"
											onClick={() => i < step && goTo(i)}
											disabled={i > step}
											aria-current={i === step ? "step" : undefined}
											className={`group w-full cursor-pointer text-left disabled:cursor-default ${focusRing} rounded-md`}
										>
											<span className="block h-2 overflow-hidden rounded-full bg-emerald-950/10">
												<span
													className="block h-full rounded-full bg-emerald-800 transition-[width] duration-500 ease-out"
													style={{ width: state === "todo" ? "0%" : "100%" }}
												/>
											</span>
											<span className={`mt-2 flex items-center gap-1.5 text-xs font-bold ${state === "todo" ? "text-emerald-950/40" : "text-emerald-950"}`}>
												{state === "done" ? (
													<Check size={13} strokeWidth={3} className="sk-pop text-emerald-700" />
												) : (
													<span>{i + 1}</span>
												)}
												<span className="hidden sm:inline">{st.label}</span>
											</span>
										</button>
									</li>
								);
							})}
						</ol>

						<div key={step} className="sk-step mt-8 flex-1" style={{ "--dir": dir }}>
							<p className="text-xs font-bold uppercase tracking-wider text-emerald-950/50">
								Step {step + 1} of {STEPS.length}
							</p>
							<h2 ref={headingRef} tabIndex={-1} className="ud-display mt-1 text-2xl font-bold leading-tight outline-none sm:text-3xl">
								{cur.title}
							</h2>
							<p className="mt-1.5 text-sm leading-relaxed text-emerald-950/65">{cur.sub}</p>

							<div className="mt-7 space-y-7">
								{step === 0 && (
									<>
										<ChipGroup label="Current level of study" options={EDUCATION_LEVELS} value={formData.educationLevel} onChange={(v) => set("educationLevel", v)} />
										<ChipGroup label="Field / stream" options={STREAMS} value={formData.courseStream} onChange={(v) => set("courseStream", v)} />
									</>
								)}
								{step === 1 && (
									<>
										<ChipGroup label="Gender" options={GENDERS} value={formData.gender} onChange={(v) => set("gender", v)} />
										<ChipGroup label="Social category" options={CATEGORIES} value={formData.casteCategory} onChange={(v) => set("casteCategory", v)} />
										<ChipGroup label="Home state" options={STATES} value={formData.state} onChange={(v) => set("state", v)} />
										<CheckTile checked={formData.hasDisability} onToggle={() => set("hasDisability", !formData.hasDisability)}>
											I have a PwD disability certificate (40% or more)
										</CheckTile>
									</>
								)}
								{step === 2 && (
									<>
										<DualNumber
											id="elig-income"
											label="Annual family income"
											value={formData.familyIncome}
											onChange={(v) => set("familyIncome", v)}
											min={0}
											max={2000000}
											step={10000}
											display={(v) => (Number(v) >= 2000000 ? "₹20L+" : `${inr(v)}`)}
											hint="As on your income certificate"
										/>
										<DualNumber
											id="elig-cgpa"
											label="Latest CGPA (out of 10)"
											value={formData.cgpa}
											onChange={(v) => set("cgpa", v)}
											min={0}
											max={10}
											step={0.1}
											display={(v) => Number(v).toFixed(1)}
											hint="Board % ÷ 9.5 is a fair estimate"
										/>
									</>
								)}
								{step === 3 && (
									<div className="grid gap-2.5 sm:grid-cols-2">
										{COMMON_DOCUMENTS.map((doc) => (
											<CheckTile key={doc.code} checked={documentsHeld.includes(doc.code)} onToggle={() => toggleDocument(doc.code)}>
												{doc.name}
											</CheckTile>
										))}
									</div>
								)}
							</div>
						</div>

						<VerifyingCard active={isSubmitting} />

						<div className="sticky bottom-0 -mx-5 mt-8 flex items-center gap-3 border-t-[1.5px] border-dashed border-emerald-950/25 bg-white px-5 py-4 sm:static sm:mx-0 sm:px-0 sm:pb-0">
							{step > 0 && (
								<button
									type="button"
									onClick={() => goTo(step - 1)}
									className={`inline-flex min-h-[48px] cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950 px-5 text-sm font-bold hover:bg-emerald-50 ${focusRing}`}
								>
									<ArrowLeft size={16} /> Back
								</button>
							)}
							<button
								type="submit"
								disabled={isSubmitting}
								className={`sk-chip ml-auto inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-[1.5px] border-emerald-950 px-6 text-sm font-bold shadow-[0_3px_0_0_#022c22] disabled:cursor-wait disabled:opacity-70 sm:flex-none ${focusRing} ${
									step === last ? "bg-yellow-200 text-emerald-950" : "bg-emerald-800 text-white"
								}`}
							>
								{isSubmitting ? (
									<>
										<span className="ud-spin" /> Checking every scheme
									</>
								) : step === last ? (
									<>
										<Sparkles size={16} /> Check my eligibility
									</>
								) : (
									<>
										Next <ArrowRight size={16} />
									</>
								)}
							</button>
						</div>
					</div>

					{/* Live profile ticket */}
					<aside className="relative hidden border-l-[1.5px] border-dashed border-emerald-950 bg-emerald-50 p-8 lg:block">
						<span aria-hidden className="absolute -left-3 -top-3 h-6 w-6 rounded-full border-[1.5px] border-emerald-950 bg-[#E9F0EA]" />
						<span aria-hidden className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full border-[1.5px] border-emerald-950 bg-[#E9F0EA]" />
						<p className="ud-display text-lg font-bold">Your profile so far</p>
						<ul className="mt-5 space-y-4">
							{profileLines.map(([i, text]) => (
								<li key={i} className={`flex items-start gap-3 transition-opacity ${i > step ? "opacity-35" : ""}`}>
									<span
										className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-emerald-950 text-xs font-bold ${
											i < step ? "bg-emerald-900 text-white" : i === step ? "bg-yellow-200" : "bg-white"
										}`}
									>
										{i < step ? <Check size={12} strokeWidth={3.5} /> : i + 1}
									</span>
									<span>
										<span className="block text-xs font-bold text-emerald-950/55">{STEPS[i].label}</span>
										<span key={text} className="ud-fade-in block text-sm font-semibold leading-snug">
											{text}
										</span>
									</span>
								</li>
							))}
						</ul>
						<p className="mt-8 -rotate-1 rounded-md bg-yellow-200 p-4 text-sm font-medium leading-snug shadow-[0_6px_0_-3px_rgba(2,44,34,0.15)]">
							No Aadhaar number, no uploads. Only what the rules actually check.
						</p>
					</aside>
				</form>
			</section>

			<section ref={resultsRef} className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-24 sm:px-8 md:pb-32">
				{resultsVisible && (
					<div className="ud-fade-in">
						<div className="flex flex-col items-start gap-6 rounded-2xl border-[1.5px] border-emerald-950 bg-white p-6 sm:flex-row sm:items-center sm:p-8">
							<div className="shrink-0">
								{eligibleCount > 0 ? <CheeringStudent size={96} /> : <ConfusedDetective size={96} />}
							</div>
							<div className="min-w-0 flex-1" aria-live="polite">
								<p className="text-sm font-bold text-emerald-950/60">Your eligibility report</p>
								<h2 className="ud-display mt-1 text-3xl font-extrabold leading-[1.05] sm:text-5xl">
									{eligibleCount > 0 ? (
										<>
											You can apply to{" "}
											<span className="underline decoration-yellow-300 decoration-[6px] underline-offset-4">
												<CountUp value={eligibleCount} duration={900} />
											</span>{" "}
											{eligibleCount === 1 ? "scheme" : "schemes"}.
										</>
									) : (
										"No clean match yet."
									)}
								</h2>
								<p className="mt-3 max-w-xl text-sm leading-relaxed text-emerald-950/70 sm:text-base">
									Checked against {evaluationData.summary.totalEvaluated || 0} open, verified schemes.
									{evaluationData.missing.length > 0 &&
										` ${evaluationData.missing.length} more need a detail we couldn't check.`}
									{eligibleCount === 0 && " The 'Not eligible' tab shows how close you came and which rule stopped each one."}
								</p>
							</div>
							<button
								type="button"
								onClick={() => goTo(0)}
								className={`inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950 px-4 text-sm font-bold hover:bg-emerald-50 ${focusRing}`}
							>
								<Pencil size={14} /> Edit answers
							</button>
						</div>

						<div role="tablist" aria-label="Results" className="no-scrollbar mt-8 flex gap-2 overflow-x-auto pb-1">
							{tabs.map((t) => (
								<button
									key={t.id}
									type="button"
									role="tab"
									aria-selected={current.id === t.id}
									onClick={() => setActiveTab(t.id)}
									className={`sk-chip inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-bold ${focusRing} ${
										current.id === t.id ? "border-emerald-950 bg-emerald-950 text-white" : "border-emerald-950/25 bg-white"
									}`}
								>
									{t.id === "eligible" ? <CheckCircle2 size={16} /> : t.id === "missing" ? <AlertCircle size={16} /> : <XCircle size={16} />}
									{t.label}
									<span className="rounded-full bg-white/20 px-1.5 text-xs">{t.list.length}</span>
								</button>
							))}
						</div>

						<div key={current.id} role="tabpanel" className="mt-5 grid gap-4">
							{current.list.length === 0 ? (
								<p className="rounded-2xl border-[1.5px] border-dashed border-emerald-950/30 bg-white/60 p-6 text-sm font-medium text-emerald-950/70">
									{current.id === "eligible"
										? "Nothing matched every rule. Try the 'Not eligible' tab to see which rule was the blocker."
										: "Nothing here. You cleared every scheme we could check."}
								</p>
							) : (
								current.list.map((s, i) => (
									<ResultCard
										key={s._id || s.id || i}
										s={s}
										tone={current.tone}
										index={i}
										onWhy={() => {
											setEvidenceScholarship(s);
											setIsEvidenceOpen(true);
										}}
									/>
								))
							)}
						</div>
					</div>
				)}
			</section>

			{isEvidenceOpen && (
				<EvidenceModal isOpen={isEvidenceOpen} onClose={() => setIsEvidenceOpen(false)} scholarship={evidenceScholarship} />
			)}
		</main>
	);
}
