import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import {
	Search,
	X,
	ShieldCheck,
	History,
	FileText,
	ExternalLink,
	RotateCcw,
	ArrowUpRight,
	Check,
	ChevronDown,
	SlidersHorizontal,
} from "lucide-react";
import {
	getScholarships,
	getScholarshipSuggestions,
	getBookmarks,
	toggleBookmark as apiToggleBookmark,
} from "../services/scholarshipService";
import EvidenceModal from "../components/EvidenceModal";
import AuthPromptModal from "../components/AuthPromptModal";
import {
	emitBookmarkChanged,
	onBookmarkChanged,
	setPendingBookmark,
} from "../utils/bookmarkSync";
import { formatGrant } from "../utils/formatGrant";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import {
	formatClauseTitle,
	formatEvidenceText,
	formatSourceLabel,
	formatChangeNotice,
	formatFieldLabel,
	formatRuleRequirement,
	cleanOfficialUrl,
	isGenuinePdf,
} from "../utils/formatEvidence";
import { PageStyles } from "../components/PageKit";
import { CountUp } from "../components/MotionKit";
import {
	ScholarshipCard,
	SaveButton,
	CardSkeleton,
} from "../components/ScholarshipKit";
import {
	CategoryMotifIcon,
	ScholarshipsHeroCluster,
	getCategoryTheme,
} from "../components/CategoryMotif";
import {
	ConfusedDetective,
	CablesDoctor,
} from "../components/AnimatedIllustrations";

const CATEGORIES = [
	"All",
	"Government",
	"Merit based",
	"Need based",
	"Women",
	"SC / ST / OBC",
	"Minority",
	"STEM",
];

const LEVELS = ["All", "UG", "PG", "PhD", "Class 10", "Class 12"];

const STATES = [
	"All India",
	"UP",
	"Bihar",
	"Maharashtra",
	"Karnataka",
	"West Bengal",
	"Delhi",
	"Tamil Nadu",
];

const SOURCES = [
	"All",
	"Government",
	"Institution",
	"NGO / Trust",
	"Corporate CSR",
];

const SORTS = [
	{ label: "Closing soonest", value: "deadline" },
	{ label: "Highest grant", value: "amount_high" },
	{ label: "Most trusted source", value: "trust" },
	{ label: "Recently added", value: "newest" },
];

// Quick entry points under the search field. Keep these to real, common queries.
const QUICK_SEARCHES = ["Post matric", "Girls UG", "Merit", "PhD fellowship"];

const CATALOG_ID = "catalog";

// Height of your fixed site header. Sticky sidebar + scroll anchors read from this.
const HEADER_OFFSET = "lg:top-24";

function daysUntil(deadline) {
	if (!deadline) return null;
	return Math.max(
		0,
		Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24)),
	);
}

function deadlineMeta(deadline) {
	const days = daysUntil(deadline);
	if (days === null) return { text: "No fixed date", tone: "quiet" };
	if (days === 0) return { text: "Closes today", tone: "urgent" };
	if (days <= 10)
		return { text: `${days} day${days === 1 ? "" : "s"} left`, tone: "urgent" };
	if (days <= 30) return { text: `${days} days left`, tone: "soon" };
	return { text: `${days} days left`, tone: "quiet" };
}

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

function FilterGroup({
	label,
	options,
	selected = [],
	defaultOption = "All",
	onChange,
}) {
	const isDefaultActive = selected.length === 0;

	return (
		<div>
			<p className="mb-2.5 text-sm font-bold text-emerald-950">{label}</p>
			<div className="flex flex-wrap gap-1.5">
				{options.map((o) => {
					const isSelected =
						o === defaultOption ? isDefaultActive : selected.includes(o);
					return (
						<button
							key={o}
							type="button"
							onClick={() => onChange(o)}
							aria-pressed={isSelected}
							className={`sk-chip inline-flex min-h-[38px] cursor-pointer items-center gap-1 rounded-full border-[1.5px] px-3.5 py-1 text-[13px] font-semibold ${focusRing} ${
								isSelected
									? "border-emerald-950 bg-emerald-950 text-white"
									: "border-emerald-950/20 bg-white text-emerald-950/80 hover:border-emerald-950 hover:text-emerald-950"
							}`}
						>
							{isSelected && o !== defaultOption && (
								<Check size={11} strokeWidth={3.5} className="sk-pop" />
							)}
							{o}
						</button>
					);
				})}
			</div>
		</div>
	);
}

function DeadlineChip({ deadline }) {
	const { text, tone } = deadlineMeta(deadline);
	const tones = {
		urgent: "border-rose-300 bg-rose-50 text-rose-800",
		soon: "border-emerald-950/20 bg-yellow-200 text-emerald-950",
		quiet: "border-emerald-950/15 bg-emerald-50 text-emerald-950/70",
	};
	return (
		<span
			className={`inline-flex shrink-0 items-center rounded-full border-[1.5px] px-2.5 py-1 text-xs font-bold ${tones[tone]}`}
		>
			{text}
		</span>
	);
}

