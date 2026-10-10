import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
	ArrowRight,
	Check,
	ChevronDown,
	Download,
	ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Confetti, PageStyles, Stamp } from "../components/PageKit";

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

// Left column width for the checklist.
const SIDE_COL = "lg:grid-cols-[18rem_1fr]";

// Warn when the deadline is this close and slow documents are still missing.
const URGENT_DAYS = 21;

const ROADMAP_STEPS = [
	{
		step: "01",
		title: "Find and shortlist scholarships",
		category: "Discovery",
		description:
			"Target the highest-probability opportunities for your state, category and degree, without drowning in 200 tabs.",
		time: "4 min read",
		path: "/how-to-apply#discovery",
		linkLabel: "Learn how to shortlist",
		tips: [
			"Filter by your state, category and course first. Ignore the rest.",
			"Shortlist 5 to 8 schemes and put each deadline in your phone's calendar.",
			"Read eligibility from the official circular, never from a forwarded message.",
		],
	},
	{
		step: "02",
		title: "Prepare your documents",
		category: "Paperwork",
		description:
			"Certificates, issuing officers, bonafide letters and bank Aadhaar seeding, all in the checklist further down this page.",
		time: "5 min read",
		target: "checklist",
		linkLabel: "Open document checklist",
		tips: [
			"Start the income and caste certificates first. They take the longest.",
			"Scan every document as PDF or JPEG under 2 MB.",
			"Check that your bank account is Aadhaar-seeded and the name matches your ID.",
		],
	},
	{
		step: "03",
		title: "Write a personal statement, if required",
		category: "Statement",
		description:
			"Check whether your scholarship asks for a statement. If it does, use the narrative blueprint and STAR framework to tell your story. Otherwise, mark this step as not required.",
		time: "6 min read",
		path: "/application-guide",
		linkLabel: "Read statement guide",
		optional: true,
		tips: [
			"Open with one specific moment, not \u201CI have always been passionate about\u2026\u201D.",
			"Use STAR: Situation, Task, Action, Result. Put real numbers in the result.",
			"End with what this scholarship lets you do next.",
		],
	},
	{
		step: "04",
		title: "Verify and submit without errors",
		category: "Final submit",
		description:
			"Double-check file sizes, bank account status and names, then save the official acknowledgement receipt.",
		time: "3 min read",
		path: "/how-to-apply#submission",
		linkLabel: "See submission checks",
		tips: [
			"Open every upload once more. Is it readable and the right way up?",
			"Make sure name, date of birth and bank details match across documents.",
			"Save the application ID and receipt as a PDF and a screenshot.",
		],
	},
];

// `slow` = depends on a government office or bank, so it sets your timeline.
// `short` = the label printed on the sheet in the folder.
const DOCUMENTS = [
	{
		name: "Aadhaar Card (Identity & DOB)",
		short: "Aadhaar",
		slow: false,
		tip: "Download your e-Aadhaar from the UIDAI portal. The PDF is accepted for most uploads.",
	},
	{
		name: "Income Certificate (Tehsildar/SDM)",
		short: "Income cert.",
		slow: true,
		tip: "Apply through your state's e-District portal or the Tehsildar/SDM office. Check which financial year the scheme accepts.",
	},
	{
		name: "Caste / Category Certificate",
		short: "Caste cert.",
		slow: true,
		tip: "Issued by the Tehsildar/SDM office, usually via the same e-District portal. Some schemes want a recent or specific format, so check the circular.",
	},
	{
		name: "Previous Year Academic Mark Sheets",
		short: "Marksheets",
		slow: false,
		tip: "Use your last completed year. Merge multi-page results into one PDF so the upload doesn't fail.",
	},
	{
		name: "College Bonafide Certificate",
		short: "Bonafide",
		slow: false,
		tip: "Request it from your college office or admin portal, and ask for the current academic year on it.",
	},
	{
		name: "Bank Passbook (Aadhaar Seeded)",
		short: "Passbook",
		slow: true,
		tip: "Scan the first page with your name, account number and IFSC. Confirm with the bank that the account is Aadhaar-seeded for direct benefit transfer.",
	},
	{
		name: "Passport Size Photographs",
		short: "Photos",
		slow: false,
		tip: "Plain background, face clearly visible. Check each portal's file-size limit before you compress.",
	},
	{
		name: "Current Year College Fee Receipt",
		short: "Fee receipt",
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
].map((p) => ({ ...p, host: new URL(p.url).hostname }));

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

const NAV = [
	{ id: "roadmap", label: "Roadmap" },
	{ id: "checklist", label: "Document checklist" },
	{ id: "portals", label: "Official portals" },
	{ id: "templates", label: "Templates" },
];

// Persists any JSON value; falls back to `initial` if the stored shape differs.
function usePersisted(key, initial) {
	const [value, setValue] = useState(() => {
		try {
			const raw = JSON.parse(localStorage.getItem(key) || "null");
			const sameShape =
				raw !== null &&
				typeof raw === typeof initial &&
				Array.isArray(raw) === Array.isArray(initial);
			return sameShape ? raw : initial;
		} catch {
			return initial;
		}
	});
	useEffect(() => {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// Keep the checklist usable when browser storage is unavailable.
		}
	}, [key, value]);
	return [value, setValue];
}

