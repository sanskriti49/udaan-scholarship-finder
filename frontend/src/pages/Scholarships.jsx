import { useState } from "react";
import {
	Search,
	Bookmark,
	BookmarkCheck,
	Clock,
	X,
	Filter,
	Star,
} from "lucide-react";

const ALL_SCHOLARSHIPS = [
	{
		id: 1,
		title: "PM Scholarship Scheme",
		org: "Ministry of Home Affairs",
		desc: "For dependents of ex-servicemen and ex-coast guard personnel pursuing professional degree courses.",
		amount: "₹36,000",
		amtSub: "/yr",
		cat: "Government",
		catBg: "bg-[#E6F1FB]",
		catText: "text-[#0C447C]",
		daysLeft: 8,
		level: "UG",
		state: "All India",
		source: "Government",
		popular: true,
	},
	{
		id: 2,
		title: "National Means-cum-Merit Scholarship",
		org: "Ministry of Education",
		desc: "Awarded to meritorious students from economically weaker sections to prevent dropout at Class VIII.",
		amount: "₹12,000",
		amtSub: "/yr",
		cat: "Merit based",
		catBg: "bg-[#EAF3DE]",
		catText: "text-[#27500A]",
		daysLeft: 24,
		level: "Class 9–12",
		state: "All India",
		source: "Government",
	},
	{
		id: 3,
		title: "Begum Hazrat Mahal National Scholarship",
		org: "Maulana Azad Education Foundation",
		desc: "For minority girl students studying in Classes 9–12 with family income below ₹2 lakh per annum.",
		amount: "₹12,000",
		amtSub: "/yr",
		cat: "Minority",
		catBg: "bg-[#FAEEDA]",
		catText: "text-[#633806]",
		daysLeft: 12,
		level: "Class 9–12",
		state: "All India",
		source: "Government",
	},
	{
		id: 4,
		title: "Women in STEM Scholarship",
		org: "DST — Govt. of India",
		desc: "Supporting female students pursuing undergraduate degrees in Science, Technology, Engineering, and Math.",
		amount: "₹75,000",
		amtSub: "/yr",
		cat: "Women",
		catBg: "bg-[#FBEAF0]",
		catText: "text-[#72243E]",
		daysLeft: 45,
		level: "UG",
		state: "All India",
		source: "Government",
		popular: true,
	},
	{
		id: 5,
		title: "UP Scholarship (Pre-Matric)",
		org: "UP Social Welfare Dept.",
		desc: "State scholarship for SC/ST/OBC/Minority students in Classes 9–10 domiciled in Uttar Pradesh.",
		amount: "₹3,500",
		amtSub: "/yr",
		cat: "SC / ST / OBC",
		catBg: "bg-[#EAF3DE]",
		catText: "text-[#27500A]",
		daysLeft: 18,
		level: "Class 9–12",
		state: "UP",
		source: "Government",
	},
	{
		id: 6,
		title: "Central Sector Scheme of Scholarships",
		org: "Ministry of Education",
		desc: "For college students in the top 20th percentile of Class XII board exam scorers.",
		amount: "₹20,000",
		amtSub: "/yr",
		cat: "Merit based",
		catBg: "bg-[#EAF3DE]",
		catText: "text-[#27500A]",
		daysLeft: 6,
		level: "UG",
		state: "All India",
		source: "Government",
	},
	{
		id: 7,
		title: "Ishan Uday NE Region Scholarship",
		org: "UGC",
		desc: "Special scholarship for students from north-eastern region pursuing general degree courses.",
		amount: "₹54,000",
		amtSub: "/yr",
		cat: "Need based",
		catBg: "bg-[#E6F1FB]",
		catText: "text-[#0C447C]",
		daysLeft: 52,
		level: "UG",
		state: "All India",
		source: "Government",
	},
	{
		id: 8,
		title: "Pragati Scholarship for Girls",
		org: "AICTE",
		desc: "For girl students pursuing technical education at diploma and degree level institutions.",
		amount: "₹50,000",
		amtSub: "/yr",
		cat: "Women",
		catBg: "bg-[#FBEAF0]",
		catText: "text-[#72243E]",
		daysLeft: 30,
		level: "Diploma",
		state: "All India",
		source: "Institution",
	},
];

