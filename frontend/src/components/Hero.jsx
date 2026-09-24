import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	Search,
	ArrowRight,
	ShieldCheck,
	Clock,
	ArrowUpRight,
	CheckCircle2,
} from "lucide-react";
import { CategoryMotifIcon } from "./CategoryMotif";
import { Stamp } from "./PageKit";
import {
	ShockedStudent,
	CornerPeeker,
	CoinHugger,
	DoodleSparkle,
} from "./AnimatedIllustrations";

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

function Hero() {
	const [searchQuery, setSearchQuery] = useState("");
	const navigate = useNavigate();

	const handleSearch = (e) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			navigate(
				`/scholarships?search=${encodeURIComponent(searchQuery.trim())}`,
			);
		} else {
			navigate("/scholarships");
		}
	};

	const quickTags = [
		{ label: "AICTE Pragati", query: "Pragati", category: "Women & Girls" },
		{ label: "Central Sector CSSS", query: "CSSS", category: "Merit-Based" },
		{
			label: "Post-Matric Schemes",
			query: "Post-Matric",
			category: "Government",
		},
		{ label: "STEM Grants", query: "STEM", category: "STEM & Tech Grants" },
		{ label: "Saksham (PwD)", query: "Saksham", category: "Special / PwD" },
	];

	const proofPoints = [
		{
			stat: "55+",
			title: "Verified Official Schemes",
			desc: "NSP, AICTE, State & CSR",
			icon: "government",
		},
		{
			stat: "100%",
			title: "Direct Genuine Links",
			desc: "Zero third-party redirects",
			icon: "stem",
		},
		{
			stat: "₹0",
			title: "Free for Every Student",
			desc: "No paywalls or sponsored ads",
			icon: "merit",
		},
		{
			stat: "Live",
			title: "Daily Official Scans",
			desc: "Deadlines verified at source",
			icon: "need",
		},
	];

	return (
		<div className="relative overflow-hidden bg-[#E9F0EA] pt-8 pb-14 sm:pt-12 sm:pb-20 md:pt-14 md:pb-24 border-b-[1.5px] border-emerald-950/15">
			{/* Subtle background drafting grid texture */}
			<div
				className="absolute inset-0 opacity-[0.035] pointer-events-none"
				style={{
					backgroundImage: `radial-gradient(#022c22 1px, transparent 1px)`,
					backgroundSize: "24px 24px",
				}}
			/>

			<div className="relative mx-auto max-w-7xl px-5 sm:px-8">
				<div className="grid grid-cols-1 gap-12 items-center lg:grid-cols-12 lg:gap-8 xl:gap-14">
					{/* Left Column: Headlines & Search Discovery */}
					<div className="lg:col-span-7 flex flex-col gap-5 sm:gap-6">
						<div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-900 uppercase">
							<span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
							<span>
								Verified Scholarship Intelligence · Zero Platform Fees
							</span>
						</div>

						<h1
							className="font-georgia font-medium text-emerald-950 leading-[0.98] tracking-tight"
							style={{ fontSize: "clamp(2.6rem, 5.8vw, 4.45rem)" }}
						>
							Less scrolling.
							<br />
							More{" "}
							<span className="ud-display inline-block relative font-extrabold underline decoration-yellow-300 decoration-[5px] underline-offset-6 text-emerald-950">
								“wait, I qualify for this?”
								<span className="absolute -top-14 -right-20 hidden md:inline-flex transform rotate-6 hover:rotate-0 transition-transform pointer-events-none">
									<ShockedStudent
										size={66}
										showBubble={true}
										bubbleText="Wait... ME?!"
									/>
								</span>
							</span>
						</h1>

						<p className="text-emerald-950/75 text-base sm:text-lg max-w-xl leading-relaxed font-sans font-medium">
							No endless searching through PDF gazettes. We cross-check genuine
							government notices against your course, caste category, academics,
							and family income.
						</p>

						{/* Central Search Discovery Bar */}
						<form
							onSubmit={handleSearch}
							className={`flex flex-col sm:flex-row items-center gap-2 max-w-xl pt-1 w-full rounded-2xl border-[1.5px] border-emerald-950 bg-white p-2 pl-4 focus-within:ring-4 focus-within:ring-yellow-200 transition shadow-[4px_4px_0px_0px_rgba(2,44,34,0.15)]`}
						>
							<div className="relative flex-1 min-w-0 flex items-center gap-2 w-full sm:w-auto">
								<Search size={18} className="shrink-0 text-emerald-950/45" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search scheme, course, or state (e.g., Pragati, B.Tech, UP)..."
									className="w-full bg-transparent py-2 text-sm sm:text-base font-semibold text-emerald-950 placeholder:text-emerald-950/35 focus:outline-none"
								/>
							</div>
							<button
								type="submit"
								className={`w-full sm:w-auto px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:translate-y-px text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${focusRing}`}
							>
								<span>Explore catalog</span>
								<ArrowRight size={15} />
							</button>
						</form>

						{/* Curated Category Quick Tags */}
						<div className="flex items-center gap-2 pt-0.5 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto sm:flex-wrap sm:overflow-visible no-scrollbar">
							<span className="text-xs font-bold text-emerald-950/60 shrink-0">
								Popular schemes:
							</span>
							{quickTags.map((t) => (
								<button
									key={t.label}
									type="button"
									onClick={() =>
										navigate(
											`/scholarships?search=${encodeURIComponent(t.query)}`,
										)
									}
									className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950/20 bg-white/80 hover:border-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-950 transition hover:-translate-y-0.5 ${focusRing} shrink-0 whitespace-nowrap shadow-2xs`}
								>
									<CategoryMotifIcon category={t.category} size={14} />
									<span>{t.label}</span>
								</button>
							))}
						</div>
					</div>

					{/* Right Column: Layered, Asymmetric Illustrated Discovery Visual */}
					<div className="lg:col-span-5 flex justify-center relative">
						<div className="relative w-full max-w-sm sm:max-w-md">
							{/* Floating Category Orbit Stamp: Top-Left */}
							<div className="absolute -top-6 -left-6 z-20 hidden sm:block animate-subtle-float">
								<Stamp
									tilt={-6}
									className="bg-[#FEF9EE] border-[#B45309] text-[#78350F] shadow-xs"
								>
									<div className="flex items-center gap-1.5">
										<CategoryMotifIcon category="Merit-Based" size={17} />
										<span>100% VERIFIED</span>
									</div>
								</Stamp>
							</div>

							{/* Floating Category Orbit Stamp: Top-Right */}
							<div className="absolute -top-4 -right-4 z-20 hidden sm:block">
								<Stamp
									tilt={5}
									className="bg-[#F0FDF9] border-[#047857] text-[#064E3B] shadow-xs"
								>
									<div className="flex items-center gap-1.5">
										<CategoryMotifIcon category="STEM" size={17} />
										<span>NSP TRACKED</span>
									</div>
								</Stamp>
							</div>

							{/* Main Discovery Anchor Card (Editorial Scholarship Preview) */}
							<div className="relative z-10 rounded-2xl border-[1.5px] border-emerald-950 bg-white p-5 sm:p-6 shadow-[6px_6px_0px_0px_rgba(2,44,34,1)] transition-transform hover:-translate-y-1 duration-200">
								{/* Cute peeker on the top right edge */}
								<div className="absolute -top-5 right-16 hidden sm:block pointer-events-none z-30">
									<CornerPeeker size={44} />
								</div>

								{/* Card Illustrated Header */}
								<div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-dashed border-emerald-950/15">
									<div className="flex items-center gap-2">
										<div className="w-8 h-8 rounded-lg bg-[#FDF2F8] border-[1.5px] border-[#9D174D] flex items-center justify-center shrink-0">
											<CategoryMotifIcon category="Women & Girls" size={20} />
										</div>
										<div>
											<span className="text-[11px] font-black uppercase tracking-wider text-[#9D174D] block">
												Flagship Scheme
											</span>
											<span className="text-xs font-semibold text-emerald-950/60 leading-none">
												AICTE Approved
											</span>
										</div>
									</div>

									<span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-emerald-950 bg-yellow-200 px-2.5 py-0.5 text-xs font-bold text-emerald-950">
										<Clock size={11} />
										<span>Closes 31 Oct</span>
									</span>
								</div>

								{/* Scholarship Title & Body */}
								<h3 className="ud-display text-xl sm:text-2xl font-bold text-emerald-950 leading-tight">
									AICTE Pragati Scholarship for Girl Students
								</h3>
								<p className="text-xs text-emerald-950/60 mt-1 font-sans">
									Ministry of Education · Govt of India
								</p>

								{/* Verified Eligibility Clause Highlight */}
								<div className="mt-3.5 p-3 rounded-xl bg-[#FAF9F6] border border-dashed border-emerald-950/20 text-xs font-medium text-emerald-950/80 space-y-1.5">
									<div className="flex items-center gap-1.5 text-emerald-800 font-bold">
										<CheckCircle2 size={13} className="shrink-0" />
										<span>Official Eligibility Verified:</span>
									</div>
									<p className="pl-4 text-[11px] text-emerald-950/70 leading-relaxed font-sans">
										Admitted to 1st year technical degree · Family income ≤ ₹8.0
										Lakh/year · Max 2 girls per family.
									</p>
								</div>

								{/* Card Bottom Grant Value + Action */}
								<div className="mt-4 pt-3.5 border-t-[1.5px] border-emerald-950/15 flex items-center justify-between">
									<div className="flex items-center gap-2">
										<CoinHugger
											size={42}
											className="shrink-0 hidden xs:block"
										/>
										<div>
											<span className="ud-display text-2xl sm:text-3xl font-extrabold text-emerald-950">
												₹50,000
											</span>
											<span className="text-xs font-semibold text-emerald-950/55 ml-1 font-sans">
												/ year
											</span>
										</div>
									</div>

									<button
										type="button"
										onClick={() => navigate("/scholarships?search=Pragati")}
										className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-emerald-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-900 active:translate-y-px shadow-2xs"
									>
										<span>View scheme</span>
										<ArrowUpRight size={13} />
									</button>
								</div>
							</div>

							{/* Floating Stamp: Bottom-Left */}
							<div className="absolute -bottom-4 -left-4 z-20 hidden sm:block">
								<Stamp
									tilt={-4}
									className="bg-[#F2F7F4] border-[#1B432A] text-[#143621] shadow-xs"
								>
									<div className="flex items-center gap-1.5">
										<CategoryMotifIcon category="Government" size={16} />
										<span>ZERO ADS · ₹0 CHARGES</span>
									</div>
								</Stamp>
							</div>
						</div>
					</div>
				</div>

				{/* Loose scattered row of real metrics / proof points (replacing boxed stat-bar) */}
				<div className="mt-14 pt-8 border-t-[1.5px] border-dashed border-emerald-950/20">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
						{proofPoints.map((item, idx) => (
							<div
								key={item.title}
								className={`flex items-start gap-3.5 transition-transform hover:-translate-y-0.5 ${
									idx % 2 === 1 ? "sm:translate-y-1" : ""
								}`}
							>
								<div className="w-10 h-10 rounded-xl border-[1.5px] border-emerald-950/25 bg-white flex items-center justify-center shrink-0 shadow-2xs">
									<CategoryMotifIcon category={item.icon} size={22} />
								</div>
								<div className="min-w-0">
									<div className="ud-display text-2xl sm:text-3xl font-extrabold text-emerald-950 leading-none">
										{item.stat}
									</div>
									<div className="text-xs font-bold text-emerald-950 mt-1 truncate">
										{item.title}
									</div>
									<div className="text-[11px] text-emerald-950/60 font-sans leading-tight mt-0.5">
										{item.desc}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export default Hero;
