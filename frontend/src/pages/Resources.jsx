import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
	ArrowLeft,
	ArrowRight,
	Building2,
	Camera,
	Check,
	ChevronDown,
	Copy,
	CreditCard,
	Download,
	ExternalLink,
	FileText,
	GraduationCap,
	Landmark,
	Receipt,
	ShieldCheck,
	Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Confetti, PageStyles, Stamp, useCopy } from "../components/PageKit";

const ROADMAP_STEPS = [
	{
		step: "01",
		title: "Find and shortlist scholarships",
		short: "Find schemes",
		category: "Discovery",
		description:
			"Target the highest-probability opportunities for your state, category and degree, without drowning in 200 tabs.",
		time: "4 min read",
		path: "/how-to-apply",
		tips: [
			"Filter by your state, category and course first. Ignore the rest.",
			"Shortlist 5 to 8 schemes and put each deadline in your phone's calendar.",
			"Read eligibility from the official circular, never from a forwarded message.",
		],
		illustration: (
			<svg
				viewBox="0 0 240 140"
				className="h-full max-h-52 w-full"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<ellipse
					cx="120"
					cy="95"
					rx="80"
					ry="32"
					fill="#D8F3DC"
					fillOpacity="0.6"
				/>
				<rect
					x="70"
					y="28"
					width="100"
					height="76"
					rx="10"
					fill="#FFFFFF"
					stroke="#022c22"
					strokeWidth="2"
				/>
				<rect x="82" y="42" width="76" height="7" rx="3.5" fill="#143621" />
				<rect x="82" y="55" width="55" height="5" rx="2.5" fill="#52B788" />
				<rect x="82" y="66" width="65" height="5" rx="2.5" fill="#74C69D" />
				<circle cx="150" cy="78" r="16" fill="#143621" />
				<circle cx="147" cy="75" r="7" stroke="#FFFFFF" strokeWidth="2" />
				<path
					d="M152 80L160 88"
					stroke="#FFFFFF"
					strokeWidth="2.5"
					strokeLinecap="round"
				/>
			</svg>
		),
	},
	{
		step: "02",
		title: "Prepare your documents",
		short: "Get paperwork",
		category: "Paperwork",
		description:
			"Certificates, issuing officers, bonafide letters and bank Aadhaar seeding, all in one checklist further down this page.",
		time: "5 min read",
		path: "/how-to-apply",
		tips: [
			"Start the income and caste certificates first. They take the longest.",
			"Scan every document as PDF or JPEG under 2 MB.",
			"Check that your bank account is Aadhaar-seeded and the name matches your ID.",
		],
		illustration: (
			<svg
				viewBox="0 0 240 140"
				className="h-full max-h-52 w-full"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<ellipse
					cx="120"
					cy="95"
					rx="80"
					ry="32"
					fill="#D8F3DC"
					fillOpacity="0.6"
				/>
				<rect
					x="65"
					y="32"
					width="70"
					height="75"
					rx="8"
					fill="#FFFFFF"
					stroke="#74C69D"
					strokeWidth="1.5"
				/>
				<rect
					x="85"
					y="24"
					width="80"
					height="85"
					rx="10"
					fill="#FFFFFF"
					stroke="#022c22"
					strokeWidth="2"
				/>
				<rect x="98" y="38" width="54" height="6" rx="3" fill="#143621" />
				<rect x="98" y="50" width="45" height="5" rx="2.5" fill="#52B788" />
				<rect x="98" y="61" width="50" height="5" rx="2.5" fill="#74C69D" />
				<circle cx="142" cy="85" r="11" fill="#2D6A4F" />
				<path
					d="M138 85L141 88L147 82"
					stroke="#FFFFFF"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		),
	},
	{
		step: "03",
		title: "Write a strong personal statement",
		short: "Write your story",
		category: "Statement",
		description:
			"Use the 5-step narrative blueprint and the STAR framework to turn your challenges into a story reviewers remember.",
		time: "6 min read",
		path: "/application-guide",
		tips: [
			"Open with one specific moment, not “I have always been passionate about…”.",
			"Use STAR: Situation, Task, Action, Result. Put real numbers in the result.",
			"End with what this scholarship lets you do next.",
		],
		illustration: (
			<svg
				viewBox="0 0 240 140"
				className="h-full max-h-52 w-full"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<ellipse
					cx="120"
					cy="95"
					rx="80"
					ry="32"
					fill="#D8F3DC"
					fillOpacity="0.6"
				/>
				<rect
					x="75"
					y="25"
					width="90"
					height="82"
					rx="10"
					fill="#FFFFFF"
					stroke="#022c22"
					strokeWidth="2"
				/>
				<rect x="88" y="38" width="64" height="6" rx="3" fill="#143621" />
				<rect x="88" y="50" width="55" height="4" rx="2" fill="#52B788" />
				<rect x="88" y="60" width="60" height="4" rx="2" fill="#74C69D" />
				<rect x="88" y="70" width="40" height="4" rx="2" fill="#95D5B2" />
				<path d="M165 45L180 30L190 40L175 55L165 45Z" fill="#143621" />
				<path d="M165 45L155 58L168 55L165 45Z" fill="#D97706" />
				<circle cx="155" cy="58" r="1.5" fill="#FFFFFF" />
			</svg>
		),
	},
	{
		step: "04",
		title: "Verify and submit without errors",
		short: "Submit",
		category: "Final submit",
		description:
			"Double-check file sizes, bank account status and names, then save the official acknowledgement receipt.",
		time: "3 min read",
		path: "/how-to-apply",
		tips: [
			"Open every upload once more. Is it readable and the right way up?",
			"Make sure name, date of birth and bank details match across documents.",
			"Save the application ID and receipt as a PDF and a screenshot.",
		],
		illustration: (
			<svg
				viewBox="0 0 240 140"
				className="h-full max-h-52 w-full"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<ellipse
					cx="120"
					cy="95"
					rx="80"
					ry="32"
					fill="#D8F3DC"
					fillOpacity="0.6"
				/>
				<rect
					x="70"
					y="30"
					width="100"
					height="74"
					rx="10"
					fill="#FFFFFF"
					stroke="#022c22"
					strokeWidth="2"
				/>
				<path d="M120 42L140 78L120 70L100 78L120 42Z" fill="#143621" />
				<path d="M120 42L127 72L120 70V42Z" fill="#2D6A4F" />
				<circle cx="120" cy="58" r="3" fill="#D8F3DC" />
				<path
					d="M115 75L120 85L125 75"
					stroke="#D97706"
					strokeWidth="2"
					strokeLinecap="round"
				/>
			</svg>
		),
	},
];

