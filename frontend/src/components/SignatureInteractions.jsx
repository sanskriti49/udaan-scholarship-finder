import { useState, useEffect, useRef } from "react";
import {
	Clock,
	Check,
	X,
	Bookmark,
	BookmarkCheck,
	RotateCcw,
	ShieldCheck,
	AlertTriangle,
	CircleSlash,
	ChevronRight,
	ChevronLeft,
	Coffee,
	Copy,
	Sparkles,
} from "lucide-react";

/* ---------- shared helpers ---------- */

const reducedMotion = () =>
	typeof window !== "undefined" &&
	window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const haptic = (ms = 10) => {
	if (reducedMotion()) return;
	try {
		navigator.vibrate?.(ms);
	} catch {
		/* not supported / blocked */
	}
};

// Full literal class strings so Tailwind can see them.
const SH2 = "shadow-[2px_2px_0px_0px_rgba(2,44,34,1)]";
const SH4 = "shadow-[4px_4px_0px_0px_rgba(2,44,34,1)]";
const SH5 = "shadow-[5px_5px_0px_0px_rgba(2,44,34,1)]";
const FOCUS =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200";

/* =========================================================================
   1. Deadline countdown
   Four tiers instead of two: calm (8d+), soon (≤7d), urgent (≤48h), closed.
   Students should feel the difference between "next month" and "tomorrow".
   ========================================================================= */

function timeLeftUntil(deadline) {
	const diff = new Date(deadline).getTime() - Date.now();
	if (Number.isNaN(diff) || diff <= 0) {
		return { expired: true, totalHours: 0, days: 0, hours: 0, minutes: 0 };
	}
	const H = 36e5;
	return {
		expired: false,
		totalHours: Math.floor(diff / H),
		days: Math.floor(diff / (24 * H)),
		hours: Math.floor((diff % (24 * H)) / H),
		minutes: Math.floor((diff % H) / 6e4),
	};
}

function useTimeLeft(deadline) {
	const [t, setT] = useState(() => timeLeftUntil(deadline));
	const [flip, setFlip] = useState(false);
	const prevDays = useRef(t.days);

	useEffect(() => {
		let off;
		setT(timeLeftUntil(deadline));
		const id = setInterval(() => {
			const next = timeLeftUntil(deadline);
			if (next.days !== prevDays.current) {
				prevDays.current = next.days;
				setFlip(true);
				clearTimeout(off);
				off = setTimeout(() => setFlip(false), 550);
			}
			setT(next);
		}, 60_000);
		return () => {
			clearInterval(id);
			clearTimeout(off);
		};
	}, [deadline]);

	return [t, flip];
}

const tierOf = (t) =>
	t.expired
		? "closed"
		: t.totalHours <= 48
			? "urgent"
			: t.days <= 7
				? "soon"
				: "calm";

const TIERS = {
	calm: {
		chip: "border-emerald-950/20 bg-[#FEF9EE] text-emerald-950",
		icon: "text-emerald-800",
		tag: "Closing",
	},
	soon: {
		chip: "border-amber-600/50 bg-amber-50 text-amber-950",
		icon: "text-amber-700",
		tag: "Closing soon",
	},
	urgent: {
		chip: "border-red-700/50 bg-red-50 text-red-900 animate-urgent-wobble",
		icon: "text-red-700",
		tag: "Last call",
	},
	closed: {
		chip: "border-slate-300 bg-slate-100 text-slate-500",
		icon: "text-slate-400",
		tag: "Closed",
	},
};

const fmtDate = (d) =>
	new Date(d).toLocaleDateString("en-IN", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});

