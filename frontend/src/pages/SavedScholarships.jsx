import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
	Bookmark,
	BookmarkCheck,
	Search,
	X,
	ShieldCheck,
	History,
	FileText,
	ArrowUpRight,
	Sparkles,
	Clock,
	Compass,
	ArrowRight,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
	getBookmarks,
	removeBookmark as apiRemoveBookmark,
	toggleBookmark as apiToggleBookmark,
} from "../services/scholarshipService";
import EvidenceModal from "../components/EvidenceModal";
import AuthPromptModal from "../components/AuthPromptModal";
import { formatGrant } from "../utils/formatGrant";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import { cleanOfficialUrl } from "../utils/formatEvidence";
import { emitBookmarkChanged, onBookmarkChanged } from "../utils/bookmarkSync";
import { PageStyles } from "../components/PageKit";
import { ScholarshipCard, CardSkeleton } from "../components/ScholarshipKit";
import { CountUp } from "../components/MotionKit";
import { deadlineInfo } from "../utils/scholarshipMeta";
import {
	CategoryMotifIcon,
	getCategoryTheme,
} from "../components/CategoryMotif";
import {
	BoardCurator,
	CablesDoctor,
	ConfusedDetective,
} from "../components/AnimatedIllustrations";
import PreFlightChecklist from "../components/PreFlightChecklist";
import AddToCalendarButton from "../components/AddToCalendarButton";

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

// Each scheme lands on the first shelf it fits. `plate` colours the label.
const SHELVES = [
	{
		id: "closing",
		title: "Closing soon",
		note: "Deadline within 14 days. Do these first.",
		plate: "bg-yellow-200",
		tilt: "-rotate-1",
		test: (s, d) => d.days !== null && d.days <= 14 && d.tone !== "closed",
	},
	{
		id: "updated",
		title: "Recently updated",
		note: "Rules, dates or amounts changed. Worth a re-read.",
		plate: "bg-rose-100",
		tilt: "rotate-1",
		test: (s, d) => s.hasChanges && d.tone !== "closed",
	},
	{
		id: "ready",
		title: "Ready to apply",
		note: "Open now, with a direct official link.",
		plate: "bg-emerald-200",
		tilt: "-rotate-[0.5deg]",
		test: (s, d) =>
			!!s.applicationLink && d.tone !== "closed" && s.status !== "upcoming",
	},
	{
		id: "later",
		title: "On the shelf",
		note: "Opening later or no fixed date yet.",
		plate: "bg-white",
		tilt: "rotate-[0.5deg]",
		test: (s, d) => d.tone !== "closed",
	},
	{
		id: "past",
		title: "Past deadline",
		note: "Kept for next year's cycle.",
		plate: "bg-emerald-950/10",
		tilt: "-rotate-1",
		test: () => true,
	},
];

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

