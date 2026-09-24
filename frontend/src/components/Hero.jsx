import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import heroPhoto from "../assets/images/hero-image.jpg";

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
		{ label: "AICTE Pragati", query: "Pragati" },
		{ label: "Central Sector CSSS", query: "CSSS" },
		{ label: "Post-Matric Schemes", query: "Post-Matric" },
		{ label: "Specially Abled (Saksham)", query: "Saksham" },
		{ label: "Girl Students", query: "Girl" },
	];

	const metrics = [
		{ value: "55+", label: "Verified schemes" },
		{ value: "5 Tiers", label: "Govt, State, CSR" },
		{ value: "₹0", label: "Free for students" },
	];

	return (
		<div className="relative overflow-hidden bg-[#E9F0EA] pt-8 pb-16 sm:pt-10 sm:pb-20 md:pt-12 md:pb-24 border-b-[1.5px] border-emerald-950/15">
			<div className="mx-auto max-w-7xl px-5 sm:px-8">
				<div className="grid grid-cols-1 gap-12 items-center lg:grid-cols-12 lg:gap-8 xl:gap-14">
					<div className="lg:col-span-7 flex flex-col gap-5 sm:gap-6">
						<h1
							className="font-serif text-emerald-950 leading-[1.04] tracking-tight font-medium"
							style={{ fontSize: "clamp(2.5rem, 5.8vw, 4.25rem)" }}
						>
							Find scholarships
							<br className="hidden sm:block" /> that actually{" "}
							<span className="ud-display font-extrabold underline decoration-yellow-300 decoration-4 underline-offset-4 text-emerald-950">
								fit you
							</span>
							.
						</h1>

						<p className="text-emerald-950/70 text-base sm:text-lg max-w-xl leading-relaxed font-medium">
							No endless searching. Just relevant scholarships matched to your
							course, category, academics, and family income.
						</p>

						<form
							onSubmit={handleSearch}
							className={`flex flex-col sm:flex-row items-center gap-2 max-w-xl pt-1 w-full rounded-2xl border-[1.5px] border-emerald-950 bg-white p-2 pl-4 focus-within:ring-4 focus-within:ring-yellow-200 transition`}
						>
							<div className="relative flex-1 min-w-0 flex items-center gap-2 w-full sm:w-auto">
								<Search size={18} className="shrink-0 text-emerald-950/45" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search by course, category, or scholarship..."
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

						<div className="flex items-center gap-2 pt-0.5 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto sm:flex-wrap sm:overflow-visible no-scrollbar">
							<span className="text-xs font-bold text-emerald-950/60 shrink-0">
								Popular:
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
									className={`cursor-pointer inline-flex items-center rounded-full border-[1.5px] border-emerald-950/20 bg-white/70 hover:border-emerald-950 px-3.5 py-1 text-xs font-semibold text-emerald-950 transition ${focusRing} shrink-0 whitespace-nowrap`}
								>
									{t.label}
								</button>
							))}
						</div>
					</div>

					<div className="lg:col-span-5 flex justify-center">
						<div className="relative w-full max-w-sm sm:max-w-md pb-8 sm:pb-10">
							<div className="overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(2,44,34,1)]">
								<div className="relative w-full aspect-[4/3.8] rounded-xl overflow-hidden bg-emerald-50">
									<img
										src={heroPhoto}
										alt="Students preparing scholarship applications in library"
										width="448"
										height="380"
										fetchPriority="high"
										loading="eager"
										decoding="async"
										className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700 ease-out"
									/>
									<div className="absolute top-3.5 right-3.5 hidden sm:flex items-center gap-1.5 bg-emerald-950/85 backdrop-blur-md rounded-full px-3 py-1 text-xs font-bold text-white border border-white/10">
										<Sparkles size={12} className="text-yellow-300" />
										<span>Updated daily</span>
									</div>
								</div>
							</div>

							<div className="absolute -bottom-2 sm:-bottom-3 inset-x-3 sm:inset-x-5 bg-white rounded-2xl p-3.5 sm:p-4 shadow-md border-[1.5px] border-emerald-950">
								<div className="grid grid-cols-3 divide-x divide-dashed divide-emerald-950/20">
									{metrics.map((m) => (
										<div key={m.label} className="text-center px-1 sm:px-2">
											<div className="ud-display text-xl sm:text-2xl font-extrabold text-emerald-950">
												{m.value}
											</div>
											<div className="text-xs font-semibold text-emerald-950/65 mt-0.5 leading-tight truncate">
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