const CATS = [
	"All",
	"Merit based",
	"Need based",
	"Women",
	"SC / ST / OBC",
	"Minority",
	"Sports",
	"Disability",
	"Government",
];
const LEVELS = ["All", "Class 1–8", "Class 9–12", "Diploma", "UG", "PG", "PhD"];
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
	"Deadline (soonest)",
	"Amount (highest)",
	"Recently added",
	"Most relevant",
];

//

function FilterChips({ label, options, active, onChange }) {
	return (
		<div className="mb-5">
			<p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2">
				{label}
			</p>
			<div className="flex flex-wrap gap-1.5">
				{options.map((o) => (
					<button
						key={o}
						onClick={() => onChange(o)}
						className={`cursor-pointer text-[12px] font-medium px-2.5 py-1 rounded-full border transition-all duration-150 ${
							active === o
								? "bg-[#EAF3DE] border-[#C0DD97] text-[#27500A] font-semibold shadow-sm"
								: "bg-white border-gray-200 text-gray-500 hover:border-[#C0DD97] hover:text-[#3B6D11]"
						}`}
					>
						{o}
					</button>
				))}
			</div>
		</div>
	);
}

function DeadlineProgress({ days }) {
	const maxDays = 60;
	const percent = Math.min((days / maxDays) * 100, 100);
	const color =
		days <= 10 ? "bg-red-500" : days <= 30 ? "bg-amber-500" : "bg-green-400";
	return (
		<div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
			<div
				className={`h-full ${color} transition-all duration-500`}
				style={{ width: `${100 - percent}%` }}
			/>
		</div>
	);
}

function DeadlineTag({ days }) {
	if (days <= 10)
		return (
			<span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
				<Clock size={11} className="animate-pulse" /> {days} days left — closing
				soon
			</span>
		);
	if (days <= 30)
		return (
			<span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700">
				<Clock size={11} /> {days} days left
			</span>
		);
	return (
		<span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400">
			<Clock size={11} /> {days} days left
		</span>
	);
}

function ScholarshipCard({ s, saved, onSave, onClick }) {
	return (
		<div
			className="group bg-white border border-gray-200/80 rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200 hover:shadow-xl hover:border-[#C0DD97] hover:-translate-y-1 cursor-pointer"
			onClick={onClick}
		>
			<div className="flex items-start justify-between gap-2">
				<span
					className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${s.catBg} ${s.catText} flex items-center gap-1`}
				>
					{s.popular && <Star size={10} className="fill-current" />}
					{s.cat}
				</span>
				<button
					onClick={(e) => {
						e.stopPropagation();
						onSave(s.id);
					}}
					className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
						saved
							? "bg-[#EAF3DE] border-[#C0DD97] scale-110"
							: "border-gray-200 hover:border-[#C0DD97] hover:bg-[#EAF3DE]"
					}`}
					aria-label="Bookmark"
				>
					{saved ? (
						<BookmarkCheck size={13} className="text-[#5AAD1F]" />
					) : (
						<Bookmark
							size={13}
							className="text-gray-400 group-hover:text-[#5AAD1F]"
						/>
					)}
				</button>
			</div>

			<div>
				<h3 className="text-[16.5px] font-semibold text-gray-900 leading-snug">
					{s.title}
				</h3>
				<p className="font-inter text-[12.5px] text-gray-400 mt-0.5">{s.org}</p>
			</div>

			<p className="text-[13.5px] text-gray-500 leading-relaxed line-clamp-2 flex-1">
				{s.desc}
			</p>

			<div className="font-inter flex items-center justify-between pt-2.5 border-t border-gray-100">
				<div>
					<div className="text-[18px] font-extrabold text-[#5AAD1F] tracking-tight leading-none">
						{s.amount}
						<span className="text-[12px] font-medium text-gray-400">
							{s.amtSub}
						</span>
					</div>
					<div className="mt-1">
						<DeadlineTag days={s.daysLeft} />
					</div>
				</div>
				<button
					className="cursor-pointer text-[13px] font-bold px-3.5 py-1.5 bg-gray-900 group-hover:bg-[#3B7DC8] text-white rounded-full transition-colors duration-150"
					onClick={(e) => {
						e.stopPropagation();
						alert(`Apply for ${s.title}`);
					}}
				>
					Apply →
				</button>
			</div>

			{/* deadline progress bar */}
			<DeadlineProgress days={s.daysLeft} />
		</div>
	);
}