export function TearOffCountdown({ deadline, compact = false }) {
	const [t, flip] = useTimeLeft(deadline);
	const tier = tierOf(t);
	const tone = TIERS[tier];
	const closes = `Closes ${fmtDate(deadline)}`;

	if (compact) {
		const label =
			tier === "closed"
				? "Closed"
				: tier === "urgent"
					? `${t.totalHours}h left`
					: `${t.days}d left`;
		return (
			<div
				title={closes}
				className={`inline-flex items-center gap-1.5 rounded-md border-[1.5px] px-2.5 py-1 text-xs font-bold select-none ${tone.chip}`}
			>
				<Clock size={12} className={tone.icon} aria-hidden="true" />
				<span>{label}</span>
				{tier === "urgent" && (
					<span className="font-semibold">· apply today</span>
				)}
			</div>
		);
	}

	return (
		<div
			role="timer"
			aria-label={
				t.expired
					? "Scheme closed"
					: `${t.days} days and ${t.hours} hours left. ${closes}`
			}
			className={`relative inline-flex min-w-[84px] flex-col items-center rounded-xl border-[1.5px] border-emerald-950 bg-white p-2.5 select-none ${SH4} ${
				tier === "urgent" ? "animate-urgent-wobble" : ""
			}`}
		>
			<div className="mb-1 flex w-full items-center justify-between border-b border-dashed border-emerald-950/20 px-1 pb-1">
				<span className="h-1.5 w-1.5 rounded-full bg-emerald-950/30" />
				<span className={`text-[10px] font-bold ${tone.icon}`}>{tone.tag}</span>
				<span className="h-1.5 w-1.5 rounded-full bg-emerald-950/30" />
			</div>

			<div className="w-full py-1 text-center">
				<div
					className={`ud-display text-3xl font-black leading-none text-emerald-950 ${flip ? "animate-calendar-flip" : ""}`}
				>
					{String(t.days).padStart(2, "0")}
				</div>
				<span className="mt-0.5 block text-[11px] font-semibold text-emerald-950/60">
					{t.days === 1 ? "day left" : "days left"}
				</span>
			</div>

			{tier === "urgent" && (
				<div className="mt-1 w-full rounded border border-red-300 bg-red-100 py-0.5 text-center text-[11px] font-extrabold text-red-900">
					{t.hours}h {t.minutes}m
				</div>
			)}
			<span className="mt-1 text-[10px] font-medium text-emerald-950/50">
				{fmtDate(deadline)}
			</span>
		</div>
	);
}

/* =========================================================================
   2. Repeat-action microcopy hook
   ========================================================================= */

export function useActionMicrocopy(copies = []) {
	const [count, setCount] = useState(0);
	const trigger = () => {
		setCount((c) => c + 1);
		haptic(12);
	};
	return {
		count,
		currentCopy: copies[Math.min(count, copies.length - 1)] ?? copies[0],
		trigger,
	};
}

/* =========================================================================
   3. Save button ("pin to desk")
   The joke escalates across *different* scholarships you pin in one session,
   not when you toggle the same one on and off.
   ========================================================================= */

const PIN_COPIES = [
	"Pinned to desk",
	"Pinned. Big goals.",
	"Another one. Respect.",
	"Desk is filling up",
];
let sessionPins = 0;