const goTo = (id) => {
	const target = document.getElementById(id);
	target?.scrollIntoView({
		behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
			? "instant"
			: "smooth",
		block: "start",
	});
	target?.focus({ preventScroll: true });
};

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

// Highlighter pen: sweeps across the text when `on` becomes true.
function Highlight({ on, color = "#fde047", children }) {
	return (
		<span
			className={`box-decoration-clone bg-no-repeat bg-left transition-[background-size] duration-500 ease-out motion-reduce:transition-none ${
				on ? "bg-[length:100%_100%]" : "bg-[length:0%_100%]"
			}`}
			style={{
				backgroundImage: `linear-gradient(transparent 58%, ${color} 58%)`,
			}}
		>
			{children}
		</span>
	);
}

// Collapsible region that stays out of the tab order while closed.
function Collapse({ open, className = "", children }) {
	return (
		<div
			className={`grid transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none ${
				open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
			} ${className}`}
		>
			<div className="overflow-hidden">{children}</div>
		</div>
	);
}

// The only place a trusted web address ending is highlighted.
function Host({ host }) {
	const m = host.match(/^(.*?)(gov\.in|nic\.in)$/);
	if (!m) return <>{host}</>;
	return (
		<>
			{m[1]}
			<mark className="bg-yellow-200 px-0.5 font-bold text-emerald-950">
				{m[2]}
			</mark>
		</>
	);
}

function PaperThumb({ label }) {
	return (
		<svg
			viewBox="0 0 36 46"
			className="h-12 w-9 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none"
			fill="none"
			aria-hidden
		>
			<path
				d="M2 2h23l9 9v33H2z"
				fill="#fff"
				stroke="#022c22"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<path
				d="M25 2v9h9"
				fill="#fde047"
				stroke="#022c22"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<path
				d="M7 19h22M7 24h22M7 29h14"
				stroke="#022c22"
				strokeOpacity=".3"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
			<text
				x="18"
				y="41"
				textAnchor="middle"
				fontSize="7"
				fontWeight="800"
				fill="#022c22"
			>
				{label}
			</text>
		</svg>
	);
}

/* ------------------------------------------------------------------ */
/* The application file: sheets rise out of the folder as you tick     */
/* ------------------------------------------------------------------ */

const TOP = 142; // sheet top when tucked in
const SHEET_H = 132;
const RISE = 92; // how far a ready sheet lifts
const JITTER = [-1.6, 1.1, -0.6, 1.8, -1.2, 0.7, -1.8, 1.3];