function ScholarshipModal({ scholarship, onClose }) {
	if (!scholarship) return null;
	return (
		<div
			className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200"
				onClick={(e) => e.stopPropagation()}
			>
				<button
					onClick={onClose}
					className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
				>
					<X size={20} />
				</button>
				<div className="mb-4">
					<span
						className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${scholarship.catBg} ${scholarship.catText}`}
					>
						{scholarship.cat}
					</span>
					<h2 className="text-2xl font-extrabold mt-2">{scholarship.title}</h2>
					<p className="text-sm text-gray-500">{scholarship.org}</p>
				</div>
				<p className="text-gray-700 text-sm leading-relaxed mb-4">
					{scholarship.desc}
				</p>
				<div className="grid grid-cols-2 gap-3 text-sm">
					<div>
						<span className="text-gray-400">Amount</span>
						<p className="font-bold text-[#5AAD1F]">
							{scholarship.amount} {scholarship.amtSub}
						</p>
					</div>
					<div>
						<span className="text-gray-400">Deadline</span>
						<p className="font-medium">{scholarship.daysLeft} days left</p>
					</div>
					<div>
						<span className="text-gray-400">Level</span>
						<p className="font-medium">{scholarship.level}</p>
					</div>
					<div>
						<span className="text-gray-400">State</span>
						<p className="font-medium">{scholarship.state}</p>
					</div>
					<div className="col-span-2">
						<span className="text-gray-400">Source</span>
						<p className="font-medium">{scholarship.source}</p>
					</div>
				</div>
				<button
					className="mt-6 w-full bg-[#3B7DC8] text-white font-bold py-2.5 rounded-xl hover:bg-[#2E66A4] transition-colors"
					onClick={() => alert(`Apply for ${scholarship.title}`)}
				>
					Apply Now
				</button>
			</div>
		</div>
	);
}

function Scholarships() {
	const [search, setSearch] = useState("");
	const [cat, setCat] = useState("All");
	const [level, setLevel] = useState("All");
	const [state, setState] = useState("All India");
	const [source, setSource] = useState("All");
	const [sort, setSort] = useState(SORTS[0]);
	const [minAmt, setMinAmt] = useState(0);
	const [saved, setSaved] = useState(new Set());
	const [visible, setVisible] = useState(8);
	const [showSavedOnly, setShowSavedOnly] = useState(false);
	const [selectedScholarship, setSelectedScholarship] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isFilterOpen, setIsFilterOpen] = useState(false);

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
		setMinAmt(0);
		setSearch("");
		setShowSavedOnly(false);
	};

	const openModal = (s) => {
		setSelectedScholarship(s);
		setIsModalOpen(true);
	};
	const closeModal = () => {
		setIsModalOpen(false);
		setSelectedScholarship(null);
	};

	const filtered = ALL_SCHOLARSHIPS.filter(
		(s) => cat === "All" || s.cat === cat,
	)
		.filter((s) => level === "All" || s.level === level)
		.filter(
			(s) =>
				state === "All India" || s.state === state || s.state === "All India",
		)
		.filter((s) => source === "All" || s.source === source)
		.filter((s) => {
			const raw = parseInt(s.amount.replace(/[₹,]/g, ""));
			return raw >= minAmt;
		})
		.filter(
			(s) =>
				!search ||
				s.title.toLowerCase().includes(search.toLowerCase()) ||
				s.org.toLowerCase().includes(search.toLowerCase()),
		)
		.filter((s) => (showSavedOnly ? saved.has(s.id) : true))
		.sort((a, b) => {
			if (sort === SORTS[0]) return a.daysLeft - b.daysLeft;
			if (sort === SORTS[1]) {
				return (
					parseInt(b.amount.replace(/[₹,]/g, "")) -
					parseInt(a.amount.replace(/[₹,]/g, ""))
				);
			}
			return 0;
		});

	const activeChips = [
		cat !== "All" && cat,
		level !== "All" && level,
		state !== "All India" && state,
		source !== "All" && source,
		showSavedOnly && "Saved",
	].filter(Boolean);

	return (
		<main className="font-pangea bg-gray-50 min-h-screen">
			<section className="bg-gradient-to-br from-[#F6FAF1] to-white border-b border-[#DDECCB] py-6 px-4">
				<div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
					<div>
						<h2 className="text-3xl font-extrabold tracking-tight">
							<span className="text-[#3B7DC8]">Scholarships</span> for your
							future
						</h2>
						<p className="text-sm text-gray-500">
							{filtered.length} opportunities found
						</p>
					</div>
					<div className="flex gap-6 text-base">
						<div>
							<span className="block font-semibold text-gray-900">1,240+</span>
							<span className="text-gray-400">total listings</span>
						</div>
						<div>
							<span className="block font-semibold text-gray-900">38</span>
							<span className="text-gray-400">closing this month</span>
						</div>
						<div>
							<span className="block font-semibold text-gray-900">95%</span>
							<span className="text-gray-400">verified</span>
						</div>
					</div>
				</div>

				<div className="max-w-7xl mx-auto mt-6 flex flex-col sm:flex-row items-center gap-3">
					<div className="flex-1 relative w-full">
						<Search
							size={16}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
						/>
						<input
							className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B7DC8]/30 transition"
							placeholder="Search scholarships by name, organisation..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					<div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-2 flex-shrink-0">
						<button
							onClick={() => setShowSavedOnly(!showSavedOnly)}
							className={`cursor-pointer flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-all ${
								showSavedOnly
									? "bg-[#EAF3DE] border-[#C0DD97] text-[#27500A]"
									: "bg-white border-gray-200 text-gray-500 hover:border-[#C0DD97]"
							}`}
						>
							<BookmarkCheck size={14} />
							Saved
						</button>
						<button
							onClick={() => setIsFilterOpen(true)}
							className="lg:hidden flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-500"
						>
							<Filter size={14} />
							Filters
						</button>
					</div>
				</div>
			</section>

			<div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
				<aside className="hidden lg:block sticky top-24 self-start">
					<div className="flex items-center justify-between mb-4">
						<span className="text-sm font-bold">Filters</span>
						<button
							onClick={clearAll}
							className="cursor-pointer text-sm text-[#3B7DC8] font-semibold hover:underline"
						>
							Clear all
						</button>
					</div>
					<FilterChips
						label="Category"
						options={CATS}
						active={cat}
						onChange={setCat}
					/>
					<FilterChips
						label="Education level"
						options={LEVELS}
						active={level}
						onChange={setLevel}
					/>
					<FilterChips
						label="State"
						options={STATES}
						active={state}
						onChange={setState}
					/>
					<FilterChips
						label="Source"
						options={SOURCES}
						active={source}
						onChange={setSource}
					/>
					<div className="mb-5">
						<p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2">
							Min. award amount
						</p>
						<input
							type="range"
							min="0"
							max="200000"
							step="5000"
							value={minAmt}
							onChange={(e) => setMinAmt(Number(e.target.value))}
							className="cursor-pointer w-full accent-[#5AAD1F]"
						/>
						<p className="text-xs font-semibold text-[#3B6D11] mt-1">
							₹{minAmt.toLocaleString("en-IN")}+
						</p>
					</div>
				</aside>

				<div>
					<div className="flex items-center justify-between flex-wrap gap-3 mb-4">
						<p className="text-sm text-gray-500">
							Showing{" "}
							<strong className="text-gray-900">
								{Math.min(visible, filtered.length)}
							</strong>{" "}
							of <strong className="text-gray-900">{filtered.length}</strong>{" "}
							scholarships
						</p>
						<div className="flex items-center gap-2 text-sm text-slate-400">
							Sort by
							<select
								value={sort}
								onChange={(e) => setSort(e.target.value)}
								className="cursor-pointer border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 outline-none focus:border-[#3B7DC8]"
							>
								{SORTS.map((s) => (
									<option key={s}>{s}</option>
								))}
							</select>
						</div>
					</div>

					{activeChips.length > 0 && (
						<div className="flex flex-wrap gap-2 mb-4">
							{activeChips.map((c) => (
								<span
									key={c}
									className="inline-flex items-center gap-1.5 bg-[#EAF3DE] border border-[#C0DD97] text-[#27500A] text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer"
									onClick={clearAll}
								>
									{c} ×
								</span>
							))}
						</div>
					)}

					<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
						{filtered.slice(0, visible).map((s) => (
							<ScholarshipCard
								key={s.id}
								s={s}
								saved={saved.has(s.id)}
								onSave={toggleSave}
								onClick={() => openModal(s)}
							/>
						))}
					</div>

					{filtered.length === 0 && (
						<div className="text-center py-16">
							<p className="text-base font-semibold text-gray-900 mb-1">
								No scholarships found
							</p>
							<p className="text-sm text-gray-400 mb-4">
								Try adjusting your filters or search term.
							</p>
							<button
								onClick={clearAll}
								className="text-[#3B7DC8] text-sm font-semibold border-b border-transparent hover:border-[#3B7DC8] transition-colors"
							>
								Clear all filters
							</button>
						</div>
					)}

					{visible < filtered.length && (
						<div className="text-center pt-6">
							<button
								onClick={() => setVisible((v) => v + 8)}
								className="text-sm font-semibold px-6 py-2.5 border border-gray-200 rounded-full text-gray-500 hover:border-[#C0DD97] hover:text-[#3B6D11] transition-all"
							>
								Load more scholarships
							</button>
						</div>
					)}
				</div>
			</div>

			{/* == MOBILE FILTER DRAWER === */}
			{isFilterOpen && (
				<div
					className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
					onClick={() => setIsFilterOpen(false)}
				>
					<div
						className="fixed right-0 top-0 h-full w-72 bg-white shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between mb-6">
							<span className="text-lg font-bold">Filters</span>
							<button onClick={() => setIsFilterOpen(false)}>
								<X size={20} />
							</button>
						</div>
						<FilterChips
							label="Category"
							options={CATS}
							active={cat}
							onChange={setCat}
						/>
						<FilterChips
							label="Education level"
							options={LEVELS}
							active={level}
							onChange={setLevel}
						/>
						<FilterChips
							label="State"
							options={STATES}
							active={state}
							onChange={setState}
						/>
						<FilterChips
							label="Source"
							options={SOURCES}
							active={source}
							onChange={setSource}
						/>
						<div className="mb-5">
							<p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">
								Min. award amount
							</p>
							<input
								type="range"
								min="0"
								max="200000"
								step="5000"
								value={minAmt}
								onChange={(e) => setMinAmt(Number(e.target.value))}
								className="w-full accent-[#5AAD1F]"
							/>
							<p className="text-xs font-semibold text-[#3B6D11] mt-1">
								₹{minAmt.toLocaleString("en-IN")}+
							</p>
						</div>
						<button
							onClick={() => {
								clearAll();
								setIsFilterOpen(false);
							}}
							className="w-full text-sm font-semibold text-[#3B7DC8] border border-[#3B7DC8] rounded-xl py-2 mt-4 hover:bg-[#3B7DC8] hover:text-white transition-colors"
						>
							Clear all filters
						</button>
					</div>
				</div>
			)}

			{isModalOpen && (
				<ScholarshipModal
					scholarship={selectedScholarship}
					onClose={closeModal}
				/>
			)}
		</main>
	);
}

export default Scholarships;
