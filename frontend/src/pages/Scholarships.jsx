import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, Link } from "react-router-dom";
import {
	Search,
	Bookmark,
	BookmarkCheck,
	Clock,
	X,
	Filter,
	ShieldCheck,
	History,
	FileText,
	ExternalLink,
	Sparkles,
	AlertCircle,
	ChevronRight,
	RotateCcw,
	ArrowUpRight,
	Tag,
	CheckCircle2,
} from "lucide-react";
import {
	getScholarships,
	getScholarshipSuggestions,
	getBookmarks,
	toggleBookmark as apiToggleBookmark,
} from "../services/scholarshipService";
import EvidenceModal from "../components/EvidenceModal";
import { formatGrant } from "../utils/formatGrant";
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
	{ label: "Deadline (closing soon)", value: "deadline" },
	{ label: "Grant Amount (highest)", value: "amount_high" },
	{ label: "Source Trust (highest)", value: "trust" },
	{ label: "Recently Added", value: "newest" },
];

function FilterChips({ label, options, active, onChange }) {
	return (
		<div className="mb-6">
			<p className="text-xs font-bold tracking-wider text-slate-700 uppercase mb-2.5">
				{label}
			</p>
			<div className="flex flex-wrap gap-1.5">
				{options.map((o) => {
					const isSelected = active === o;
					return (
						<button
							key={o}
							onClick={() => onChange(o)}
							className={`cursor-pointer text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all duration-150 ${
								isSelected
									? "bg-emerald-800 border-emerald-800 text-white font-semibold shadow-2xs"
									: "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
							}`}
						>
							{o}
						</button>
					);
				})}
			</div>
		</div>
	);
}

function DeadlineTag({ deadline }) {
	if (!deadline) return null;
	const days = Math.max(
		0,
		Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24)),
	);

	if (days <= 10)
		return (
			<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/80">
				<Clock size={12} className="text-rose-600" /> {days} days left (closing
				soon)
			</span>
		);
	if (days <= 30)
		return (
			<span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80">
				<Clock size={12} className="text-amber-600" /> {days} days left
			</span>
		);
	return (
		<span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/80">
			<Clock size={12} className="text-slate-400" /> {days} days left
		</span>
	);
}

