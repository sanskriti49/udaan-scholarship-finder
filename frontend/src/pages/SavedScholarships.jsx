import { useState, useEffect, useRef } from "react";
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
	ExternalLink,
	AlertCircle,
	ArrowUpRight,
	Check,
	ChevronDown,
	Sparkles,
	Clock,
	Compass,
	ArrowRight,
	RotateCcw,
	Loader2,
	SlidersHorizontal,
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
import {
	formatClauseTitle,
	formatEvidenceText,
	formatSourceLabel,
	formatChangeNotice,
	cleanOfficialUrl,
	isGenuinePdf,
} from "../utils/formatEvidence";
import { emitBookmarkChanged, onBookmarkChanged } from "../utils/bookmarkSync";
import { PageStyles } from "../components/PageKit";
import {
	CategoryCardHeader,
	CategoryMotifIcon,
	getCategoryTheme,
} from "../components/CategoryMotif";
import {
	BoardCurator,
	CablesDoctor,
	ConfusedDetective,
	DoodleSparkle,
} from "../components/AnimatedIllustrations";

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

function DeadlineChip({ deadline }) {
	if (!deadline) {
		return (
			<span className="inline-flex shrink-0 items-center rounded-full border-[1.5px] border-emerald-950/20 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-950">
				Check portal
			</span>
		);
	}
	const d = new Date(deadline);
	const now = new Date();
	const diffDays = Math.ceil(
		(d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
	);
	const isUrgent = diffDays >= 0 && diffDays <= 7;
	const isPast = diffDays < 0;

	let text = d.toLocaleDateString("en-IN", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
	let tone = "default";

	if (isPast) {
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
		default: "border-emerald-950/20 bg-emerald-50 text-emerald-950",
		urgent: "border-emerald-950 bg-yellow-200 text-emerald-950",
		closed: "border-emerald-950/20 bg-emerald-950/5 text-emerald-950/50",
	};

	return (
		<span
			className={`inline-flex shrink-0 items-center rounded-full border-[1.5px] px-2.5 py-1 text-xs font-bold ${tones[tone]}`}
		>
			{text}
		</span>
	);
}

function DrawerSection({ title, aside, children }) {
	return (
		<section className="space-y-3">
			<div className="flex items-baseline justify-between gap-3 border-b-[1.5px] border-emerald-950/15 pb-2">
				<h4 className="ud-display text-lg font-bold text-emerald-950">
					{title}
				</h4>
				{aside}
			</div>
			{children}
		</section>
	);
}

export default function SavedScholarships() {
	const { user } = useAuth();
	const navigate = useNavigate();

	const [savedItems, setSavedItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("All");
	const [sortBy, setSortBy] = useState("deadline");

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
				// If a new bookmark was added in another tab/page, re-fetch list
				fetchBookmarks();
			}
		});
		return unsubscribe;
	}, []);

	// Handle removing a bookmark
	const handleRemoveBookmark = async (scholarship) => {
		const id = scholarship._id || scholarship.id;
		if (removingSet.has(id)) return;

		setRemovingSet((prev) => new Set(prev).add(id));

		// Save backup for undo
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
						} catch (_) {
							toast.error("Could not restore bookmark");
						}
					},
				},
			});
		} catch (err) {
			// Rollback on failure
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

	const closeDrawer = () => {
		setIsDrawerOpen(false);
	};

	// Categories available in saved items
	const categories = [
		"All",
		...Array.from(new Set(savedItems.map((s) => s.category).filter(Boolean))),
	];

	// Filtered & sorted items
	const filteredItems = savedItems.filter((s) => {
		const matchesQuery =
			!searchQuery.trim() ||
			(s.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
			(s.organization || "")
				.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			(s.state || "").toLowerCase().includes(searchQuery.toLowerCase());

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
		// Default: closing soonest
		const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
		const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
		return dateA - dateB;
	});

	// Count statistics
	const now = Date.now();
	const closingSoonCount = savedItems.filter((s) => {
		if (!s.deadline) return false;
		const diff = new Date(s.deadline).getTime() - now;
		return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
	}).length;

	return (
		<div className="min-h-screen bg-[#FAF9F6] text-emerald-950 font-sans selection:bg-yellow-200">
			<PageStyles />

			{/* Hero Header */}
			<section className="border-b-[1.5px] border-emerald-950/20 bg-emerald-50/50 py-10 sm:py-14">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
						<div className="max-w-2xl space-y-3">
							<div className="flex items-center gap-2">
								<span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950 bg-yellow-200 px-3 py-0.5 text-xs font-bold text-emerald-950">
									<BookmarkCheck size={13} />
									Saved Opportunities
								</span>
								<span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">
									<ShieldCheck size={13} />
									Active Deadlines Monitored
								</span>
							</div>

							<h1 className="ud-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
								Your Saved Scholarships
							</h1>

							<p className="text-base text-emerald-950/70 font-medium leading-relaxed">
								Track closing dates, review requirement checklists, and prepare
								official submissions for your saved opportunities.
							</p>
						</div>

						{/* Quick stats pills */}
						{user && !loading && (
							<div className="flex flex-wrap items-center gap-3">
								<div className="rounded-2xl border-[1.5px] border-emerald-950 bg-white px-4 py-3 shadow-2xs">
									<span className="block text-2xl font-black text-emerald-950">
										{savedItems.length}
									</span>
									<span className="text-xs font-bold text-emerald-950/60 uppercase tracking-wider">
										Saved Schemes
									</span>
								</div>

								<div className="rounded-2xl border-[1.5px] border-emerald-950 bg-yellow-200 px-4 py-3 shadow-2xs">
									<span className="block text-2xl font-black text-emerald-950">
										{closingSoonCount}
									</span>
									<span className="text-xs font-bold text-emerald-950/80 uppercase tracking-wider">
										Closing &lt; 7 Days
									</span>
								</div>
							</div>
						)}
					</div>
				</div>
			</section>

			{/* Main Content Area */}
			<section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				{/* Unauthenticated State */}
				{!user && !loading && (
					<div className="my-8 rounded-3xl border-[1.5px] border-emerald-950 bg-white p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs">
						<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-[1.5px] border-emerald-950 bg-yellow-200 text-emerald-950 mb-4">
							<Bookmark size={26} strokeWidth={2.5} />
						</div>

						<h2 className="ud-display text-2xl sm:text-3xl font-bold">
							Sign in to view saved scholarships
						</h2>

						<p className="mt-2.5 text-sm sm:text-base text-emerald-950/70 leading-relaxed font-medium">
							Your bookmarked opportunities and proactive countdown alerts are
							tied to your student account. Sign in to access your personal
							catalog.
						</p>

						<div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
							<button
								type="button"
								onClick={() => navigate("/login?redirect=/saved")}
								className="w-full sm:w-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-800 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 shadow-2xs"
							>
								<span>Sign In</span>
								<ArrowRight size={15} />
							</button>

							<button
								type="button"
								onClick={() => navigate("/signup?redirect=/saved")}
								className="w-full sm:w-auto inline-flex cursor-pointer items-center justify-center rounded-full border-[1.5px] border-emerald-950 bg-white px-6 py-3 text-sm font-bold text-emerald-950 transition hover:bg-yellow-200"
							>
								Create Free Account
							</button>
						</div>

						<div className="mt-8 pt-6 border-t-[1.5px] border-dashed border-emerald-950/15 flex items-center justify-center gap-6 text-xs text-emerald-950/60 font-semibold">
							<span className="flex items-center gap-1.5">
								<Clock size={14} className="text-emerald-800" /> Deadline Alerts
							</span>
							<span className="flex items-center gap-1.5">
								<ShieldCheck size={14} className="text-emerald-800" /> 100% Free
							</span>
							<span className="flex items-center gap-1.5">
								<Sparkles size={14} className="text-amber-700" /> Multi-device
								Sync
							</span>
						</div>
					</div>
				)}

				{/* Authenticated State */}
				{user && (
					<>
						{/* Search & Filter Toolbar */}
						<div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
							{/* Search input */}
							<div className="relative flex-1 max-w-md">
								<Search
									size={16}
									className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-950/50"
								/>
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search saved schemes, providers, states..."
									className={`w-full rounded-full border-[1.5px] border-emerald-950 bg-white pl-10 pr-9 py-2 text-sm font-medium text-emerald-950 placeholder:text-emerald-950/45 ${focusRing}`}
								/>
								{searchQuery && (
									<button
										type="button"
										onClick={() => setSearchQuery("")}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-950/40 hover:text-emerald-950 cursor-pointer"
									>
										<X size={14} />
									</button>
								)}
							</div>

							{/* Sort & Category controls */}
							<div className="flex items-center gap-3">
								{categories.length > 2 && (
									<select
										value={selectedCategory}
										onChange={(e) => setSelectedCategory(e.target.value)}
										className={`rounded-full border-[1.5px] border-emerald-950 bg-white px-3.5 py-2 text-xs font-bold text-emerald-950 outline-none cursor-pointer ${focusRing}`}
									>
										{categories.map((cat) => (
											<option key={cat} value={cat}>
												{cat === "All" ? "All Categories" : cat}
											</option>
										))}
									</select>
								)}

								<select
									value={sortBy}
									onChange={(e) => setSortBy(e.target.value)}
									className={`rounded-full border-[1.5px] border-emerald-950 bg-white px-3.5 py-2 text-xs font-bold text-emerald-950 outline-none cursor-pointer ${focusRing}`}
								>
									<option value="deadline">Closing Soonest</option>
									<option value="amount">Highest Benefit</option>
									<option value="alphabetical">Alphabetical (A-Z)</option>
								</select>

								<Link
									to="/scholarships"
									className={`hidden md:inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950 bg-yellow-200 px-4 py-2 text-xs font-bold text-emerald-950 hover:bg-yellow-300 transition ${focusRing}`}
								>
									<Compass size={14} />
									<span>Browse All</span>
								</Link>
							</div>
						</div>

						{/* Loading Skeleton */}
						{loading && (
							<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
								{[1, 2, 3, 4].map((i) => (
									<div
										key={i}
										className="flex h-64 animate-pulse flex-col justify-between rounded-2xl border-[1.5px] border-emerald-950/15 bg-white p-6"
									>
										<div className="space-y-3">
											<div className="h-3.5 w-1/4 rounded bg-emerald-950/10" />
											<div className="h-6 w-4/5 rounded bg-emerald-950/10" />
											<div className="h-3.5 w-1/2 rounded bg-emerald-950/10" />
										</div>
										<div className="flex items-center justify-between pt-4 border-t border-emerald-950/10">
											<div className="h-4 w-28 rounded bg-emerald-950/10" />
											<div className="h-8 w-24 rounded-full bg-emerald-950/10" />
										</div>
									</div>
								))}
							</div>
						)}

						{/* Error State */}
						{!loading && error && (
							<div className="my-8 rounded-3xl border-[1.5px] border-rose-300 bg-white p-7 sm:p-9 max-w-lg mx-auto text-center space-y-4 shadow-[3px_3px_0px_0px_rgba(225,29,72,0.12)]">
								<div className="mx-auto flex justify-center">
									<CablesDoctor size={76} />
								</div>
								<div>
									<h3 className="ud-display text-2xl font-bold text-emerald-950">
										{error}
									</h3>
									<p className="mt-1 text-sm text-emerald-950/70 font-medium">
										We encountered a connection issue fetching your saved list.
										Your saved state is preserved.
									</p>
								</div>
								<button
									type="button"
									onClick={fetchBookmarks}
									className={`cursor-pointer rounded-full bg-emerald-800 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-900 transition ${focusRing}`}
								>
									Try Again
								</button>
							</div>
						)}

						{/* Empty State: No bookmarks at all */}
						{!loading && !error && savedItems.length === 0 && (
							<div className="my-10 rounded-3xl border-[2px] border-emerald-950 bg-white p-8 sm:p-12 text-center max-w-xl mx-auto shadow-[4px_4px_0px_0px_rgba(2,44,34,1)]">
								<div className="mx-auto flex justify-center mb-5">
									<BoardCurator size={110} />
								</div>

								<div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-950/20 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 uppercase tracking-wide mb-3">
									<DoodleSparkle size={13} color="#10B981" />
									<span>Your Scholarship Pinboard</span>
								</div>

								<h3 className="ud-display text-2xl sm:text-3xl font-bold text-emerald-950">
									Your personal board is waiting
								</h3>

								<p className="mt-3 text-[15px] text-emerald-950/75 leading-relaxed font-medium max-w-md mx-auto">
									Save schemes you qualify for to track official deadlines,
									document requirements, and policy notices all in one place.
								</p>

								{/* Quick suggestions */}
								<div className="mt-6 pt-5 border-t border-dashed border-emerald-950/20">
									<p className="text-xs font-bold text-emerald-950/55 uppercase tracking-wider mb-2.5">
										Popular starting searches
									</p>
									<div className="flex flex-wrap justify-center gap-2">
										{[
											{ label: "AICTE Pragati", query: "Pragati" },
											{ label: "Central Sector CSSS", query: "CSSS" },
											{ label: "Post-Matric", query: "Post-Matric" },
											{ label: "STEM Grants", query: "STEM" },
										].map((item) => (
											<Link
												key={item.label}
												to={`/scholarships?search=${encodeURIComponent(item.query)}`}
												className="rounded-full border-[1.5px] border-emerald-950/20 bg-[#FAF9F6] hover:border-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-50"
											>
												{item.label}
											</Link>
										))}
									</div>
								</div>

								<div className="mt-6 pt-2">
									<Link
										to="/scholarships"
										className={`inline-flex items-center gap-2 rounded-full bg-emerald-800 px-7 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 shadow-2xs ${focusRing}`}
									>
										<Compass size={17} />
										<span>Explore Verified Scholarships</span>
									</Link>
								</div>
							</div>
						)}

						{/* Empty State: Search filter yielded zero matches */}
						{!loading &&
							!error &&
							savedItems.length > 0 &&
							sortedItems.length === 0 && (
								<div className="my-8 rounded-3xl border-[1.5px] border-emerald-950 bg-white p-7 text-center max-w-md mx-auto shadow-xs">
									<div className="mx-auto flex justify-center mb-3">
										<ConfusedDetective size={72} />
									</div>
									<h3 className="ud-display text-xl font-bold text-emerald-950">
										No saved schemes match your filter
									</h3>
									<p className="mt-1.5 text-xs text-emerald-950/70 font-medium">
										Try adjusting your search terms or selecting another
										category.
									</p>
									<button
										type="button"
										onClick={() => {
											setSearchQuery("");
											setSelectedCategory("All");
										}}
										className={`mt-4 cursor-pointer rounded-full border-[1.5px] border-emerald-950 bg-yellow-200 px-4 py-2 text-xs font-bold text-emerald-950 hover:bg-yellow-300 transition ${focusRing}`}
									>
										Clear Filters
									</button>
								</div>
							)}

						{/* Saved Scholarship Cards Grid */}
						{!loading && !error && sortedItems.length > 0 && (
							<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
								{sortedItems.map((s) => {
									const id = s._id || s.id;
									const grantInfo = formatGrant(s.amount);
									const isRemoving = removingSet.has(id);
									const docCount = Array.isArray(s.requiredDocuments)
										? s.requiredDocuments.length
										: 0;

									return (
										<article
											key={id}
											className="group flex flex-col justify-between rounded-2xl border-[1.5px] border-emerald-950/20 bg-white overflow-hidden transition-all duration-200 hover:border-emerald-950 hover:shadow-[4px_4px_0px_0px_rgba(2,44,34,1)] focus-within:border-emerald-950 shadow-[2px_2px_0px_0px_rgba(2,44,34,0.08)]"
										>
											<CategoryCardHeader
												category={s.category}
												sourceType={s.sourceType || "Official"}
												hasChanges={s.hasChanges}
												rightSlot={
													<button
														type="button"
														onClick={() => handleRemoveBookmark(s)}
														disabled={isRemoving}
														title="Remove from saved"
														aria-label={`Remove ${s.title} from saved`}
														className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-emerald-950/20 bg-white/90 text-emerald-800 transition hover:bg-rose-50 hover:text-rose-700 hover:border-rose-400 active:scale-95 ${focusRing} ${
															isRemoving ? "opacity-50 cursor-not-allowed" : ""
														}`}
													>
														{isRemoving ? (
															<Loader2
																size={15}
																className="animate-spin text-emerald-800"
															/>
														) : (
															<BookmarkCheck size={16} />
														)}
													</button>
												}
											/>

											<div className="p-5 sm:p-6 flex flex-col flex-1">
												<h3>
													<button
														type="button"
														onClick={() => openDetails(s)}
														className={`ud-display cursor-pointer text-left text-xl font-bold leading-tight text-emerald-950 decoration-yellow-300 decoration-2 underline-offset-4 group-hover:underline ${focusRing} rounded-sm`}
													>
														{s.title}
													</button>
												</h3>

												<p className="mt-1 text-sm text-emerald-950/65 font-medium">
													{s.organization}
												</p>

												<div className="mt-auto pt-4">
													{/* Benefits & Deadline summary row */}
													<div className="flex items-center justify-between gap-3 border-t-[1.5px] border-dashed border-emerald-950/20 pt-4">
														<div className="min-w-0">
															{grantInfo?.isUnpublished ? (
																<p className="text-sm font-medium italic text-emerald-950/60">
																	{grantInfo.main}
																</p>
															) : grantInfo ? (
																<p className="flex items-baseline gap-1.5">
																	<span className="ud-display text-2xl font-extrabold text-emerald-950">
																		{grantInfo.isStipend
																			? grantInfo.main
																			: `₹${grantInfo.main}`}
																	</span>
																	{grantInfo.period && (
																		<span className="text-xs font-semibold text-emerald-950/55">
																			{grantInfo.period}
																		</span>
																	)}
																</p>
															) : null}
														</div>
														<DeadlineChip deadline={s.deadline} />
													</div>

													{/* Bottom Action Footer */}
													<div className="mt-4 flex items-center justify-between gap-3">
														<button
															type="button"
															onClick={() => openDetails(s)}
															className={`cursor-pointer rounded-sm text-sm font-bold text-emerald-950 underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950 ${focusRing}`}
														>
															Rules & documents
														</button>

														{s.applicationLink ? (
															<a
																href={cleanOfficialUrl(s.applicationLink)}
																target="_blank"
																rel="noopener noreferrer"
																className={`group/apply inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-900 active:translate-y-px ${focusRing}`}
															>
																<span>Apply Direct</span>
																<ArrowUpRight
																	size={13}
																	className="transition-transform group-hover/apply:-translate-y-0.5 group-hover/apply:translate-x-0.5"
																/>
															</a>
														) : (
															<span className="text-xs text-emerald-950/40 font-medium">
																Official portal link inside
															</span>
														)}
													</div>
												</div>
											</div>
										</article>
									);
								})}
							</div>
						)}
					</>
				)}
			</section>

			{/* Complete Details Drawer */}
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
														Verified Scheme
													</span>
												</div>

												<h2
													id="saved-drawer-title"
													className="ud-display text-2xl sm:text-3xl font-extrabold leading-tight text-emerald-950"
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

											<div className="flex items-center gap-2 shrink-0">
												<button
													type="button"
													onClick={() =>
														handleRemoveBookmark(selectedScholarship)
													}
													title="Remove bookmark"
													className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-emerald-950 bg-white hover:bg-rose-50 text-emerald-800 hover:text-rose-700 transition ${focusRing}`}
												>
													<BookmarkCheck size={17} />
												</button>
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
								{selectedScholarship.latestChangeSummary && (
									<div className="rounded-xl border-[1.5px] border-emerald-950/15 bg-yellow-200 p-4">
										<p className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
											<History size={13} />
											Notice: Scheme rules or dates were recently updated
										</p>
									</div>
								)}

								{/* Award summary */}
								{selectedScholarship.amount && (
									<div className="rounded-2xl border-[1.5px] border-emerald-950/20 bg-[#FAF9F6] p-5 shadow-xs">
										<div className="flex items-center justify-between border-b border-dashed border-emerald-950/15 pb-2.5 mb-3">
											<span className="text-xs font-extrabold uppercase tracking-wider text-emerald-950/60">
												Financial Award Grant
											</span>
											<span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
												✓ Direct Bank Transfer (DBT)
											</span>
										</div>

										<div className="flex items-baseline gap-2">
											<span className="ud-display text-3xl sm:text-4xl font-extrabold text-emerald-950">
												{formatGrant(selectedScholarship.amount)?.main
													? `₹${formatGrant(selectedScholarship.amount).main}`
													: "Benefit Specified in Circular"}
											</span>
											{formatGrant(selectedScholarship.amount)?.period && (
												<span className="text-sm font-semibold text-emerald-950/60 font-sans">
													{formatGrant(selectedScholarship.amount).period}
												</span>
											)}
										</div>
										<span className="mt-2 block text-xs text-emerald-950/60 font-medium">
											Disbursed directly via DBT to Aadhaar-seeded student bank
											account.
										</span>
									</div>
								)}

								{/* Summary */}
								{selectedScholarship.summary && (
									<DrawerSection title="Overview">
										<p className="text-[15px] leading-relaxed text-emerald-950/80 font-medium">
											{selectedScholarship.summary}
										</p>
									</DrawerSection>
								)}

								{/* Documents checklist */}
								<DrawerSection
									title="Documents to keep ready"
									aside={
										<Link
											to="/documents"
											className="text-sm font-bold underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950"
										>
											Open Vault
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
														<Check size={11} strokeWidth={3.5} />
													</span>
													<span className="min-w-0">
														<span className="block text-sm font-semibold leading-snug">
															{doc.name}
														</span>
														<span className="mt-0.5 block text-xs text-emerald-950/55">
															{doc.mandatory !== false
																? "Required"
																: "Optional"}
														</span>
													</span>
												</li>
											))}
										</ul>
									) : (
										<p className="text-sm text-emerald-950/70">
											Standard student documents required: College ID,
											marksheet, income certificate, and DBT passbook.
										</p>
									)}
								</DrawerSection>
							</div>

							<div className="flex shrink-0 items-center gap-3 border-t-[1.5px] border-emerald-950 bg-emerald-50 px-6 py-4">
								{selectedScholarship.applicationLink && (
									<a
										href={cleanOfficialUrl(selectedScholarship.applicationLink)}
										target="_blank"
										rel="noopener noreferrer"
										className={`group inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 ${focusRing}`}
									>
										<span>Apply on official site</span>
										<ArrowUpRight
											size={15}
											className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
										/>
									</a>
								)}
								<button
									type="button"
									onClick={() => {
										setIsDrawerOpen(false);
										setIsEvidenceModalOpen(true);
									}}
									className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950 bg-white px-5 py-2.5 text-sm font-bold hover:bg-emerald-100 ${focusRing}`}
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
