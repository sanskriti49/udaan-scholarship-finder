import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
	Search,
	ArrowRight,
	ShieldCheck,
	ArrowUpRight,
	CheckCircle2,
	Sparkles,
} from "lucide-react";
import { CategoryMotifIcon } from "./CategoryMotif";
import { Stamp } from "./PageKit";
import {
	ShockedStudent,
	CornerPeeker,
	CoinHugger,
} from "./AnimatedIllustrations";
import { TearOffCountdown, SecretCornerKnock } from "./SignatureInteractions";
import HeroSchemeCard from "./HeroSchemeCard";

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

// Update when the featured scheme's cycle changes.
const FLAGSHIP_DEADLINE = "2026-10-31";

const QUICK_TAGS = [
	{ label: "AICTE Pragati", query: "Pragati", category: "Women & Girls" },
	{ label: "Central Sector CSSS", query: "CSSS", category: "Merit-Based" },
	{ label: "Post-Matric", query: "Post-Matric", category: "Government" },
	{ label: "STEM grants", query: "STEM", category: "STEM & Tech Grants" },
];

// Students often don't know scheme names, so the placeholder teaches by example.
const PLACEHOLDERS = [
	"Pragati",
	"B.Tech scholarship in UP",
	"girls in STEM",
	"Post-Matric",
	"PwD scholarships",
];

const PROOF_POINTS = [
	{
		stat: "55+",
		title: "Verified schemes",
		desc: "NSP, AICTE, state and CSR",
		icon: "government",
	},
	{
		stat: "100%",
		title: "Official links only",
		desc: "No third-party redirects",
		icon: "stem",
	},
	{
		stat: "₹0",
		title: "Free, always",
		desc: "No paywalls or sponsored ads",
		icon: "merit",
	},
	{
		stat: "Live",
		title: "Checked daily",
		desc: "Deadlines verified at source",
		icon: "need",
		live: true,
	},
];

function useRotatingPlaceholder(list, paused) {
	const [i, setI] = useState(0);
	useEffect(() => {
		if (
			paused ||
			window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
		)
			return;
		const id = setInterval(() => setI((n) => (n + 1) % list.length), 2400);
		return () => clearInterval(id);
	}, [paused, list.length]);
	return `Try “${list[i]}”`;
}

