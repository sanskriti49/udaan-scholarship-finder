import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	Search,
	ArrowRight,
	ShieldCheck,
	Sparkles,
	Award,
	CheckCircle2,
	BookmarkCheck,
} from "lucide-react";
import heroPhoto from "../assets/images/hero-image.jpg";

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
		{ label: "AICTE Pragati", query: "Pragati" },
		{ label: "Post-Matric (SC/ST/OBC)", query: "Post-Matric" },
		{ label: "Tata Trust STEM", query: "STEM" },
		{ label: "Single Girl Child", query: "Single Girl Child" },
		{ label: "Corporate CSR", query: "Corporate" },
	];

	return (
		<div className="relative overflow-hidden bg-[#FAF9F6] border-b border-slate-200/80 pt-6 pb-14 md:pt-10 md:pb-20">
			{/* Multi-shade green ambient glow */}
			<div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-100/35 rounded-full blur-3xl pointer-events-none -z-10" />
			<div className="absolute bottom-0 left-10 w-80 h-80 bg-teal-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

			<div className="mx-auto max-w-7xl px-5 sm:px-8">
				<div className="grid grid-cols-1 gap-12 items-center lg:grid-cols-12 lg:gap-10">
					{/* Left Column: Typography & Search */}
					<div className="lg:col-span-7 flex flex-col gap-5 sm:gap-6">
						{/* Subtle top kicker */}
						<div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-800 uppercase">
							<span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
							<span>SCHOLARSHIPS, WITHOUT THE GUESSWORK</span>
						</div>

						{/* Editorial Headline */}
						<h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-slate-900 leading-[1.12] tracking-tight font-normal">
							Find scholarships that{" "}
							<span className="italic font-normal text-emerald-800">
								actually fit you.
							</span>
						</h1>
						<p className="text-slate-600 text-base sm:text-lg max-w-2xl leading-relaxed font-sans">
							Discover scholarships based on your course, category, academic
							performance, and family income. Udaan helps you narrow down
							opportunities using the eligibility criteria that matter most,
							from your course and category to academic performance and family
							income.
						</p>

						{/* Interactive Search Bar */}
						<form
							onSubmit={handleSearch}
							className="flex flex-col sm:flex-row gap-2.5 max-w-xl pt-1"
						>
							<div className="relative flex-1">
								<Search
									size={18}
									className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
								/>
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search by course, category, or scholarship..."
									className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-emerald-900/60 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition"
								/>
							</div>
							<button
								type="submit"
								className="px-6 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm rounded-2xl transition shadow-xs hover:shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
							>
								<span>Explore Catalog</span>
								<ArrowRight size={15} />
							</button>
						</form>

						{/* Quick Tag Recommendations */}
						<div className="flex flex-wrap items-center gap-2 pt-0.5">
							<span className="text-xs text-slate-500 font-medium">
								Popular:
							</span>
							{quickTags.map((t) => (
								<button
									key={t.label}
									onClick={() =>
										navigate(
											`/scholarships?search=${encodeURIComponent(t.query)}`,
										)
									}
									className="text-xs text-slate-700 bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-3 py-1 rounded-full transition cursor-pointer shadow-2xs"
								>
									{t.label}
								</button>
							))}
						</div>
					</div>

					{/* Right Column: Authentic Image Integration */}
					<div className="lg:col-span-5 flex flex-col items-center">
						<div className="relative w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-sm">
							{/* Authentic Image Frame */}
							<div className="relative w-full h-72 sm:h-90 rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
								<img
									src={heroPhoto}
									alt="Students preparing scholarship applications in library"
									className="w-full h-full object-cover object-center"
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
							</div>

							{/* Metrics Grid */}
							<div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 mt-4 text-center">
								<div>
									<div className="text-2xl font-bold font-serif text-slate-900">
										37+
									</div>
									<div className="text-xs text-slate-500 font-medium mt-0.5">
										Active Schemes
									</div>
								</div>
								<div className="border-x border-slate-100">
									<div className="text-2xl font-bold font-serif text-emerald-800">
										5 Tiers
									</div>
									<div className="text-xs text-slate-500 font-medium mt-0.5">
										Govt, State, CSR
									</div>
								</div>
								<div>
									<div className="text-2xl font-bold font-serif text-slate-900">
										₹0
									</div>
									<div className="text-xs text-slate-500 font-medium mt-0.5">
										Free for Students
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Hero;