const DOCUMENTS = [
	{
		name: "Aadhaar Card (Identity & DOB)",
		icon: CreditCard,
		slow: false,
		tip: "Download your e-Aadhaar from the UIDAI portal. The PDF is accepted for most uploads.",
	},
	{
		name: "Income Certificate (Tehsildar/SDM)",
		icon: Wallet,
		slow: true,
		tip: "Apply through your state's e-District portal or the Tehsildar/SDM office. Check which financial year the scheme accepts.",
	},
	{
		name: "Caste / Category Certificate",
		icon: FileText,
		slow: true,
		tip: "Issued by the Tehsildar/SDM office, usually via the same e-District portal. Some schemes want a recent or specific format, so check the circular.",
	},
	{
		name: "Previous Year Academic Mark Sheets",
		icon: GraduationCap,
		slow: false,
		tip: "Use your last completed year. Merge multi-page results into one PDF so the upload doesn't fail.",
	},
	{
		name: "College Bonafide Certificate",
		icon: Building2,
		slow: false,
		tip: "Request it from your college office or admin portal, and ask for the current academic year on it.",
	},
	{
		name: "Bank Passbook (Aadhaar Seeded)",
		icon: Landmark,
		slow: true,
		tip: "Scan the first page with your name, account number and IFSC. Confirm with the bank that the account is Aadhaar-seeded for direct benefit transfer.",
	},
	{
		name: "Passport Size Photographs",
		icon: Camera,
		slow: false,
		tip: "Plain background, face clearly visible. Check each portal's file-size limit before you compress.",
	},
	{
		name: "Current Year College Fee Receipt",
		icon: Receipt,
		slow: false,
		tip: "Ask the accounts office for this year's receipt, stamped or signed if the portal asks for it.",
	},
];

