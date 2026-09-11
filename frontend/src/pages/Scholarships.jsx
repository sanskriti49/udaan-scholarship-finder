import { useState, useEffect } from "react";
import {
	Search,
	Bookmark,
	BookmarkCheck,
	Clock,
	X,
	Filter,
	Star,
	ShieldCheck,
	History,
	FileText,
	ExternalLink,
	Sparkles,
	AlertCircle,
	ChevronRight,
	RotateCcw,
} from "lucide-react";
import { getScholarships } from "../services/scholarshipService";
import EvidenceModal from "../components/EvidenceModal";

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
	"Delhi",
	"Karnataka",
	"Tamil Nadu",
];

const SOURCES = [
	"All",
	"Government",
	"Institution",
	"NGO / Trust",
	"Corporate",
];

const SORTS = [
	{ label: "Deadline (soonest)", value: "deadline" },
	{ label: "Amount (highest)", value: "amount_high" },
	{ label: "Source Trust (highest)", value: "trust" },
	{ label: "Recently Added", value: "newest" },
];

function FilterChips({ label, options, active, onChange }) {
	return (
		<div className="mb-5">
			<p className="text-xs font-bold tracking-wider text-gray-700 uppercase mb-2">
				{label}
			</p>
			<div className="flex flex-wrap gap-1.5">
				{options.map((o) => (
					<button
						key={o}
						onClick={() => onChange(o)}
						className={`cursor-pointer text-[12px] font-medium px-3 py-1 rounded-full border transition-all duration-150 ${
							active === o
								? "bg-[#EAF3DE] border-[#C0DD97] text-[#27500A] font-bold shadow-2xs"
								: "bg-white border-gray-300 text-gray-700 hover:border-[#5AAD1F] hover:text-[#27500A] hover:bg-[#F6FAF1]"
						}`}
					>
						{o}
					</button>
				))}
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
			<span className="flex items-center gap-1 text-[11.5px] font-bold text-red-600">
				<Clock size={12} className="animate-pulse" /> {days} days left — closing
				soon
			</span>
		);
	if (days <= 30)
		return (
			<span className="flex items-center gap-1 text-[11.5px] font-bold text-amber-800">
				<Clock size={12} /> {days} days left
			</span>
		);
	return (
		<span className="flex items-center gap-1 text-[11.5px] font-semibold text-gray-600">
			<Clock size={12} className="text-gray-500" /> {days} days left
		</span>
	);
}