function ApplicationFile({ docs, isReady, compact = false }) {
	// Start tucked in, then rise on mount so saved progress animates in once.
	const [shown, setShown] = useState(false);
	useEffect(() => {
		const id = requestAnimationFrame(() => setShown(true));
		return () => cancelAnimationFrame(id);
	}, []);

	const n = docs.length;
	const pitch = 380 / n;
	const w = pitch - 8;
	const ready = docs.filter((d) => isReady(d.name)).length;

	return (
		<svg
			viewBox="0 20 420 270"
			role="img"
			aria-label={`Application file with ${ready} of ${n} documents ready`}
			className="w-full overflow-visible"
		>
			{/* back of the folder, with its tab */}
			<path
				d="M12 96V72Q12 66 18 66H112L128 88H402Q408 88 408 94V276Q408 282 402 282H18Q12 282 12 276Z"
				fill="#064e3b"
				stroke="#022c22"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			{!compact && (
				<text x="24" y="82" fontSize="11" fontWeight="700" fill="#fde047">
					Application file
				</text>
			)}

			{/* sheets */}
			{docs.map((d, i) => {
				const on = isReady(d.name);
				const x = 20 + i * pitch + 4;
				const cx = x + w / 2;
				const lifted = shown && on;
				return (
					<g
						key={d.name}
						className="transition-transform duration-700 ease-[cubic-bezier(0.2,1.3,0.4,1)] motion-reduce:transition-none"
						style={{
							transformOrigin: `${cx}px ${TOP + SHEET_H}px`,
							transform: `translateY(${lifted ? -RISE : 0}px) rotate(${lifted ? JITTER[i % JITTER.length] : 0}deg)`,
							transitionDelay: shown ? `${i * 40}ms` : "0ms",
						}}
					>
						<rect
							x={x}
							y={TOP}
							width={w}
							height={SHEET_H}
							rx="3"
							fill={on ? "#ffffff" : d.slow ? "#fff1f2" : "#ecfdf5"}
							stroke={on ? "#022c22" : d.slow ? "#be123c" : "#022c22"}
							strokeOpacity={on || d.slow ? 1 : 0.5}
							strokeWidth="1.8"
						/>
						{on && (
							<>
								<circle cx={cx} cy={TOP + 11} r="6.5" fill="#065f46" />
								<path
									d={`M${cx - 3} ${TOP + 11}l2.4 2.6 4.2-4.8`}
									stroke="#fff"
									strokeWidth="1.8"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
								{compact ? (
									<path
										d={`M${x + 7} ${TOP + 30}h${w - 14}M${x + 7} ${TOP + 40}h${w - 14}M${x + 7} ${TOP + 50}h${(w - 14) * 0.6}`}
										stroke="#022c22"
										strokeOpacity=".3"
										strokeWidth="2"
										strokeLinecap="round"
									/>
								) : (
									<text
										transform={`translate(${cx - 3.5} ${TOP + 26}) rotate(90)`}
										fontSize="10"
										fontWeight="700"
										fill="#022c22"
									>
										{d.short}
									</text>
								)}
							</>
						)}
					</g>
				);
			})}

			{/* front of the folder */}
			<path
				d="M12 150H408V276Q408 282 402 282H18Q12 282 12 276Z"
				fill="#065f46"
				stroke="#022c22"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Resources() {
	const { hash } = useLocation();
	useEffect(() => {
		if (!hash) return;
		const frame = requestAnimationFrame(() => {
			const target = document.getElementById(hash.slice(1));
			target?.scrollIntoView({ block: "start", behavior: "instant" });
			target?.focus({ preventScroll: true });
		});
		return () => cancelAnimationFrame(frame);
	}, [hash]);
	const [checked, setChecked] = usePersisted("checkedDocs", []);
	const [doneSteps, setDoneSteps] = usePersisted("doneRoadmapSteps", []);
	const [skippedSteps, setSkippedSteps] = usePersisted(
		"skippedRoadmapSteps",
		[],
	);
	const [deadline, setDeadline] = usePersisted("applicationDeadline", "");
	// null = default (first unfinished step open), -1 = everything closed
	const [active, setActive] = useState(null);
	const [openTip, setOpenTip] = useState(null);
	const [hideReady, setHideReady] = useState(false);
	const [burst, setBurst] = useState(0);

	const isReady = (name) => checked.includes(name);
	const docCount = DOCUMENTS.filter((d) => isReady(d.name)).length;
	const isStepComplete = (step) =>
		doneSteps.includes(step.step) ||
		(step.optional && skippedSteps.includes(step.step));
	const stepCount = ROADMAP_STEPS.filter(isStepComplete).length;
	const readiness = Math.round(
		((stepCount / ROADMAP_STEPS.length) * 0.4 +
			(docCount / DOCUMENTS.length) * 0.6) *
			100,
	);
	const level = LEVELS.find((l) => readiness >= l.min);
	const allDocs = docCount === DOCUMENTS.length;
	const allSteps = stepCount === ROADMAP_STEPS.length;

	const firstUnfinished = ROADMAP_STEPS.findIndex((s) => !isStepComplete(s));
	const openIdx = active ?? firstUnfinished;

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

	const toggleDoc = (name) =>
		setChecked((list) =>
			list.includes(name) ? list.filter((n) => n !== name) : [...list, name],
		);

	const toggleStep = (stepId, idx) => {
		const wasDone = doneSteps.includes(stepId);
		setSkippedSteps((list) => list.filter((s) => s !== stepId));
		setDoneSteps((list) =>
			wasDone ? list.filter((s) => s !== stepId) : [...list, stepId],
		);
		if (!wasDone && idx < ROADMAP_STEPS.length - 1) setActive(idx + 1);
	};
	const toggleSkippedStep = (stepId, idx) => {
		const wasSkipped = skippedSteps.includes(stepId);
		setDoneSteps((list) => list.filter((s) => s !== stepId));
		setSkippedSteps((list) =>
			wasSkipped ? list.filter((s) => s !== stepId) : [...list, stepId],
		);
		if (!wasSkipped && idx < ROADMAP_STEPS.length - 1) setActive(idx + 1);
	};

	// Deadline awareness: days left, and whether slow documents put it at risk.
	const slowLeft = DOCUMENTS.filter((d) => d.slow && !isReady(d.name)).length;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const daysLeft = deadline
		? Math.round((new Date(`${deadline}T00:00:00`) - today) / 86400000)
		: null;
	let deadlineNote = null;
	let urgent = false;
	if (daysLeft !== null) {
		if (daysLeft < 0) deadlineNote = "That date has passed.";
		else if (daysLeft === 0) deadlineNote = "Your deadline is today.";
		else deadlineNote = `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
		if (daysLeft >= 0 && daysLeft <= URGENT_DAYS && slowLeft > 0) {
			urgent = true;
			deadlineNote += `, and ${slowLeft} slow document${slowLeft === 1 ? " is" : "s are"} still to collect.`;
		}
	}

	const next = (() => {
		const slow = DOCUMENTS.find((d) => d.slow && !isReady(d.name));
		if (slow)
			return { text: `Start early: ${slow.name}`, go: () => goTo("checklist") };
		const doc = DOCUMENTS.find((d) => !isReady(d.name));
		if (doc)
			return { text: `Collect: ${doc.name}`, go: () => goTo("checklist") };
		const stepIdx = ROADMAP_STEPS.findIndex((s) => !isStepComplete(s));
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

	const docGroups = [
		{
			key: "slow",
			title: "Start these first",
			note: "Issued by a government office or your bank, so they depend on someone else\u2019s turnaround.",
			color: "#fecdd3",
			items: DOCUMENTS.filter((d) => d.slow),
		},
		{
			key: "quick",
			title: "Mostly in your hands",
			note: "Download it, scan it, or ask your college office.",
			color: "#bbf7d0",
			items: DOCUMENTS.filter((d) => !d.slow),
		},
	].map((g) => ({
		...g,
		items: hideReady ? g.items.filter((d) => !isReady(d.name)) : g.items,
	}));
	const nothingShown = docGroups.every((g) => g.items.length === 0);

	return (
		<div className="ud-root min-h-screen bg-[#E9F0EA] font-sans text-emerald-950">
			<PageStyles />
			<Confetti burst={burst} />

			{/* Hero */}
			<section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-12 sm:px-8 md:pt-20 lg:grid-cols-12">
				<div className="lg:col-span-6">
					<h1
						className="font-bricolage-grotesque text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
						style={{ textWrap: "balance" }}
					>
						Get your paperwork ready before the deadline does.
					</h1>
					<p className="mt-6 max-w-xl text-base leading-relaxed text-emerald-950/75 sm:text-lg">
						A four-step roadmap, a document checklist that remembers your
						progress, templates to download, and links to the official portals.
					</p>
					<nav
						aria-label="On this page"
						className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold"
					>
						{NAV.map((n) => (
							<button
								key={n.id}
								type="button"
								onClick={() => goTo(n.id)}
								className={`cursor-pointer underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950 ${focusRing}`}
							>
								{n.label}
							</button>
						))}
					</nav>
				</div>

				<div className="mx-auto w-full max-w-xl lg:col-span-6">
					<div className="relative">
						<ApplicationFile docs={DOCUMENTS} isReady={isReady} />
						<Stamp
							key={level.label}
							slam
							tilt={-6}
							className="absolute bottom-[9%] left-[5%] border-emerald-950 bg-yellow-200/95 text-xl text-emerald-950 sm:text-2xl"
						>
							{level.label}
						</Stamp>
					</div>

					<div className="relative mt-5 flex flex-col gap-6 sm:-mt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
						<div className="min-w-0 flex-1 sm:pt-9">
							<p className="text-sm leading-relaxed text-emerald-950/75">
								<span className="font-semibold text-emerald-950">
									{docCount} of {DOCUMENTS.length}
								</span>{" "}
								documents ready,{" "}
								<span className="font-semibold text-emerald-950">
									{stepCount} of {ROADMAP_STEPS.length}
								</span>{" "}
								roadmap steps done. Rose-edged sheets take the longest.
							</p>
							<p className="mt-4 text-sm text-emerald-950/65">Next up</p>
							{next.to ? (
								<Link
									to={next.to}
									className={`mt-0.5 inline-flex items-center gap-2 text-[15px] font-bold underline decoration-yellow-300 decoration-2 underline-offset-4 ${focusRing}`}
								>
									{next.text} <ArrowRight size={16} className="shrink-0" />
								</Link>
							) : (
								<button
									type="button"
									onClick={next.go}
									className={`mt-0.5 inline-flex cursor-pointer items-center gap-2 text-left text-[15px] font-bold underline decoration-yellow-300 decoration-2 underline-offset-4 ${focusRing}`}
								>
									{next.text} <ArrowRight size={16} className="shrink-0" />
								</button>
							)}
						</div>

						{/* Sticky note */}
						<div className="relative w-44 shrink-0 self-end rotate-2 bg-yellow-200 px-3 pb-3 pt-5 shadow-[3px_4px_0_rgba(2,44,34,0.3)] sm:self-auto">
							<span
								aria-hidden
								className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 -rotate-2 bg-white/60"
							/>
							<label className="block text-sm font-semibold">
								Your deadline
								<input
									type="date"
									value={deadline}
									onChange={(e) => setDeadline(e.target.value)}
									className="mt-1 w-full border-b-[1.5px] border-emerald-950 bg-transparent py-0.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-950"
								/>
							</label>
							<p
								aria-live="polite"
								className={`mt-2 text-xs leading-snug ${urgent ? "font-semibold text-rose-700" : "text-emerald-950/75"}`}
							>
								{deadlineNote ?? "Add a date and we\u2019ll count the days."}
							</p>
						</div>
					</div>
				</div>
			</section>

			<div className="mx-auto max-w-7xl space-y-28 px-5 sm:px-8">
				{/* Roadmap */}
				<section id="roadmap" tabIndex={-1} className="scroll-mt-28">
					<h2 className="max-w-2xl font-georgia text-4xl leading-[1.05] sm:text-5xl">
						Four steps from &ldquo;where do I start?&rdquo; to submitted
					</h2>
					<p className="mt-4 max-w-xl text-base leading-relaxed text-emerald-950/75">
						Open a step to see what to do. Tick it off and it counts toward your
						readiness. A statement that is not required counts as complete too.
					</p>

					<ol className="mt-10 border-t-[1.5px] border-emerald-950">
						{ROADMAP_STEPS.map((st, idx) => {
							const open = openIdx === idx;
							const done = isStepComplete(st);
							const checkedStep = doneSteps.includes(st.step);
							const skipped = st.optional && skippedSteps.includes(st.step);
							return (
								<li
									key={st.step}
									className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-4 border-b border-emerald-950/15 py-7 md:grid-cols-[7rem_minmax(0,5fr)_minmax(0,6fr)] md:gap-x-8"
								>
									<span
										aria-hidden
										className={`font-georgia text-5xl leading-none transition-colors md:text-7xl ${
											done
												? "text-emerald-700"
												: open
													? "text-emerald-950"
													: "text-emerald-950/20"
										}`}
									>
										{st.step}
									</span>

									<div className="min-w-0">
										<button
											type="button"
											onClick={() => setActive(open ? -1 : idx)}
											aria-expanded={open}
											className={`flex w-full cursor-pointer items-start justify-between gap-4 text-left ${focusRing}`}
										>
											<span>
												<span className="block font-georgia text-2xl leading-snug">
													<Highlight on={done}>{st.title}</Highlight>
												</span>
												<span className="mt-1 block text-sm text-emerald-950/60">
													{st.category}, {st.time}
												</span>
											</span>
											<ChevronDown
												size={18}
												className={`mt-2 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
											/>
										</button>

										<label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold">
											<input
												type="checkbox"
												checked={checkedStep}
												onChange={() => toggleStep(st.step, idx)}
												className="peer sr-only"
											/>
											<span
												className={`flex h-5 w-5 items-center justify-center rounded border-[1.5px] border-emerald-950 transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-yellow-200 ${
													checkedStep ? "bg-emerald-800 text-white" : "bg-white"
												}`}
											>
												{checkedStep && <Check size={12} strokeWidth={3.5} />}
											</span>
											{checkedStep ? "Done" : "Mark as done"}
										</label>
										{st.optional && (
											<button
												type="button"
												aria-pressed={Boolean(skipped)}
												onClick={() => toggleSkippedStep(st.step, idx)}
												className={`mt-3 ml-4 cursor-pointer text-sm font-semibold underline underline-offset-4 ${focusRing}`}
											>
												{skipped
													? "Not required — undo"
													: "Not required for my scholarship"}
											</button>
										)}
									</div>

									<Collapse
										open={open}
										className="col-start-2 md:col-start-3 md:row-start-1"
									>
										<div className="pt-5 md:pt-0">
											<p className="max-w-[60ch] text-[15px] leading-relaxed text-emerald-950/80">
												{st.description}
											</p>

											{/* Tips on ruled notepad paper */}
											<ul
												className="relative mt-5 list-none rounded-sm border-[1.5px] border-emerald-950 bg-white pl-12 pr-4 text-[15px] leading-[28px] shadow-[3px_3px_0_#022c22] before:absolute before:inset-y-0 before:left-8 before:w-px before:bg-rose-300"
												style={{
													backgroundImage:
														"repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(2,44,34,0.13) 27px, rgba(2,44,34,0.13) 28px)",
												}}
											>
												{st.tips.map((tip) => (
													<li key={tip}>{tip}</li>
												))}
											</ul>

											{st.target ? (
												<button
													type="button"
													onClick={() => goTo(st.target)}
													className={`mt-6 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950 ${focusRing}`}
												>
													{st.linkLabel} <ArrowRight size={14} />
												</button>
											) : (
												<Link
													to={st.path}
													className={`mt-6 inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950 ${focusRing}`}
												>
													{st.linkLabel} <ArrowRight size={14} />
												</Link>
											)}
										</div>
									</Collapse>
								</li>
							);
						})}
					</ol>
				</section>

				{/* Checklist */}
				<section
					id="checklist"
					tabIndex={-1}
					className={`grid scroll-mt-28 gap-10 lg:gap-14 ${SIDE_COL}`}
				>
					<div className="lg:sticky lg:top-8 lg:self-start">
						<h2 className="font-georgia text-4xl leading-[1.05] sm:text-5xl">
							Document checklist
						</h2>
						<p className="mt-4 text-sm leading-relaxed text-emerald-950/70">
							Tick a document once you have a digital copy ready, as a PDF or
							JPEG under 2 MB. Ticks are saved on this device.
						</p>

						<div className="mt-8 max-w-[18rem]">
							<ApplicationFile docs={DOCUMENTS} isReady={isReady} compact />
							<p className="mt-3 text-sm font-semibold">
								{allDocs
									? "Every document is in the file."
									: `${docCount} of ${DOCUMENTS.length} in the file, ${DOCUMENTS.length - docCount} to go`}
							</p>
						</div>

						<div className="mt-5 flex items-center gap-5 text-sm font-semibold">
							<button
								type="button"
								aria-pressed={hideReady}
								onClick={() => setHideReady((v) => !v)}
								className={`cursor-pointer underline underline-offset-4 ${focusRing}`}
							>
								{hideReady ? "Show ready documents" : "Hide ready documents"}
							</button>
							{docCount > 0 && (
								<button
									type="button"
									onClick={() => setChecked([])}
									className={`cursor-pointer text-emerald-950/60 underline underline-offset-4 hover:text-rose-700 ${focusRing}`}
								>
									Reset
								</button>
							)}
						</div>
					</div>

					<div className="space-y-12">
						{nothingShown && (
							<p className="text-[15px]">Every document is ready.</p>
						)}
						{docGroups.map(
							(g) =>
								g.items.length > 0 && (
									<div key={g.key}>
										<h3 className="font-georgia text-2xl">
											<Highlight on color={g.color}>
												{g.title}
											</Highlight>
										</h3>
										<p className="mt-2 text-sm text-emerald-950/65">{g.note}</p>
										<ul className="mt-4 border-t-[1.5px] border-emerald-950">
											{g.items.map((d) => {
												const on = isReady(d.name);
												const tipOpen = openTip === d.name;
												return (
													<li
														key={d.name}
														className="border-b border-emerald-950/15 py-4"
													>
														<label className="flex cursor-pointer items-start gap-4">
															<input
																type="checkbox"
																checked={on}
																onChange={() => toggleDoc(d.name)}
																className="peer sr-only"
															/>
															<span
																className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-[1.5px] border-emerald-950 transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-yellow-200 ${
																	on ? "bg-emerald-800 text-white" : "bg-white"
																}`}
															>
																{on && <Check size={14} strokeWidth={3.5} />}
															</span>
															<span className="text-[15px] font-semibold leading-snug">
																<Highlight on={on}>{d.name}</Highlight>
															</span>
														</label>

														<button
															type="button"
															aria-expanded={tipOpen}
															onClick={() =>
																setOpenTip(tipOpen ? null : d.name)
															}
															className={`ml-10 mt-1 inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
														>
															How to get it
															<ChevronDown
																size={15}
																className={`transition-transform ${tipOpen ? "rotate-180" : ""}`}
															/>
														</button>
														<Collapse open={tipOpen} className="ml-10">
															<p className="max-w-[58ch] pt-2 text-sm leading-relaxed text-emerald-950/80">
																{d.tip}
															</p>
														</Collapse>
													</li>
												);
											})}
										</ul>
									</div>
								),
						)}
					</div>
				</section>

				{/* Portals and templates */}
				<section className="grid gap-16 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-20">
					<div id="portals" tabIndex={-1} className="scroll-mt-28">
						<h2 className="font-georgia text-4xl leading-[1.05] sm:text-5xl">
							Official portals
						</h2>
						<p className="mt-4 max-w-[56ch] text-sm leading-relaxed text-emerald-950/70">
							The government sites most central and state schemes run through.
							Look at how each address ends. If a site asks for a processing fee
							to apply, close it.
						</p>

						<ul className="mt-8 border-t-[1.5px] border-emerald-950">
							{PORTALS.map((p) => (
								<li key={p.url} className="border-b border-emerald-950/15 py-6">
									<div className="flex items-start justify-between gap-4">
										<div className="min-w-0">
											<h3 className="font-georgia text-xl leading-snug">
												{p.name}
											</h3>
											<p className="mt-0.5 text-sm text-emerald-950/60">
												{p.authority}
											</p>
										</div>
										<a
											href={p.url}
											target="_blank"
											rel="noopener noreferrer"
											aria-label={`Open portal: ${p.name}`}
											className={`inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold underline decoration-emerald-950/30 underline-offset-4 hover:decoration-emerald-950 ${focusRing}`}
										>
											Open portal <ExternalLink size={13} />
										</a>
									</div>
									<p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-emerald-950/80">
										{p.desc}
									</p>
									<p className="mt-3 flex flex-wrap items-baseline gap-x-3 text-xs text-emerald-950/60">
										<span>{p.tag}</span>
										<span className="font-mono text-sm text-emerald-950">
											<Host host={p.host} />
										</span>
									</p>
								</li>
							))}
						</ul>
					</div>

					<div id="templates" className="scroll-mt-8">
						<h2 className="font-georgia text-4xl leading-[1.05] sm:text-5xl">
							Templates
						</h2>
						<p className="mt-4 text-sm leading-relaxed text-emerald-950/70">
							Start from a formatted CV or statement of purpose instead of a
							blank page.
						</p>

						<ul className="mt-8 border-t-[1.5px] border-emerald-950">
							{DOWNLOADS.map((f) => (
								<li key={f.title} className="border-b border-emerald-950/15">
									<a
										href={f.href}
										download
										onClick={() => toast.success(`Downloading ${f.title}`)}
										className={`group flex items-center gap-4 py-4 ${focusRing}`}
									>
										<PaperThumb label={f.type} />
										<span className="min-w-0 flex-1">
											<span className="block font-semibold leading-snug underline-offset-4 group-hover:underline">
												{f.title}
											</span>
											<span className="mt-0.5 block text-xs text-emerald-950/60">
												{f.type}, {f.size}
											</span>
										</span>
										<Download
											size={16}
											className="shrink-0 transition-transform group-hover:translate-y-0.5 motion-reduce:transition-none"
										/>
									</a>
								</li>
							))}
						</ul>
					</div>
				</section>
			</div>

			{/* Closing band with a perforated edge */}
			<section className="relative mt-32 bg-emerald-950 text-white">
				<div
					aria-hidden
					className="absolute inset-x-0 -top-3 h-3"
					style={{
						background:
							"radial-gradient(circle at 10px 0, transparent 6px, #022c22 6.5px)",
						backgroundSize: "20px 12px",
					}}
				/>
				<div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-16 sm:px-8 md:flex-row md:items-end md:justify-between md:py-20">
					<div className="max-w-2xl">
						<h2 className="font-georgia text-4xl leading-[1.05] sm:text-5xl">
							{readiness >= 60
								? "You\u2019re nearly set. See which schemes fit you."
								: "Next, see which schemes fit your profile."}
						</h2>
						<p className="mt-4 text-base leading-relaxed text-emerald-50/80">
							Answer a few questions and Udaan checks you against the
							eligibility rules.
						</p>
					</div>
					<div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3">
						<Link
							to="/eligibility"
							className={`inline-flex items-center gap-2 rounded-md bg-yellow-300 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-yellow-200 active:translate-y-px ${focusRing}`}
						>
							Check eligibility <ArrowRight size={16} />
						</Link>
						<Link
							to="/scholarships"
							className={`text-sm font-semibold underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-white ${focusRing}`}
						>
							Browse scholarships
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