const PORTALS = [
	{
		name: "National Scholarship Portal (NSP)",
		authority: "Ministry of Electronics & IT / Ministry of Education",
		desc: "Central sector schemes, post-matric fellowships, and state quota disbursements.",
		url: "https://scholarships.gov.in/All-Scholarships",
		tag: "Central",
	},
	{
		name: "AICTE Fellowship & Schemes Portal",
		authority: "All India Council for Technical Education",
		desc: "Pragati, Saksham, Swanath, and PG GATE engineering stipends.",
		url: "https://fellowship.aicte.gov.in/",
		tag: "Fellowship",
	},
	{
		name: "UGC Student Financial Assistance",
		authority: "University Grants Commission",
		desc: "Ishan Uday (NER), Single Girl Child, and university rank holder grants.",
		url: "https://www.ugc.gov.in/Home/student_Corner",
		tag: "Fellowship",
	},
	{
		name: "UP State Scholarship Portal (Dashmottar)",
		authority: "Social Welfare Department, Uttar Pradesh",
		desc: "Pre-matric and post-matric fee reimbursement for Uttar Pradesh domicile students.",
		url: "https://scholarship.up.gov.in/",
		tag: "State",
	},
];

const DOWNLOADS = [
	{
		title: "Scholarship Document Checklist 2026",
		type: "PDF",
		size: "280 KB",
		href: "/downloads/scholarship-document-checklist-2026.pdf",
	},
	{
		title: "Student Academic Resume & CV Template",
		type: "DOCX",
		size: "45 KB",
		href: "/downloads/student-cv-template.docx",
	},
	{
		title: "Statement of Purpose for Scholarships",
		type: "DOCX",
		size: "15.4 KB",
		href: "/downloads/sop-sample-drafts.docx",
	},
];

const LEVELS = [
	{ min: 100, label: "Ready to apply" },
	{ min: 60, label: "Almost ready" },
	{ min: 25, label: "In progress" },
	{ min: 0, label: "Just starting" },
];

function usePersisted(key, initial) {
	const [value, setValue] = useState(() => {
		try {
			const raw = JSON.parse(localStorage.getItem(key) || "null");
			return Array.isArray(raw) ? raw : initial;
		} catch {
			return initial;
		}
	});
	useEffect(() => {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {}
	}, [key, value]);
	return [value, setValue];
}

const goTo = (id) =>
	document
		.getElementById(id)
		?.scrollIntoView({ behavior: "smooth", block: "start" });

