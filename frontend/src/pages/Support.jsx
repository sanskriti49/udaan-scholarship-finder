import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
	ArrowUpRight,
	BookOpen,
	Check,
	Copy,
	FileText,
	Flag,
	Lightbulb,
	Mail,
	MapPin,
	MessageCircle,
	Phone,
	Plus,
	Search,
	Send,
	ShieldCheck,
	ThumbsDown,
	ThumbsUp,
	X,
} from "lucide-react";
import heroImg from "../assets/images/support2.webp";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { toast } from "sonner";
import { faqs } from "../utils/faqs";
import { PageStyles, Stamp, useCopy } from "../components/PageKit";

gsap.registerPlugin(ScrollToPlugin);


const TOPICS = [
	"Scholarship issue",
	"Eligibility question",
	"Technical problem",
	"Suggest a scholarship",
	"Report incorrect information",
	"Feedback",
	"Other",
];

const POPULAR = ["documents", "income", "deadline", "eligibility", "reject"];

const QUICK_HELP = [
	{
		icon: BookOpen,
		title: "Scholarship matching",
		desc: "How schemes are matched to your degree, category and family income.",
		cta: "Ask about matching",
		tab: "message",
		topic: "Eligibility question",
	},
	{
		icon: FileText,
		title: "Required documents",
		desc: "The certificates you need (income, domicile, bonafide) before you apply.",
		cta: "Open the checklist",
		to: "/resources",
	},
	{
		icon: ShieldCheck,
		title: "Eligibility criteria",
		desc: "Minimum marks, income cutoffs and what the official circular really says.",
		cta: "Check my eligibility",
		to: "/eligibility",
	},
	{
		icon: Flag,
		title: "Report a wrong listing",
		desc: "Old deadline or broken circular link? Tell us and we'll re-check it.",
		cta: "Report it",
		tab: "report",
	},
	{
		icon: Lightbulb,
		title: "Suggest a scholarship",
		desc: "Know a university grant or state scheme we haven't listed yet?",
		cta: "Suggest one",
		tab: "suggest",
	},
	{
		icon: MessageCircle,
		title: "Talk to the team",
		desc: "Still stuck? Write to us and you'll hear back within 24 business hours.",
		cta: "Write a message",
		tab: "message",
		topic: "Scholarship issue",
		dark: true,
	},
];

const TAB_INFO = {
	message: {
		icon: MessageCircle,
		short: "Message",
		long: "Message",
		title: "Write to the support team",
		desc: "Tell us what's going on. Include the scheme name if there is one.",
	},
	report: {
		icon: Flag,
		short: "Report",
		long: "Report a listing",
		title: "Report a wrong listing",
		desc: "Wrong deadline, broken link, or an income cutoff that doesn't match the circular?",
	},
	suggest: {
		icon: Lightbulb,
		short: "Suggest",
		long: "Suggest a scheme",
		title: "Suggest a scholarship",
		desc: "From an NGO, a state department or a company foundation. We'll verify it before listing.",
	},
};

const BLANK = {
	contact: { name: "", email: "", topic: "Scholarship issue", message: "" },
	report: { link: "", issue: "" },
	suggest: { org: "", name: "", website: "", notes: "" },
};

const SUCCESS_COPY = {
	message: (email) => `We'll reply to ${email} within 24 business hours.`,
	report: () =>
		"Thanks for keeping Udaan accurate. We'll re-check the listing against the official circular.",
	suggest: () =>
		"Thanks! We'll verify it against the official source before it goes live.",
};


const scrollToId = (id) =>
	gsap.to(window, {
		scrollTo: { y: `#${id}`, offsetY: 88 },
		duration: 0.8,
		ease: "power3.out",
	});

function getSupportStatus() {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: "Asia/Kolkata",
		weekday: "short",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(new Date());
	const v = (t) => parts.find((p) => p.type === t)?.value;
	const hour = Number(v("hour"));
	const open = !["Sat", "Sun"].includes(v("weekday")) && hour >= 9 && hour < 18;
	return { open, time: `${v("hour")}:${v("minute")}` };
}

