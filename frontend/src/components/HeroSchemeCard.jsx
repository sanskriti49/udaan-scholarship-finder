import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { CategoryMotifIcon } from "./CategoryMotif";
import { Stamp } from "./PageKit";
import { CoinHugger } from "./AnimatedIllustrations";
import { TearOffCountdown } from "./SignatureInteractions";
import { CountUp } from "./MotionKit";

export const SCHEMES = [
	{
		id: "all_degrees",
		tab: "All Degrees (NSP)",
		tag: "All streams · All genders",
		badgeTheme: "border-[#047857] bg-[#F0FDF9] text-[#065F46]",
		category: "Merit & Means",
		title: "Central Sector Scheme (NSP)",
		authority: "Dept of Higher Education · Ministry of Education",
		limit: 450000,
		max: 1000000,
		payout: 20000,
		payoutSub: "/ year",
		payoutLabel: "Direct bank transfer",
		eligibleNote: "Regular college degree (UG/PG), 80th percentile in 12th board.",
		ineligibleNote: "Family income over ₹4.5L/yr. Try state or private trusts!",
		searchQuery: "Central Sector Scheme",
		deadline: "2026-10-31",
	},
	{
		id: "stem_tech",
		tab: "STEM & Tech",
		tag: "Degree & Diploma",
		badgeTheme: "border-[#1E40AF] bg-[#EFF6FF] text-[#1E40AF]",
		category: "STEM",
		title: "AICTE Technical Degree Grant",
		authority: "Ministry of Education · Govt of India",
		limit: 800000,
		max: 1200000,
		payout: 50000,
		payoutSub: "/ year",
		payoutLabel: "Tuition + contingency",
		eligibleNote: "First-year technical degree or diploma (Engineering, Architecture, Pharmacy).",
		ineligibleNote: "Just over the ₹8L limit. Merit & state schemes still fit.",
		searchQuery: "AICTE",
		deadline: "2026-10-31",
	},
	{
		id: "post_matric",
		tab: "Post-Matric DBT",
		tag: "Fee waiver + grant",
		badgeTheme: "border-[#854D0E] bg-[#FEFCE8] text-[#854D0E]",
		category: "Government",
		title: "National Post-Matric Scholarship",
		authority: "Direct Benefit Transfer (DBT) · Govt of India",
		limit: 250000,
		max: 800000,
		payout: 48000,
		payoutSub: "/ yr (avg)",
		payoutLabel: "100% Tuition + hostel",
		eligibleNote: "Post-matric studies, SC/ST/OBC/EWS & freeship eligible students.",
		ineligibleNote: "Above ₹2.5L ceiling for full DBT. State partial waivers available.",
		searchQuery: "Post Matric",
		deadline: "2026-11-15",
	},
];

const lakh = (n) => `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L`;

const CSS = `
.hs-range{-webkit-appearance:none;appearance:none;width:100%;height:16px;border-radius:999px;
 border:1.5px solid #022c22;cursor:pointer;}
.hs-range::-webkit-slider-thumb{-webkit-appearance:none;width:30px;height:30px;border-radius:50%;
 background:#fde047;border:2px solid #022c22;box-shadow:0 3px 0 #022c22;transition:transform .15s}
.hs-range::-moz-range-thumb{width:26px;height:26px;border-radius:50%;background:#fde047;
 border:2px solid #022c22;box-shadow:0 3px 0 #022c22}
.hs-range:active::-webkit-slider-thumb{transform:scale(1.15) translateY(2px);box-shadow:0 1px 0 #022c22}
.hs-range:focus-visible{outline:3px solid #143621;outline-offset:4px}
@keyframes hs-bob{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-7px) rotate(4deg)}}
.hs-bob{animation:hs-bob 3.2s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.hs-bob{animation:none}}
`;