function ActiveFilter({ children, onRemove, label }) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950/25 bg-white py-1 pl-3 pr-1 text-[13px] font-semibold">
			{children}
			<button
				type="button"
				onClick={onRemove}
				aria-label={label}
				className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded-full hover:bg-emerald-100 ${focusRing}`}
			>
				<X size={12} strokeWidth={3} />
			</button>
		</span>
	);
}

function DrawerSection({ title, aside, children }) {
	return (
		<section className="border-t-[1.5px] border-dashed border-emerald-950/20 pt-6 first:border-t-0 first:pt-0">
			<div className="mb-3 flex items-baseline justify-between gap-3">
				<h4 className="ud-display text-lg font-bold text-emerald-950">
					{title}
				</h4>
				{aside}
			</div>
			{children}
		</section>
	);
}

export default function Scholarships() {
	const [searchParams, setSearchParams] = useSearchParams();
	const { user } = useAuth();
	const navigate = useNavigate();

	const [authPrompt, setAuthPrompt] = useState({
		isOpen: false,
		scholarship: null,
	});
	const [savingSet, setSavingSet] = useState(new Set());

	const parseList = (key) => {
		const raw = searchParams.get(key);
		return raw
			? raw
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean)
			: [];
	};

	const selectedCats = parseList("category");
	const selectedLevels = parseList("level");
	const selectedStates = parseList("state");
	const selectedSources = parseList("sourceType");

	const sort = searchParams.get("sort") || "deadline";
	const hasChangesOnly = searchParams.get("hasChanges") === "true";
	const status = searchParams.get("status") || "active";

	const [search, setSearch] = useState(() => searchParams.get("search") || "");

	const [scholarships, setScholarships] = useState([]);
	const [recentUpdatesCount, setRecentUpdatesCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [suggestions, setSuggestions] = useState([]);
	const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
	const searchContainerRef = useRef(null);

	const [saved, setSaved] = useState(new Set());
	const [selectedScholarship, setSelectedScholarship] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
	const [filtersOpen, setFiltersOpen] = useState(false);

	useEffect(() => {
		const qSearch = searchParams.get("search") || "";
		if (qSearch !== search) setSearch(qSearch);
	}, [searchParams]);

	const updateMultiParam = (key, option, defaultOption) => {
		const currentParam = searchParams.get(key);
		const currentList = currentParam
			? currentParam
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean)
			: [];
		const next = new URLSearchParams(searchParams);

		if (option === defaultOption) {
			next.delete(key);
		} else {
			const updatedList = currentList.includes(option)
				? currentList.filter((item) => item !== option)
				: [...currentList, option];

			if (updatedList.length === 0) next.delete(key);
			else next.set(key, updatedList.join(","));
		}
		setSearchParams(next, { replace: true });
	};

	const updateParam = (key, value, defaultValue) => {
		const next = new URLSearchParams(searchParams);
		if (!value || value === defaultValue) next.delete(key);
		else next.set(key, value);
		setSearchParams(next, { replace: true });
	};

	const toggleCat = (val) => updateMultiParam("category", val, "All");
	const toggleLevel = (val) => updateMultiParam("level", val, "All");
	const toggleState = (val) => updateMultiParam("state", val, "All India");
	const toggleSource = (val) => updateMultiParam("sourceType", val, "All");
	const setSort = (val) => updateParam("sort", val, "deadline");
	const setHasChangesOnly = (val) =>
		updateParam("hasChanges", val ? "true" : "", "");
	const setStatus = (val) => updateParam("status", val, "active");

	useEffect(() => {
		const timer = setTimeout(() => {
			const currentSearchInUrl = searchParams.get("search") || "";
			const trimmed = search.trim();
			if (trimmed !== currentSearchInUrl) {
				const next = new URLSearchParams(searchParams);
				if (trimmed) next.set("search", trimmed);
				else next.delete("search");
				setSearchParams(next, { replace: true });
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [search]);

	useEffect(() => {
		if (!search || search.trim().length < 2) {
			setSuggestions([]);
			setIsSuggestionsOpen(false);
			return;
		}

		const timer = setTimeout(async () => {
			try {
				const res = await getScholarshipSuggestions(search);
				if (res.success && Array.isArray(res.data)) {
					setSuggestions(res.data);
					setIsSuggestionsOpen(res.data.length > 0);
				}
			} catch {
				setSuggestions([]);
			}
		}, 180);

		return () => clearTimeout(timer);
	}, [search]);

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (
				searchContainerRef.current &&
				!searchContainerRef.current.contains(e.target)
			) {
				setIsSuggestionsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const scrollToCatalog = () => {
		setIsSuggestionsOpen(false);
		document
			.getElementById(CATALOG_ID)
			?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	const fetchLiveScholarships = async () => {
		try {
			setLoading(true);
			setError(null);
			const params = {
				search: (searchParams.get("search") || "").trim() || undefined,
				category: selectedCats.length > 0 ? selectedCats.join(",") : undefined,
				level: selectedLevels.length > 0 ? selectedLevels.join(",") : undefined,
				state: selectedStates.length > 0 ? selectedStates.join(",") : undefined,
				sourceType:
					selectedSources.length > 0 ? selectedSources.join(",") : undefined,
				hasChanges: hasChangesOnly ? "true" : undefined,
				status,
				sort,
				limit: 50,
			};
			const res = await getScholarships(params);
			if (res.success) {
				setScholarships(res.data || []);
				if (typeof res.recentUpdatesCount === "number") {
					setRecentUpdatesCount(res.recentUpdatesCount);
				}
			} else {
				setError("We could not load scholarships just now.");
			}
		} catch (err) {
			console.error("API error:", err);
			setError("The scholarship service did not respond.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const timer = setTimeout(() => {
			fetchLiveScholarships();
		}, 80);
		return () => clearTimeout(timer);
	}, [searchParams]);

	const openDetails = (s) => {
		setSelectedScholarship(s);
		setIsModalOpen(true);
	};

	const closeDrawer = () => {
		setIsModalOpen(false);
		setSelectedScholarship(null);
	};

	useEffect(() => {
		if (!isModalOpen) return;
		const handleKeyDown = (e) => {
			if (e.key === "Escape") closeDrawer();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isModalOpen]);

	// Lock for both surfaces, otherwise the page scrolls behind the evidence modal.
	useBodyScrollLock(isModalOpen || isEvidenceModalOpen || filtersOpen);

	useEffect(() => {
		if (!filtersOpen) return;
		const onKey = (e) => e.key === "Escape" && setFiltersOpen(false);
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [filtersOpen]);

	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!user || !token) {
			setSaved(new Set());
			return;
		}
		getBookmarks()
			.then((res) => {
				if (res && res.success && Array.isArray(res.data)) {
					setSaved(new Set(res.data.map((s) => s._id || s.id)));
				}
			})
			.catch(() => {});
	}, [user]);

	useEffect(() => {
		const unsubscribe = onBookmarkChanged(({ scholarshipId, isBookmarked }) => {
			setSaved((prev) => {
				const next = new Set(prev);
				if (isBookmarked) next.add(scholarshipId);
				else next.delete(scholarshipId);
				return next;
			});
		});
		return unsubscribe;
	}, []);

	const toggleSave = async (id, targetScholarship = null) => {
		const token = localStorage.getItem("token");
		const scholarshipObj =
			targetScholarship ||
			scholarships.find((s) => (s._id || s.id) === id) ||
			selectedScholarship;

		// 1. Guard for logged-out users: do NOT silently fail, prompt intentionally
		if (!user || !token) {
			setPendingBookmark(id);
			setAuthPrompt({
				isOpen: true,
				scholarship: scholarshipObj,
			});
			toast.info("Log in to save scholarships and access them later.", {
				action: {
					label: "Log In",
					onClick: () => {
						const currentPath = encodeURIComponent(
							window.location.pathname + window.location.search,
						);
						navigate(`/login?redirect=${currentPath}`);
					},
				},
			});
			return;
		}

		// 2. Prevent concurrent / duplicate spamming
		if (savingSet.has(id)) return;
		setSavingSet((prev) => new Set(prev).add(id));

		const wasSaved = saved.has(id);
		const willBeSaved = !wasSaved;

		// Optimistic update
		setSaved((prev) => {
			const next = new Set(prev);
			willBeSaved ? next.add(id) : next.delete(id);
			return next;
		});

		try {
			const res = await apiToggleBookmark(id);
			const finalState = res.bookmarked ?? willBeSaved;
			emitBookmarkChanged(id, finalState);
			if (finalState) {
				toast.success("Scholarship bookmarked! Deadline reminders queued.");
			} else {
				toast.success("Removed scholarship from bookmarks.");
			}
		} catch (err) {
			// Rollback optimistic state
			setSaved((prev) => {
				const next = new Set(prev);
				wasSaved ? next.add(id) : next.delete(id);
				return next;
			});

			if (err.response?.status === 401) {
				setPendingBookmark(id);
				setAuthPrompt({ isOpen: true, scholarship: scholarshipObj });
				toast.error(
					"Your session expired. Please sign in to save scholarships.",
				);
			} else {
				toast.error("Could not update bookmark. Please try again.");
			}
		} finally {
			setSavingSet((prev) => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
		}
	};

	const clearAll = () => {
		const next = new URLSearchParams(searchParams);
		[
			"category",
			"level",
			"state",
			"sourceType",
			"search",
			"hasChanges",
			"sort",
		].forEach((k) => next.delete(k));
		setSearch("");
		setIsSuggestionsOpen(false);
		setSearchParams(next, { replace: true });
	};

	const activeCount =
		selectedCats.length +
		selectedLevels.length +
		selectedStates.length +
		selectedSources.length +
		(hasChangesOnly ? 1 : 0) +
		(status !== "active" ? 1 : 0);
	const hasAnyFilter = activeCount > 0 || !!search;

	return (
		<div className="ud-root min-h-screen bg-[#E9F0EA] pb-24 font-sans text-emerald-950">
			<PageStyles />

			{/* ---------- Hero ---------- */}
			<section className="mx-auto max-w-7xl px-5 pb-12 pt-12 sm:px-8 md:pb-16 md:pt-16">
				<div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.75fr)] lg:gap-16">
					<div>
						<h1 className="font-georgia text-[2.75rem] font-medium leading-[1.02] sm:text-6xl">
							Scholarships hiding in plain sight? Not anymore.
						</h1>
						<p className="mt-5 max-w-[52ch] text-base leading-relaxed text-emerald-950/70 sm:text-lg">
							Government, state, university and trust schemes. Every deadline is
							checked against the official notice, and the clauses that decide
							who qualifies sit right on the card.
						</p>

						<div className="mt-8" ref={searchContainerRef}>
							<div className="relative">
								<form
									onSubmit={(e) => {
										e.preventDefault();
										scrollToCatalog();
									}}
									className="flex items-center gap-2 rounded-2xl border-[1.5px] border-emerald-950 bg-white p-2 pl-4 focus-within:ring-4 focus-within:ring-yellow-200"
								>
									<Search size={20} className="shrink-0 text-emerald-950/50" />
									<input
										type="text"
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										onFocus={() => {
											if (suggestions.length > 0) setIsSuggestionsOpen(true);
										}}
										placeholder="Search a scheme, degree or authority"
										aria-label="Search scholarships"
										className="min-w-0 flex-1 bg-transparent py-2 text-base placeholder:text-emerald-950/35 focus:outline-none"
									/>
									{search && (
										<button
											type="button"
											onClick={() => {
												setSearch("");
												setIsSuggestionsOpen(false);
											}}
											aria-label="Clear search"
											className={`cursor-pointer rounded-full p-2 text-emerald-950/50 hover:bg-emerald-50 ${focusRing}`}
										>
											<X size={16} />
										</button>
									)}
									<button
										type="submit"
										className={`hidden shrink-0 cursor-pointer rounded-xl bg-emerald-800 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 active:translate-y-px sm:block ${focusRing}`}
									>
										Search
									</button>
								</form>

								{isSuggestionsOpen && suggestions.length > 0 && (
									<div className="ud-fade-in absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white">
										<div className="max-h-72 overflow-y-auto">
											{suggestions.map((item) => (
												<button
													key={item.slug || item._id}
													type="button"
													onClick={() => {
														setSearch(item.title);
														setIsSuggestionsOpen(false);
													}}
													className="block w-full cursor-pointer border-b border-dashed border-emerald-950/20 px-5 py-3 text-left last:border-b-0 hover:bg-emerald-50"
												>
													<p className="truncate text-sm font-bold">
														{item.title}
													</p>
													<p className="mt-0.5 truncate text-xs text-emerald-950/55">
														{item.organization} · {item.category}
													</p>
												</button>
											))}
										</div>
										<button
											type="button"
											onClick={scrollToCatalog}
											className="block w-full cursor-pointer bg-emerald-50 px-5 py-2.5 text-left text-sm font-bold text-emerald-800 hover:bg-emerald-100"
										>
											See all results for “{search}”
										</button>
									</div>
								)}
							</div>

							<div className="mt-3 flex flex-wrap items-center gap-2">
								<span className="text-sm text-emerald-950/55">Try</span>
								{QUICK_SEARCHES.map((q) => (
									<button
										key={q}
										type="button"
										onClick={() => {
											setSearch(q);
											scrollToCatalog();
										}}
										className={`cursor-pointer rounded-full border-[1.5px] border-emerald-950/20 bg-white/70 px-3 py-1 text-[13px] font-semibold text-emerald-950/80 transition-colors hover:border-emerald-950 hover:text-emerald-950 ${focusRing}`}
									>
										{q}
									</button>
								))}
							</div>
						</div>
					</div>

					<div className="order-first lg:order-none flex justify-center py-4 lg:py-0">
						<ScholarshipsHeroCluster />
					</div>
				</div>
			</section>

			{/* ---------- Catalog ---------- */}
			<div
				id={CATALOG_ID}
				className="mx-auto max-w-7xl scroll-mt-24 border-t-[1.5px] border-emerald-950/15 px-5 pt-10 sm:px-8"
			>
				<div className="flex flex-col items-start gap-8 lg:flex-row lg:gap-10">
					<aside
						className={`sticky top-16 ${filtersOpen ? "z-[70]" : "z-30"} w-full shrink-0 bg-[#E9F0EA] py-2 lg:w-72 lg:self-start lg:bg-transparent lg:py-0 ${HEADER_OFFSET}`}
					>
						<div className="flex items-center gap-2 lg:hidden">
							<button
								type="button"
								onClick={() => setFiltersOpen(true)}
								aria-expanded={filtersOpen}
								aria-controls="filter-panel"
								className={`sk-chip inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-emerald-950 bg-white px-4 text-sm font-bold shadow-[0_3px_0_0_#022c22] ${focusRing}`}
							>
								<SlidersHorizontal size={16} />
								Filters
								{activeCount > 0 && (
									<span className="sk-pop rounded-full bg-emerald-950 px-2 py-0.5 text-xs text-white">
										{activeCount}
									</span>
								)}
							</button>
							<div className="no-scrollbar -mr-5 flex gap-2 overflow-x-auto py-1 pr-5">
								{CATEGORIES.slice(1).map((c) => {
									const on = selectedCats.includes(c);
									return (
										<button
											key={c}
											type="button"
											onClick={() => toggleCat(c)}
											aria-pressed={on}
											className={`sk-chip inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3 text-[13px] font-semibold ${focusRing} ${
												on
													? "border-emerald-950 bg-emerald-950 text-white"
													: "border-emerald-950/20 bg-white text-emerald-950/80"
											}`}
										>
											<CategoryMotifIcon category={c} size={16} />
											{c}
										</button>
									);
								})}
							</div>
						</div>

						{filtersOpen && (
							<div
								className="animate-fade-in fixed inset-0 z-[60] bg-emerald-950/40 lg:hidden"
								onClick={() => setFiltersOpen(false)}
								aria-hidden
							/>
						)}
						<div
							id="filter-panel"
							role={filtersOpen ? "dialog" : undefined}
							aria-modal={filtersOpen ? "true" : undefined}
							aria-label="Filters"
							className={`${filtersOpen ? "sk-sheet fixed inset-x-0 bottom-0 z-[61] flex max-h-[85vh] flex-col rounded-t-3xl" : "hidden"} border-[1.5px] border-emerald-950 bg-white lg:static lg:z-auto lg:block lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:rounded-2xl lg:[animation:none]`}
						>
							<span
								aria-hidden
								className="mx-auto mt-2 block h-1.5 w-12 shrink-0 rounded-full bg-emerald-950/20 lg:hidden"
							/>
							<div className="sticky top-0 z-10 flex items-center justify-between border-b-[1.5px] border-emerald-950 bg-emerald-50 px-5 py-3.5">
								<span className="ud-display text-lg font-bold">Filters</span>
								{activeCount > 0 && (
									<button
										type="button"
										onClick={clearAll}
										className={`inline-flex cursor-pointer items-center gap-1 rounded-sm text-sm font-bold text-emerald-950/70 underline decoration-yellow-300 decoration-2 underline-offset-4 hover:text-emerald-950 ${focusRing}`}
									>
										<RotateCcw size={12} />
										Reset
									</button>
								)}
							</div>

							<div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 lg:overflow-visible">
								<button
									type="button"
									role="switch"
									aria-checked={hasChangesOnly}
									onClick={() => setHasChangesOnly(!hasChangesOnly)}
									className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border-[1.5px] p-3.5 text-left transition-colors ${focusRing} ${
										hasChangesOnly
											? "border-emerald-950 bg-yellow-200"
											: "border-emerald-950/20 bg-white hover:border-emerald-950"
									}`}
								>
									<span className="min-w-0 flex-1">
										<span className="block text-sm font-bold">
											Recently updated
											{recentUpdatesCount > 0 && (
												<span className="ml-1.5 font-semibold text-emerald-950/55">
													{recentUpdatesCount}
												</span>
											)}
										</span>
										<span className="mt-0.5 block text-xs leading-snug text-emerald-950/65">
											Rules, dates or amounts changed lately
										</span>
									</span>
									<span
										aria-hidden
										className={`relative h-6 w-10 shrink-0 rounded-full border-[1.5px] border-emerald-950 transition-colors ${
											hasChangesOnly ? "bg-emerald-950" : "bg-white"
										}`}
									>
										<span
											className={`absolute top-[3px] h-4 w-4 rounded-full border-[1.5px] border-emerald-950 transition-all ${
												hasChangesOnly
													? "left-[19px] bg-yellow-200"
													: "left-[3px] bg-emerald-100"
											}`}
										/>
									</span>
								</button>

								<FilterGroup
									label="Application status"
									options={["Active only", "All schemes", "Closed only"]}
									selected={
										status === "all"
											? ["All schemes"]
											: status === "closed"
												? ["Closed only"]
												: ["Active only"]
									}
									defaultOption="Active only"
									onChange={(val) => {
										if (val === "All schemes") setStatus("all");
										else if (val === "Closed only") setStatus("closed");
										else setStatus("active");
									}}
								/>

								<FilterGroup
									label="Category"
									options={CATEGORIES}
									selected={selectedCats}
									defaultOption="All"
									onChange={toggleCat}
								/>
								<FilterGroup
									label="Education level"
									options={LEVELS}
									selected={selectedLevels}
									defaultOption="All"
									onChange={toggleLevel}
								/>
								<FilterGroup
									label="Home state"
									options={STATES}
									selected={selectedStates}
									defaultOption="All India"
									onChange={toggleState}
								/>
								<FilterGroup
									label="Source"
									options={SOURCES}
									selected={selectedSources}
									defaultOption="All"
									onChange={toggleSource}
								/>
							</div>
							<div className="sticky bottom-0 flex shrink-0 gap-2 border-t-[1.5px] border-emerald-950 bg-white p-4 lg:hidden">
								<button
									type="button"
									onClick={clearAll}
									className={`min-h-[48px] cursor-pointer rounded-full border-[1.5px] border-emerald-950 px-5 text-sm font-bold ${focusRing}`}
								>
									Reset
								</button>
								<button
									type="button"
									onClick={() => {
										setFiltersOpen(false);
										scrollToCatalog();
									}}
									className={`min-h-[48px] flex-1 cursor-pointer rounded-full bg-emerald-800 px-5 text-sm font-bold text-white ${focusRing}`}
								>
									{loading
										? "Updating…"
										: `Show ${scholarships.length} ${scholarships.length === 1 ? "scheme" : "schemes"}`}
								</button>
							</div>
						</div>
					</aside>

					<main className="w-full min-w-0 flex-1">
						<div className="flex flex-wrap items-center justify-between gap-4">
							<p className="text-base font-bold" aria-live="polite">
								{loading ? (
									"Loading schemes"
								) : (
									<>
										<span className="ud-display text-2xl font-extrabold">
											<CountUp value={scholarships.length} duration={500} />
										</span>{" "}
										{scholarships.length === 1 ? "scheme" : "schemes"}
									</>
								)}
								<span className="ml-2 font-medium text-emerald-950/55">
									{hasAnyFilter
										? "matching your filters"
										: "we currently track"}
								</span>
							</p>

							<label className="flex items-center gap-2 text-sm font-semibold">
								<span className="text-emerald-950/55">Sort</span>
								<span className="relative">
									<select
										value={sort}
										onChange={(e) => setSort(e.target.value)}
										className={`cursor-pointer appearance-none rounded-lg border-[1.5px] border-emerald-950/25 bg-white py-2 pl-3 pr-9 text-sm font-semibold text-emerald-950 transition-colors hover:border-emerald-950 focus:border-emerald-950 ${focusRing}`}
									>
										{SORTS.map((s) => (
											<option key={s.value} value={s.value}>
												{s.label}
											</option>
										))}
									</select>
									<ChevronDown
										size={15}
										aria-hidden
										className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-950/60"
									/>
								</span>
							</label>
						</div>

						{hasAnyFilter && (
							<div className="mt-4 flex flex-wrap items-center gap-2 border-t-[1.5px] border-dashed border-emerald-950/20 pt-4">
								{search && (
									<ActiveFilter
										onRemove={() => setSearch("")}
										label="Remove search"
									>
										“{search}”
									</ActiveFilter>
								)}
								{selectedCats.map((c) => (
									<ActiveFilter
										key={`c-${c}`}
										onRemove={() => toggleCat(c)}
										label={`Remove ${c}`}
									>
										{c}
									</ActiveFilter>
								))}
								{selectedLevels.map((l) => (
									<ActiveFilter
										key={`l-${l}`}
										onRemove={() => toggleLevel(l)}
										label={`Remove ${l}`}
									>
										{l}
									</ActiveFilter>
								))}
								{selectedStates.map((st) => (
									<ActiveFilter
										key={`s-${st}`}
										onRemove={() => toggleState(st)}
										label={`Remove ${st}`}
									>
										{st}
									</ActiveFilter>
								))}
								{selectedSources.map((src) => (
									<ActiveFilter
										key={`o-${src}`}
										onRemove={() => toggleSource(src)}
										label={`Remove ${src}`}
									>
										{src}
									</ActiveFilter>
								))}
								{hasChangesOnly && (
									<ActiveFilter
										onRemove={() => setHasChangesOnly(false)}
										label="Remove recently updated"
									>
										Recently updated
									</ActiveFilter>
								)}
								{status !== "active" && (
									<ActiveFilter
										onRemove={() => setStatus("active")}
										label="Reset application status"
									>
										Status: {status === "all" ? "All schemes" : "Closed only"}
									</ActiveFilter>
								)}
								<button
									type="button"
									onClick={clearAll}
									className={`ml-1 cursor-pointer rounded-sm text-sm font-bold underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950 ${focusRing}`}
								>
									Clear all
								</button>
							</div>
						)}

						<div className="mt-6">
							{loading ? (
								<div
									className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
									role="status"
									aria-label="Loading scholarships"
								>
									{[1, 2, 3, 4, 5, 6].map((i) => (
										<CardSkeleton key={i} />
									))}
								</div>
							) : error ? (
								<div className="flex flex-col sm:flex-row items-center gap-6 rounded-3xl border-[1.5px] border-rose-300 bg-white p-7 sm:p-9 shadow-[3px_3px_0px_0px_rgba(225,29,72,0.15)]">
									<div className="shrink-0 flex items-center justify-center p-3 rounded-2xl bg-rose-50 border-[1.5px] border-rose-200">
										<CablesDoctor size={78} />
									</div>
									<div className="flex-1 text-center sm:text-left space-y-2">
										<h3 className="ud-display text-2xl font-bold text-emerald-950">
											{error || "Loose connection to scholarship notice stream"}
										</h3>
										<p className="max-w-[48ch] text-[15px] text-emerald-950/70 font-medium leading-relaxed">
											The scholarship service couldn't be reached right now.
											Your selected filters and search query are safely
											preserved!
										</p>
										<div className="pt-2">
											<button
												type="button"
												onClick={fetchLiveScholarships}
												className={`cursor-pointer rounded-full bg-emerald-800 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-900 transition ${focusRing}`}
											>
												Try again
											</button>
										</div>
									</div>
								</div>
							) : scholarships.length === 0 ? (
								<div className="flex flex-col sm:flex-row items-center gap-6 rounded-3xl border-[1.5px] border-emerald-950 bg-white p-8 sm:p-10 shadow-[3px_3px_0px_0px_rgba(2,44,34,0.12)]">
									<div className="shrink-0 flex items-center justify-center p-3 rounded-2xl bg-emerald-50 border-[1.5px] border-emerald-950/20">
										<ConfusedDetective size={88} />
									</div>
									<div className="flex-1 text-center sm:text-left space-y-2">
										<h3 className="ud-display text-2xl font-bold text-emerald-950">
											No scheme matches that combination.
										</h3>
										<p className="max-w-[50ch] text-[15px] leading-relaxed text-emerald-950/75 font-medium">
											Drop a filter, or search one word instead of a full
											phrase. For example, “Merit” finds more active schemes
											than “merit based girls”.
										</p>
										<div className="pt-2">
											<button
												type="button"
												onClick={clearAll}
												className={`cursor-pointer rounded-full border-[1.5px] border-emerald-950 bg-yellow-200 px-5 py-2 text-sm font-bold text-emerald-950 hover:bg-yellow-300 transition ${focusRing}`}
											>
												Reset all filters
											</button>
										</div>
									</div>
								</div>
							) : (
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
									{scholarships.map((s, idx) => (
										<ScholarshipCard
											key={s._id || s.slug}
											s={s}
											index={idx}
											saved={saved.has(s._id || s.id)}
											saving={savingSet.has(s._id || s.id)}
											onSave={toggleSave}
											onOpen={() => openDetails(s)}
										/>
									))}
								</div>
							)}
						</div>
					</main>
				</div>
			</div>

			{/* ---------- Detail drawer ---------- */}
			{isModalOpen &&
				selectedScholarship &&
				createPortal(
					<div
						className="fixed inset-0 z-50 overflow-hidden"
						role="dialog"
						aria-modal="true"
						aria-labelledby="scholarship-drawer-title"
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
										className="relative overflow-hidden shrink-0 border-b-[1.5px] border-emerald-950 px-6 py-5"
										style={{ background: drawerTheme.colors.headerBg }}
									>
										{/* Watermark in background */}
										<div className="absolute -right-4 -bottom-4 opacity-15 pointer-events-none transform rotate-12 scale-150">
											<CategoryMotifIcon
												category={selectedScholarship.category}
												size={96}
											/>
										</div>

										<div className="relative z-10 flex items-start justify-between gap-4">
											<div className="min-w-0 flex-1">
												<div className="flex flex-wrap items-center gap-2 mb-2">
													<span
														className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold"
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

													<span className="inline-flex items-center gap-1 rounded-full border border-emerald-950/20 bg-white/80 px-2 py-0.5 text-xs font-bold text-emerald-800">
														<ShieldCheck size={13} />
														Verified
													</span>

													{isGenuinePdf(
														selectedScholarship.officialLinks?.guidelinesUrl,
													) && (
														<span className="inline-flex items-center gap-1 rounded-full border border-emerald-950/20 bg-white/80 px-2 py-0.5 text-xs font-bold text-emerald-950/70">
															<FileText size={12} />
															Official PDF
														</span>
													)}
												</div>

												<h2
													id="scholarship-drawer-title"
													className="ud-display text-2xl sm:text-3xl font-extrabold leading-tight text-emerald-950"
												>
													{selectedScholarship.title}
												</h2>
												<a
													href={`/scanner?scholarship=${encodeURIComponent(selectedScholarship._id || selectedScholarship.id)}`}
													className="mt-3 inline-block text-sm font-semibold text-emerald-900 underline underline-offset-4"
												>
													Check document readiness ↗
												</a>

												<div className="mt-2.5 flex flex-wrap items-center gap-3">
													<p className="text-sm font-medium text-emerald-950/65">
														{selectedScholarship.organization}
													</p>
													<DeadlineChip
														deadline={selectedScholarship.deadline}
													/>
												</div>
											</div>

											<div className="flex items-center gap-2 shrink-0">
												<SaveButton
													saved={saved.has(
														selectedScholarship._id || selectedScholarship.id,
													)}
													saving={savingSet.has(
														selectedScholarship._id || selectedScholarship.id,
													)}
													name={selectedScholarship.title}
													onToggle={() =>
														toggleSave(
															selectedScholarship._id || selectedScholarship.id,
															selectedScholarship,
														)
													}
												/>

												<button
													type="button"
													onClick={closeDrawer}
													aria-label="Close details"
													className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-emerald-950 bg-white hover:bg-yellow-200 transition ${focusRing}`}
												>
													<X size={17} />
												</button>
											</div>
										</div>
									</div>
								);
							})()}

							<div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 text-sm sm:px-8">
								{selectedScholarship.latestChangeSummary &&
									formatChangeNotice(
										selectedScholarship.latestChangeSummary,
									) && (
										<div className="rounded-xl border-[1.5px] border-emerald-950/15 bg-yellow-200 p-4">
											<p className="flex items-center gap-1.5 text-xs font-bold">
												<History size={13} />
												Recently changed
											</p>
											<p className="mt-1.5 text-sm leading-snug">
												{formatChangeNotice(
													selectedScholarship.latestChangeSummary,
												)}
											</p>
										</div>
									)}

								{(() => {
									const g = formatGrant(selectedScholarship.amount);
									return (
										<div className="rounded-2xl border-[1.5px] border-emerald-950/20 bg-[#FAF9F6] p-5 shadow-xs">
											<div className="flex items-center justify-between border-b border-dashed border-emerald-950/15 pb-2.5 mb-3">
												<span className="text-xs font-extrabold uppercase tracking-wider text-emerald-950/60">
													Award amount
												</span>
											</div>

											{g.isUnpublished ? (
												<>
													<p className="text-lg font-semibold italic text-emerald-950/70">
														{g.main}
													</p>
													<p className="mt-1.5 text-sm leading-relaxed text-emerald-950/70 font-medium">
														{g.details ||
															"The amount follows official government rules. Check official notice for exact figures."}
													</p>
												</>
											) : (
												<>
													<div className="flex items-baseline gap-2">
														<span className="ud-display text-4xl sm:text-5xl font-extrabold text-emerald-950">
															{g.main}
														</span>
														{g.period && (
															<span className="text-base font-semibold text-emerald-950/60 font-sans">
																{g.period}
															</span>
														)}
													</div>
													{g.options && g.options.length > 1 && (
														<div className="mt-4 pt-3 border-t border-dashed border-emerald-950/15">
															<p className="mb-2 text-xs font-bold text-emerald-950/60 uppercase tracking-wider">
																Award Tiers & Variations
															</p>
															<div className="flex flex-wrap gap-2">
																{g.options.map((opt, i) => (
																	<span
																		key={i}
																		className="rounded-full border-[1.5px] border-emerald-950/25 bg-white px-3 py-1 text-xs font-bold text-emerald-950"
																	>
																		₹{opt.value?.toLocaleString("en-IN")} /{" "}
																		{opt.period}
																	</span>
																))}
															</div>
														</div>
													)}
												</>
											)}
										</div>
									);
								})()}

								<DrawerSection title="About">
									<p className="text-[15px] leading-relaxed text-emerald-950/80">
										{selectedScholarship.description ||
											selectedScholarship.summary ||
											"Official scholarship verified against its published notification."}
									</p>
								</DrawerSection>

								{selectedScholarship.rules &&
									selectedScholarship.rules.length > 0 && (
										<DrawerSection
											title="Who can apply"
											aside={
												<span className="text-xs font-bold text-emerald-950/55">
													{selectedScholarship.rules.length} criteria
												</span>
											}
										>
											<ul className="divide-y divide-dashed divide-emerald-950/20 rounded-xl border-[1.5px] border-emerald-950/20">
												{selectedScholarship.rules.map((r, idx) => (
													<li
														key={idx}
														className="flex items-start justify-between gap-4 px-4 py-3"
													>
														<span className="text-[15px] font-semibold leading-snug">
															{r.description || formatFieldLabel(r.field)}
														</span>
														<span className="shrink-0 rounded-sm bg-yellow-200 px-1.5 py-0.5 text-[13px] font-bold">
															{formatRuleRequirement(r)}
														</span>
													</li>
												))}
											</ul>
										</DrawerSection>
									)}

								{((selectedScholarship.provenanceQuotes &&
									selectedScholarship.provenanceQuotes.length > 0) ||
									(selectedScholarship.rules &&
										selectedScholarship.rules.length > 0)) && (
									<DrawerSection
										title="From the official notice"
										aside={
											<span className="text-xs font-bold text-emerald-950/55">
												{selectedScholarship.provenanceQuotes?.length ||
													selectedScholarship.rules?.length ||
													0}{" "}
												clauses
											</span>
										}
									>
										<div className="space-y-3">
											{(selectedScholarship.provenanceQuotes &&
											selectedScholarship.provenanceQuotes.length > 0
												? selectedScholarship.provenanceQuotes
												: selectedScholarship.rules.map((r, i) => ({
														clause: `Official Rule ${i + 1}: ${r.field}`,
														quote:
															r.description ||
															`Satisfies eligibility criteria as specified in the official scheme circular.`,
														page: 1,
														sourceUrl:
															selectedScholarship.officialLinks
																?.guidelinesUrl ||
															selectedScholarship.sourceUrl,
													}))
											).map((q, idx) => {
												const rawQuoteLink =
													q.sourceUrl ||
													selectedScholarship.officialLinks?.guidelinesUrl ||
													selectedScholarship.sourceUrl;
												const quoteLink = cleanOfficialUrl(rawQuoteLink);
												const isPdf = isGenuinePdf(quoteLink);
												const sourceLabel = formatSourceLabel(quoteLink);
												const clauseTitle = formatClauseTitle(
													q.clause,
													q.field,
													idx + 1,
												);
												const cleanQuote = formatEvidenceText(q.quote, q.field);

												return (
													<div
														key={idx}
														className="rounded-xl border-[1.5px] border-emerald-950/20 bg-white p-4"
													>
														<div className="flex flex-wrap items-baseline justify-between gap-2">
															<p className="text-sm font-bold">{clauseTitle}</p>
															{q.page && (
																<span className="text-xs font-semibold text-emerald-950/55">
																	Page {q.page}
																</span>
															)}
														</div>
														<blockquote className="mt-2 border-l-2 border-yellow-400 pl-3 text-[15px] italic leading-relaxed text-emerald-950/80">
															“{cleanQuote}”
														</blockquote>
														{quoteLink && (
															<div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
																<span
																	className="max-w-[260px] truncate font-medium text-emerald-950/55"
																	title={quoteLink}
																>
																	{sourceLabel}
																</span>
																{isPdf && (
																	<a
																		href={quoteLink}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="inline-flex shrink-0 items-center gap-1 font-bold underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950"
																	>
																		Open cited PDF
																		<ExternalLink size={11} />
																	</a>
																)}
															</div>
														)}
													</div>
												);
											})}
										</div>
									</DrawerSection>
								)}

								<DrawerSection
									title="Documents to keep ready"
									aside={
										<Link
											to="/documents"
											className="text-sm font-bold underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950"
										>
											Open checklist
										</Link>
									}
								>
									{Array.isArray(selectedScholarship.requiredDocuments) &&
									selectedScholarship.requiredDocuments.length > 0 ? (
										<ul className="grid gap-2 sm:grid-cols-2">
											{selectedScholarship.requiredDocuments.map((doc, idx) => (
												<li
													key={idx}
													className="flex items-start gap-2.5 rounded-xl border-[1.5px] border-emerald-950/20 p-3"
												>
													<span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-[1.5px] border-emerald-950 bg-white">
														{doc.mandatory !== false && (
															<Check size={11} strokeWidth={3.5} />
														)}
													</span>
													<span className="min-w-0">
														<span className="block text-sm font-semibold leading-snug">
															{doc.name}
														</span>
														<span className="mt-0.5 block text-xs text-emerald-950/55">
															{doc.mandatory !== false
																? "Required"
																: "If applicable"}
														</span>
													</span>
												</li>
											))}
										</ul>
									) : (
										<p className="text-[15px] leading-relaxed text-emerald-950/75">
											Usually: identity card, bonafide college certificate,
											latest marksheet, and a bank passbook with DBT active.
										</p>
									)}
								</DrawerSection>
							</div>

							<div className="flex shrink-0 flex-wrap items-center gap-2 border-t-[1.5px] border-emerald-950 bg-emerald-50 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
								{selectedScholarship.applicationLink && (
									<a
										href={cleanOfficialUrl(selectedScholarship.applicationLink)}
										target="_blank"
										rel="noopener noreferrer"
										className={`group inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 active:translate-y-px ${focusRing}`}
									>
										Apply on official site
										<ArrowUpRight
											size={15}
											className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
										/>
									</a>
								)}
								<button
									type="button"
									onClick={() => {
										setIsModalOpen(false);
										setIsEvidenceModalOpen(true);
									}}
									className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950 bg-white px-5 py-2.5 text-sm font-bold hover:bg-emerald-100 ${focusRing}`}
								>
									<FileText size={15} />
									Full rules
								</button>
								<SaveButton
									variant="pill"
									saved={saved.has(
										selectedScholarship._id || selectedScholarship.id,
									)}
									saving={savingSet.has(
										selectedScholarship._id || selectedScholarship.id,
									)}
									onToggle={() =>
										toggleSave(
											selectedScholarship._id || selectedScholarship.id,
											selectedScholarship,
										)
									}
								/>
								{(() => {
									const rawGl =
										selectedScholarship.officialLinks?.guidelinesUrl ||
										(selectedScholarship.sourceUrl
											?.toLowerCase()
											.includes(".pdf")
											? selectedScholarship.sourceUrl
											: null);
									return isGenuinePdf(rawGl) ? (
										<a
											href={cleanOfficialUrl(rawGl)}
											target="_blank"
											rel="noopener noreferrer"
											className="ml-auto text-sm font-bold underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950"
										>
											Official PDF
										</a>
									) : null;
								})()}
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
				isOpen={authPrompt.isOpen}
				onClose={() => setAuthPrompt({ isOpen: false, scholarship: null })}
				scholarshipTitle={authPrompt.scholarship?.title}
				scholarshipId={
					authPrompt.scholarship?._id || authPrompt.scholarship?.id
				}
			/>
		</div>
	);
}