function ScholarshipCard({ s, saved, onSave, onClick, onInspectEvidence }) {
	const trustPct = Math.round((s.trustScore || 0.85) * 100);
	const daysLeft = s.deadline
		? Math.max(
				0,
				Math.ceil((new Date(s.deadline) - new Date()) / (1000 * 60 * 60 * 24)),
			)
		: 30;

	return (
		<div className="group bg-white border border-gray-200/90 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:border-[#C0DD97] hover:-translate-y-1 shadow-2xs">
			<div>
				{/* Top Badges */}
				<div className="flex items-start justify-between gap-2 mb-3">
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-[11.5px] font-bold px-2.5 py-0.5 rounded-full bg-[#EAF3DE] text-[#27500A] flex items-center gap-1">
							{s.popular && (
								<Star size={10} className="fill-current text-[#5AAD1F]" />
							)}
							{s.category}
						</span>
						<span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1">
							<ShieldCheck size={11} className="text-emerald-600" />
							{trustPct}% Trust
						</span>
						{s.hasChanges && (
							<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 flex items-center gap-1">
								<History size={11} /> Updated
							</span>
						)}
					</div>
					<button
						onClick={(e) => {
							e.stopPropagation();
							onSave(s._id || s.id);
						}}
						className="p-1.5 rounded-lg text-gray-400 hover:text-[#5AAD1F] hover:bg-gray-50 transition-colors"
						title={saved ? "Remove bookmark" : "Save scholarship"}
					>
						{saved ? (
							<BookmarkCheck size={18} className="text-[#5AAD1F]" />
						) : (
							<Bookmark size={18} />
						)}
					</button>
				</div>

				{/* Title & Organization */}
				<h3
					onClick={onClick}
					className="text-[15px] font-bold text-gray-900 group-hover:text-[#27500A] transition-colors leading-snug cursor-pointer line-clamp-2"
				>
					{s.title}
				</h3>
				<p className="text-[12px] text-gray-500 font-medium mt-1 mb-2 line-clamp-1">
					{s.organization}
				</p>

				{/* Drift Alert Banner if present */}
				{s.latestChangeSummary && (
					<div className="mb-3 p-2 rounded-lg bg-amber-50/80 border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-1.5">
						<History size={13} className="shrink-0 mt-0.5 text-amber-700" />
						<span className="line-clamp-2">{s.latestChangeSummary}</span>
					</div>
				)}

				<p className="text-[12.5px] text-gray-600 line-clamp-2 mb-4 leading-relaxed">
					{s.summary || s.description}
				</p>
			</div>

			<div>
				{/* Amount & Deadline */}
				<div className="pt-3 border-t border-gray-100 flex items-center justify-between">
					<div>
						<span className="text-[17px] font-black text-gray-900">
							{s.amount?.displayString ||
								`₹${s.amount?.value?.toLocaleString("en-IN")}`}
						</span>
						<span className="text-[11px] text-gray-500 font-medium">
							{" "}
							/{s.amount?.period || "yr"}
						</span>
					</div>
					<DeadlineTag deadline={s.deadline} />
				</div>

				{/* Card Actions */}
				<div className="mt-4 flex items-center gap-2">
					<button
						onClick={onClick}
						className="cursor-pointer flex-1 text-center py-2 px-3 rounded-xl bg-slate-100 hover:bg-[#EAF3DE] text-gray-800 hover:text-[#27500A] text-xs font-semibold transition-colors"
					>
						View Details
					</button>
					<button
						className="cursor-pointer py-2 px-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-800 text-xs font-semibold flex items-center gap-1 transition-colors"
						title="Inspect official clause proof"
						onClick={(e) => {
							e.stopPropagation();
							onInspectEvidence(s);
						}}
					>
						<FileText size={13} />
						Proof
					</button>
				</div>
			</div>
		</div>
	);
}

export default function Scholarships() {
	const [scholarships, setScholarships] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [search, setSearch] = useState("");
	const [cat, setCat] = useState("All");
	const [level, setLevel] = useState("All");
	const [state, setState] = useState("All India");
	const [source, setSource] = useState("All");
	const [sort, setSort] = useState("deadline");
	const [hasChangesOnly, setHasChangesOnly] = useState(false);

	const [saved, setSaved] = useState(new Set());
	const [selectedScholarship, setSelectedScholarship] = useState(null);
	const [evidenceScholarship, setEvidenceScholarship] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
	const [isFilterOpen, setIsFilterOpen] = useState(false);

	const fetchLiveScholarships = async () => {
		try {
			setLoading(true);
			setError(null);
			const params = {
				search: search || undefined,
				category: cat !== "All" ? cat : undefined,
				level: level !== "All" ? level : undefined,
				state: state !== "All India" ? state : undefined,
				sourceType: source !== "All" ? source : undefined,
				hasChanges: hasChangesOnly ? "true" : undefined,
				sort,
				limit: 24,
			};
			const res = await getScholarships(params);
			if (res.success) {
				setScholarships(res.data);
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

	useEffect(() => {
		const timer = setTimeout(() => {
			fetchLiveScholarships();
		}, 250);
		return () => clearTimeout(timer);
	}, [search, cat, level, state, source, sort, hasChangesOnly]);

	const toggleSave = (id) => {
		setSaved((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	};

	const clearAll = () => {
		setCat("All");
		setLevel("All");
		setState("All India");
		setSource("All");
		setSearch("");
		setHasChangesOnly(false);
		setSort("deadline");
	};

	return (
		<div className="min-h-screen bg-[#FDFDFD] text-gray-900 pb-20">
			{/* Hero Header */}
			<section className="bg-[#F6FAF1] border-b border-[#DDECCB] py-12 px-6">
				<div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
					<div>
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#C0DD97] text-[#27500A] text-xs font-bold mb-3 shadow-2xs">
							<ShieldCheck className="w-3.5 h-3.5 text-[#5AAD1F]" />
							Canonical & Verified Opportunities
						</div>
						<h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
							Scholarship{" "}
							<span className="text-[#5AAD1F]">Intelligence Feed</span>
						</h1>
						<p className="text-sm text-gray-600 mt-2 max-w-xl">
							Explore verified scholarships with traceable official source
							clauses, policy drift tracking, and real-time deadline monitoring.
						</p>
					</div>

					{/* Quick Search */}
					<div className="w-full md:w-96 relative">
						<Search
							className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
							size={18}
						/>
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search by title, organization, criteria..."
							className="w-full bg-white border border-[#C0DD97] rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-[#5AAD1F] focus:ring-2 focus:ring-[#5AAD1F]/20 shadow-2xs text-gray-800"
						/>
						{search && (
							<button
								onClick={() => setSearch("")}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
							>
								<X size={15} />
							</button>
						)}
					</div>
				</div>
			</section>

			{/* Main Content Area */}
			<div className="max-w-6xl mx-auto px-6 pt-8">
				<div className="flex flex-col lg:flex-row gap-8 items-start">
					{/* Sidebar Filter Panel */}
					<aside className="w-full lg:w-64 shrink-0 bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs">
						<div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
							<span className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
								<Filter size={15} className="text-[#5AAD1F]" /> Filters
							</span>
							<button
								onClick={clearAll}
								className="text-xs font-medium text-[#27500A] hover:underline flex items-center gap-1 cursor-pointer"
							>
								<RotateCcw size={11} /> Reset
							</button>
						</div>

						{/* Policy Drift Toggle */}
						<div className="mb-5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/60">
							<label className="flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
								<input
									type="checkbox"
									checked={hasChangesOnly}
									onChange={(e) => setHasChangesOnly(e.target.checked)}
									className="rounded text-amber-600 focus:ring-amber-500"
								/>
								<span>Policy Updates Only</span>
							</label>
							<p className="text-[11px] text-amber-700 mt-1 pl-5">
								Filter for schemes with recent deadline or income limit changes.
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

					{/* Cards Catalog */}
					<main className="flex-1 w-full">
						{/* Sorting & Result Bar */}
						<div className="flex items-center justify-between mb-6 flex-wrap gap-4">
							<p className="text-xs font-semibold text-gray-500">
								Showing{" "}
								<span className="text-gray-900 font-bold">
									{scholarships.length}
								</span>{" "}
								verified scholarship schemes
							</p>

							<div className="flex items-center gap-2">
								<span className="text-xs text-gray-500 font-medium">
									Sort by:
								</span>
								<select
									value={sort}
									onChange={(e) => setSort(e.target.value)}
									className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-[#5AAD1F] cursor-pointer"
								>
									{SORTS.map((s) => (
										<option key={s.value} value={s.value}>
											{s.label}
										</option>
									))}
								</select>
							</div>
						</div>

						{/* Loading State */}
						{loading ? (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								{[1, 2, 3, 4].map((i) => (
									<div
										key={i}
										className="h-64 rounded-2xl bg-slate-100 animate-pulse p-6 flex flex-col justify-between"
									>
										<div className="space-y-3">
											<div className="h-4 bg-slate-200 rounded w-1/3" />
											<div className="h-6 bg-slate-200 rounded w-3/4" />
											<div className="h-3 bg-slate-200 rounded w-full" />
										</div>
										<div className="h-8 bg-slate-200 rounded w-full" />
									</div>
								))}
							</div>
						) : error ? (
							<div className="p-8 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
								<AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
								<p className="text-sm font-semibold text-red-800">{error}</p>
								<button
									onClick={fetchLiveScholarships}
									className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold"
								>
									Retry Connection
								</button>
							</div>
						) : scholarships.length === 0 ? (
							<div className="p-12 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-3">
								<Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
								<h4 className="text-base font-bold text-slate-800">
									No matching scholarships found
								</h4>
								<p className="text-xs text-slate-500 max-w-sm mx-auto">
									Try adjusting your search criteria or resetting filters to
									discover more opportunities.
								</p>
								<button
									onClick={clearAll}
									className="px-4 py-2 rounded-xl bg-[#EAF3DE] text-[#27500A] text-xs font-bold hover:bg-[#C0DD97] transition-colors"
								>
									Clear All Filters
								</button>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
										onInspectEvidence={(item) => {
											setEvidenceScholarship(item);
											setIsEvidenceOpen(true);
										}}
									/>
								))}
							</div>
						)}
					</main>
				</div>
			</div>

			{/* Evidence & Clause Citation Modal */}
			<EvidenceModal
				isOpen={isEvidenceOpen}
				onClose={() => {
					setIsEvidenceOpen(false);
					setEvidenceScholarship(null);
				}}
				scholarship={evidenceScholarship}
			/>

			{/* Detailed Slide-out Drawer */}
			{isModalOpen && selectedScholarship && (
				<div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
					<div className="bg-white w-full max-w-xl h-full overflow-y-auto p-6 md:p-8 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
						<div>
							<div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
								<div>
									<span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EAF3DE] text-[#27500A]">
										{selectedScholarship.category}
									</span>
									<h2 className="text-xl font-bold text-gray-900 mt-2">
										{selectedScholarship.title}
									</h2>
									<p className="text-xs text-gray-500 font-medium">
										{selectedScholarship.organization}
									</p>
								</div>
								<button
									onClick={() => {
										setIsModalOpen(false);
										setSelectedScholarship(null);
									}}
									className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
								>
									<X size={20} />
								</button>
							</div>

							<div className="py-6 space-y-6 text-sm text-gray-700">
								{selectedScholarship.latestChangeSummary && (
									<div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs space-y-1">
										<span className="font-bold text-amber-900 flex items-center gap-1.5">
											<History size={14} /> Recent Policy Shift
										</span>
										<p className="text-amber-800">
											{selectedScholarship.latestChangeSummary}
										</p>
									</div>
								)}

								<div>
									<h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
										Financial Benefit
									</h4>
									<p className="text-2xl font-black text-gray-900">
										{selectedScholarship.amount?.displayString ||
											`₹${selectedScholarship.amount?.value?.toLocaleString("en-IN")}`}
										<span className="text-xs text-gray-500 font-normal">
											{" "}
											/ {selectedScholarship.amount?.period || "yearly"}
										</span>
									</p>
								</div>

								<div>
									<h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
										Description & Scope
									</h4>
									<p className="text-xs leading-relaxed text-gray-600">
										{selectedScholarship.description}
									</p>
								</div>

								{/* Structured Rules */}
								{selectedScholarship.rules &&
									selectedScholarship.rules.length > 0 && (
										<div>
											<h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
												Evaluation Criteria
											</h4>
											<div className="space-y-2">
												{selectedScholarship.rules.map((r, idx) => (
													<div
														key={idx}
														className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between"
													>
														<span className="text-slate-800 font-medium">
															{r.description}
														</span>
														<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
															Mandatory
														</span>
													</div>
												))}
											</div>
										</div>
									)}
							</div>
						</div>

						<div className="pt-6 border-t border-gray-100 flex items-center gap-3">
							<button
								onClick={() => {
									setEvidenceScholarship(selectedScholarship);
									setIsEvidenceOpen(true);
								}}
								className="flex-1 py-3 px-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-xs font-bold hover:bg-blue-100 flex items-center justify-center gap-1.5 transition-colors"
							>
								<FileText size={14} />
								Inspect Proof
							</button>

							{selectedScholarship.applicationLink && (
								<a
									href={selectedScholarship.applicationLink}
									target="_blank"
									rel="noopener noreferrer"
									className="flex-1 py-3 px-4 rounded-xl bg-[#27500A] hover:bg-[#1E3E08] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
								>
									Apply on Official Portal <ExternalLink size={14} />
								</a>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