function useSupportStatus() {
	const [status, setStatus] = useState(getSupportStatus);
	useEffect(() => {
		const id = setInterval(() => setStatus(getSupportStatus()), 60000);
		return () => clearInterval(id);
	}, []);
	return status;
}

function Highlight({ text, query }) {
	const q = query.trim();
	if (!q) return text;
	const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return text.split(new RegExp(`(${safe})`, "gi")).map((part, i) =>
		part.toLowerCase() === q.toLowerCase() ? (
			<mark key={i} className="rounded-sm bg-yellow-200 px-0.5 text-inherit">
				{part}
			</mark>
		) : (
			part
		),
	);
}

function getChecks(tab, { contact, report, suggest }) {
	if (tab === "report") {
		return [
			{
				label: "Named the scheme or pasted its link",
				done: report.link.trim().length > 3,
			},
			{
				label: "Explained what's wrong (30+ characters)",
				done: report.issue.trim().length >= 30,
			},
			{
				label: "Included the official circular link",
				done: /https?:\/\//i.test(`${report.link} ${report.issue}`),
			},
		];
	}
	if (tab === "suggest") {
		return [
			{
				label: "Added the issuing body and scheme name",
				done: !!(suggest.org.trim() && suggest.name.trim()),
			},
			{
				label: "Linked the official page",
				done: /^https?:\/\//i.test(suggest.website.trim()),
			},
			{
				label: "Said who it's for (20+ characters)",
				done: suggest.notes.trim().length >= 20,
			},
		];
	}
	return [
		{
			label: "Added your name and email",
			done: !!(contact.name.trim() && /\S+@\S+\.\S+/.test(contact.email)),
		},
		{
			label: "Described the problem (40+ characters)",
			done: contact.message.trim().length >= 40,
		},
		{
			label: "Mentioned the scheme or pasted a link",
			done: /(https?:\/\/|scheme|scholarship|nsp|aicte|ugc)/i.test(
				contact.message,
			),
		},
	];
}


const inputCls =
	"w-full rounded-lg border-[1.5px] border-emerald-950/40 bg-white px-3.5 py-2.5 text-[15px] text-emerald-950 placeholder:text-emerald-950/40 transition-colors hover:border-emerald-950 focus:border-emerald-950 focus:outline-none focus:ring-4 focus:ring-yellow-200";