// Highlighter pen, the same one used on the Resources page.
function Highlight({ on = true, color = "#fde047", children }) {
	return (
		<span
			className={`box-decoration-clone bg-left bg-no-repeat transition-[background-size] duration-500 ease-out motion-reduce:transition-none ${
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

function ShelfRail() {
	return (
		<div
			aria-hidden
			className="h-3 rounded-sm border-[1.5px] border-emerald-950 bg-emerald-800 shadow-[0_6px_0_rgba(2,44,34,0.18)]"
		/>
	);
}

function GhostCard({ className = "", children }) {
	return (
		<div
			aria-hidden
			className={`flex items-center justify-center rounded-md border-[1.5px] border-dashed border-emerald-950/40 ${className}`}
		>
			{children}
		</div>
	);
}

function DeadlineChip({ deadline }) {
	if (!deadline) {
		return (
			<span className="inline-flex shrink-0 items-center rounded-md border-[1.5px] border-emerald-950/20 bg-white px-2.5 py-1 text-xs font-bold">
				Check portal
			</span>
		);
	}
	const d = new Date(deadline);
	const diffDays = Math.ceil(
		(d.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
	);
	const isUrgent = diffDays >= 0 && diffDays <= 7;

	let text = d.toLocaleDateString("en-IN", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
	let tone = "default";
	if (diffDays < 0) {
		text = `Closed ${text}`;
		tone = "closed";
	} else if (diffDays === 0) {
		text = "Closes today";
		tone = "urgent";
	} else if (diffDays === 1) {
		text = "Closes tomorrow";
		tone = "urgent";
	} else if (isUrgent) {
		text = `${diffDays} days left`;
		tone = "urgent";
	}

	const tones = {
		default: "border-emerald-950/20 bg-white text-emerald-950",
		urgent: "border-emerald-950 bg-yellow-200 text-emerald-950",
		closed: "border-emerald-950/20 bg-emerald-950/5 text-emerald-950/50",
	};
	return (
		<span
			className={`inline-flex shrink-0 items-center rounded-md border-[1.5px] px-2.5 py-1 text-xs font-bold ${tones[tone]}`}
		>
			{text}
		</span>
	);
}

function DrawerSection({ title, aside, children }) {
	return (
		<section className="space-y-3">
			<div className="flex items-baseline justify-between gap-3 border-b-[1.5px] border-emerald-950/15 pb-2">
				<h4 className="font-georgia text-xl text-emerald-950">{title}</h4>
				{aside}
			</div>
			{children}
		</section>
	);
}

/* ------------------------------------------------------------------ */
/* Deadline ruler: every saved deadline as a flag on a 90 day ruler    */
/* ------------------------------------------------------------------ */

const HORIZON = 90; // days shown on the ruler
const ZONE_DAYS = 14; // matches the "Closing soon" shelf
const MIN_GAP = 5; // days between flags that share a lane
const LANE_H = 30;
const RULER_H = 44;
const LABEL_H = 26;
const MARKS = [
	{ d: 0, t: "Today" },
	{ d: 14, t: "2 weeks" },
	{ d: 30, t: "1 month" },
	{ d: 60, t: "2 months" },
	{ d: 90, t: "3 months" },
];

const RULER_TICKS = {
	backgroundImage: [
		"linear-gradient(to right, rgba(2,44,34,.6) 1.5px, transparent 1.5px)",
		"linear-gradient(to right, rgba(2,44,34,.55) 1.5px, transparent 1.5px)",
		"linear-gradient(to right, rgba(2,44,34,.4) 1px, transparent 1px)",
	].join(","),
	backgroundSize: [
		`calc(100% / ${HORIZON / 30}) 100%`,
		`calc(100% * 7 / ${HORIZON}) 55%`,
		`calc(100% / ${HORIZON}) 28%`,
	].join(","),
	backgroundPosition: "0 100%, 0 100%, 0 100%",
	backgroundRepeat: "repeat-x",
};

function DeadlineRuler({ items, onOpen }) {
	const [selId, setSelId] = useState(null);

	const pins = [];
	let later = 0;
	let undated = 0;
	for (const s of items) {
		const d = deadlineInfo(s.deadline, s.status);
		if (d.tone === "closed") continue;
		if (d.days === null || d.days === undefined) {
			undated++;
			continue;
		}
		if (d.days > HORIZON) {
			later++;
			continue;
		}
		pins.push({ id: s._id || s.id, s, days: Math.max(0, d.days) });
	}
	pins.sort((a, b) => a.days - b.days);

	// Stagger flags into lanes so nearby deadlines don't sit on top of each other.
	const laneEnds = [];
	for (const p of pins) {
		let lane = laneEnds.findIndex((end) => p.days - end >= MIN_GAP);
		if (lane === -1) {
			lane =
				laneEnds.length < 4
					? laneEnds.length
					: laneEnds.indexOf(Math.min(...laneEnds));
		}
		laneEnds[lane] = p.days;
		p.lane = lane;
	}
	const lanes = Math.max(1, laneEnds.length);
	const rulerBottom = LABEL_H;
	const height = rulerBottom + RULER_H + 24 + 8 + (lanes - 1) * LANE_H + 12;

	const focus = pins.find((p) => p.id === selId) ?? pins[0];
	const daysText = (n) =>
		n === 0 ? "Today" : `${n} day${n === 1 ? "" : "s"} left`;

	return (
		<div>
			<style>{`
				@keyframes dr-drop { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: none; } }
				.dr-drop { animation: dr-drop .45s cubic-bezier(.2,1.2,.4,1) both; }
				@media (prefers-reduced-motion: reduce) { .dr-drop { animation: none; } }
			`}</style>

			<div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
				<h2 className="font-georgia text-3xl leading-tight">
					The next 90 days
				</h2>
				<p className="text-sm text-emerald-950/65">
					Each flag is a deadline, counted in days from today.
				</p>
			</div>

			<div className="-mx-1 mt-4 overflow-x-auto px-1">
				<div className="min-w-[720px]">
					<div className="relative mr-12" style={{ height }}>
						{/* the ruler */}
						<div
							className="absolute inset-x-0 overflow-hidden rounded-md border-[1.5px] border-emerald-950 bg-yellow-200"
							style={{ bottom: rulerBottom, height: RULER_H, ...RULER_TICKS }}
						>
							<div
								aria-hidden
								className="pointer-events-none absolute inset-y-0 left-0 border-r-[1.5px] border-dashed border-rose-600/70"
								style={{
									width: `${(ZONE_DAYS / HORIZON) * 100}%`,
									backgroundImage:
										"repeating-linear-gradient(135deg, rgba(225,29,72,.18) 0 5px, transparent 5px 10px)",
								}}
							/>
							<span className="absolute left-2 top-1 text-[11px] font-bold text-rose-800">
								Next 14 days
							</span>
						</div>

						{/* labels under the ruler */}
						{MARKS.map((m) => (
							<span
								key={m.d}
								className={`absolute bottom-0 text-xs font-semibold text-emerald-950/70 ${
									m.d === 0
										? ""
										: m.d === HORIZON
											? "-translate-x-full"
											: "-translate-x-1/2"
								}`}
								style={{ left: `${(m.d / HORIZON) * 100}%` }}
							>
								{m.t}
							</span>
						))}

						{/* flags */}
						{pins.map((p, i) => {
							const on = focus?.id === p.id;
							const urgent = p.days <= 7;
							return (
								<div
									key={p.id}
									className="absolute -ml-px"
									style={{
										left: `${(p.days / HORIZON) * 100}%`,
										bottom: rulerBottom + RULER_H,
									}}
								>
									<div
										className="dr-drop flex flex-col items-start"
										style={{ animationDelay: `${i * 55}ms` }}
									>
										<button
											type="button"
											onMouseEnter={() => setSelId(p.id)}
											onFocus={() => setSelId(p.id)}
											onClick={() => onOpen(p.s)}
											aria-label={`${p.s.title}, ${daysText(p.days)}. Open details`}
											className={`h-6 cursor-pointer whitespace-nowrap rounded-r-sm border-[1.5px] border-l-0 border-emerald-950 px-2 text-xs font-bold transition-colors ${focusRing} ${
												on
													? "bg-emerald-950 text-white"
													: urgent
														? "bg-yellow-300"
														: "bg-white hover:bg-yellow-100"
											}`}
										>
											{p.days === 0 ? "Today" : `${p.days}d`}
										</button>
										<span
											aria-hidden
											className="w-[2px] bg-emerald-950"
											style={{ height: 8 + p.lane * LANE_H }}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* readout */}
			<div
				aria-live="polite"
				className="mt-4 flex flex-col gap-3 border-t-[1.5px] border-emerald-950 pt-4 sm:flex-row sm:items-center sm:justify-between"
			>
				{focus ? (
					<>
						<div className="min-w-0">
							<p className="font-georgia text-3xl leading-none">
								{daysText(focus.days)}
							</p>
							<p className="mt-1.5 truncate font-semibold">{focus.s.title}</p>
							<p className="text-sm text-emerald-950/60">
								{focus.s.organization}
								{focus.s.deadline &&
									`, closes ${new Date(focus.s.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
							</p>
						</div>
						<button
							type="button"
							onClick={() => onOpen(focus.s)}
							className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-md bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 active:translate-y-px sm:self-auto ${focusRing}`}
						>
							Open details <ArrowUpRight size={15} />
						</button>
					</>
				) : (
					<p className="text-[15px] text-emerald-950/75">
						{items.length === 0
							? "Save a scholarship and its deadline lands on this ruler."
							: "Nothing you saved closes in the next 90 days."}
					</p>
				)}
			</div>

			{(later > 0 || undated > 0) && (
				<p className="mt-3 text-xs text-emerald-950/60">
					{[
						later > 0 &&
							`${later} close${later === 1 ? "s" : ""} after 90 days`,
						undated > 0 &&
							`${undated} ${undated === 1 ? "has" : "have"} no fixed date`,
					]
						.filter(Boolean)
						.join(", ")}
					.
				</p>
			)}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function SavedScholarships() {
	const { user } = useAuth();
	const navigate = useNavigate();

	const [savedItems, setSavedItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("All");
	const [sortBy, setSortBy] = useState("deadline");
	const [view, setView] = useState("shelf");

	const [selectedScholarship, setSelectedScholarship] = useState(null);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
	const [authPromptOpen, setAuthPromptOpen] = useState(false);

	const [removingSet, setRemovingSet] = useState(new Set());

	useBodyScrollLock(isDrawerOpen || isEvidenceModalOpen);

	const fetchBookmarks = async () => {
		const token = localStorage.getItem("token");
		if (!user || !token) {
			setSavedItems([]);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);
			const res = await getBookmarks();
			if (res && res.success && Array.isArray(res.data)) {
				setSavedItems(res.data);
			} else {
				setSavedItems([]);
			}
		} catch (err) {
			console.error("[SavedScholarships] Error fetching:", err);
			if (err.response?.status === 401) {
				setSavedItems([]);
			} else {
				setError("Could not load saved scholarships. Please try again.");
			}
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBookmarks();
	}, [user]);

	// Global bookmark sync listener
	useEffect(() => {
		const unsubscribe = onBookmarkChanged(({ scholarshipId, isBookmarked }) => {
			if (!isBookmarked) {
				setSavedItems((prev) =>
					prev.filter((s) => (s._id || s.id) !== scholarshipId),
				);
			} else {
				// A bookmark was added elsewhere, so re-fetch the list
				fetchBookmarks();
			}
		});
		return unsubscribe;
	}, []);

	const handleRemoveBookmark = async (scholarship) => {
		const id = scholarship._id || scholarship.id;
		if (removingSet.has(id)) return;

		setRemovingSet((prev) => new Set(prev).add(id));

		// Keep a backup for undo
		const removedIndex = savedItems.findIndex((s) => (s._id || s.id) === id);
		const removedItem = savedItems[removedIndex];

		// Optimistic removal
		setSavedItems((prev) => prev.filter((s) => (s._id || s.id) !== id));
		emitBookmarkChanged(id, false);

		try {
			await apiRemoveBookmark(id);

			toast.success(`Removed "${scholarship.title}" from saved`, {
				action: {
					label: "Undo",
					onClick: async () => {
						try {
							await apiToggleBookmark(id);
							emitBookmarkChanged(id, true);
							setSavedItems((prev) => {
								const copy = [...prev];
								if (removedIndex >= 0 && removedIndex <= copy.length) {
									copy.splice(removedIndex, 0, removedItem);
								} else {
									copy.push(removedItem);
								}
								return copy;
							});
							toast.success("Bookmark restored!");
						} catch {
							toast.error("Could not restore bookmark");
						}
					},
				},
			});
		} catch {
			// Roll back on failure
			if (removedItem) {
				setSavedItems((prev) => {
					const copy = [...prev];
					copy.splice(removedIndex, 0, removedItem);
					return copy;
				});
				emitBookmarkChanged(id, true);
			}
			toast.error("Failed to remove bookmark. Please try again.");
		} finally {
			setRemovingSet((prev) => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
		}
	};

	const openDetails = (scholarship) => {
		setSelectedScholarship(scholarship);
		setIsDrawerOpen(true);
	};

	const closeDrawer = () => setIsDrawerOpen(false);

	// Categories available in saved items
	const categories = [
		"All",
		...Array.from(new Set(savedItems.map((s) => s.category).filter(Boolean))),
	];

	const q = searchQuery.trim().toLowerCase();
	const filteredItems = savedItems.filter((s) => {
		const matchesQuery =
			!q ||
			(s.title || "").toLowerCase().includes(q) ||
			(s.organization || "").toLowerCase().includes(q) ||
			(s.state || "").toLowerCase().includes(q);
		const matchesCat =
			selectedCategory === "All" || s.category === selectedCategory;
		return matchesQuery && matchesCat;
	});

	const sortedItems = [...filteredItems].sort((a, b) => {
		if (sortBy === "alphabetical") {
			return (a.title || "").localeCompare(b.title || "");
		}
		if (sortBy === "amount") {
			return (b.amount?.value || 0) - (a.amount?.value || 0);
		}
		const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
		const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
		return dateA - dateB;
	});

	const shelves = SHELVES.map((sh) => ({ ...sh, items: [] }));
	for (const item of sortedItems) {
		const d = deadlineInfo(item.deadline, item.status);
		shelves.find((sh) => sh.test(item, d)).items.push(item);
	}
	const count = (id) => shelves.find((sh) => sh.id === id).items.length;
	const showShelf = view === "shelf" && !q && selectedCategory === "All";
	const hasData = user && !loading && !error;

	const renderCard = (s, i) => {
		const id = s._id || s.id;
		return (
			<ScholarshipCard
				key={id}
				s={s}
				index={i}
				saved
				saving={removingSet.has(id)}
				onSave={() => handleRemoveBookmark(s)}
				onOpen={() => openDetails(s)}
			/>
		);
	};

	const grant = selectedScholarship?.amount
		? formatGrant(selectedScholarship.amount)
		: null;

	return (
		<div className="min-h-screen bg-[#E9F0EA] font-sans text-emerald-950 selection:bg-yellow-200">
			<PageStyles />

			{/* Hero */}
			<section className="mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 md:pt-16 lg:px-8">
				<div className="grid items-end gap-10 lg:grid-cols-[1.25fr_1fr]">
					<div>
						<h1
							className="font-georgia text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
							style={{ textWrap: "balance" }}
						>
							Your shortlist, with the clock on it.
						</h1>
						<p className="mt-5 max-w-xl text-base leading-relaxed text-emerald-950/75 sm:text-lg">
							Everything you&rsquo;ve saved, ordered by what closes first, so
							nothing slips past a deadline.
						</p>
					</div>

					{hasData && (
						<dl className="flex gap-8 sm:gap-10 lg:justify-end">
							{[
								["Saved", savedItems.length, false],
								["Closing within 14 days", count("closing"), true],
								["Ready to apply", count("ready"), false],
							].map(([label, n, hl]) => (
								<div key={label} className="flex flex-col-reverse">
									<dt className="mt-2 max-w-[8rem] text-sm font-semibold leading-snug text-emerald-950/65">
										{label}
									</dt>
									<dd className="font-georgia text-6xl leading-none">
										<Highlight on={hl && n > 0}>
											<CountUp value={n} duration={700} />
										</Highlight>
									</dd>
								</div>
							))}
						</dl>
					)}
				</div>

				{hasData && (
					<div className="mt-12">
						<DeadlineRuler items={savedItems} onOpen={openDetails} />
					</div>
				)}
			</section>

			{/* Main content */}
			<section className="mx-auto max-w-7xl border-t-[1.5px] border-emerald-950 px-4 pb-24 pt-10 sm:px-6 lg:px-8">
				{/* Signed-out state */}
				{!user && !loading && (
					<div className="mx-auto my-6 max-w-xl text-center">
						<div className="flex items-end justify-center gap-4 px-6">
							<GhostCard className="hidden h-32 w-24 sm:flex" />
							<GhostCard className="h-40 w-28 bg-yellow-200/60">
								<Bookmark
									size={28}
									strokeWidth={2.2}
									className="text-emerald-950/70"
								/>
							</GhostCard>
							<GhostCard className="hidden h-36 w-24 sm:flex" />
						</div>
						<ShelfRail />

						<h2 className="mt-10 font-georgia text-3xl leading-tight sm:text-4xl">
							Sign in to see your shelf
						</h2>
						<p className="mt-3 text-[15px] leading-relaxed text-emerald-950/75">
							Your saved scholarships and their countdowns are tied to your
							student account. Sign in to pick up where you left off.
						</p>

						<div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
							<button
								type="button"
								onClick={() => navigate("/login?redirect=/saved")}
								className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-emerald-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 active:translate-y-px sm:w-auto ${focusRing}`}
							>
								Sign in <ArrowRight size={15} />
							</button>
							<button
								type="button"
								onClick={() => navigate("/signup?redirect=/saved")}
								className={`inline-flex w-full cursor-pointer items-center justify-center rounded-md border-[1.5px] border-emerald-950 bg-white px-6 py-3 text-sm font-semibold transition hover:bg-yellow-200 sm:w-auto ${focusRing}`}
							>
								Create a free account
							</button>
						</div>

						<div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-emerald-950/65">
							<span className="flex items-center gap-1.5">
								<Clock size={14} className="text-emerald-800" /> Deadline
								countdowns
							</span>
							<span className="flex items-center gap-1.5">
								<ShieldCheck size={14} className="text-emerald-800" /> Free
							</span>
							<span className="flex items-center gap-1.5">
								<Sparkles size={14} className="text-amber-700" /> Syncs across
								devices
							</span>
						</div>
					</div>
				)}

				{user && (
					<>
						{/* Toolbar */}
						<div className="mb-8 flex flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-center">
							<div className="relative max-w-md flex-1">
								<Search
									size={16}
									className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-950/50"
								/>
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									aria-label="Search saved scholarships"
									placeholder="Search saved schemes, providers, states"
									className={`w-full rounded-md border-[1.5px] border-emerald-950 bg-white py-2.5 pl-10 pr-9 text-sm font-medium placeholder:text-emerald-950/45 ${focusRing}`}
								/>
								{searchQuery && (
									<button
										type="button"
										onClick={() => setSearchQuery("")}
										aria-label="Clear search"
										className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-emerald-950/40 hover:text-emerald-950"
									>
										<X size={14} />
									</button>
								)}
							</div>

							<div className="flex flex-wrap items-center gap-x-5 gap-y-3">
								<div role="group" aria-label="Layout" className="flex gap-4">
									{[
										{ id: "shelf", label: "Shelves" },
										{ id: "list", label: "All in one list" },
									].map((v) => (
										<button
											key={v.id}
											type="button"
											aria-pressed={view === v.id}
											onClick={() => setView(v.id)}
											className={`-mb-px cursor-pointer border-b-2 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:underline ${
												view === v.id
													? "border-emerald-950"
													: "border-transparent text-emerald-950/55 hover:text-emerald-950"
											}`}
										>
											{v.label}
										</button>
									))}
								</div>

								{categories.length > 2 && (
									<select
										value={selectedCategory}
										onChange={(e) => setSelectedCategory(e.target.value)}
										aria-label="Filter by category"
										className={`cursor-pointer rounded-md border-[1.5px] border-emerald-950 bg-white px-3 py-2 text-sm font-semibold ${focusRing}`}
									>
										{categories.map((cat) => (
											<option key={cat} value={cat}>
												{cat === "All" ? "All categories" : cat}
											</option>
										))}
									</select>
								)}

								<select
									value={sortBy}
									onChange={(e) => setSortBy(e.target.value)}
									aria-label="Sort saved scholarships"
									className={`cursor-pointer rounded-md border-[1.5px] border-emerald-950 bg-white px-3 py-2 text-sm font-semibold ${focusRing}`}
								>
									<option value="deadline">Closing soonest</option>
									<option value="amount">Highest benefit</option>
									<option value="alphabetical">A to Z</option>
								</select>

								<Link
									to="/scholarships"
									className={`hidden items-center gap-1.5 text-sm font-semibold underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950 md:inline-flex ${focusRing}`}
								>
									<Compass size={14} /> Browse all
								</Link>
							</div>
						</div>

						{/* Loading */}
						{loading && (
							<div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
								{[1, 2, 3].map((i) => (
									<CardSkeleton key={i} />
								))}
							</div>
						)}

						{/* Error */}
						{!loading && error && (
							<div className="mx-auto my-8 max-w-lg space-y-4 rounded-lg border-[1.5px] border-rose-300 bg-white p-7 text-center sm:p-9">
								<div className="flex justify-center">
									<CablesDoctor size={76} />
								</div>
								<div>
									<h3 className="font-georgia text-2xl">{error}</h3>
									<p className="mt-1 text-sm font-medium text-emerald-950/70">
										We couldn&rsquo;t reach the server. Your saved list is safe,
										so try again in a moment.
									</p>
								</div>
								<button
									type="button"
									onClick={fetchBookmarks}
									className={`cursor-pointer rounded-md bg-emerald-800 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 ${focusRing}`}
								>
									Try again
								</button>
							</div>
						)}

						{/* Empty: nothing saved yet */}
						{!loading && !error && savedItems.length === 0 && (
							<div className="mx-auto my-6 max-w-2xl text-center">
								<div className="flex items-end justify-center gap-4 px-6">
									<GhostCard className="hidden h-36 w-28 sm:flex" />
									<BoardCurator size={150} />
									<GhostCard className="hidden h-28 w-28 sm:flex" />
								</div>
								<ShelfRail />

								<h3 className="mt-10 font-georgia text-3xl leading-tight sm:text-4xl">
									Nothing on the shelf yet
								</h3>
								<p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-emerald-950/75">
									Save the schemes you qualify for. Their deadlines land on the
									ruler above, and their rules and documents stay one tap away.
								</p>

								<p className="mt-6 text-sm font-semibold">
									Popular places to start
								</p>
								<div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold">
									{[
										{ label: "AICTE Pragati", query: "Pragati" },
										{ label: "Central Sector CSSS", query: "CSSS" },
										{ label: "Post-Matric", query: "Post-Matric" },
										{ label: "STEM grants", query: "STEM" },
									].map((item) => (
										<Link
											key={item.label}
											to={`/scholarships?search=${encodeURIComponent(item.query)}`}
											className={`underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950 ${focusRing}`}
										>
											{item.label}
										</Link>
									))}
								</div>

								<Link
									to="/scholarships"
									className={`mt-8 inline-flex items-center gap-2 rounded-md bg-emerald-800 px-7 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 active:translate-y-px ${focusRing}`}
								>
									<Compass size={16} /> Explore verified scholarships
								</Link>
							</div>
						)}

						{/* Empty: filters matched nothing */}
						{!loading &&
							!error &&
							savedItems.length > 0 &&
							sortedItems.length === 0 && (
								<div className="mx-auto my-8 max-w-md rounded-lg border-[1.5px] border-emerald-950 bg-white p-7 text-center">
									<div className="mb-3 flex justify-center">
										<ConfusedDetective size={72} />
									</div>
									<h3 className="font-georgia text-2xl">
										No saved schemes match
									</h3>
									<p className="mt-1.5 text-sm font-medium text-emerald-950/70">
										Try different search words or another category.
									</p>
									<button
										type="button"
										onClick={() => {
											setSearchQuery("");
											setSelectedCategory("All");
										}}
										className={`mt-4 cursor-pointer rounded-md border-[1.5px] border-emerald-950 bg-yellow-200 px-4 py-2 text-sm font-semibold transition hover:bg-yellow-300 ${focusRing}`}
									>
										Clear filters
									</button>
								</div>
							)}

						{/* Shelves or plain list */}
						{!loading &&
							!error &&
							sortedItems.length > 0 &&
							(showShelf ? (
								<div className="space-y-16">
									{shelves
										.filter((sh) => sh.items.length > 0)
										.map((sh) => (
											<section key={sh.id} aria-labelledby={`shelf-${sh.id}`}>
												<div className="mb-5 flex flex-wrap items-end gap-x-5 gap-y-2">
													<h2
														id={`shelf-${sh.id}`}
														className={`inline-flex items-baseline gap-3 border-[1.5px] border-emerald-950 px-4 py-1.5 font-georgia text-2xl shadow-[3px_3px_0_#022c22] ${sh.plate} ${sh.tilt}`}
													>
														{sh.title}
														<span className="font-sans text-sm font-bold text-emerald-950/60">
															{sh.items.length}
														</span>
													</h2>
													<p className="pb-1 text-sm text-emerald-950/65">
														{sh.note}
													</p>
												</div>

												<div className="sk-shelf md:grid md:grid-cols-2 md:gap-5 xl:grid-cols-3">
													{sh.items.map(renderCard)}
												</div>
												<div className="mt-1">
													<ShelfRail />
												</div>
											</section>
										))}
								</div>
							) : (
								<div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
									{sortedItems.map(renderCard)}
								</div>
							))}
					</>
				)}
			</section>

			{/* Details drawer */}
			{isDrawerOpen &&
				selectedScholarship &&
				createPortal(
					<div
						className="fixed inset-0 z-50 overflow-hidden"
						role="dialog"
						aria-modal="true"
						aria-labelledby="saved-drawer-title"
					>
						<div
							className="animate-fade-in fixed inset-0 bg-emerald-950/45 backdrop-blur-[2px]"
							onClick={closeDrawer}
							aria-hidden="true"
						/>

						<div
							className="animate-slide-in-right fixed inset-y-0 right-0 z-50 flex h-screen max-h-screen flex-col border-l-[1.5px] border-emerald-950 bg-white text-emerald-950"
							style={{ width: "min(580px, 100vw)" }}
						>
							{(() => {
								const drawerTheme = getCategoryTheme(
									selectedScholarship.category,
								);
								return (
									<div
										className="relative shrink-0 overflow-hidden border-b-[1.5px] border-emerald-950 px-6 py-5"
										style={{ background: drawerTheme.colors.headerBg }}
									>
										<div className="pointer-events-none absolute -bottom-4 -right-4 rotate-12 scale-150 opacity-15">
											<CategoryMotifIcon
												category={selectedScholarship.category}
												size={96}
											/>
										</div>

										<div className="relative z-10 flex items-start justify-between gap-4">
											<div className="min-w-0 flex-1">
												<div className="mb-2 flex flex-wrap items-center gap-2">
													<span
														className="inline-flex items-center gap-1.5 rounded-md border-[1.5px] px-2.5 py-0.5 text-xs font-bold"
														style={{
															borderColor: drawerTheme.colors.border,
															backgroundColor: "white",
															color: drawerTheme.colors.text,
														}}
													>
														<CategoryMotifIcon
															category={selectedScholarship.category}
															size={15}
														/>
														<span>
															{selectedScholarship.category || "Scholarship"}
														</span>
													</span>

													<span className="inline-flex items-center gap-1 rounded-md border border-emerald-950/20 bg-white/80 px-2 py-0.5 text-xs font-bold text-emerald-800">
														<ShieldCheck size={13} />
														Verified scheme
													</span>
												</div>

												<h2
													id="saved-drawer-title"
													className="font-georgia text-3xl leading-tight"
												>
													{selectedScholarship.title}
												</h2>

												<div className="mt-2.5 flex flex-wrap items-center gap-3">
													<p className="text-sm font-medium text-emerald-950/65">
														{selectedScholarship.organization}
													</p>
													<DeadlineChip
														deadline={selectedScholarship.deadline}
													/>
												</div>
											</div>

											<div className="flex shrink-0 items-center gap-2">
												<AddToCalendarButton
													scholarship={selectedScholarship}
													variant="mini"
												/>
												<button
													type="button"
													onClick={() => {
														handleRemoveBookmark(selectedScholarship);
														closeDrawer();
													}}
													title="Remove from saved"
													aria-label="Remove from saved"
													className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border-[1.5px] border-emerald-950 bg-white text-emerald-800 transition hover:bg-rose-50 hover:text-rose-700 ${focusRing}`}
												>
													<BookmarkCheck size={17} />
												</button>
												<button
													type="button"
													onClick={closeDrawer}
													aria-label="Close details"
													className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border-[1.5px] border-emerald-950 bg-white transition hover:bg-yellow-200 ${focusRing}`}
												>
													<X size={17} />
												</button>
											</div>
										</div>
									</div>
								);
							})()}

							<div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6 text-sm sm:px-8">
								{selectedScholarship.latestChangeSummary && (
									<div className="rounded-md border-[1.5px] border-emerald-950/15 bg-yellow-200 p-4">
										<p className="flex items-center gap-1.5 text-xs font-bold">
											<History size={13} />
											Rules or dates for this scheme were recently updated
										</p>
									</div>
								)}

								{/* What you get */}
								{selectedScholarship.amount && (
									<div className="rounded-sm border-[1.5px] border-emerald-950 bg-white p-5 shadow-[3px_3px_0_#022c22]">
										<p className="text-sm font-semibold text-emerald-950/65">
											What you get
										</p>
										<p className="mt-1 font-georgia text-4xl leading-tight">
											{grant?.main ? (
												<Highlight>{`\u20B9${grant.main}`}</Highlight>
											) : (
												<span className="text-2xl">
													Set out in the circular
												</span>
											)}
											{grant?.period && (
												<span className="ml-2 font-sans text-sm font-semibold text-emerald-950/60">
													{grant.period}
												</span>
											)}
										</p>
										<p className="mt-2 text-xs text-emerald-950/60">
											Check the official circular for how and when it is paid.
										</p>
									</div>
								)}

								{selectedScholarship.summary && (
									<DrawerSection title="Overview">
										<p className="text-[15px] leading-relaxed text-emerald-950/80">
											{selectedScholarship.summary}
										</p>
									</DrawerSection>
								)}

								<PreFlightChecklist scholarship={selectedScholarship} />
							</div>

							<div className="flex shrink-0 flex-wrap items-center gap-3 border-t-[1.5px] border-emerald-950 bg-emerald-50 px-6 py-4">
								{selectedScholarship.applicationLink && (
									<a
										href={cleanOfficialUrl(selectedScholarship.applicationLink)}
										target="_blank"
										rel="noopener noreferrer"
										className={`group inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 ${focusRing}`}
									>
										<span>Apply on official site</span>
										<ArrowUpRight
											size={15}
											className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
										/>
									</a>
								)}
								<AddToCalendarButton
									scholarship={selectedScholarship}
									variant="pill"
								/>
								<button
									type="button"
									onClick={() => {
										setIsDrawerOpen(false);
										setIsEvidenceModalOpen(true);
									}}
									className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border-[1.5px] border-emerald-950 bg-white px-5 py-2.5 text-sm font-semibold transition hover:bg-emerald-100 ${focusRing}`}
								>
									<FileText size={15} />
									<span>Full rules</span>
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)}

			<EvidenceModal
				isOpen={isEvidenceModalOpen}
				onClose={() => setIsEvidenceModalOpen(false)}
				scholarship={selectedScholarship}
			/>

			<AuthPromptModal
				isOpen={authPromptOpen}
				onClose={() => setAuthPromptOpen(false)}
			/>
		</div>
	);
}
