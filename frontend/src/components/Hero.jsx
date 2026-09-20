import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import heroPhoto from "../assets/images/hero-image.jpg";

function Hero() {
	const [searchQuery, setSearchQuery] = useState("");
	const [mounted, setMounted] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		const t = requestAnimationFrame(() => setMounted(true));
		return () => cancelAnimationFrame(t);
	}, []);

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
		{ label: "Central Sector CSSS", query: "CSSS" },
		{ label: "Post-Matric Schemes", query: "Post-Matric" },
		{ label: "Specially Abled (Saksham)", query: "Saksham" },
		{ label: "Girl Students", query: "Girl" },
	];

	const metrics = [
		{ value: "37+", label: "Active schemes" },
		{ value: "5 Tiers", label: "Govt, state, CSR" },
		{ value: "₹0", label: "Free for students" },
	];

	return (
		<div className="relative overflow-hidden bg-[#FAF9F6] border-b border-slate-200/80 pt-8 pb-16 sm:pt-10 sm:pb-20 md:pt-14 md:pb-28">
			<div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
			<div className="absolute bottom-0 left-0 w-48 h-48 sm:w-80 sm:h-80 bg-teal-100/35 rounded-full blur-3xl pointer-events-none -z-10" />

			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-12 items-center lg:grid-cols-12 lg:gap-8 xl:gap-14">
					<div
						className={`lg:col-span-7 flex flex-col gap-5 sm:gap-6 transition-all duration-700 ease-out ${
							mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
						}`}
					>
						<div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-850 w-fit">
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-700 inline-block shrink-0" />
							<span>From eligibility to opportunity</span>
						</div>

						<h1
							className="font-serif text-slate-900 leading-[1.1] tracking-tight font-medium"
							style={{ fontSize: "clamp(2.25rem, 5.5vw, 3.75rem)" }}
						>
							Find scholarships
							<br className="hidden sm:block" /> that actually{" "}
							<span className="relative inline-block text-emerald-800">
								fit you
								<svg
									className="absolute left-0 -bottom-1 w-full"
									viewBox="0 0 200 10"
									preserveAspectRatio="none"
									aria-hidden="true"
								>
									<path
										d="M2 7 C 50 2, 150 2, 198 7"
										stroke="currentColor"
										strokeWidth="3"
										fill="none"
										strokeLinecap="round"
										className="text-emerald-300"
									/>
								</svg>
							</span>
							.
						</h1>
						<p className="text-slate-600 text-base sm:text-lg max-w-xl leading-relaxed">
							No endless searching. Just relevant scholarships matched to your
							course, category, academics, and family income.
						</p>

						<form
							onSubmit={handleSearch}
							className="flex flex-col sm:flex-row gap-2.5 max-w-xl pt-1 w-full"
						>
							<div className="relative flex-1 min-w-0">
								<Search
									size={18}
									className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
								/>
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search by course, category, or scholarship..."
									className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition"
								/>
							</div>
							<button
								type="submit"
								className="px-6 py-3.5 bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-white font-semibold text-sm rounded-2xl transition shadow-sm hover:shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
							>
								<span>Explore catalog</span>
								<ArrowRight size={15} />
							</button>
						</form>

						<div className="flex items-center gap-2 pt-0.5 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto sm:flex-wrap sm:overflow-visible no-scrollbar">
							<span className="text-xs text-slate-500 font-medium shrink-0">
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
									className="text-xs text-slate-700 bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-full transition cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
								>
									{t.label}
								</button>
							))}
						</div>
					</div>

					<div
						className={`lg:col-span-5 flex justify-center transition-all duration-700 ease-out delay-150 ${
							mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
						}`}
					>
						<div className="relative w-full max-w-sm sm:max-w-md pb-8 sm:pb-10">
							<div className="absolute -inset-2 bg-gradient-to-br from-emerald-100/60 via-teal-50/40 to-amber-50/40 rounded-[2.25rem] transform -rotate-1 pointer-events-none -z-10" />

							<div className="relative rounded-[2rem] p-2 bg-white/90 backdrop-blur-sm border border-slate-200/90 shadow-xl shadow-slate-900/5">
								<div className="relative w-full aspect-[4/3.8] rounded-[1.5rem] overflow-hidden bg-slate-100">
									<img
										src={heroPhoto}
										alt="Students preparing scholarship applications in library"
										className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700 ease-out"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-black/10 pointer-events-none" />

									<div className="absolute top-3.5 right-3.5 hidden sm:flex items-center gap-1 bg-slate-900/60 backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] font-medium text-white border border-white/10">
										<Sparkles size={11} className="text-amber-300" />
										<span>Updated daily</span>
									</div>
								</div>
							</div>

							<div className="absolute -bottom-2 sm:-bottom-3 inset-x-3 sm:inset-x-5 bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-xl shadow-slate-900/10 border border-slate-200/80">
								<div className="grid grid-cols-3 divide-x divide-slate-100">
									{metrics.map((m) => (
										<div key={m.label} className="text-center px-1 sm:px-2">
											<div className="font-sans text-lg sm:text-xl font-bold text-emerald-950">
												{m.value}
											</div>
											<div className="text-[11px] sm:text-[13px] text-emerald-950/90 font-medium mt-0.5 leading-tight truncate">
												{m.label}
											</div>
										</div>
									))}
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