function Segmented({ options, value, onChange }) {
	return (
		<div
			className="inline-flex rounded-full border-[1.5px] border-emerald-950 bg-white p-1"
			role="tablist"
		>
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					role="tab"
					aria-selected={value === o.value}
					onClick={() => onChange(o.value)}
					className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
						value === o.value
							? "bg-emerald-950 text-white"
							: "text-emerald-950/70 hover:bg-emerald-50"
					}`}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

function MeterBar({ label, done, total }) {
	return (
		<div>
			<div className="mb-1.5 flex items-baseline justify-between text-sm">
				<span className="font-semibold">{label}</span>
				<span className="text-emerald-950/65">
					{done} of {total}
				</span>
			</div>
			<div className="flex gap-1" aria-hidden>
				{Array.from({ length: total }, (_, i) => (
					<span
						key={i}
						className={`h-2.5 flex-1 rounded-sm border border-emerald-950 transition-colors duration-300 ${i < done ? "bg-emerald-700" : "bg-white"}`}
					/>
				))}
			</div>
		</div>
	);
}

export default function Resources() {
	const [checked, setChecked] = usePersisted("checkedDocs", []);
	const [doneSteps, setDoneSteps] = usePersisted("doneRoadmapSteps", []);
	const [active, setActive] = useState(0);
	const [docFilter, setDocFilter] = useState("all");
	const [openTip, setOpenTip] = useState(null);
	const [fresh, setFresh] = useState(null);
	const [burst, setBurst] = useState(0);
	const [portalFilter, setPortalFilter] = useState("All");
	const [fileFilter, setFileFilter] = useState("All");
	const [saved, setSaved] = useState([]);
	const [copied, copy] = useCopy();

	const isReady = (name) => checked.includes(name);
	const docCount = DOCUMENTS.filter((d) => isReady(d.name)).length;
	const stepCount = ROADMAP_STEPS.filter((s) =>
		doneSteps.includes(s.step),
	).length;
	const readiness = Math.round(
		((stepCount / ROADMAP_STEPS.length) * 0.4 +
			(docCount / DOCUMENTS.length) * 0.6) *
			100,
	);
	const level = LEVELS.find((l) => readiness >= l.min);
	const allDocs = docCount === DOCUMENTS.length;
	const allSteps = stepCount === ROADMAP_STEPS.length;

	const prev = useRef({ allDocs, allSteps });
	useEffect(() => {
		if (allDocs && !prev.current.allDocs) {
			setBurst((b) => b + 1);
			toast.success("Every document is ready. Nice work.");
		} else if (allSteps && !prev.current.allSteps) {
			setBurst((b) => b + 1);
			toast.success("Roadmap finished.");
		}
		prev.current = { allDocs, allSteps };
	}, [allDocs, allSteps]);

	const toggleDoc = (name) => {
		if (!isReady(name)) setFresh(name);
		setChecked((list) =>
			list.includes(name) ? list.filter((n) => n !== name) : [...list, name],
		);
	};
	const resetDocs = () => {
		setChecked([]);
		setFresh(null);
	};

	const toggleStep = (stepId, idx) => {
		const wasDone = doneSteps.includes(stepId);
		setDoneSteps((list) =>
			wasDone ? list.filter((s) => s !== stepId) : [...list, stepId],
		);
		if (!wasDone && idx < ROADMAP_STEPS.length - 1) setActive(idx + 1);
	};

	const next = (() => {
		const slow = DOCUMENTS.find((d) => d.slow && !isReady(d.name));
		if (slow)
			return { text: `Start early: ${slow.name}`, go: () => goTo("checklist") };
		const doc = DOCUMENTS.find((d) => !isReady(d.name));
		if (doc)
			return { text: `Collect: ${doc.name}`, go: () => goTo("checklist") };
		const stepIdx = ROADMAP_STEPS.findIndex((s) => !doneSteps.includes(s.step));
		if (stepIdx >= 0)
			return {
				text: `Read: ${ROADMAP_STEPS[stepIdx].title}`,
				go: () => {
					setActive(stepIdx);
					goTo("roadmap");
				},
			};
		return { text: "Find schemes that match you", to: "/eligibility" };
	})();

	const visibleDocs = DOCUMENTS.filter((d) =>
		docFilter === "todo"
			? !isReady(d.name)
			: docFilter === "ready"
				? isReady(d.name)
				: true,
	);
	const visiblePortals = PORTALS.filter(
		(p) => portalFilter === "All" || p.tag === portalFilter,
	);
	const visibleFiles = DOWNLOADS.filter(
		(f) => fileFilter === "All" || f.type === fileFilter,
	);
	const s = ROADMAP_STEPS[active];
	const stepDone = doneSteps.includes(s.step);

	return (
		<div className="ud-root min-h-screen bg-[#E9F0EA] font-sans text-emerald-950">
			<PageStyles />
			<Confetti burst={burst} />

			<section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 md:pb-24 md:pt-20 lg:grid-cols-12">
				<div className="lg:col-span-7">
					<h1 className="font-display text-5xl font-medium leading-[1.05] sm:text-6xl md:text-7xl">
						Get your paperwork ready before the deadline does.
					</h1>
					<p className="mt-6 max-w-xl text-base leading-relaxed text-emerald-950/75 sm:text-lg">
						A step-by-step roadmap, a document checklist that remembers your
						progress, templates you can download, and links to the official
						portals.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<button
							type="button"
							onClick={() => goTo("roadmap")}
							className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-emerald-800 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 active:translate-y-px"
						>
							Start the roadmap <ArrowRight size={16} />
						</button>
						<button
							type="button"
							onClick={() => goTo("checklist")}
							className="cursor-pointer rounded-full border-[1.5px] border-emerald-950 bg-white px-6 py-3 text-sm font-bold transition hover:bg-emerald-50"
						>
							Jump to checklist
						</button>
					</div>
				</div>

				<div className="relative mx-auto w-full max-w-md lg:col-span-5">
					<div
						aria-hidden
						className="absolute inset-0 rotate-3 rounded-2xl border-[1.5px] border-emerald-950 bg-emerald-100"
					/>
					<div className="relative -rotate-1 rounded-2xl border-[1.5px] border-emerald-950 bg-white p-6 sm:p-7">
						<p className="text-sm font-semibold text-emerald-950/65">
							Your application readiness
						</p>
						<div className="mt-3 flex min-h-[3.5rem] items-center">
							<Stamp
								key={level.label}
								slam
								tilt={-4}
								className="text-2xl sm:text-3xl"
							>
								{level.label}
							</Stamp>
						</div>
						<div className="mt-6 space-y-4">
							<MeterBar
								label="Roadmap steps"
								done={stepCount}
								total={ROADMAP_STEPS.length}
							/>
							<MeterBar
								label="Documents"
								done={docCount}
								total={DOCUMENTS.length}
							/>
						</div>
						<div className="mt-6 border-t-[1.5px] border-dashed border-emerald-950/40 pt-5">
							<p className="text-sm text-emerald-950/65">Next up</p>
							{next.to ? (
								<Link
									to={next.to}
									className="mt-1 flex items-center justify-between gap-3 text-[15px] font-bold underline decoration-yellow-300 decoration-2 underline-offset-4"
								>
									{next.text} <ArrowRight size={16} className="shrink-0" />
								</Link>
							) : (
								<button
									type="button"
									onClick={next.go}
									className="mt-1 flex w-full cursor-pointer items-center justify-between gap-3 text-left text-[15px] font-bold underline decoration-yellow-300 decoration-2 underline-offset-4"
								>
									{next.text} <ArrowRight size={16} className="shrink-0" />
								</button>
							)}
						</div>
					</div>
				</div>
			</section>

			<section
				id="roadmap"
				className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 md:pb-28"
			>
				<h2 className="ud-display max-w-2xl text-4xl font-extrabold leading-[1.02] sm:text-5xl">
					Four steps from “where do I start?” to submitted
				</h2>
				<p className="mt-4 max-w-xl text-base leading-relaxed text-emerald-950/75">
					Tap a step to see what to do. Mark it done when you're through, and it
					counts toward your readiness.
				</p>

				<div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
					<ol className="relative flex flex-col gap-3">
						<span
							aria-hidden
							className="absolute bottom-8 left-[2.15rem] top-8 hidden w-[1.5px] bg-emerald-950/25 sm:block"
						/>
						{ROADMAP_STEPS.map((st, idx) => {
							const on = active === idx;
							const done = doneSteps.includes(st.step);
							return (
								<li key={st.step}>
									<button
										type="button"
										onClick={() => setActive(idx)}
										aria-current={on ? "step" : undefined}
										className={`relative flex w-full cursor-pointer items-center gap-4 rounded-xl border-[1.5px] p-4 text-left transition-colors ${
											on
												? "border-emerald-950 bg-white"
												: "border-emerald-950/20 bg-white/60 hover:border-emerald-950 hover:bg-white"
										}`}
									>
										<span
											className={`ud-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-emerald-950 text-base font-extrabold transition-colors ${
												done
													? "bg-emerald-800 text-white"
													: on
														? "bg-yellow-200"
														: "bg-white"
											}`}
										>
											{done ? <Check size={20} strokeWidth={3} /> : st.step}
										</span>
										<span className="min-w-0 flex-1">
											<span className="block text-[15px] font-bold leading-snug sm:text-base">
												{st.title}
											</span>
											<span className="mt-0.5 block text-sm text-emerald-950/60">
												{st.category}, {st.time}
											</span>
										</span>
									</button>
								</li>
							);
						})}
					</ol>

					<div
						key={active}
						className="ud-fade-in overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white"
					>
						<div className="relative flex h-56 items-center justify-center border-b-[1.5px] border-emerald-950 bg-emerald-100 p-4">
							{s.illustration}
							{stepDone && (
								<Stamp
									slam
									tilt={-10}
									className="absolute right-5 top-5 bg-white/50 text-lg"
								>
									Done
								</Stamp>
							)}
						</div>
						<div className="p-6 sm:p-8">
							<p className="text-sm font-semibold text-emerald-800">
								Step {s.step}: {s.category}
							</p>
							<h3 className="ud-display mt-1 text-3xl font-extrabold leading-tight">
								{s.title}
							</h3>
							<p className="mt-3 text-[15px] leading-relaxed text-emerald-950/75">
								{s.description}
							</p>

							<ul className="mt-6 space-y-3">
								{s.tips.map((tip) => (
									<li
										key={tip}
										className="flex items-start gap-3 text-[15px] leading-snug"
									>
										<span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-700" />
										{tip}
									</li>
								))}
							</ul>

							<div className="mt-8 flex flex-wrap items-center gap-3">
								<button
									type="button"
									onClick={() => toggleStep(s.step, active)}
									className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition active:translate-y-px ${
										stepDone
											? "border-[1.5px] border-emerald-950 bg-white hover:bg-emerald-50"
											: "bg-emerald-800 text-white hover:bg-emerald-900"
									}`}
								>
									<Check size={16} />
									{stepDone ? "Marked done. Undo" : "Mark step done"}
								</button>
								<Link
									to={s.path}
									className="inline-flex items-center gap-1.5 text-sm font-bold underline decoration-yellow-300 decoration-2 underline-offset-4"
								>
									Read the full guide <ArrowRight size={15} />
								</Link>
								<div className="ml-auto flex gap-2">
									<button
										type="button"
										aria-label="Previous step"
										disabled={active === 0}
										onClick={() => setActive(active - 1)}
										className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-emerald-950 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-30"
									>
										<ArrowLeft size={16} />
									</button>
									<button
										type="button"
										aria-label="Next step"
										disabled={active === ROADMAP_STEPS.length - 1}
										onClick={() => setActive(active + 1)}
										className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-emerald-950 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-30"
									>
										<ArrowRight size={16} />
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section
				id="checklist"
				className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 md:pb-28"
			>
				<div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-14">
					<div className="lg:sticky lg:top-24 lg:self-start">
						<h2 className="ud-display text-4xl font-extrabold leading-[1.02] sm:text-5xl">
							Document checklist
						</h2>
						<p className="mt-4 text-base leading-relaxed text-emerald-950/75">
							Tick a document when you have a digital copy ready (PDF or JPEG
							under 2 MB). We save your ticks on this device.
						</p>
						<div className="mt-6">
							<MeterBar
								label={
									allDocs ? "All ready" : `${DOCUMENTS.length - docCount} to go`
								}
								done={docCount}
								total={DOCUMENTS.length}
							/>
						</div>
						<div className="mt-6 flex flex-wrap items-center gap-3">
							<Segmented
								value={docFilter}
								onChange={setDocFilter}
								options={[
									{ value: "all", label: "All" },
									{ value: "todo", label: "To do" },
									{ value: "ready", label: "Ready" },
								]}
							/>
							{docCount > 0 && (
								<button
									type="button"
									onClick={resetDocs}
									className="cursor-pointer text-sm font-semibold text-emerald-950/60 underline underline-offset-4 hover:text-red-700"
								>
									Reset
								</button>
							)}
						</div>
					</div>

					<div>
						{visibleDocs.length === 0 ? (
							<div className="rounded-2xl border-[1.5px] border-dashed border-emerald-950/50 bg-white/60 p-8 text-[15px]">
								{docFilter === "todo"
									? "Nothing left to collect. Every document is ready."
									: "No documents ticked yet. Tap one on the left to stamp it."}
							</div>
						) : (
							<ul className="grid gap-4 sm:grid-cols-2">
								{visibleDocs.map((d) => {
									const on = isReady(d.name);
									const tipOpen = openTip === d.name;
									const Icon = d.icon;
									return (
										<li
											key={d.name}
											className={`relative rounded-xl border-[1.5px] transition-colors ${on ? "border-emerald-950 bg-emerald-50" : "border-emerald-950/25 bg-white"}`}
										>
											{on && (
												<Stamp
													slam={fresh === d.name}
													tilt={-9}
													className="absolute -top-3 right-12 bg-emerald-50/70 text-xs"
												>
													Ready
												</Stamp>
											)}
											<button
												type="button"
												onClick={() => toggleDoc(d.name)}
												aria-pressed={on}
												className="flex w-full cursor-pointer items-center gap-4 p-4 text-left"
											>
												<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-emerald-950 bg-white">
													<Icon size={20} />
												</span>
												<span className="min-w-0 flex-1">
													<span className="block text-[15px] font-semibold leading-snug">
														{d.name}
													</span>
													{d.slow && !on && (
														<span className="mt-1.5 inline-block rounded-full bg-yellow-200 px-2.5 py-0.5 text-xs font-bold">
															Start early
														</span>
													)}
												</span>
												<span
													className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-[1.5px] border-emerald-950 transition-colors ${on ? "bg-emerald-800 text-white" : "bg-white"}`}
												>
													{on && <Check size={14} strokeWidth={3.5} />}
												</span>
											</button>
											<div className="border-t border-dashed border-emerald-950/25 px-4 py-2">
												<button
													type="button"
													aria-expanded={tipOpen}
													onClick={() => setOpenTip(tipOpen ? null : d.name)}
													className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-emerald-800 hover:underline"
												>
													How to get it
													<ChevronDown
														size={15}
														className={`transition-transform ${tipOpen ? "rotate-180" : ""}`}
													/>
												</button>
											</div>
											<div
												className={`grid transition-[grid-template-rows] duration-300 ease-out ${tipOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
											>
												<div className="overflow-hidden">
													<p className="px-4 pb-4 text-sm leading-relaxed text-emerald-950/80">
														{d.tip}
													</p>
												</div>
											</div>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 md:pb-28">
				<div className="flex flex-wrap items-end justify-between gap-6">
					<div className="max-w-2xl">
						<h2 className="ud-display text-4xl font-extrabold leading-[1.02] sm:text-5xl">
							Official portals
						</h2>
						<p className="mt-4 text-base leading-relaxed text-emerald-950/75">
							Apply only on government domains. Udaan reads scholarship rules
							straight from these authorities.
						</p>
					</div>
					<Segmented
						value={portalFilter}
						onChange={setPortalFilter}
						options={["All", "Central", "Fellowship", "State"].map((v) => ({
							value: v,
							label: v,
						}))}
					/>
				</div>

				<div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
					<div className="divide-y-[1.5px] divide-dashed divide-emerald-950/25 overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white">
						{visiblePortals.map((p) => {
							const host = new URL(p.url).hostname;
							return (
								<div
									key={p.url}
									className="ud-fade-in flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6"
								>
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2.5">
											<h3 className="text-lg font-bold leading-snug">
												{p.name}
											</h3>
											<span className="rounded-full border-[1.5px] border-emerald-950 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold">
												{p.tag}
											</span>
										</div>
										<p className="mt-1 text-sm text-emerald-950/60">
											{p.authority}
										</p>
										<p className="mt-2 text-[15px] leading-relaxed text-emerald-950/80">
											{p.desc}
										</p>
										<p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
											<ShieldCheck size={15} /> {host}
										</p>
									</div>
									<div className="flex shrink-0 items-center gap-2">
										<button
											type="button"
											aria-label={`Copy link to ${p.name}`}
											onClick={() =>
												copy(p.url, p.url).then(
													(ok) => ok && toast.success("Link copied"),
												)
											}
											className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-emerald-950/30 hover:border-emerald-950"
										>
											{copied === p.url ? (
												<Check size={16} className="text-emerald-700" />
											) : (
												<Copy size={16} />
											)}
										</button>
										<a
											href={p.url}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 active:translate-y-px"
										>
											Open portal <ExternalLink size={15} />
										</a>
									</div>
								</div>
							);
						})}
					</div>

					<div className="-rotate-1 rounded-md bg-yellow-200 p-5 shadow-[0_6px_0_-3px_rgba(2,44,34,0.15)]">
						<p className="ud-display text-lg font-bold">
							Check the address bar
						</p>
						<p className="mt-2 text-sm leading-relaxed">
							Real scholarship portals end in <strong>.gov.in</strong> or{" "}
							<strong>.nic.in</strong>. If a site asks for a “processing fee” to
							apply, close it.
						</p>
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 md:pb-28">
				<div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-14">
					<div>
						<h2 className="ud-display text-4xl font-extrabold leading-[1.02] sm:text-5xl">
							Free templates
						</h2>
						<p className="mt-4 text-base leading-relaxed text-emerald-950/75">
							Pre-formatted files for your CV and statement of purpose, so
							you're editing, not starting from a blank page.
						</p>
						<div className="mt-6">
							<Segmented
								value={fileFilter}
								onChange={setFileFilter}
								options={["All", "PDF", "DOCX"].map((v) => ({
									value: v,
									label: v,
								}))}
							/>
						</div>
					</div>

					<ul className="grid gap-5 sm:grid-cols-2">
						{visibleFiles.map((f) => {
							const done = saved.includes(f.title);
							return (
								<li key={f.title} className="ud-fade-in">
									<a
										href={f.href}
										download
										onClick={() => {
											setSaved((list) =>
												list.includes(f.title) ? list : [...list, f.title],
											);
											toast.success(`Downloading ${f.title}`);
										}}
										className="group relative flex h-full flex-col rounded-xl rounded-tr-none border-[1.5px] border-emerald-950 bg-white p-5 pt-6 transition-colors hover:bg-emerald-50"
									>
										<span aria-hidden className="ud-fold" />
										<span
											className={`w-fit rounded-md border-[1.5px] border-emerald-950 px-2 py-0.5 text-xs font-extrabold ${f.type === "PDF" ? "bg-red-100" : "bg-sky-100"}`}
										>
											{f.type}
										</span>
										<span className="mt-4 flex-1 text-base font-bold leading-snug">
											{f.title}
										</span>
										<span className="mt-5 flex items-center justify-between border-t border-dashed border-emerald-950/30 pt-3 text-sm">
											<span className="text-emerald-950/60">{f.size}</span>
											<span
												className={`inline-flex items-center gap-1.5 font-bold ${done ? "text-emerald-700" : "text-emerald-950"}`}
											>
												{done ? (
													<Check size={16} />
												) : (
													<Download
														size={16}
														className="transition-transform group-hover:translate-y-0.5"
													/>
												)}
												{done ? "Downloaded" : "Download"}
											</span>
										</span>
									</a>
								</li>
							);
						})}
					</ul>
				</div>
			</section>

			<section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 md:pb-32">
				<div className="flex flex-col items-start justify-between gap-8 rounded-2xl border-[1.5px] border-emerald-950 bg-emerald-950 p-8 text-white sm:p-12 md:flex-row md:items-center">
					<div className="max-w-xl">
						<h3 className="ud-display text-3xl font-extrabold leading-tight sm:text-4xl">
							{readiness >= 60
								? "You're nearly set. See which schemes fit you."
								: "Ready to see which schemes fit your profile?"}
						</h3>
						<p className="mt-3 text-base leading-relaxed text-emerald-50/80">
							Answer a few questions and Udaan matches you against real
							eligibility rules in under a minute.
						</p>
					</div>
					<div className="flex shrink-0 flex-wrap gap-3">
						<Link
							to="/eligibility"
							className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-6 py-3 text-sm font-bold text-emerald-950 transition hover:bg-yellow-200 active:translate-y-px"
						>
							Check eligibility <ArrowRight size={16} />
						</Link>
						<Link
							to="/scholarships"
							className="rounded-full border-[1.5px] border-white/50 px-6 py-3 text-sm font-bold transition hover:border-white hover:bg-white/10"
						>
							Browse scholarships
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