export function PhysicalPinButton({
	isSaved = false,
	onToggle,
	title = "scholarship",
	className = "",
}) {
	const [animating, setAnimating] = useState(false);
	const [copyIdx, setCopyIdx] = useState(0);

	const handleClick = (e) => {
		e.stopPropagation();
		haptic(15);
		if (!isSaved) {
			sessionPins += 1;
			setCopyIdx(Math.min(sessionPins - 1, PIN_COPIES.length - 1));
		}
		setAnimating(true);
		setTimeout(() => setAnimating(false), 420);
		onToggle?.();
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			aria-pressed={isSaved}
			aria-label={
				isSaved ? `Remove ${title} from saved` : `Save ${title} to desk`
			}
			className={`inline-flex min-h-[44px] cursor-pointer select-none items-center gap-2 rounded-full border-[1.5px] border-emerald-950 px-3.5 py-1.5 text-xs font-bold text-emerald-950 transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${SH2} ${FOCUS} ${
				isSaved ? "bg-yellow-100" : "bg-white"
			} ${className}`}
		>
			<span
				className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
					isSaved ? "bg-yellow-300" : "bg-emerald-100/70 text-emerald-800"
				} ${animating ? "animate-physical-stamp" : ""}`}
			>
				{isSaved ? (
					<BookmarkCheck size={12} strokeWidth={2.5} />
				) : (
					<Bookmark size={12} />
				)}
			</span>
			<span aria-live="polite">
				{isSaved ? PIN_COPIES[copyIdx] : "Save to desk"}
			</span>
		</button>
	);
}

/* =========================================================================
   4. Eligibility check
   Now honest: each check carries pass/fail, and the stamp reflects the real
   result. A failing check shows how to fix it. Skippable, and instant under
   reduced-motion.
   ========================================================================= */

const DEFAULT_CHECKS = [
	{
		id: "stream",
		label: "Enrolled in B.Tech / Diploma / STEM degree",
		pass: true,
	},
	{ id: "income", label: "Family income under ₹8 lakh a year", pass: true },
	{ id: "board", label: "Class 12 marks above 80th percentile", pass: true },
	{
		id: "domicile",
		label: "State domicile certificate",
		pass: true,
		fix: "Apply for it at your local tehsil or e-District portal.",
	},
];

const VERDICTS = {
	yes: {
		Icon: ShieldCheck,
		title: "You qualify",
		sub: "Every rule matched",
		cls: "border-[#15803D] bg-emerald-50/80 text-[#15803D]",
	},
	almost: {
		Icon: AlertTriangle,
		title: "Almost there",
		sub: "One thing to sort out",
		cls: "border-amber-600 bg-amber-50 text-amber-800",
	},
	no: {
		Icon: CircleSlash,
		title: "Not this one",
		sub: "Try another scheme",
		cls: "border-slate-500 bg-slate-100 text-slate-700",
	},
};

export function TypewriterMatchCheck({
	checks = DEFAULT_CHECKS,
	schemeTitle = "AICTE Pragati Scheme",
	grantAmount = "₹50,000 / year",
	onFinish,
}) {
	const instant = useRef(reducedMotion()).current;
	const [step, setStep] = useState(instant ? checks.length : 0);
	const [stamped, setStamped] = useState(instant);
	const finishRef = useRef(onFinish);
	useEffect(() => {
		finishRef.current = onFinish;
	});

	useEffect(() => {
		if (stamped) return;
		const done = step >= checks.length;
		const id = setTimeout(
			() => {
				haptic(done ? 20 : 8);
				if (done) {
					setStamped(true);
					finishRef.current?.();
				} else setStep((s) => s + 1);
			},
			done ? 350 : 450 + Math.random() * 200,
		);
		return () => clearTimeout(id);
	}, [step, stamped, checks.length]);

	const skip = () => {
		setStep(checks.length);
		setStamped(true);
		finishRef.current?.();
	};

	const failed = checks.filter((c) => c.pass === false);
	const v =
		VERDICTS[
			failed.length === 0 ? "yes" : failed.length === 1 ? "almost" : "no"
		];

	return (
		<div
			className={`relative overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-[#FAF9F6] p-5 sm:p-7 ${SH5}`}
		>
			<div className="mb-4 flex items-center justify-between border-b border-dashed border-emerald-950/20 pb-3">
				<span className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-950/70">
					<span className="h-2 w-2 rounded-full bg-emerald-700" />
					Checking the official rules
				</span>
				{!stamped && (
					<button
						type="button"
						onClick={skip}
						className={`cursor-pointer rounded px-1 text-xs font-bold text-emerald-900 underline decoration-yellow-300 decoration-2 underline-offset-4 ${FOCUS}`}
					>
						Skip
					</button>
				)}
			</div>

			<h3 className="ud-display mb-4 text-lg font-bold text-emerald-950 sm:text-xl">
				{schemeTitle}
			</h3>

			<ul className="space-y-3 font-mono text-xs" aria-live="polite">
				{checks.map((c, i) => {
					const done = i < step;
					const current = i === step && !stamped;
					const bad = done && c.pass === false;
					return (
						<li
							key={c.id}
							className={`flex items-start gap-2.5 transition-opacity duration-200 ${done || current ? "opacity-100" : "opacity-40"}`}
						>
							<span
								className={`mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px] text-[10px] ${
									bad
										? "border-red-700 bg-red-100 text-red-800"
										: done
											? "border-emerald-800 bg-emerald-100 text-emerald-900"
											: current
												? "border-amber-600 bg-amber-50 text-amber-900"
												: "border-slate-300 bg-white"
								}`}
							>
								{bad ? (
									<X size={11} strokeWidth={3} />
								) : done ? (
									<Check size={11} strokeWidth={3} />
								) : current ? (
									<span className="animate-spin">›</span>
								) : (
									""
								)}
							</span>
							<span className="leading-snug text-emerald-950">
								{c.label}
								{current && (
									<span className="ml-1 inline-block animate-pulse">_</span>
								)}
								{bad && c.fix && (
									<span className="mt-0.5 block font-sans text-[11px] font-medium text-red-800">
										{c.fix}
									</span>
								)}
							</span>
						</li>
					);
				})}
			</ul>

			{stamped && (
				<div className="animate-card-stack-rise mt-6 border-t-[1.5px] border-dashed border-emerald-950/20 pt-5">
					<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
						<div>
							<span className="block text-xs font-bold text-emerald-950/60">
								Grant value
							</span>
							<span className="ud-display text-2xl font-black text-emerald-950">
								{grantAmount}
							</span>
						</div>
						<div
							className={`animate-physical-stamp -rotate-3 rounded-lg border-[3px] border-dashed px-4 py-1.5 ${v.cls}`}
						>
							<div className="flex items-center gap-1.5">
								<v.Icon size={18} aria-hidden="true" />
								<div>
									<span className="block text-sm font-black leading-none">
										{v.title}
									</span>
									<span className="text-[11px] font-semibold">{v.sub}</span>
								</div>
							</div>
						</div>
					</div>
					<p className="mt-3 text-[11px] text-emerald-950/55">
						This is a rule check on what you told us. The official portal makes
						the final call.
					</p>
				</div>
			)}
		</div>
	);
}