function Hero() {
	const [searchQuery, setSearchQuery] = useState("");
	const [focused, setFocused] = useState(false);
	const navigate = useNavigate();
	const placeholder = useRotatingPlaceholder(
		PLACEHOLDERS,
		focused || searchQuery !== "",
	);

	const go = (q) =>
		navigate(
			q ? `/scholarships?search=${encodeURIComponent(q)}` : "/scholarships",
		);
	const handleSearch = (e) => {
		e.preventDefault();
		go(searchQuery.trim());
	};

	return (
		<div className="relative overflow-hidden border-b-[1.5px] border-emerald-950/15 bg-[#E9F0EA] pt-8 pb-14 sm:pt-12 sm:pb-20 md:pt-14 md:pb-24">
			<div
				className="pointer-events-none absolute inset-0 opacity-[0.035]"
				style={{
					backgroundImage: "radial-gradient(#022c22 1px, transparent 1px)",
					backgroundSize: "24px 24px",
				}}
			/>

			<div className="relative mx-auto max-w-7xl px-5 sm:px-8">
				<div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8 xl:gap-14">
					{/* Left: headline + two ways in */}
					<div className="flex flex-col gap-5 sm:gap-6 lg:col-span-7">
						<h1
							className="font-georgia font-medium leading-[0.98] tracking-tight text-emerald-950"
							style={{ fontSize: "clamp(2.6rem, 5.8vw, 4.45rem)" }}
						>
							Less scrolling. More <br />
							<span className="ud-display relative inline-block font-extrabold underline decoration-yellow-300 decoration-[5px] underline-offset-6">
								“wait, I qualify for this?”
								<span
									className="pointer-events-none absolute -top-5 -right-16 hidden rotate-6 transition-transform hover:rotate-0 lg:inline-flex"
									aria-hidden="true"
								>
									<ShockedStudent
										size={66}
										showBubble
										bubbleText="Wait... ME?!"
									/>
								</span>
							</span>
						</h1>

						<p className="max-w-xl font-sans text-base font-medium leading-relaxed text-emerald-950/75 sm:text-lg">
							Government scholarship notices are buried in PDFs. We check them
							against your course, category, marks and family income, and show
							you only what you can actually apply for.
						</p>

						{/* Path A: I know what I'm looking for */}
						<form
							onSubmit={handleSearch}
							role="search"
							className="flex w-full max-w-xl flex-col items-center gap-2 rounded-2xl border-[1.5px] border-emerald-950 bg-white p-2 pl-4 shadow-[4px_4px_0px_0px_rgba(2,44,34,0.15)] transition focus-within:ring-4 focus-within:ring-yellow-200 sm:flex-row"
						>
							<label className="flex w-full min-w-0 flex-1 items-center gap-2 sm:w-auto">
								<Search
									size={18}
									className="shrink-0 text-emerald-950/45"
									aria-hidden="true"
								/>
								<span className="sr-only">
									Search scholarships by scheme, course or state
								</span>
								<input
									type="search"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									onFocus={() => setFocused(true)}
									onBlur={() => setFocused(false)}
									placeholder={placeholder}
									className="w-full bg-transparent py-2 text-sm font-semibold text-emerald-950 placeholder:text-emerald-950/40 focus:outline-none sm:text-base"
								/>
							</label>
							<button
								type="submit"
								className={`flex w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-800 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 active:translate-y-px sm:w-auto ${focusRing}`}
							>
								<span>Search</span>
								<ArrowRight size={15} />
							</button>
						</form>

						{/* Path B: I have no idea what exists */}
						<div className="flex max-w-xl flex-wrap items-center gap-x-3 gap-y-2 text-sm">
							<span className="font-semibold text-emerald-950/70">
								Not sure what to search?
							</span>
							<button
								type="button"
								onClick={() => navigate("/eligibility")}
								className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950 bg-yellow-200 px-4 py-1.5 text-sm font-bold text-emerald-950 shadow-[2px_2px_0px_0px_rgba(2,44,34,1)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${focusRing}`}
							>
								<Sparkles size={14} aria-hidden="true" />
								<span>Answer 3 questions</span>
							</button>
							<span className="text-xs text-emerald-950/55">
								About a minute. No passwords, no Aadhaar number.
							</span>
						</div>

						<div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pt-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
							<span className="shrink-0 text-xs font-bold text-emerald-950/60">
								Popular:
							</span>
							{QUICK_TAGS.map((t) => (
								<button
									key={t.label}
									type="button"
									onClick={() => go(t.query)}
									className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-emerald-950/20 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-950 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-950 hover:bg-white active:translate-y-0 active:scale-95 ${focusRing}`}
								>
									<CategoryMotifIcon category={t.category} size={14} />
									<span>{t.label}</span>
								</button>
							))}
							<div className="shrink-0 pl-1">
								<SecretCornerKnock />
							</div>
						</div>
					</div>

					{/* Right: one real scheme, shown the way students will see it */}
					{/* <div className="relative flex justify-center lg:col-span-5">
						<div className="relative w-full max-w-sm sm:max-w-md">
							<div className="animate-subtle-float absolute -top-6 -left-6 z-20 hidden sm:block">
								<Stamp
									tilt={-6}
									className="border-[#B45309] bg-[#FEF9EE] text-[#78350F] shadow-xs"
								>
									<div className="flex items-center gap-1.5">
										<CategoryMotifIcon category="Merit-Based" size={17} />
										<span>100% VERIFIED</span>
									</div>
								</Stamp>
							</div>
							<div className="animate-subtle-float-reverse absolute -top-4 -right-4 z-20 hidden sm:block">
								<Stamp
									tilt={5}
									className="border-[#047857] bg-[#F0FDF9] text-[#064E3B] shadow-xs"
								>
									<div className="flex items-center gap-1.5">
										<CategoryMotifIcon category="STEM" size={17} />
										<span>NSP TRACKED</span>
									</div>
								</Stamp>
							</div>

							<article className="card-fluid relative z-10 rounded-2xl border-[1.5px] border-emerald-950 bg-white p-5 shadow-[6px_6px_0px_0px_rgba(2,44,34,1)] hover:shadow-[8px_8px_0px_0px_rgba(2,44,34,1)] sm:p-6">
								<div
									className="pointer-events-none absolute -top-5 right-16 z-30 hidden sm:block"
									aria-hidden="true"
								>
									<CornerPeeker size={44} />
								</div>

								<div className="mb-3 flex items-center justify-between gap-2 border-b border-dashed border-emerald-950/15 pb-3">
									<div className="flex items-center gap-2">
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-[#9D174D] bg-[#FDF2F8]">
											<CategoryMotifIcon category="Women & Girls" size={20} />
										</div>
										<div>
											<span className="block text-xs font-bold text-[#9D174D]">
												Featured scheme
											</span>
											<span className="text-xs font-semibold leading-none text-emerald-950/60">
												AICTE approved
											</span>
										</div>
									</div>
									<TearOffCountdown deadline={FLAGSHIP_DEADLINE} compact />
								</div>

								<h3 className="ud-display text-xl font-bold leading-tight text-emerald-950 sm:text-2xl">
									AICTE Pragati Scholarship for Girl Students
								</h3>
								<p className="mt-1 font-sans text-xs text-emerald-950/60">
									Ministry of Education · Govt of India
								</p>

								<div className="mt-3.5 space-y-1.5 rounded-xl border border-dashed border-emerald-950/20 bg-[#FAF9F6] p-3 text-xs font-medium text-emerald-950/80">
									<div className="flex items-center gap-1.5 font-bold text-emerald-800">
										<CheckCircle2 size={13} className="shrink-0" />
										<span>Who can apply (from the official notice)</span>
									</div>
									<p className="pl-4 font-sans text-[11px] leading-relaxed text-emerald-950/70">
										First-year technical degree · family income up to ₹8 lakh a
										year · max 2 girls per family.
									</p>
								</div>

								<div className="mt-4 flex items-center justify-between border-t-[1.5px] border-emerald-950/15 pt-3.5">
									<div className="flex items-center gap-2">
										<CoinHugger
											size={42}
											className="hidden shrink-0 sm:block"
										/>
										<div>
											<span className="ud-display text-2xl font-extrabold text-emerald-950 sm:text-3xl">
												₹50,000
											</span>
											<span className="ml-1 font-sans text-xs font-semibold text-emerald-950/55">
												a year
											</span>
										</div>
									</div>
									<button
										type="button"
										onClick={() => go("Pragati")}
										className={`btn-fluid inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-full bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-900 ${focusRing}`}
									>
										<span>View scheme</span>
										<ArrowUpRight size={13} />
									</button>
								</div>
							</article>

							<div className="animate-subtle-float absolute -bottom-4 -left-4 z-20 hidden sm:block">
								<Stamp
									tilt={-4}
									className="border-[#1B432A] bg-[#F2F7F4] text-[#143621] shadow-xs"
								>
									<div className="flex items-center gap-1.5">
										<CategoryMotifIcon category="Government" size={16} />
										<span>ZERO ADS · ₹0 CHARGES</span>
									</div>
								</Stamp>
							</div>
						</div>
					</div> */}
					<div className="lg:col-span-5">
						<HeroSchemeCard
							deadline={FLAGSHIP_DEADLINE}
							onView={(scheme) => {
								const q = typeof scheme === "string" ? scheme : scheme?.searchQuery || "Central Sector";
								go(q);
							}}
						/>
					</div>
				</div>

				{/* Proof points */}
				<ul className="mt-14 grid grid-cols-2 gap-6 border-t-[1.5px] border-dashed border-emerald-950/20 pt-8 sm:gap-8 md:grid-cols-4">
					{PROOF_POINTS.map((item, idx) => (
						<li
							key={item.title}
							className={`flex items-start gap-3.5 ${idx % 2 === 1 ? "sm:translate-y-1" : ""}`}
						>
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-emerald-950/25 bg-white shadow-2xs">
								<CategoryMotifIcon category={item.icon} size={22} />
							</div>
							<div className="min-w-0">
								<div className="ud-display flex items-center gap-1.5 text-2xl font-extrabold leading-none text-emerald-950 sm:text-3xl">
									{item.stat}
									{item.live && (
										<span className="relative flex h-2 w-2" aria-hidden="true">
											<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
											<span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
										</span>
									)}
								</div>
								<div className="mt-1 text-xs font-bold text-emerald-950">
									{item.title}
								</div>
								<div className="mt-0.5 font-sans text-[11px] leading-tight text-emerald-950/60">
									{item.desc}
								</div>
							</div>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

export default Hero;