function Field({ label, hint, error, children }) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="flex items-baseline justify-between text-sm font-bold text-emerald-950">
				{label}
				{hint && (
					<span className="text-xs font-medium text-emerald-950/55">
						{hint}
					</span>
				)}
			</span>
			{children}
			{error && (
				<span className="text-xs font-semibold text-red-700">{error}</span>
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

function SubmitButton({ busy, children }) {
	return (
		<button
			type="submit"
			disabled={busy}
			className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-emerald-800 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 active:translate-y-px disabled:cursor-wait disabled:opacity-70"
		>
			{busy ? <span className="ud-spin" /> : <Send size={15} />}
			{busy ? "Sending" : children}
		</button>
	);
}

function TopicSlip({ t, onPick }) {
	const Icon = t.icon;
	const dark = !!t.dark;
	const cls = `group flex cursor-pointer flex-col items-start rounded-2xl border-[1.5px] p-6 text-left transition-colors ${
		dark
			? "border-emerald-950 bg-emerald-950 text-white hover:bg-emerald-900"
			: "border-emerald-950/20 bg-white text-emerald-950 hover:border-emerald-950"
	}`;
	const body = (
		<>
			<span
				className={`flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] ${
					dark
						? "border-yellow-200 bg-yellow-200 text-emerald-950"
						: "border-emerald-950 bg-emerald-50 text-emerald-900"
				}`}
			>
				<Icon size={20} />
			</span>
			<h3 className="ud-display mt-5 text-xl font-bold leading-tight">
				{t.title}
			</h3>
			<p
				className={`mt-2 text-sm leading-relaxed ${dark ? "text-emerald-50/80" : "text-emerald-950/70"}`}
			>
				{t.desc}
			</p>
			<span className="mt-5 inline-flex items-center gap-1 text-sm font-bold underline decoration-2 underline-offset-4 decoration-yellow-300">
				{t.cta}
				<ArrowUpRight
					size={16}
					className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
				/>
			</span>
		</>
	);
	return t.to ? (
		<Link to={t.to} className={cls}>
			{body}
		</Link>
	) : (
		<button type="button" onClick={() => onPick(t)} className={cls}>
			{body}
		</button>
	);
}

function FaqRow({ item, query, isOpen, onToggle, vote, onVote, onAsk }) {
	return (
		<div className={`transition-colors ${isOpen ? "bg-emerald-50/70" : ""}`}>
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={isOpen}
				className="flex w-full cursor-pointer items-start gap-4 px-5 py-4 text-left hover:bg-emerald-50/70 sm:px-6"
			>
				<span className="flex-1 text-[15px] font-semibold leading-snug text-emerald-950 sm:text-base">
					<Highlight text={item.question} query={query} />
				</span>
				<span
					className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-emerald-950 transition-all duration-200 ${
						isOpen ? "rotate-45 bg-yellow-200" : "bg-white"
					}`}
				>
					<Plus size={14} />
				</span>
			</button>
			<div
				className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
			>
				<div className="overflow-hidden">
					<div className="px-5 pb-5 sm:px-6">
						<p className="max-w-prose text-sm leading-relaxed text-emerald-950/80 sm:text-[15px]">
							<Highlight text={item.answer} query={query} />
						</p>
						<div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
							{!vote && (
								<>
									<span className="font-semibold text-emerald-950/70">
										Did this answer it?
									</span>
									<button
										type="button"
										onClick={() => onVote("up")}
										className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950/30 bg-white px-3 py-1 font-semibold hover:border-emerald-950"
									>
										<ThumbsUp size={14} /> Yes
									</button>
									<button
										type="button"
										onClick={() => onVote("down")}
										className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950/30 bg-white px-3 py-1 font-semibold hover:border-emerald-950"
									>
										<ThumbsDown size={14} /> Not really
									</button>
								</>
							)}
							{vote === "up" && (
								<span className="ud-fade-in inline-flex items-center gap-1.5 font-semibold text-emerald-800">
									<Check size={15} /> Glad that helped.
								</span>
							)}
							{vote === "down" && (
								<span className="ud-fade-in inline-flex flex-wrap items-center gap-3 font-semibold text-emerald-950">
									Sorry about that.
									<button
										type="button"
										onClick={onAsk}
										className="cursor-pointer rounded-full bg-emerald-800 px-4 py-1.5 text-white hover:bg-emerald-900"
									>
										Ask the team about this
									</button>
								</span>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function CopyRow({ icon: Icon, label, value, href, copied, onCopy, extra }) {
	return (
		<div className="flex items-start gap-3.5">
			<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-emerald-950 bg-white">
				<Icon size={17} />
			</span>
			<div className="min-w-0 flex-1">
				<p className="text-sm text-emerald-950/60">{label}</p>
				{href ? (
					<a
						href={href}
						className="break-all text-[15px] font-bold text-emerald-950 underline decoration-yellow-300 decoration-2 underline-offset-4"
					>
						{value}
					</a>
				) : (
					<p className="text-[15px] font-bold text-emerald-950">{value}</p>
				)}
				{extra && <p className="mt-0.5 text-sm text-emerald-950/60">{extra}</p>}
			</div>
			{onCopy && (
				<button
					type="button"
					onClick={onCopy}
					aria-label={`Copy ${label}`}
					className="mt-0.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-emerald-950/30 bg-white hover:border-emerald-950"
				>
					{copied ? (
						<Check size={14} className="text-emerald-700" />
					) : (
						<Copy size={14} />
					)}
				</button>
			)}
		</div>
	);
}


function Support() {
	const status = useSupportStatus();
	const [copied, copy] = useCopy();

	const [query, setQuery] = useState("");
	const [focused, setFocused] = useState(false);
	const [openSet, setOpenSet] = useState(() => new Set([0]));
	const [votes, setVotes] = useState({});
	const searchRef = useRef(null);

	const [tab, setTab] = useState("message");
	const [contact, setContact] = useState(BLANK.contact);
	const [report, setReport] = useState(BLANK.report);
	const [suggest, setSuggest] = useState(BLANK.suggest);
	const [emailTouched, setEmailTouched] = useState(false);
	const [busy, setBusy] = useState(false);
	const [sent, setSent] = useState(null);

	useEffect(() => {
		gsap.set(window, { scrollTo: 0 });
	}, []);

	useEffect(() => {
		const onKey = (e) => {
			const tag = document.activeElement?.tagName;
			if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
				e.preventDefault();
				searchRef.current?.focus();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const q = query.trim().toLowerCase();
	const items = useMemo(
		() =>
			faqs
				.map((f, i) => ({ ...f, i }))
				.filter(
					(f) => !q || `${f.question} ${f.answer}`.toLowerCase().includes(q),
				),
		[q],
	);
	const suggestions = q.length >= 2 ? items.slice(0, 4) : [];

	const toggleFaq = (i) =>
		setOpenSet((prev) => {
			const next = new Set(prev);
			if (next.has(i)) next.delete(i);
			else next.add(i);
			return next;
		});

	const openTicket = (nextTab, { topic, message } = {}) => {
		setTab(nextTab);
		setSent(null);
		if (topic) setContact((c) => ({ ...c, topic }));
		if (message) setContact((c) => ({ ...c, message }));
		scrollToId("contact");
	};

	const pickFromSearch = (item) => {
		setOpenSet(new Set([item.i]));
		setFocused(false);
		scrollToId("faq");
	};

	const checks = getChecks(tab, { contact, report, suggest });
	const score = checks.filter((c) => c.done).length;
	const emailInvalid =
		emailTouched && contact.email && !/\S+@\S+\.\S+/.test(contact.email);

	const submit = async (e, kind) => {
		e.preventDefault();
		setBusy(true);
		try {
			await new Promise((r) => setTimeout(r, 700));
			if (kind === "message") {
				toast.success("Message sent. We'll reply within 24 business hours.");
				setSent({ kind, email: contact.email });
				setContact(BLANK.contact);
				setEmailTouched(false);
			} else if (kind === "report") {
				toast.success("Thank you for helping keep Udaan accurate.");
				setSent({ kind });
				setReport(BLANK.report);
			} else {
				toast.success("Suggestion sent for verification.");
				setSent({ kind });
				setSuggest(BLANK.suggest);
			}
		} finally {
			setBusy(false);
		}
	};

	const info = TAB_INFO[tab];
	const InfoIcon = info.icon;

	return (
		<main className="ud-root min-h-screen bg-[#E9F0EA] font-sans text-emerald-950">
			<PageStyles />

			<section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 md:pb-24 md:pt-20 lg:grid-cols-12">
				<div className="lg:col-span-7">
					<div className="inline-flex items-center gap-2.5 rounded-full border-[1.5px] border-emerald-950 bg-white px-3.5 py-1.5 text-sm font-semibold">
						<span
							className={`h-2.5 w-2.5 rounded-full ${status.open ? "ud-live bg-emerald-500" : "bg-amber-500"}`}
						/>
						{status.open ? "Helpline is open" : "Helpline is closed"}
						<span className="font-normal text-emerald-950/60">
							{status.time} IST
						</span>
					</div>

					<h1 className="ud-display mt-6 text-5xl font-extrabold leading-[0.98] sm:text-6xl md:text-7xl">
						Stuck on a scholarship form? Search first, or ask us.
					</h1>

					<p className="mt-6 max-w-xl text-base leading-relaxed text-emerald-950/75 sm:text-lg">
						Type your question and we'll pull up the matching answer. If there
						isn't one, you can write to our team right below.
					</p>

					<form
						className="relative mt-8 max-w-xl"
						onSubmit={(e) => {
							e.preventDefault();
							setFocused(false);
							scrollToId("faq");
						}}
					>
						<div className="flex items-center gap-3 rounded-xl border-[1.5px] border-emerald-950 bg-white px-4 py-3.5 focus-within:ring-4 focus-within:ring-yellow-200">
							<Search size={20} className="shrink-0 text-emerald-950/60" />
							<input
								ref={searchRef}
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onFocus={() => setFocused(true)}
								onBlur={() => setFocused(false)}
								placeholder="Try “income certificate” or “deadline”"
								aria-label="Search help articles"
								className="min-w-0 flex-1 bg-transparent text-base placeholder:text-emerald-950/40 focus:outline-none"
							/>
							{query ? (
								<button
									type="button"
									onClick={() => setQuery("")}
									aria-label="Clear search"
									className="cursor-pointer rounded-full p-1 text-emerald-950/60 hover:bg-emerald-50"
								>
									<X size={16} />
								</button>
							) : (
								<kbd className="hidden rounded-md border border-emerald-950/30 px-2 py-0.5 text-xs font-semibold text-emerald-950/60 sm:inline">
									/
								</kbd>
							)}
						</div>

						{focused && q.length >= 2 && (
							<div
								onMouseDown={(e) => e.preventDefault()}
								className="ud-fade-in absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border-[1.5px] border-emerald-950 bg-white"
							>
								{suggestions.length > 0 ? (
									<>
										{suggestions.map((s) => (
											<button
												key={s.i}
												type="button"
												onClick={() => pickFromSearch(s)}
												className="block w-full cursor-pointer border-b border-dashed border-emerald-950/25 px-4 py-3 text-left text-sm font-semibold last:border-b-0 hover:bg-emerald-50"
											>
												<Highlight text={s.question} query={query} />
											</button>
										))}
										{items.length > suggestions.length && (
											<button
												type="button"
												onClick={() => {
													setFocused(false);
													scrollToId("faq");
												}}
												className="block w-full cursor-pointer bg-emerald-50 px-4 py-2.5 text-left text-sm font-bold text-emerald-800 hover:bg-emerald-100"
											>
												See all {items.length} answers
											</button>
										)}
									</>
								) : (
									<button
										type="button"
										onClick={() =>
											openTicket("message", {
												topic: "Other",
												message: `I couldn't find an answer about: ${query.trim()}`,
											})
										}
										className="block w-full cursor-pointer px-4 py-3 text-left text-sm hover:bg-emerald-50"
									>
										<span className="font-bold">
											No answer for “{query.trim()}”.
										</span>{" "}
										<span className="text-emerald-800 underline underline-offset-2">
											Ask the team instead
										</span>
									</button>
								)}
							</div>
						)}
					</form>

					<div className="mt-4 flex max-w-xl flex-wrap items-center gap-2">
						<span className="mr-1 text-sm text-emerald-950/60">Popular:</span>
						{POPULAR.map((p) => (
							<Chip
								key={p}
								active={q === p}
								onClick={() => {
									setQuery(p);
									scrollToId("faq");
								}}
							>
								{p}
							</Chip>
						))}
					</div>
				</div>

				<div className="relative mx-auto w-full max-w-md lg:col-span-5">
					<div
						aria-hidden
						className="absolute inset-0 -rotate-3 rounded-2xl border-[1.5px] border-emerald-950 bg-emerald-100"
					/>
					<div className="relative rotate-[1.5deg] rounded-2xl border-[1.5px] border-emerald-950 bg-white p-3">
						<div className="overflow-hidden rounded-xl bg-emerald-50 p-2">
							<img
								src={heroImg}
								alt="Udaan support desk"
								className="mx-auto max-h-80 w-full object-contain"
							/>
						</div>
						<div className="flex items-center justify-between gap-3 px-1.5 pb-1 pt-3 text-sm">
							<span className="font-bold">Udaan support desk</span>
							<span className="text-emerald-950/60">
								Replies in 24 business hours
							</span>
						</div>
					</div>
					<Stamp
						slam
						delay={0.6}
						tilt={-9}
						className="absolute -bottom-5 -left-3 bg-white/60 text-2xl sm:-left-6"
					>
						Answered
					</Stamp>
				</div>
			</section>

			<section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 md:pb-28">
				<h2 className="ud-display max-w-2xl text-4xl font-extrabold leading-[1.02] sm:text-5xl">
					What do you need help with?
				</h2>
				<p className="mt-4 max-w-xl text-base leading-relaxed text-emerald-950/75">
					Pick the closest one. Some open a page, some open the ticket below
					with the right form ready.
				</p>
				<div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{QUICK_HELP.map((t) => (
						<TopicSlip
							key={t.title}
							t={t}
							onPick={(x) => openTicket(x.tab, { topic: x.topic })}
						/>
					))}
				</div>
			</section>

			<section
				id="contact"
				className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 md:pb-28"
			>
				<h2 className="ud-display max-w-2xl text-4xl font-extrabold leading-[1.02] sm:text-5xl">
					Write to us
				</h2>
				<p className="mt-4 max-w-xl text-base leading-relaxed text-emerald-950/75">
					Fill in one slip. The checklist on the right shows what helps us fix
					things faster.
				</p>

				<div className="relative mt-10 grid overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white lg:grid-cols-[minmax(0,1fr)_380px]">
					<div>
						<div
							role="tablist"
							className="flex items-end gap-2 border-b-[1.5px] border-emerald-950 bg-emerald-50 px-4 pt-4 sm:px-6 sm:pt-5"
						>
							{Object.entries(TAB_INFO).map(([key, t]) => {
								const Icon = t.icon;
								const active = tab === key;
								return (
									<button
										key={key}
										role="tab"
										type="button"
										aria-selected={active}
										onClick={() => {
											setTab(key);
											setSent(null);
										}}
										className={`relative -mb-[1.5px] flex cursor-pointer items-center gap-2 rounded-t-xl border-[1.5px] border-b-0 px-3.5 py-2.5 text-sm font-bold transition-colors sm:px-5 ${
											active
												? "z-10 border-emerald-950 bg-white"
												: "border-emerald-950/35 bg-emerald-100/70 text-emerald-950/70 hover:bg-emerald-100"
										}`}
									>
										<Icon size={16} />
										<span className="sm:hidden">{t.short}</span>
										<span className="hidden sm:inline">{t.long}</span>
									</button>
								);
							})}
						</div>

						<div
							key={`${tab}-${sent ? "sent" : "form"}`}
							className="ud-fade-in p-6 sm:p-8"
						>
							{sent ? (
								<div className="flex flex-col items-start gap-5 py-6">
									<div className="ud-pop-in flex h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-emerald-950 bg-emerald-100">
										<Check
											size={30}
											strokeWidth={3}
											className="text-emerald-800"
										/>
									</div>
									<h3 className="ud-display text-3xl font-extrabold">
										Sent. We've got it.
									</h3>
									<p className="max-w-md text-base leading-relaxed text-emerald-950/75">
										{SUCCESS_COPY[sent.kind](sent.email)}
									</p>
									<button
										type="button"
										onClick={() => setSent(null)}
										className="cursor-pointer rounded-full border-[1.5px] border-emerald-950 px-5 py-2.5 text-sm font-bold hover:bg-emerald-50"
									>
										Write another
									</button>
								</div>
							) : (
								<>
									<div className="mb-6 flex items-start gap-3.5">
										<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-emerald-950 bg-yellow-200">
											<InfoIcon size={18} />
										</span>
										<div>
											<h3 className="ud-display text-2xl font-bold leading-tight">
												{info.title}
											</h3>
											<p className="mt-1 text-sm leading-relaxed text-emerald-950/70">
												{info.desc}
											</p>
										</div>
									</div>

									{tab === "message" && (
										<form
											onSubmit={(e) => submit(e, tab)}
											className="space-y-5"
										>
											<div className="grid gap-4 sm:grid-cols-2">
												<Field label="Your name">
													<input
														required
														placeholder="Priya Sharma"
														value={contact.name}
														onChange={(e) =>
															setContact({ ...contact, name: e.target.value })
														}
														className={inputCls}
													/>
												</Field>
												<Field
													label="Email"
													error={
														emailInvalid
															? "That doesn't look like an email address."
															: null
													}
												>
													<input
														required
														type="email"
														placeholder="priya@example.com"
														value={contact.email}
														onChange={(e) =>
															setContact({ ...contact, email: e.target.value })
														}
														onBlur={() => setEmailTouched(true)}
														className={inputCls}
													/>
												</Field>
											</div>

											<div>
												<p className="mb-2 text-sm font-bold">
													What's it about?
												</p>
												<div className="flex flex-wrap gap-2">
													{TOPICS.map((t) => (
														<Chip
															key={t}
															active={contact.topic === t}
															onClick={() =>
																setContact({ ...contact, topic: t })
															}
														>
															{t}
														</Chip>
													))}
												</div>
											</div>

											<Field
												label="Message"
												hint={`${contact.message.length}/600`}
											>
												<textarea
													required
													rows={5}
													maxLength={600}
													placeholder="What happened, and what did you expect to see?"
													value={contact.message}
													onChange={(e) =>
														setContact({ ...contact, message: e.target.value })
													}
													className={`${inputCls} resize-none`}
												/>
											</Field>

											<div className="flex flex-wrap items-center gap-4">
												<SubmitButton busy={busy}>Send message</SubmitButton>
												<span className="text-sm text-emerald-950/60">
													Reply within 24 business hours
												</span>
											</div>
										</form>
									)}

									{tab === "report" && (
										<form
											onSubmit={(e) => submit(e, tab)}
											className="space-y-5"
										>
											<Field label="Scholarship name or link">
												<input
													required
													placeholder="AICTE Pragati, or https://…"
													value={report.link}
													onChange={(e) =>
														setReport({ ...report, link: e.target.value })
													}
													className={inputCls}
												/>
											</Field>
											<Field
												label="What needs fixing?"
												hint={`${report.issue.length}/500`}
											>
												<textarea
													required
													rows={5}
													maxLength={500}
													placeholder="The deadline says 30 June but the circular says 15 July…"
													value={report.issue}
													onChange={(e) =>
														setReport({ ...report, issue: e.target.value })
													}
													className={`${inputCls} resize-none`}
												/>
											</Field>
											<SubmitButton busy={busy}>Send correction</SubmitButton>
										</form>
									)}

									{tab === "suggest" && (
										<form
											onSubmit={(e) => submit(e, tab)}
											className="space-y-5"
										>
											<div className="grid gap-4 sm:grid-cols-2">
												<Field label="Issuing body">
													<input
														required
														placeholder="Tata Trusts"
														value={suggest.org}
														onChange={(e) =>
															setSuggest({ ...suggest, org: e.target.value })
														}
														className={inputCls}
													/>
												</Field>
												<Field label="Scheme name">
													<input
														required
														placeholder="STEM Grant"
														value={suggest.name}
														onChange={(e) =>
															setSuggest({ ...suggest, name: e.target.value })
														}
														className={inputCls}
													/>
												</Field>
											</div>
											<Field label="Official page or circular" hint="optional">
												<input
													type="url"
													placeholder="https://…"
													value={suggest.website}
													onChange={(e) =>
														setSuggest({ ...suggest, website: e.target.value })
													}
													className={inputCls}
												/>
											</Field>
											<Field label="Who is it for?" hint="optional">
												<textarea
													rows={3}
													placeholder="Girls in engineering, family income under ₹6 lakh…"
													value={suggest.notes}
													onChange={(e) =>
														setSuggest({ ...suggest, notes: e.target.value })
													}
													className={`${inputCls} resize-none`}
												/>
											</Field>
											<SubmitButton busy={busy}>Suggest scheme</SubmitButton>
										</form>
									)}
								</>
							)}
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
								<p className="ud-display text-lg font-bold">Faster fixes</p>
								<span className="text-sm font-bold">{score}/3</span>
							</div>
							<div className="mt-3 flex gap-1.5" aria-hidden>
								{checks.map((c, i) => (
									<span
										key={i}
										className={`h-2 flex-1 rounded-full transition-colors duration-300 ${c.done ? "bg-emerald-900" : "bg-emerald-950/15"}`}
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
									: "Tick these off and we can usually fix it in one reply."}
							</p>
						</div>

						<div className="space-y-5">
							<CopyRow
								icon={Mail}
								label="Email"
								value="support@udaan.com"
								href="mailto:support@udaan.com"
								copied={copied === "email"}
								onCopy={() =>
									copy("email", "support@udaan.com").then(
										(ok) => ok && toast.success("Email copied"),
									)
								}
							/>
							<CopyRow
								icon={Phone}
								label="Student helpline"
								value="+91 98765 43210"
								extra="Mon to Fri, 9am to 6pm IST"
								copied={copied === "phone"}
								onCopy={() =>
									copy("phone", "+91 98765 43210").then(
										(ok) => ok && toast.success("Number copied"),
									)
								}
							/>
							<CopyRow
								icon={MapPin}
								label="Headquarters"
								value="Kolkata, India"
							/>
						</div>
					</aside>
				</div>
			</section>

			<section
				id="faq"
				className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 md:pb-32"
			>
				<div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-14">
					<div className="lg:sticky lg:top-24 lg:self-start">
						<h2 className="ud-display text-4xl font-extrabold leading-[1.02] sm:text-5xl">
							Quick answers
						</h2>
						<p className="mt-4 text-base leading-relaxed text-emerald-950/75">
							{q ? (
								<>
									{items.length}{" "}
									{items.length === 1 ? "answer matches" : "answers match"} “
									{query.trim()}”.
								</>
							) : (
								<>Showing all {faqs.length} answers.</>
							)}
						</p>

						<div className="mt-5 flex items-center gap-3 rounded-xl border-[1.5px] border-emerald-950 bg-white px-3.5 py-2.5 focus-within:ring-4 focus-within:ring-yellow-200">
							<Search size={17} className="shrink-0 text-emerald-950/60" />
							<input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Filter answers"
								aria-label="Filter answers"
								className="min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-emerald-950/40 focus:outline-none"
							/>
							{query && (
								<button
									type="button"
									onClick={() => setQuery("")}
									aria-label="Clear filter"
									className="cursor-pointer rounded-full p-1 text-emerald-950/60 hover:bg-emerald-50"
								>
									<X size={15} />
								</button>
							)}
						</div>

						<div className="mt-4 flex flex-wrap gap-2">
							<Chip
								active={false}
								onClick={() => setOpenSet(new Set(items.map((f) => f.i)))}
							>
								Open all
							</Chip>
							<Chip active={false} onClick={() => setOpenSet(new Set())}>
								Close all
							</Chip>
						</div>
					</div>

					<div className="overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white">
						{items.length > 0 ? (
							<div className="divide-y-[1.5px] divide-dashed divide-emerald-950/25">
								{items.map((f) => (
									<FaqRow
										key={f.i}
										item={f}
										query={query}
										isOpen={openSet.has(f.i)}
										onToggle={() => toggleFaq(f.i)}
										vote={votes[f.i]}
										onVote={(v) => setVotes((prev) => ({ ...prev, [f.i]: v }))}
										onAsk={() =>
											openTicket("message", {
												topic: "Other",
												message: `About "${f.question}": that answer didn't solve my problem because `,
											})
										}
									/>
								))}
							</div>
						) : (
							<div className="flex flex-col items-start gap-4 p-8">
								<h3 className="ud-display text-2xl font-bold">
									Nothing matches “{query.trim()}”.
								</h3>
								<p className="max-w-md text-[15px] leading-relaxed text-emerald-950/75">
									Try one word, like “income” instead of “income certificate”,
									or send us the question and we'll answer it.
								</p>
								<div className="flex flex-wrap gap-3">
									<button
										type="button"
										onClick={() => setQuery("")}
										className="cursor-pointer rounded-full border-[1.5px] border-emerald-950 px-5 py-2.5 text-sm font-bold hover:bg-emerald-50"
									>
										Clear search
									</button>
									<button
										type="button"
										onClick={() =>
											openTicket("message", {
												topic: "Other",
												message: `I couldn't find an answer about: ${query.trim()}`,
											})
										}
										className="cursor-pointer rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-900"
									>
										Ask the team
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</section>
		</main>
	);
}

export default Support;