function ScholarshipCard({ s, saved, onSave, onClick, onOpenEvidence }) {
	// Determine concrete scheme type
	const provenanceLabel = s.sourceType
		? `${s.sourceType} Scheme`
		: "Official Scheme";

	const grantInfo = formatGrant(s.amount);

	return (
		<div className="group bg-white border border-slate-200/90 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 hover:border-slate-300 hover:shadow-sm">
			<div>
				{/* Top Row: Scheme category and type */}
				<div className="flex items-center justify-between gap-2 mb-3.5">
					<div className="flex items-center gap-2 flex-wrap">
						{/* Category Label */}
						<span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
							{s.category}
						</span>

						<span className="text-slate-200 select-none">/</span>

						{/* Verified Scheme Tag */}
						<span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md tracking-tight">
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
							{provenanceLabel}
						</span>

						{/* Update Pip */}
						{s.hasChanges && (
							<span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50/80 border border-amber-200/70 px-2 py-0.5 rounded-md">
								<History size={10} className="text-amber-600" />
								Updated
							</span>
						)}
					</div>

					<button
						onClick={(e) => {
							e.stopPropagation();
							onSave(s._id || s.id);
						}}
						className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
						title={saved ? "Remove bookmark" : "Save scholarship"}
					>
						{saved ? (
							<BookmarkCheck size={17} className="text-slate-900" />
						) : (
							<Bookmark size={17} />
						)}
					</button>
				</div>

				{/* Title */}
				<h3
					onClick={onClick}
					className="text-lg font-bold text-slate-900 group-hover:text-emerald-900 transition-colors leading-snug cursor-pointer"
				>
					{s.title}
				</h3>

				{/* Change Notice */}
				{s.latestChangeSummary && formatChangeNotice(s.latestChangeSummary) && (
					<div className="mb-4 p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2">
						<History size={13} className="shrink-0 mt-0.5 text-amber-700" />
						<span className="leading-relaxed">
							{formatChangeNotice(s.latestChangeSummary)}
						</span>
					</div>
				)}

				<p className="text-sm text-slate-600 line-clamp-2 mt-2 mb-3.5 leading-relaxed">
					{s.summary || s.description}
				</p>
			</div>

			<div>
				{/* Financial Grant & Deadline */}
				<div className="pt-4 border-t border-slate-100 flex items-baseline justify-between gap-2 flex-wrap">
					<div className="max-w-[65%]">
						<span className="text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase block mb-0.5">
							Grant Value
						</span>
						<div className="flex items-baseline gap-1">
							{grantInfo.isUnpublished ? (
								<span className="text-xs sm:text-sm font-sans font-medium text-slate-600 italic leading-snug">
									{grantInfo.main}
								</span>
							) : (
								<>
									<span className="text-xl font-serif font-bold text-slate-900 leading-snug">
										{grantInfo.main}
									</span>
									{grantInfo.period && (
										<span className="text-xs text-slate-500 font-normal">
											{grantInfo.period}
										</span>
									)}
								</>
							)}
						</div>
					</div>
					<DeadlineTag deadline={s.deadline} />
				</div>

				{/* Actions */}
				<div className="mt-5 flex items-center gap-2">
					<button
						onClick={(e) => {
							e.stopPropagation();
							if (onOpenEvidence) onOpenEvidence();
							else onClick();
						}}
						className="flex-1 text-center py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-200/80"
						title="View official scheme rules and details"
					>
						<FileText size={13} className="text-emerald-700" />
						<span>Rules & Details</span>
					</button>
					<a
						href={cleanOfficialUrl(s.applicationLink || s.sourceUrl)}
						target="_blank"
						rel="noopener noreferrer"
						onClick={(e) => e.stopPropagation()}
						className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
					>
						<span>Apply on Official Site</span>
						<ArrowUpRight size={13} />
					</a>
				</div>
			</div>
		</div>
	);
}
export default function Scholarships() {
	const [searchParams, setSearchParams] = useSearchParams();

	// Read current filter parameters directly from URL (Single Source of Truth)
	const cat = searchParams.get("category") || "All";
	const level = searchParams.get("level") || "All";
	const state = searchParams.get("state") || "All India";
	const source = searchParams.get("sourceType") || "All";
	const sort = searchParams.get("sort") || "deadline";
	const hasChangesOnly = searchParams.get("hasChanges") === "true";

	// Local text state for responsive, zero-latency typing in the search bar
	const [search, setSearch] = useState(() => searchParams.get("search") || "");

	const [scholarships, setScholarships] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [suggestions, setSuggestions] = useState([]);
	const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
	const searchContainerRef = useRef(null);

	const [saved, setSaved] = useState(new Set());
	const [selectedScholarship, setSelectedScholarship] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);

	// Sync local search input if URL changes externally (e.g. from Hero, Navbar, or Footer)
	useEffect(() => {
		const qSearch = searchParams.get("search") || "";
		if (qSearch !== search) {
			setSearch(qSearch);
		}
	}, [searchParams]);

	// Clean parameter updater that modifies the URL without side-effect ping-pong loops
	const updateParam = (key, value, defaultValue) => {
		const next = new URLSearchParams(searchParams);
		if (!value || value === defaultValue) {
			next.delete(key);
		} else {
			next.set(key, value);
		}
		setSearchParams(next, { replace: true });
	};

	// Clean, non-competing setters for filter controls
	const setCat = (val) => updateParam("category", val, "All");
	const setLevel = (val) => updateParam("level", val, "All");
	const setState = (val) => updateParam("state", val, "All India");
	const setSource = (val) => updateParam("sourceType", val, "All");
	const setSort = (val) => updateParam("sort", val, "deadline");
	const setHasChangesOnly = (val) =>
		updateParam("hasChanges", val ? "true" : "", "");

	// Debounce sync for search text input to URL query
	useEffect(() => {
		const timer = setTimeout(() => {
			const currentSearchInUrl = searchParams.get("search") || "";
			const trimmed = search.trim();
			if (trimmed !== currentSearchInUrl) {
				const next = new URLSearchParams(searchParams);
				if (trimmed) {
					next.set("search", trimmed);
				} else {
					next.delete("search");
				}
				setSearchParams(next, { replace: true });
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [search]);

	// Autocomplete suggestions debounce
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

	// Close suggestions on outside click
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

	const fetchLiveScholarships = async () => {
		try {
			setLoading(true);
			setError(null);
			const params = {
				search: (searchParams.get("search") || "").trim() || undefined,
				category: cat !== "All" ? cat : undefined,
				level: level !== "All" ? level : undefined,
				state: state !== "All India" ? state : undefined,
				sourceType: source !== "All" ? source : undefined,
				hasChanges: hasChangesOnly ? "true" : undefined,
				sort,
				limit: 36,
			};
			const res = await getScholarships(params);
			if (res.success) {
				setScholarships(res.data || []);
			} else {
				setError("Unable to load scholarships.");
			}
		} catch (err) {
			console.error("API error:", err);
			setError("Failed to fetch opportunities from the backend.");
		} finally {
			setLoading(false);
		}
	};

	// Trigger fetch whenever searchParams changes
	useEffect(() => {
		const timer = setTimeout(() => {
			fetchLiveScholarships();
		}, 80);
		return () => clearTimeout(timer);
	}, [searchParams]);

	useEffect(() => {
		if (!isModalOpen) return;
		const handleKeyDown = (e) => {
			if (e.key === "Escape") {
				setIsModalOpen(false);
				setSelectedScholarship(null);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isModalOpen]);

	// Lock background body scroll when either drawer or evidence modal is open
	useEffect(() => {
		if (isModalOpen || isEvidenceModalOpen) {
			const originalOverflow = document.body.style.overflow;
			document.body.style.overflow = "hidden";
			return () => {
				document.body.style.overflow = originalOverflow;
			};
		}
	}, [isModalOpen, isEvidenceModalOpen]);

	// Fetch saved bookmarks from server if logged in
	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) return;
		getBookmarks()
			.then((res) => {
				if (res.success && Array.isArray(res.data)) {
					const ids = new Set(res.data.map((s) => s._id || s.id));
					setSaved(ids);
				}
			})
			.catch(() => {});
	}, []);

	const toggleSave = async (id) => {
		// Optimistic UI state toggle
		setSaved((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

		const token = localStorage.getItem("token");
		if (token) {
			try {
				await apiToggleBookmark(id);
			} catch (err) {
				console.warn("Could not sync bookmark with backend:", err.message);
			}
		}
	};

	const clearAll = () => {
		setCat("All");
		setLevel("All");
		setState("All India");
		setSource("All");
		setSearch("");
		setHasChangesOnly(false);
		setSort("deadline");
		setIsSuggestionsOpen(false);
	};

	return (
		<div className="min-h-screen bg-[#FAF9F6] text-slate-900 pb-20 font-sans">
			{/* Page Header */}
			<section className="bg-white border-b border-slate-200/80 py-12 md:py-16 px-5 sm:px-8">
				<div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
					<div>
						<div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2">
							<ShieldCheck size={14} className="text-emerald-700" />
							<span>Verified Opportunities Catalog</span>
						</div>
						<h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-900 tracking-tight">
							Scholarship{" "}
							<span className="italic text-emerald-800 font-normal">
								Catalog
							</span>
						</h1>
						<p className="text-sm sm:text-base text-slate-600 mt-2 max-w-xl leading-relaxed font-sans">
							Browse genuine government, state, university, and trust schemes
							with verified deadlines and official rules.
						</p>
					</div>

					{/* Interactive Search Input with Live Suggestions */}
					<div ref={searchContainerRef} className="w-full md:w-96 relative">
						<Search
							className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
							size={18}
						/>
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onFocus={() => {
								if (suggestions.length > 0) setIsSuggestionsOpen(true);
							}}
							placeholder="Search by degree, scheme, or authority..."
							className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl pl-10 pr-10 py-3 text-sm outline-none focus:bg-white focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 shadow-2xs text-slate-800 transition"
						/>
						{search && (
							<button
								onClick={() => {
									setSearch("");
									setIsSuggestionsOpen(false);
								}}
								className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
								title="Clear search"
							>
								<X size={16} />
							</button>
						)}

						{/* Live Autocomplete Suggestions Dropdown */}
						{isSuggestionsOpen && suggestions.length > 0 && (
							<div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-40 overflow-hidden divide-y divide-slate-100 animate-in fade-in-50 duration-150">
								<div className="px-4 py-2 bg-slate-50/80 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
									<span>Live Matches</span>
									<span>{suggestions.length} suggestions</span>
								</div>
								<div className="max-h-64 overflow-y-auto py-1">
									{suggestions.map((item) => (
										<button
											key={item.slug || item._id}
											type="button"
											onClick={() => {
												setSearch(item.title);
												setIsSuggestionsOpen(false);
											}}
											className="w-full px-4 py-2.5 text-left hover:bg-emerald-50/60 transition-colors flex items-start gap-3 group cursor-pointer"
										>
											<Search
												size={14}
												className="mt-1 text-slate-400 group-hover:text-emerald-700 shrink-0"
											/>
											<div className="min-w-0 flex-1">
												<p className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-800">
													{item.title}
												</p>
												<p className="text-[11px] text-slate-500 truncate mt-0.5">
													{item.organization} &bull;{" "}
													<span className="text-emerald-700 font-medium">
														{item.category}
													</span>
												</p>
											</div>
										</button>
									))}
								</div>
								<button
									type="button"
									onClick={() => setIsSuggestionsOpen(false)}
									className="w-full py-2.5 text-center text-xs font-bold text-emerald-800 bg-emerald-50/40 hover:bg-emerald-50 transition-colors block cursor-pointer"
								>
									Search all results for &ldquo;{search}&rdquo; &rarr;
								</button>
							</div>
						)}
					</div>
				</div>
			</section>

			{/* Main Catalog Section */}
			<div className="max-w-7xl mx-auto px-5 sm:px-8 pt-8 md:pt-10">
				<div className="flex flex-col lg:flex-row gap-8 items-start">
					{/* Sidebar Filter Panel */}
					<aside className="w-full lg:w-72 shrink-0 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs">
						<div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
							<span className="text-sm font-bold text-slate-900 flex items-center gap-2">
								<Filter size={15} className="text-emerald-800" /> Filters
							</span>
							<button
								onClick={clearAll}
								className="text-xs font-semibold text-slate-500 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition-colors"
							>
								<RotateCcw size={12} /> Reset
							</button>
						</div>

						{/* Recent Updates Toggle */}
						<div
							onClick={() => setHasChangesOnly(!hasChangesOnly)}
							className={`mb-6 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
								hasChangesOnly
									? "bg-amber-50/90 border-amber-300 shadow-2xs"
									: "bg-slate-50/70 border-slate-200/80 hover:border-slate-300"
							}`}
						>
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
									<History
										size={14}
										className={
											hasChangesOnly ? "text-amber-700" : "text-slate-400"
										}
									/>
									Recently Updated Only
								</span>
								<button
									type="button"
									role="switch"
									aria-checked={hasChangesOnly}
									onClick={(e) => {
										e.stopPropagation();
										setHasChangesOnly(!hasChangesOnly);
									}}
									className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
										hasChangesOnly ? "bg-amber-600" : "bg-slate-300"
									}`}
								>
									<span
										aria-hidden="true"
										className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
											hasChangesOnly ? "translate-x-4" : "translate-x-0"
										}`}
									/>
								</button>
							</div>
							<p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
								Filter opportunities with recently modified dates, rules, or
								amounts.
							</p>
						</div>

						<FilterChips
							label="Category"
							options={CATEGORIES}
							active={cat}
							onChange={setCat}
						/>

						<FilterChips
							label="Education Level"
							options={LEVELS}
							active={level}
							onChange={setLevel}
						/>

						<FilterChips
							label="Domicile / State"
							options={STATES}
							active={state}
							onChange={setState}
						/>

						<FilterChips
							label="Source Type"
							options={SOURCES}
							active={source}
							onChange={setSource}
						/>
					</aside>

					{/* Cards Catalog Grid */}
					<main className="flex-1 w-full">
						{/* Sorting & Result Count Bar */}
						<div className="flex items-center justify-between mb-6 flex-wrap gap-4">
							<p className="text-sm font-medium text-slate-500">
								Showing{" "}
								<span className="text-slate-900 font-bold">
									{scholarships.length}
								</span>{" "}
								verified schemes
							</p>

							<div className="flex items-center gap-2">
								<span className="text-xs text-slate-500 font-medium">
									Sort by:
								</span>
								<select
									value={sort}
									onChange={(e) => setSort(e.target.value)}
									className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-700 cursor-pointer shadow-2xs"
								>
									{SORTS.map((s) => (
										<option key={s.value} value={s.value}>
											{s.label}
										</option>
									))}
								</select>
							</div>
						</div>

						{/* Active Search & Filters Strip */}
						{(search ||
							cat !== "All" ||
							level !== "All" ||
							state !== "All India" ||
							source !== "All" ||
							hasChangesOnly) && (
							<div className="flex items-center gap-2 flex-wrap mb-6 pb-4 border-b border-slate-100 text-xs">
								<span className="text-slate-400 font-medium">
									Active filters:
								</span>
								{search && (
									<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium">
										<Search size={11} className="text-emerald-700" />
										<span>&ldquo;{search}&rdquo;</span>
										<button
											onClick={() => setSearch("")}
											className="hover:text-emerald-950 cursor-pointer ml-0.5"
											title="Remove search filter"
										>
											<X size={12} />
										</button>
									</span>
								)}
								{cat !== "All" && (
									<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-medium">
										<span>{cat}</span>
										<button
											onClick={() => setCat("All")}
											className="hover:text-slate-950 cursor-pointer"
										>
											<X size={12} />
										</button>
									</span>
								)}
								{level !== "All" && (
									<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-medium">
										<span>{level}</span>
										<button
											onClick={() => setLevel("All")}
											className="hover:text-slate-950 cursor-pointer"
										>
											<X size={12} />
										</button>
									</span>
								)}
								{state !== "All India" && (
									<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-medium">
										<span>{state}</span>
										<button
											onClick={() => setState("All India")}
											className="hover:text-slate-950 cursor-pointer"
										>
											<X size={12} />
										</button>
									</span>
								)}
								{source !== "All" && (
									<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-medium">
										<span>{source}</span>
										<button
											onClick={() => setSource("All")}
											className="hover:text-slate-950 cursor-pointer"
										>
											<X size={12} />
										</button>
									</span>
								)}
								{hasChangesOnly && (
									<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-medium">
										<span>Recently Updated</span>
										<button
											onClick={() => setHasChangesOnly(false)}
											className="hover:text-amber-950 cursor-pointer"
										>
											<X size={12} />
										</button>
									</span>
								)}
								<button
									onClick={clearAll}
									className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer ml-1"
								>
									Clear all
								</button>
							</div>
						)}

						{/* Loading State */}
						{loading ? (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{[1, 2, 3, 4].map((i) => (
									<div
										key={i}
										className="h-72 rounded-3xl bg-white border border-slate-200 p-6 flex flex-col justify-between animate-pulse"
									>
										<div className="space-y-3">
											<div className="h-4 bg-slate-200 rounded w-1/4" />
											<div className="h-6 bg-slate-200 rounded w-3/4" />
											<div className="h-3 bg-slate-200 rounded w-full" />
										</div>
										<div className="h-10 bg-slate-200 rounded-full w-full" />
									</div>
								))}
							</div>
						) : error ? (
							<div className="p-10 rounded-3xl bg-white border border-rose-200 text-center space-y-3 shadow-2xs">
								<AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
								<p className="text-sm font-semibold text-rose-800">{error}</p>
								<button
									onClick={fetchLiveScholarships}
									className="px-4 py-2 rounded-full bg-rose-700 text-white text-xs font-semibold"
								>
									Retry
								</button>
							</div>
						) : scholarships.length === 0 ? (
							<div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-2xs">
								<Sparkles className="w-10 h-10 text-slate-400 mx-auto" />
								<h4 className="text-lg font-sans font-bold text-slate-900">
									No matching scholarships found
								</h4>
								<p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
									Try resetting your filters or changing your search terms to
									discover more opportunities.
								</p>
								<button
									onClick={clearAll}
									className="px-5 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
								>
									Reset All Filters
								</button>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{scholarships.map((s) => (
									<ScholarshipCard
										key={s._id || s.slug}
										s={s}
										saved={saved.has(s._id || s.id)}
										onSave={toggleSave}
										onClick={() => {
											setSelectedScholarship(s);
											setIsModalOpen(true);
										}}
										onOpenEvidence={() => {
											setSelectedScholarship(s);
											setIsEvidenceModalOpen(true);
										}}
									/>
								))}
							</div>
						)}
					</main>
				</div>
			</div>

			{/* Slide-out Drawer: Detailed Rules & Verification */}
			{isModalOpen &&
				selectedScholarship &&
				createPortal(
					<div
						className="fixed inset-0 z-50 overflow-hidden"
						role="dialog"
						aria-modal="true"
						aria-labelledby="scholarship-drawer-title"
					>
						{/* Backdrop */}
						<div
							className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-200 animate-fade-in"
							onClick={() => {
								setIsModalOpen(false);
								setSelectedScholarship(null);
							}}
							aria-hidden="true"
						/>

						{/* Side Drawer Panel - Strictly constrained to viewport */}
						<div
							className="fixed inset-y-0 right-0 h-screen max-h-screen z-50 bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right"
							style={{ width: "min(560px, 100vw)" }}
						>
							{/* Drawer Header - Sticky Top */}
							<div className="bg-[#FAF9F6] border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4 shrink-0">
								<div className="space-y-1 min-w-0 flex-1">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="text-xs font-bold uppercase tracking-wider text-slate-500">
											{selectedScholarship.category || "Scholarship"}
										</span>
										<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
											<ShieldCheck size={12} className="text-emerald-700" />
											Verified Scholarship
										</span>
										{isGenuinePdf(
											selectedScholarship.officialLinks?.guidelinesUrl,
										) && (
											<span className="inline-flex items-center text-[10px] font-mono text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
												Official PDF Available
											</span>
										)}
									</div>
									<h2
										id="scholarship-drawer-title"
										className="text-xl sm:text-2xl font-serif font-bold text-slate-900 mt-1 leading-snug"
									>
										{selectedScholarship.title}
									</h2>
									<p className="text-xs sm:text-sm text-slate-600 font-medium truncate">
										Offered by:{" "}
										<span className="font-semibold text-slate-900">
											{selectedScholarship.organization}
										</span>
									</p>
								</div>
								<button
									onClick={() => {
										setIsModalOpen(false);
										setSelectedScholarship(null);
									}}
									className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 cursor-pointer transition-colors shrink-0"
									aria-label="Close"
								>
									<X size={20} />
								</button>
							</div>

							{/* Top Quick Actions - Immediately visible without scrolling */}
							<div className="bg-emerald-50/50 border-b border-emerald-100 px-6 py-2.5 flex items-center justify-between gap-2 shrink-0 flex-wrap">
								<span className="text-xs font-semibold text-emerald-900">
									Quick Actions:
								</span>
								<div className="flex items-center gap-2 flex-wrap">
									{selectedScholarship.applicationLink && (
										<a
											href={cleanOfficialUrl(
												selectedScholarship.applicationLink,
											)}
											target="_blank"
											rel="noopener noreferrer"
											className="px-3.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold inline-flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
										>
											<span>Apply on Official Site</span>
											<ArrowUpRight size={13} />
										</a>
									)}
									<button
										onClick={() => {
											setIsModalOpen(false);
											setIsEvidenceModalOpen(true);
										}}
										className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
									>
										<FileText size={13} className="text-emerald-700" />
										<span>View Rules & Quotes</span>
									</button>
									{(() => {
										const rawGl =
											selectedScholarship.officialLinks?.guidelinesUrl ||
											(selectedScholarship.sourceUrl
												?.toLowerCase()
												.includes(".pdf")
												? selectedScholarship.sourceUrl
												: null);
										if (isGenuinePdf(rawGl)) {
											return (
												<a
													href={cleanOfficialUrl(rawGl)}
													target="_blank"
													rel="noopener noreferrer"
													className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
												>
													<FileText size={13} />
													<span>Official PDF</span>
													<ArrowUpRight size={12} />
												</a>
											);
										}
										return null;
									})()}
								</div>
							</div>

							{/* Scrollable Content Body - min-h-0 prevents flex expansion beyond screen */}
							<div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-6 space-y-6 text-sm text-slate-700 bg-white">
								{/* Update notice if present */}
								{selectedScholarship.latestChangeSummary &&
									formatChangeNotice(
										selectedScholarship.latestChangeSummary,
									) && (
										<div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
											<span className="font-bold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
												<History size={13} /> Recent Scheme Update
											</span>
											<p className="text-xs text-amber-900 leading-relaxed">
												{formatChangeNotice(
													selectedScholarship.latestChangeSummary,
												)}
											</p>
										</div>
									)}

								{/* Scholarship Amount & Benefits Card */}
								{(() => {
									const drawerGrant = formatGrant(selectedScholarship.amount);
									return (
										<div className="p-5 rounded-2xl bg-[#FAF9F6] border border-slate-200 space-y-2">
											<span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
												Scholarship Amount & Benefits
											</span>
											{drawerGrant.isUnpublished ? (
												<div className="space-y-1.5">
													<p className="text-lg sm:text-xl font-serif font-bold text-slate-800 italic">
														{drawerGrant.main}
													</p>
													<p className="text-xs text-slate-500 leading-relaxed">
														{drawerGrant.details ||
															"The scholarship amount is provided as per official government rules. Check the guidelines PDF or official site for exact details."}
													</p>
												</div>
											) : (
												<div className="space-y-2">
													<div className="flex items-baseline gap-1">
														<span className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
															{drawerGrant.main}
														</span>
														{drawerGrant.period && (
															<span className="text-sm font-sans font-normal text-slate-500 ml-1">
																{drawerGrant.period}
															</span>
														)}
													</div>
													{drawerGrant.options &&
														drawerGrant.options.length > 1 && (
															<div className="pt-2.5 border-t border-slate-200/70 space-y-1.5">
																<span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
																	Official Award Tiers:
																</span>
																<div className="flex flex-wrap gap-2">
																	{drawerGrant.options.map((opt, i) => (
																		<span
																			key={i}
																			className="inline-flex items-center text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg"
																		>
																			₹{opt.value?.toLocaleString("en-IN")} /{" "}
																			{opt.period}
																		</span>
																	))}
																</div>
															</div>
														)}
												</div>
											)}
										</div>
									);
								})()}

								{/* Overview */}
								<div>
									<h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
										About This Scholarship
									</h4>
									<p className="text-sm leading-relaxed text-slate-600 font-normal">
										{selectedScholarship.description ||
											selectedScholarship.summary ||
											"Official government scholarship opportunity verified against published notifications."}
									</p>
								</div>

								{/* Who Can Apply (Eligibility Criteria) */}
								{selectedScholarship.rules &&
									selectedScholarship.rules.length > 0 && (
										<div>
											<h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
												Who Can Apply (Eligibility Criteria) (
												{selectedScholarship.rules.length})
											</h4>
											<div className="space-y-2.5">
												{selectedScholarship.rules.map((r, idx) => (
													<div
														key={idx}
														className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm flex items-center justify-between gap-3"
													>
														<div className="space-y-0.5">
															<span className="text-slate-800 font-medium block">
																{r.description || formatFieldLabel(r.field)}
															</span>
															<span className="text-[11px] text-slate-500">
																Eligibility:{" "}
																<strong className="text-emerald-800 font-semibold">
																	{formatRuleRequirement(r)}
																</strong>
															</span>
														</div>
														<span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
															Required
														</span>
													</div>
												))}
											</div>
										</div>
									)}

								{/* Rules from Official Notice */}
								{((selectedScholarship.provenanceQuotes &&
									selectedScholarship.provenanceQuotes.length > 0) ||
									(selectedScholarship.rules &&
										selectedScholarship.rules.length > 0)) && (
									<div>
										<div className="flex items-center justify-between mb-2.5">
											<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
												<Sparkles size={13} className="text-emerald-700" />
												Rules from Official Notice (
												{selectedScholarship.provenanceQuotes?.length ||
													selectedScholarship.rules?.length ||
													0}
												)
											</h4>
											<span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
												Verified Source
											</span>
										</div>

										<div className="space-y-2.5">
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
														className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-slate-200/90 text-xs space-y-1.5"
													>
														<div className="flex items-center justify-between text-slate-500 flex-wrap gap-1">
															<span className="font-bold text-slate-800 flex items-center gap-1">
																<span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
																{clauseTitle}
															</span>
															{q.page && (
																<span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">
																	Page {q.page}
																</span>
															)}
														</div>
														<blockquote className="border-l-2 border-emerald-700 pl-3 italic text-slate-700 leading-relaxed bg-emerald-50/20 py-1 rounded-r">
															&ldquo;{cleanQuote}&rdquo;
														</blockquote>
														{quoteLink && (
															<div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 gap-2 flex-wrap">
																<span
																	className="truncate max-w-[260px] text-slate-500 font-medium"
																	title={quoteLink}
																>
																	Source: {sourceLabel}
																</span>
																{isPdf ? (
																	<a
																		href={quoteLink}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="font-medium text-emerald-800 hover:text-emerald-950 flex items-center gap-1 shrink-0 hover:underline"
																	>
																		<span>Open Cited PDF</span>
																		<ExternalLink size={11} />
																	</a>
																) : (
																	<span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
																		Verified Notification
																	</span>
																)}
															</div>
														)}
													</div>
												);
											})}
										</div>
									</div>
								)}

								{/* Required Documents */}
								{selectedScholarship.requiredDocuments &&
									selectedScholarship.requiredDocuments.length > 0 && (
										<div>
											<h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
												Required Documents (
												{selectedScholarship.requiredDocuments.length})
											</h4>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
												{selectedScholarship.requiredDocuments.map(
													(doc, idx) => (
														<div
															key={idx}
															className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-center gap-2"
														>
															<span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
															<span className="truncate">{doc.name}</span>
														</div>
													),
												)}
											</div>
										</div>
									)}

								{/* Organizing Ministry or Department */}
								<div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F6] border border-slate-200/80 text-sm text-slate-700 space-y-1">
									<span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
										Offered by
									</span>
									<p className="font-semibold text-slate-900">
										{selectedScholarship.organization}
									</p>
								</div>
							</div>

							{/* Drawer Footer Actions - Sticky Bottom */}
							<div className="p-4 sm:p-5 border-t border-slate-200 bg-[#FAF9F6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
								<div className="flex items-center gap-2 flex-1 flex-wrap">
									{selectedScholarship.applicationLink && (
										<a
											href={cleanOfficialUrl(
												selectedScholarship.applicationLink,
											)}
											target="_blank"
											rel="noopener noreferrer"
											className="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
										>
											<span>Apply on Official Site</span>
											<ArrowUpRight size={14} />
										</a>
									)}

									<button
										onClick={() => {
											setIsModalOpen(false);
											setIsEvidenceModalOpen(true);
										}}
										className="flex-1 min-w-[120px] py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
										title="View official scheme guidelines and quotes"
									>
										<ShieldCheck size={15} className="text-emerald-700" />
										<span>View Rules</span>
									</button>

									<Link
										to="/documents"
										className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0"
										title="Check required documents"
									>
										<FileText size={15} className="text-emerald-700" />
										<span>Documents</span>
									</Link>
								</div>

								<button
									onClick={() => {
										setIsModalOpen(false);
										setSelectedScholarship(null);
									}}
									className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0"
								>
									Close
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)}

			{/* Full Evidence & Citation Dossier Modal */}
			<EvidenceModal
				isOpen={isEvidenceModalOpen}
				onClose={() => setIsEvidenceModalOpen(false)}
				scholarship={selectedScholarship}
			/>
		</div>
	);
}
