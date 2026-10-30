import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import {
	Search,
	X,
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
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import useDialogFocus from "../hooks/useDialogFocus";
import ScholarshipDiscoveryDesk from "../components/ScholarshipDiscoveryDesk";
import "./scholarships.css";
import { PageStyles } from "../components/PageKit";
import { CountUp } from "../components/MotionKit";
import {
	ScholarshipCard,
	SaveButton,
	CardSkeleton,
} from "../components/ScholarshipKit";
import {
	CategoryMotifIcon,
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
	{ label: "Best match", value: "relevance" },
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

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

function FilterGroup({
	label,
	options,
	selected = [],
	defaultOption = "All",
	onChange,
}) {
	const isDefaultActive =
		selected.length === 0 || selected.includes(defaultOption);

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

export default function Scholarships() {
	const [searchParams, setSearchParams] = useSearchParams();
	const { user } = useAuth();

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

	const sort = searchParams.get("sort") || "relevance";
	const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
	const hasChangesOnly = searchParams.get("hasChanges") === "true";
	const status = searchParams.get("status") || "active";

	const urlSearch = searchParams.get("search") || "";
	const [searchDraft, setSearchDraft] = useState({ origin: searchParams.toString(), value: urlSearch });
	const search = searchDraft.origin === searchParams.toString() ? searchDraft.value : urlSearch;
	const setSearch = (value) => setSearchDraft({ origin: searchParams.toString(), value });

	const [scholarships, setScholarships] = useState([]);
	const [resultInfo, setResultInfo] = useState({ total: 0, totalPages: 0, personalized: false });
	const [useProfile, setUseProfile] = useState(true);
	const [recentUpdatesCount, setRecentUpdatesCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [suggestions, setSuggestions] = useState([]);
	const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
	const searchContainerRef = useRef(null);

	const [saved, setSaved] = useState(new Set());
	const [selectedScholarship, setSelectedScholarship] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const detailTriggerRef = useRef(null);
	const catalogueRequestRef = useRef(null);
	const filterRef = useDialogFocus(filtersOpen);

	const updateMultiParam = (key, option, defaultOption) => {
		const currentParam = searchParams.get(key);
		const currentList = currentParam
			? currentParam
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean)
			: [];
		const next = new URLSearchParams(searchParams);
		next.delete("page");

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
		setSearchDraft({ origin: next.toString(), value: search });
	};

	const updateParam = (key, value, defaultValue) => {
		const next = new URLSearchParams(searchParams);
		if (key !== "page") next.delete("page");
		if (!value || value === defaultValue) next.delete(key);
		else next.set(key, value);
		setSearchParams(next, { replace: true });
		setSearchDraft({ origin: next.toString(), value: search });
	};

	const toggleCat = (val) => updateMultiParam("category", val, "All");
	const toggleLevel = (val) => updateMultiParam("level", val, "All");
	const toggleState = (val) => updateMultiParam("state", val, "All India");
	const toggleSource = (val) => updateMultiParam("sourceType", val, "All");
	const setSort = (val) => updateParam("sort", val, "relevance");
	const setHasChangesOnly = (val) =>
		updateParam("hasChanges", val ? "true" : "", "");
	const setStatus = (val) => updateParam("status", val, "active");

	useEffect(() => {
		const timer = setTimeout(() => {
			const currentSearchInUrl = searchParams.get("search") || "";
			const trimmed = search.trim();
			if (trimmed !== currentSearchInUrl) {
				const next = new URLSearchParams(searchParams);
				next.delete("page");
				if (trimmed) next.set("search", trimmed);
				else next.delete("search");
				setSearchParams(next, { replace: true });
				setSearchDraft({ origin: next.toString(), value: trimmed });
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [search, searchParams, setSearchParams]);

	useEffect(() => {
		const timer = setTimeout(async () => {
			if (!search || search.trim().length < 2) {
				setSuggestions([]);
				setIsSuggestionsOpen(false);
				return;
			}
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

	const fetchLiveScholarships = useCallback(async () => {
		catalogueRequestRef.current?.abort();
		const controller = new AbortController();
		catalogueRequestRef.current = controller;
		try {
			setLoading(true);
			setError(null);
			const params = {
				search: (searchParams.get("search") || "").trim() || undefined,
				category: searchParams.get("category") || undefined,
				level: searchParams.get("level") || undefined,
				state: searchParams.get("state") || undefined,
				sourceType:
					searchParams.get("sourceType") || undefined,
				hasChanges: searchParams.get("hasChanges") === "true" ? "true" : undefined,
				status: searchParams.get("status") || "active",
				sort: searchParams.get("sort") || "relevance",
				page: Math.max(1, parseInt(searchParams.get("page"), 10) || 1),
				limit: 12,
			};
			const res = await getScholarships(params, { signal: controller.signal, personalized: Boolean(user && useProfile) });
			if (controller.signal.aborted) return;
			if (res.success) {
				setScholarships(res.data || []);
				setResultInfo({ total: res.total ?? res.data?.length ?? 0, totalPages: res.totalPages ?? 1, personalized: res.personalized === true });
				if (typeof res.recentUpdatesCount === "number") {
					setRecentUpdatesCount(res.recentUpdatesCount);
				}
			} else {
				setError("We could not load scholarships just now.");
			}
		} catch (err) {
			if (controller.signal.aborted || err.code === 'ERR_CANCELED') return;
			console.error("API error:", err);
			setError(err.response?.data?.code === 'DISCOVERY_CANDIDATE_LIMIT'
				? 'Too many schemes to rank safely. Narrow your search or filters.'
				: err.response?.data?.error?.code === 'DATABASE_INITIALIZING'
				? 'Udaan is still connecting. Please try again in a moment.'
				: 'The scholarship service did not respond.');
		} finally {
			if (!controller.signal.aborted) setLoading(false);
		}
	}, [searchParams, user, useProfile]);

	useEffect(() => {
		const timer = setTimeout(() => {
			fetchLiveScholarships();
		}, 80);
		return () => { clearTimeout(timer); catalogueRequestRef.current?.abort(); };
	}, [fetchLiveScholarships]);

	const openDetails = (s) => {
		detailTriggerRef.current = document.activeElement;
		setSelectedScholarship(s);
		setIsModalOpen(true);
	};

	const closeDetails = () => {
		setIsModalOpen(false);
		setSelectedScholarship(null);
	};

	useBodyScrollLock(filtersOpen);

	useEffect(() => {
		if (!filtersOpen) return;
		const onKey = (e) => e.key === "Escape" && setFiltersOpen(false);
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [filtersOpen]);

	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!user || !token) {
			const timer = setTimeout(() => setSaved(new Set()), 0);
			return () => clearTimeout(timer);
		}
		const controller = new AbortController();
		getBookmarks({ signal: controller.signal })
			.then((res) => {
				if (!controller.signal.aborted && res && res.success && Array.isArray(res.data)) {
					setSaved(new Set(res.data.map((s) => s._id || s.id)));
				}
			})
			.catch(() => {});
		return () => controller.abort();
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
			"status",
			"page",
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
		<div className="ud-root scholarship-page min-h-screen bg-[#E9F0EA] pb-24 font-sans text-emerald-950">
			<PageStyles />

			{/* ---------- Hero ---------- */}
			<section className="mx-auto max-w-7xl px-5 pb-12 pt-12 sm:px-8 md:pb-10">
				<div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.75fr)] lg:gap-16">
					<div>
						<p className="sd-eyebrow mb-5">The scholarship finder</p>
						<h1 className="font-bricolage-grotesque text-[2.75rem] font-medium leading-[1.05] sm:text-6xl lg:text-[4.25rem]">
							Let’s find a scholarship
							<br /> <span className="sd-highlight">that works for you.</span>
						</h1>
						<p className="mt-5 max-w-[52ch] text-base leading-relaxed text-emerald-950/70 sm:text-lg">
							Find support for your next chapter. Explore schemes, check the
							criteria, and keep the ones worth applying for on your saved
							shelf.
						</p>

						<div className="mt-8" ref={searchContainerRef}>
							<div className="relative">
								<form
									onSubmit={(e) => {
										e.preventDefault();
										scrollToCatalog();
									}}
									className="sd-search flex items-center gap-2 border-[1.5px] border-emerald-950 bg-white p-2 pl-4 focus-within:ring-4 focus-within:ring-yellow-200"
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

					<div className="flex justify-center py-4 lg:py-0">
						<ScholarshipDiscoveryDesk
							items={scholarships}
							loading={loading}
							error={error}
							onOpen={openDetails}
						/>
					</div>
				</div>
				<nav className="sd-workflow" aria-label="Scholarship journey">
					<a href="#catalog">
						<span>01</span> Find your opportunities
					</a>
					<Link to="/resources#roadmap">
						<span>02</span> Get application-ready
					</Link>
					<Link to="/saved">
						<span>03</span>{" "}
						{user ? "Build your saved shelf" : "Sign in to save your shortlist"}{" "}
						<ArrowUpRight size={14} />
					</Link>
				</nav>
			</section>

			{/* ---------- Catalog ---------- */}
			<div
				id={CATALOG_ID}
				className="mx-auto max-w-7xl scroll-mt-24 border-t-[1.5px] border-emerald-950/15 px-5 pt-10 sm:px-8"
			>
				<div className="sd-catalog-header">
					<div>
						<p className="sd-eyebrow mb-3">The opportunity collection</p>
						<h2 className="font-georgia text-4xl sm:text-5xl">
							Find your starting point.
						</h2>
					</div>
					<p className="sd-catalog-note">
						Start with your course and home state. Then open a file to check its
						rules before you apply.
					</p>
				</div>
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
							ref={filterRef}
							tabIndex={-1}
							role={filtersOpen ? "dialog" : undefined}
							aria-modal={filtersOpen ? "true" : undefined}
							aria-label="Filters"
							className={`${filtersOpen ? "sk-sheet fixed inset-x-0 bottom-0 z-[61] flex max-h-[85vh] flex-col rounded-t-3xl" : "hidden"} border-[1.5px] border-emerald-950 bg-white lg:static lg:z-auto lg:block lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:rounded-2xl lg:[animation:none]`}
						>
							<span
								aria-hidden
								className="mx-auto mt-2 block h-1.5 w-12 shrink-0 rounded-full bg-emerald-950/20 lg:hidden"
							/>
							<div className="sd-filter-header sticky top-0 z-10 flex items-center justify-between gap-2 border-b-[1.5px] border-emerald-950 px-5 py-3.5">
								<span className="font-georgia text-2xl">Finder sheet</span>
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
								<button
									type="button"
									onClick={() => setFiltersOpen(false)}
									aria-label="Close filters"
									className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-emerald-950 bg-white lg:hidden ${focusRing}`}
								>
									<X size={17} />
								</button>
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
											<CountUp value={resultInfo.total} duration={500} />
										</span>{" "}
										{resultInfo.total === 1 ? "scheme" : "schemes"}
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

						<div className="mt-3 space-y-2 text-sm text-emerald-950/70">
							{user && <label className="flex items-center gap-2 font-semibold">
								<input type="checkbox" checked={useProfile} onChange={event => { setUseProfile(event.target.checked); updateParam("page", "", ""); }} />
								Use my saved eligibility profile
							</label>}
							<p>{resultInfo.personalized ? "Recorded eligibility compatibility comes first; the selected sort applies within each compatibility group. This is not official confirmation of eligibility." : "Browse the catalogue. Add your details in the eligibility checker to compare recorded requirements."} {sort === "deadline" && "Closing soonest uses verified, current deadlines; other dates appear later."} <Link to="/eligibility" className="font-bold underline">Check your profile</Link></p>
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
								<div className="grid grid-cols-1 gap-7 md:grid-cols-2">
									{scholarships.map((s, idx) => (
										<ScholarshipCard
											key={s._id || s.slug}
											s={s}
											index={idx}
											className="sd-paper-card"
											saved={saved.has(s._id || s.id)}
											saving={savingSet.has(s._id || s.id)}
											onSave={toggleSave}
											onOpen={() => openDetails(s)}
										/>
									))}
								</div>
							)}
						</div>
						{!loading && !error && resultInfo.totalPages > 1 && <nav aria-label="Scholarship pages" className="mt-7 flex items-center justify-center gap-4 text-sm font-bold">
							<button type="button" disabled={page <= 1} onClick={() => updateParam("page", String(page - 1), "1")} className={`rounded-full border px-4 py-2 disabled:opacity-40 ${focusRing}`}>Previous page</button>
							<span>Page {page} of {resultInfo.totalPages}</span>
							<button type="button" disabled={page >= resultInfo.totalPages} onClick={() => updateParam("page", String(page + 1), "1")} className={`rounded-full border px-4 py-2 disabled:opacity-40 ${focusRing}`}>Next page</button>
						</nav>}
					</main>
				</div>
			</div>

			<EvidenceModal
				returnFocusRef={detailTriggerRef}
				isOpen={isModalOpen}
				onClose={closeDetails}
				scholarship={selectedScholarship}
				initialSection="overview"
				interactionsBlocked={authPrompt.isOpen}
				actions={selectedScholarship && <SaveButton
					variant="pill"
					name={selectedScholarship.title}
					saved={saved.has(selectedScholarship._id || selectedScholarship.id)}
					saving={savingSet.has(selectedScholarship._id || selectedScholarship.id)}
					onToggle={() => toggleSave(selectedScholarship._id || selectedScholarship.id, selectedScholarship)}
				/>}
			/>

			<AuthPromptModal
				appearance="paper"
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