/* =========================================================================
   5. Application progress
   Tiles become checkable when onToggle is passed, and the next document is
   called out so students know exactly what to do.
   ========================================================================= */

const DEFAULT_STEPS = [
	{ id: "personal", title: "Student profile", done: true },
	{ id: "income", title: "Income certificate", done: true },
	{ id: "marks", title: "Board marksheets", done: true },
	{ id: "domicile", title: "State domicile", done: false },
	{ id: "bank", title: "Aadhaar-linked bank account", done: false },
];

export function PaperStackProgress({ steps = DEFAULT_STEPS, onToggle }) {
	const doneCount = steps.filter((s) => s.done).length;
	const total = steps.length;
	const next = steps.find((s) => !s.done);

	return (
		<div
			className={`rounded-2xl border-[1.5px] border-emerald-950 bg-white p-5 sm:p-6 ${SH4}`}
		>
			<div className="mb-4 flex items-start justify-between gap-3">
				<div>
					<span className="text-xs font-bold text-emerald-950/60">
						Your document folder
					</span>
					<h4 className="ud-display text-lg font-bold text-emerald-950">
						{doneCount} of {total} documents ready
					</h4>
				</div>
				<div
					className="relative h-14 w-12 shrink-0 select-none"
					aria-hidden="true"
				>
					<div className="absolute inset-0 rotate-6 rounded-md border-[1.5px] border-emerald-950/30 bg-[#FAF9F6]" />
					<div className="absolute inset-0 -rotate-3 rounded-md border-[1.5px] border-emerald-950/40 bg-[#F4F6F0]" />
					<div className="absolute inset-0 flex flex-col justify-between rounded-md border-[1.5px] border-emerald-950 bg-white p-1.5">
						<div className="space-y-1">
							<div className="h-1 w-5 rounded bg-emerald-950/30" />
							<div className="h-1 w-7 rounded bg-emerald-950/20" />
						</div>
						<div className="text-right font-mono text-[10px] font-bold text-emerald-800">
							{doneCount}/{total}
						</div>
					</div>
				</div>
			</div>

			<ul className="grid grid-cols-1 gap-2 border-t border-dashed border-emerald-950/20 pt-3 sm:grid-cols-2">
				{steps.map((s, i) => {
					const isNext = next?.id === s.id;
					const Tag = onToggle ? "button" : "div";
					return (
						<li key={s.id}>
							<Tag
								{...(onToggle && {
									type: "button",
									onClick: () => {
										haptic(10);
										onToggle(s.id);
									},
									"aria-pressed": s.done,
								})}
								className={`flex w-full items-center gap-2 rounded-lg border-[1.5px] p-2 text-left text-xs font-semibold transition ${onToggle ? `cursor-pointer active:scale-[0.98] ${FOCUS}` : ""} ${
									s.done
										? "border-emerald-950/25 bg-emerald-50 text-emerald-950"
										: isNext
											? "border-amber-500 bg-amber-50 text-amber-950"
											: "border-slate-200 bg-slate-50/60 text-slate-500"
								}`}
							>
								<span
									className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${s.done ? "bg-emerald-800 text-white" : isNext ? "bg-amber-400 text-amber-950" : "bg-slate-200 text-slate-600"}`}
								>
									{s.done ? <Check size={10} strokeWidth={3} /> : i + 1}
								</span>
								<span className="truncate">{s.title}</span>
								{isNext && (
									<span className="ml-auto shrink-0 rounded bg-amber-200 px-1.5 text-[10px] font-bold">
										Next
									</span>
								)}
							</Tag>
						</li>
					);
				})}
			</ul>

			<p className="mt-4 text-xs font-medium text-emerald-950/70">
				{next
					? `Next up: ${next.title}. ${total - doneCount} to go before you can submit.`
					: "Folder complete. You're ready to submit."}
			</p>
		</div>
	);
}

/* =========================================================================
   6. Submitted
   Removed the dead `dispatched` state (it was never set, so the envelope
   animation never ran). Added copy-reference, which is what students need.
   ========================================================================= */

const SUBMISSION_VOICES = [
	"Sent. Go touch grass.",
	"Off to the committee. Breathe.",
	"Dispatched. Close the laptop.",
	"In the queue. You did your part.",
];

export function PostmarkSubmission({
	schemeName = "National Means Merit Scholarship",
	applicationRef = "UDAAN-2026-NSP-8821",
	onReset,
}) {
	const [voice] = useState(
		() =>
			SUBMISSION_VOICES[Math.floor(Math.random() * SUBMISSION_VOICES.length)],
	);
	const [today] = useState(() => new Date().toLocaleDateString("en-IN"));
	const [copied, setCopied] = useState(false);

	const copyRef = async () => {
		try {
			await navigator.clipboard.writeText(applicationRef);
			setCopied(true);
			haptic(12);
			setTimeout(() => setCopied(false), 1800);
		} catch {
			/* clipboard blocked */
		}
	};

	return (
		<div
			className={`relative mx-auto max-w-md rounded-3xl border-2 border-emerald-950 bg-[#FEF9EE] p-6 text-emerald-950 sm:p-8 shadow-[6px_6px_0px_0px_rgba(2,44,34,1)]`}
		>
			<div className="mb-6 overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white">
				<div
					className="h-2 w-full"
					aria-hidden="true"
					style={{
						backgroundImage:
							"repeating-linear-gradient(45deg,#b91c1c 0 10px,transparent 10px 15px,#1d4ed8 15px 25px,transparent 25px 30px)",
					}}
				/>
				<div className="flex items-start justify-between gap-4 p-5">
					<div className="min-w-0">
						<span className="text-xs font-semibold text-emerald-950/55">
							Application sent
						</span>
						<h4 className="ud-display text-lg font-black leading-snug">
							{schemeName}
						</h4>
						<button
							type="button"
							onClick={copyRef}
							className={`mt-1.5 inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-md font-mono text-xs text-emerald-950/75 hover:text-emerald-950 ${FOCUS}`}
							aria-label={`Copy reference number ${applicationRef}`}
						>
							<span>Ref: {applicationRef}</span>
							{copied ? (
								<Check size={13} className="text-emerald-700" />
							) : (
								<Copy size={13} />
							)}
							<span className="sr-only" aria-live="polite">
								{copied ? "Copied" : ""}
							</span>
						</button>
					</div>
					<div
						className="animate-postmark flex h-16 w-16 shrink-0 rotate-6 select-none flex-col items-center justify-center rounded-full border-2 border-dashed border-red-700 p-1 text-red-700 opacity-90"
						aria-hidden="true"
					>
						<span className="text-[8px] font-black tracking-widest">SENT</span>
						<span className="my-0.5 text-[11px] font-extrabold">NSP</span>
						<span className="font-mono text-[7px] font-bold">{today}</span>
					</div>
				</div>
			</div>

			<div role="status" className="space-y-2 text-center">
				<h3 className="ud-display text-2xl font-black">You're done</h3>
				<p className="font-serif text-sm font-medium italic text-emerald-950/80">
					“{voice}”
				</p>
				<p className="mx-auto max-w-xs text-xs text-emerald-950/65">
					Keep your reference number. We'll flag it if the scheme's criteria
					change.
				</p>
			</div>

			{onReset && (
				<div className="mt-6 border-t border-dashed border-emerald-950/20 pt-5 text-center">
					<button
						type="button"
						onClick={onReset}
						className={`btn-fluid inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded text-xs font-bold text-emerald-900 underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950 ${FOCUS}`}
					>
						<RotateCcw size={13} />
						<span>Apply to another scheme</span>
					</button>
				</div>
			)}
		</div>
	);
}

/* =========================================================================
   7. Empty state
   Says what happened and what to do next; suggestions are one tap away.
   Dropped "caste category" from the copy: it reads as a prompt to hide
   identity. The fix is broader filters, not fewer details.
   ========================================================================= */

export function HonestEmptyState({
	query = "",
	suggestions = ["B.Tech", "Post-Matric", "Girls in STEM", "Merit"],
	onSuggest,
	onResetFilters,
}) {
	return (
		<div
			role="status"
			className="mx-auto max-w-lg rounded-3xl border-[1.5px] border-emerald-950/20 bg-white p-8 text-center sm:p-12"
		>
			<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border-[1.5px] border-emerald-950/20 bg-amber-50 text-amber-900">
				<Coffee size={36} strokeWidth={1.75} />
			</div>

			<h3 className="ud-display text-xl font-bold leading-snug text-emerald-950 sm:text-2xl">
				{query
					? `Nothing matches “${query}”`
					: "No schemes match these filters"}
			</h3>
			<p className="mx-auto mt-2 max-w-md font-serif text-sm leading-relaxed text-emerald-950/70">
				Your filters might be too narrow. Remove the degree or state filter
				first, since those cut the list down the most.
			</p>

			{onSuggest && (
				<div className="mt-5 flex flex-wrap justify-center gap-2">
					{suggestions.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => {
								haptic(10);
								onSuggest(s);
							}}
							className={`min-h-[44px] cursor-pointer rounded-full border-[1.5px] border-emerald-950/25 bg-[#FAF9F6] px-3.5 text-xs font-semibold text-emerald-950 transition hover:border-emerald-950 hover:bg-yellow-100 ${FOCUS}`}
						>
							{s}
						</button>
					))}
				</div>
			)}

			{onResetFilters && (
				<button
					type="button"
					onClick={() => {
						haptic(12);
						onResetFilters();
					}}
					className={`btn-fluid mt-5 inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-800 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-900 ${FOCUS}`}
				>
					<RotateCcw size={14} />
					<span>Clear all filters</span>
				</button>
			)}
		</div>
	);
}

/* =========================================================================
   8. Secret tip
   Knock animation stops after the first open. Esc closes. The default tip no
   longer quotes an unsourced "4x fewer applicants" figure: in a product whose
   promise is "verified", a made-up stat costs more trust than it earns.
   ========================================================================= */

export function SecretCornerKnock({
	tip = "Get your income and domicile certificates early. Local offices issue them, and they're what usually holds an application up.",
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [seen, setSeen] = useState(false);

	const toggle = () => {
		haptic(14);
		setSeen(true);
		setIsOpen((o) => !o);
	};

	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e) => e.key === "Escape" && setIsOpen(false);
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen]);

	if (!isOpen) {
		return (
			<button
				type="button"
				onClick={toggle}
				aria-expanded="false"
				className={`inline-flex min-h-[44px] cursor-pointer select-none items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950 bg-[#FEF9EE] px-3 py-1 text-xs font-bold text-emerald-950 transition-colors hover:bg-yellow-200 ${SH2} ${FOCUS} ${seen ? "" : "animate-knock-rhythm"}`}
			>
				<span className="h-2 w-2 rounded-full bg-amber-600" />
				<span>psst… student tip</span>
			</button>
		);
	}

	return (
		<div
			className={`animate-scale-in relative max-w-xs rounded-2xl border-[1.5px] border-emerald-950 bg-[#FEF9EE] p-4 text-emerald-950 ${SH4}`}
		>
			<div className="mb-2 flex items-center justify-between border-b border-dashed border-emerald-950/20 pb-2">
				<span className="text-xs font-bold text-amber-900">Student tip</span>
				<button
					type="button"
					onClick={toggle}
					aria-label="Close tip"
					className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-emerald-950/60 hover:text-emerald-950 ${FOCUS}`}
				>
					<X size={14} />
				</button>
			</div>
			<p className="font-serif text-xs leading-relaxed text-emerald-950/85">
				{tip}
			</p>
		</div>
	);
}

/* =========================================================================
   9. Onboarding
   Adds: Back, a selected state before the card slides, segmented progress,
   "Prefer not to say" on sensitive questions (mark them `optional: true`),
   and a finishing state.
   ========================================================================= */

const DEFAULT_QUESTIONS = [
	{
		id: "degree",
		question: "What are you studying?",
		hint: "Decides which state and AICTE schemes apply.",
		options: [
			"B.Tech / BE",
			"Medical / MBBS",
			"B.Sc / General degree",
			"Diploma",
		],
	},
	{
		id: "income",
		question: "What's your family's yearly income, roughly?",
		hint: "Needed for EWS and means-based scholarships.",
		options: [
			"Under ₹2.5 lakh",
			"₹2.5 – ₹4.5 lakh",
			"₹4.5 – ₹8 lakh",
			"Above ₹8 lakh",
		],
	},
	{
		id: "category",
		question: "Which category applies to you?",
		hint: "Some grants are reserved for specific categories. Skip it if you'd rather not say.",
		options: ["General", "OBC (non-creamy)", "SC / ST", "Minority / PwD"],
		optional: true,
	},
];

export function CardStackOnboarding({
	questions = DEFAULT_QUESTIONS,
	onComplete,
}) {
	const [index, setIndex] = useState(0);
	const [answers, setAnswers] = useState({});
	const [sliding, setSliding] = useState(false);
	const [finished, setFinished] = useState(false);

	const q = questions[index];
	if (!q && !finished) return null;
	const isLast = index === questions.length - 1;

	const choose = (value) => {
		if (sliding) return;
		haptic(10);
		const next = { ...answers, [q.id]: value };
		setAnswers(next);
		setSliding(true);
		setTimeout(
			() => {
				setSliding(false);
				if (isLast) {
					setFinished(true);
					onComplete?.(next);
				} else setIndex((i) => i + 1);
			},
			reducedMotion() ? 0 : 360,
		);
	};

	return (
		<div className="relative mx-auto w-full max-w-md">
			<div
				className="pointer-events-none absolute inset-0 translate-y-3 scale-95 rounded-3xl border-[1.5px] border-emerald-950/20 bg-white/70"
				aria-hidden="true"
			/>
			<div
				className="pointer-events-none absolute inset-0 translate-y-1.5 scale-[0.98] rounded-3xl border-[1.5px] border-emerald-950/30 bg-[#FAF9F6]"
				aria-hidden="true"
			/>

			<div
				className={`relative rounded-3xl border-2 border-emerald-950 bg-white p-6 text-emerald-950 sm:p-8 ${SH5} ${sliding ? "animate-card-swipe-out" : "animate-card-stack-rise"}`}
			>
				{finished ? (
					<div role="status" className="py-8 text-center">
						<Sparkles className="mx-auto mb-3 text-amber-500" size={28} />
						<h3 className="ud-display text-xl font-bold">
							Matching you to schemes…
						</h3>
						<p className="mt-1 text-sm text-emerald-950/65">
							This only takes a moment.
						</p>
					</div>
				) : (
					<>
						<div className="mb-5 flex items-center gap-3 border-b border-dashed border-emerald-950/20 pb-3">
							{index > 0 ? (
								<button
									type="button"
									onClick={() => setIndex((i) => i - 1)}
									aria-label="Previous question"
									className={`-ml-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-emerald-950/70 hover:bg-emerald-50 ${FOCUS}`}
								>
									<ChevronLeft size={18} />
								</button>
							) : null}
							<div
								className="flex flex-1 gap-1.5"
								role="progressbar"
								aria-valuemin={1}
								aria-valuemax={questions.length}
								aria-valuenow={index + 1}
								aria-label={`Question ${index + 1} of ${questions.length}`}
							>
								{questions.map((_, i) => (
									<span
										key={i}
										className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-emerald-800" : "bg-emerald-950/15"}`}
									/>
								))}
							</div>
						</div>

						<h3 className="ud-display mb-2 text-xl font-bold leading-snug sm:text-2xl">
							{q.question}
						</h3>
						<p className="mb-6 font-serif text-xs leading-relaxed text-emerald-950/65">
							{q.hint}
						</p>

						<div className="space-y-2.5">
							{q.options.map((opt) => (
								<button
									key={opt}
									type="button"
									onClick={() => choose(opt)}
									className={`btn-fluid flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-xl border-[1.5px] p-3.5 text-left text-sm font-semibold transition ${FOCUS} ${answers[q.id] === opt ? "border-emerald-950 bg-yellow-200" : "border-emerald-950/25 bg-[#FAF9F6] hover:border-emerald-950 hover:bg-yellow-100"}`}
								>
									<span>{opt}</span>
									<ChevronRight size={15} className="text-emerald-950/50" />
								</button>
							))}
							{q.optional && (
								<button
									type="button"
									onClick={() => choose(null)}
									className={`min-h-[44px] w-full cursor-pointer rounded-xl text-sm font-semibold text-emerald-950/60 underline decoration-yellow-300 decoration-2 underline-offset-4 hover:text-emerald-950 ${FOCUS}`}
								>
									Prefer not to say
								</button>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