/* A scholarship "ticket": top = interactive scheme tabs + fit meter, tear line, bottom = payout stub. */
export default function HeroSchemeCard({ deadline, onView }) {
	const [activeIdx, setActiveIdx] = useState(0);
	const activeScheme = SCHEMES[activeIdx];

	const [income, setIncome] = useState(350000);
	const ok = income <= activeScheme.limit;

	const limitPct = Math.min(100, (activeScheme.limit / activeScheme.max) * 100);

	const handleSwitch = (idx) => {
		setActiveIdx(idx);
		const targetScheme = SCHEMES[idx];
		if (income > targetScheme.max) {
			setIncome(targetScheme.limit);
		}
	};

	const handleViewClick = () => {
		if (onView) {
			onView(activeScheme.searchQuery || activeScheme);
		}
	};

	return (
		<div className="relative mx-auto w-full max-w-md lg:ml-auto lg:mr-0">
			<style>{CSS}</style>

			<div className="absolute -right-3 -top-5 z-20">
				<Stamp
					slam
					delay={0.4}
					tilt={7}
					className="border-[#047857] bg-[#F0FDF9] text-base text-[#064E3B]"
				>
					Verified
				</Stamp>
			</div>

			<article className="relative rounded-3xl border-2 border-emerald-950 bg-white shadow-[7px_7px_0_0_#022c22]">
				{/* top half */}
				<div className="p-6 pb-5 sm:p-7 sm:pb-6">
					{/* Interactive scheme switcher tabs */}
					<div
						role="tablist"
						aria-label="Popular scheme examples"
						className="mb-4 flex items-center gap-1 rounded-full border-[1.5px] border-emerald-950/20 bg-emerald-50/70 p-1"
					>
						{SCHEMES.map((s, idx) => {
							const active = idx === activeIdx;
							return (
								<button
									key={s.id}
									type="button"
									role="tab"
									aria-selected={active}
									onClick={() => handleSwitch(idx)}
									className={`cursor-pointer flex-1 rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
										active
											? "border-[1.5px] border-emerald-950 bg-white text-emerald-950 shadow-[1.5px_1.5px_0_0_#022c22]"
											: "border-[1.5px] border-transparent text-emerald-950/60 hover:text-emerald-950 hover:bg-white/50"
									}`}
								>
									{s.tab}
								</button>
							);
						})}
					</div>

					<div className="flex items-center justify-between gap-3">
						<span
							key={activeScheme.id + "-badge"}
							className={`ud-pop-in inline-flex items-center gap-1.5 rounded-full border-[1.5px] py-1 pl-1.5 pr-3 text-xs font-bold ${activeScheme.badgeTheme}`}
						>
							<CategoryMotifIcon category={activeScheme.category} size={18} />
							{activeScheme.tag}
						</span>
						<TearOffCountdown
							deadline={activeScheme.deadline || deadline}
							compact
						/>
					</div>

					<h3
						key={activeScheme.id + "-title"}
						className="ud-display ud-pop-in mt-4 text-2xl font-extrabold leading-[1.1] sm:text-[1.75rem]"
					>
						{activeScheme.title}
					</h3>
					<p
						key={activeScheme.id + "-auth"}
						className="ud-pop-in mt-1.5 text-sm font-medium text-emerald-950/60"
					>
						{activeScheme.authority}
					</p>

					{/* fit meter */}
					<div className="mt-6">
						<div className="mb-3 flex items-center justify-between text-sm font-bold">
							<label htmlFor="hero-income">Slide your family income</label>
							<span className="ud-display rounded-full bg-emerald-950 px-3 py-0.5 text-sm text-white">
								{lakh(income)} / yr
							</span>
						</div>
						<input
							id="hero-income"
							className="hs-range"
							type="range"
							min="0"
							max={activeScheme.max}
							step="25000"
							value={income}
							onChange={(e) => setIncome(+e.target.value)}
							style={{
								background: `linear-gradient(to right,#6ee7b7 0 ${limitPct}%,#fecdd3 ${limitPct}% 100%)`,
							}}
						/>
						<div
							className="relative mt-1.5 h-4 text-[11px] font-bold text-emerald-950/50"
							aria-hidden
						>
							<span className="absolute left-0">₹0</span>
							<span
								className="absolute -translate-x-1/2 transition-[left] duration-300"
								style={{ left: `${limitPct}%` }}
							>
								{lakh(activeScheme.limit)} limit
							</span>
							<span className="absolute right-0">{lakh(activeScheme.max)}</span>
						</div>

						<p
							key={`${activeScheme.id}-${ok}`}
							aria-live="polite"
							className={`ud-pop-in mt-3 flex items-center gap-2.5 rounded-2xl border-[1.5px] px-3.5 py-2.5 text-sm font-bold ${
								ok
									? "border-emerald-700 bg-emerald-50 text-emerald-900"
									: "border-rose-400 bg-rose-50 text-rose-800"
							}`}
						>
							<span className="text-2xl leading-none" aria-hidden>
								{ok ? "🎉" : "🥲"}
							</span>
							<span>
								{ok ? "You may qualify!" : "Above this scheme's limit."}
								<span className="block text-xs font-medium opacity-75">
									{ok ? activeScheme.eligibleNote : activeScheme.ineligibleNote}
								</span>
							</span>
						</p>
					</div>
				</div>

				{/* tear line with punched notches */}
				<div className="relative border-t-2 border-dashed border-emerald-950/40">
					<span
						aria-hidden
						className="absolute -left-[13px] -top-[13px] h-6 w-6 rounded-full border-2 border-emerald-950 bg-[#E9F0EA] [clip-path:inset(0_0_0_50%)]"
					/>
					<span
						aria-hidden
						className="absolute -right-[13px] -top-[13px] h-6 w-6 rounded-full border-2 border-emerald-950 bg-[#E9F0EA] [clip-path:inset(0_50%_0_0)]"
					/>
				</div>

				{/* stub */}
				<div className="flex items-center justify-between gap-3 rounded-b-3xl bg-yellow-200/60 px-6 py-4 sm:px-7">
					<div className="flex items-center gap-3">
						<span className="hs-bob hidden shrink-0 sm:block">
							<CoinHugger size={46} />
						</span>
						<div>
							<p className="text-xs font-bold text-emerald-950/60">
								{activeScheme.payoutLabel}
							</p>
							<p className="ud-display text-3xl font-extrabold leading-none">
								₹<CountUp key={activeScheme.id} value={activeScheme.payout} duration={800} />
								<span className="ml-1 font-sans text-sm font-semibold text-emerald-950/60">
									{activeScheme.payoutSub}
								</span>
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={handleViewClick}
						className="btn-fluid inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-full border-2 border-emerald-950 bg-emerald-800 px-5 py-2 text-sm font-bold text-white shadow-[0_3px_0_#022c22] hover:bg-emerald-900 active:translate-y-[2px] active:shadow-none focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
					>
						View <ArrowUpRight size={15} />
					</button>
				</div>
			</article>
		</div>
	);
}
