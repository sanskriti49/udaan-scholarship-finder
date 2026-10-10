import { useRef, useState } from "react";
import {
	ArrowUpRight,
	CheckCircle2,
	CircleAlert,
	Info,
	SlidersHorizontal,
	Landmark,
} from "lucide-react";
import { CategoryMotifIcon } from "./CategoryMotif";
import { CoinHugger } from "./AnimatedIllustrations";
import { TearOffCountdown } from "./SignatureInteractions";
import { CountUp } from "./MotionKit";

// Scheme metadata and numerical behavior are unchanged.
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
		eligibleNote:
			"Regular college degree (UG/PG), 80th percentile in 12th board.",
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
		eligibleNote:
			"First-year technical degree or diploma (Engineering, Architecture, Pharmacy).",
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
		eligibleNote:
			"Post-matric studies, SC/ST/OBC/EWS & freeship eligible students.",
		ineligibleNote:
			"Above ₹2.5L ceiling for full DBT. State partial waivers available.",
		searchQuery: "Post Matric",
		deadline: "2026-11-15",
	},
];

const lakh = (n) => `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L`;

const focusRing =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2";

// Slider thumb styling for WebKit + Firefox, done with arbitrary variants.
const thumb = [
	"[&::-webkit-slider-thumb]:appearance-none",
	"[&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6",
	"[&::-webkit-slider-thumb]:rounded-full",
	"[&::-webkit-slider-thumb]:border-[5px] [&::-webkit-slider-thumb]:border-white",
	"[&::-webkit-slider-thumb]:bg-emerald-700",
	"[&::-webkit-slider-thumb]:shadow-[0_0_0_1.5px_#047857,0_4px_12px_rgba(6,78,59,0.3)]",
	"[&::-webkit-slider-thumb]:transition-transform",
	"hover:[&::-webkit-slider-thumb]:scale-110",
	"[&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6",
	"[&::-moz-range-thumb]:rounded-full",
	"[&::-moz-range-thumb]:border-[5px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-white",
	"[&::-moz-range-thumb]:bg-emerald-700",
	"[&::-moz-range-thumb]:shadow-[0_0_0_1.5px_#047857,0_4px_12px_rgba(6,78,59,0.3)]",
].join(" ");

export default function HeroSchemeCard({ deadline, onView }) {
	const [activeIdx, setActiveIdx] = useState(0);
	const activeScheme = SCHEMES[activeIdx];
	const [income, setIncome] = useState(350000);
	const tabRefs = useRef([]);
	const ok = income <= activeScheme.limit;
	const limitPct = Math.min(100, (activeScheme.limit / activeScheme.max) * 100);

	// Same tab switch and income clamping logic as before.
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

	// Keyboard arrow/Home/End support for the tab buttons.
	const handleTabKeyDown = (e, idx) => {
		let next;
		if (e.key === "ArrowRight") next = (idx + 1) % SCHEMES.length;
		else if (e.key === "ArrowLeft")
			next = (idx - 1 + SCHEMES.length) % SCHEMES.length;
		else if (e.key === "Home") next = 0;
		else if (e.key === "End") next = SCHEMES.length - 1;
		else return;
		e.preventDefault();
		handleSwitch(next);
		tabRefs.current[next]?.focus();
	};

	return (
		<div className="relative mx-auto w-full max-w-[540px]">
			{/* Soft glow behind the card */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-amber-200/60 via-emerald-200/40 to-transparent blur-3xl"
			/>

			<article
				aria-label="Interactive scholarship preview"
				className="overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-24px_rgba(16,54,43,0.35),0_2px_6px_rgba(16,54,43,0.06)] ring-1 ring-emerald-950/10"
			>
				{/* Header */}
				<div className="flex items-center justify-between px-5 pt-5 sm:px-6">
					<div className="flex items-center gap-2.5">
						<span
							aria-hidden="true"
							className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-950 text-amber-200"
						>
							<Landmark size={16} />
						</span>
						<span className="text-sm font-semibold tracking-tight text-emerald-950">
							Scholarship spotlight
						</span>
					</div>
					<div className="flex items-center gap-1.5" aria-hidden="true">
						{SCHEMES.map((s, i) => (
							<span
								key={s.id}
								className={`h-1.5 rounded-full transition-all duration-300 ${
									i === activeIdx
										? "w-6 bg-emerald-700"
										: "w-1.5 bg-emerald-900/15"
								}`}
							/>
						))}
					</div>
					<span className="sr-only">
						Scheme {activeIdx + 1} of {SCHEMES.length}
					</span>
				</div>

				{/* Tabs: segmented control */}
				<div
					role="tablist"
					aria-label="Popular scholarship examples"
					className="mx-5 mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-emerald-950/[0.05] p-1 sm:mx-6"
				>
					{SCHEMES.map((s, idx) => {
						const active = idx === activeIdx;
						return (
							<button
								ref={(element) => {
									tabRefs.current[idx] = element;
								}}
								type="button"
								role="tab"
								aria-selected={active}
								aria-controls="uh-scheme-tab-panel"
								id={`uh-scheme-tab-${idx}`}
								tabIndex={active ? 0 : -1}
								key={s.id}
								onClick={() => handleSwitch(idx)}
								onKeyDown={(e) => handleTabKeyDown(e, idx)}
								className={`min-h-11 rounded-xl px-2 py-2 text-center text-xs font-semibold leading-tight transition-all ${focusRing} ${
									active
										? "bg-white text-emerald-950 shadow-sm ring-1 ring-emerald-950/10"
										: "text-emerald-900/60 hover:bg-white/60 hover:text-emerald-950"
								}`}
							>
								{s.tab}
							</button>
						);
					})}
				</div>

				{/* Panel */}
				<div
					id="uh-scheme-tab-panel"
					role="tabpanel"
					aria-labelledby={`uh-scheme-tab-${activeIdx}`}
					className="px-5 pb-6 pt-5 sm:px-6"
				>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<span
							className={`inline-flex max-w-full items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-3 text-xs font-semibold ${activeScheme.badgeTheme}`}
						>
							<CategoryMotifIcon category={activeScheme.category} size={18} />
							{activeScheme.tag}
						</span>
						<TearOffCountdown
							deadline={activeScheme.deadline || deadline}
							compact
						/>
					</div>

					<div key={activeScheme.id} className="mt-4">
						<h3 className="font-georgia text-[1.7rem] font-bold leading-[1.1] tracking-tight text-emerald-950 sm:text-3xl">
							{activeScheme.title}
						</h3>
						<p className="mt-2 text-sm text-emerald-900/60">
							{activeScheme.authority}
						</p>
					</div>

					{/* Payout: the one loud element */}
					<div className="relative mt-5 flex min-h-32 items-center justify-between gap-3 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100 via-amber-50 to-yellow-100 p-5 ring-1 ring-amber-300/50">
						<div
							aria-hidden="true"
							className="absolute -right-10 -top-12 h-44 w-44 rounded-full border border-dashed border-amber-600/25"
						/>
						<div className="relative min-w-0">
							<span className="text-sm font-medium text-amber-900/70">
								You could receive
							</span>
							<div className="font-georgia mt-1 whitespace-nowrap text-5xl font-bold leading-none tracking-tighter text-emerald-950">
								₹
								<CountUp
									key={activeScheme.id}
									value={activeScheme.payout}
									duration={800}
								/>
								<span className="ml-1 font-sans text-sm font-medium tracking-normal text-amber-900/70">
									{activeScheme.payoutSub}
								</span>
							</div>
							<span className="mt-2 inline-block rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-amber-900/80 ring-1 ring-amber-300/60">
								{activeScheme.payoutLabel}
							</span>
						</div>
						<div
							aria-hidden="true"
							className="relative hidden shrink-0 -rotate-6 min-[380px]:block"
						>
							<div className="motion-safe:animate-float drop-shadow-lg">
								<CoinHugger size={71} />
							</div>
						</div>
					</div>

					{/* Income */}
					<div className="mt-6">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="inline-flex items-center gap-2 text-emerald-900">
								<SlidersHorizontal size={17} aria-hidden="true" />
								<label
									htmlFor="hero-income"
									className="cursor-pointer text-sm font-semibold"
								>
									Annual family income
								</label>
							</div>
							<output
								htmlFor="hero-income"
								className="whitespace-nowrap rounded-xl bg-emerald-950 px-3 py-1.5 text-lg font-bold tracking-tight text-white tabular-nums"
							>
								{lakh(income)}{" "}
								<small className="font-sans text-xs font-medium text-emerald-200/80">
									/ yr
								</small>
							</output>
						</div>
						<p className="mt-1.5 text-sm text-emerald-900/50">
							Drag the slider to explore this scheme's income limit.
						</p>

						<div className="relative pt-5">
							{/* limit marker on the track */}
							<span
								aria-hidden="true"
								className="pointer-events-none absolute top-[14px] z-20 h-6 w-0.5 -translate-x-1/2 rounded-full bg-emerald-900/40"
								style={{ left: `${limitPct}%` }}
							/>
							<input
								id="hero-income"
								type="range"
								min="0"
								max={activeScheme.max}
								step="25000"
								value={income}
								onChange={(e) => setIncome(+e.target.value)}
								aria-valuetext={`${lakh(income)} annual family income`}
								style={{
									background: `linear-gradient(to right, #6ee7b7 0 ${limitPct}%, #fecdd3 ${limitPct}% 100%)`,
								}}
								className={`relative z-10 m-0 block h-2.5 w-full cursor-pointer appearance-none rounded-full border-0 ${focusRing} ${thumb}`}
							/>
							<div
								aria-hidden="true"
								className="relative mt-3 flex h-5 justify-between text-xs font-medium text-emerald-900/50"
							>
								<span>₹0</span>
								<span
									className="absolute -translate-x-1/2 whitespace-nowrap font-semibold text-emerald-700"
									style={{ left: `${limitPct}%` }}
								>
									{lakh(activeScheme.limit)} limit
								</span>
								<span>{lakh(activeScheme.max)}</span>
							</div>
						</div>

						<div
							aria-live="polite"
							className={`mt-4 rounded-2xl border p-4 transition-colors duration-300 ${
								ok
									? "border-emerald-200 bg-emerald-50 text-emerald-900"
									: "border-rose-200 bg-rose-50 text-rose-900"
							}`}
						>
							<div
								key={`${activeScheme.id}-${ok}`}
								className="flex items-start gap-3"
							>
								<span aria-hidden="true" className="mt-0.5 flex shrink-0">
									{ok ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}
								</span>
								<div>
									<strong className="block text-sm font-semibold leading-snug">
										{ok
											? "Within the income limit"
											: "Above this scheme's income limit"}
									</strong>
									<p className="mt-1 text-sm leading-relaxed opacity-80">
										{ok
											? activeScheme.eligibleNote
											: activeScheme.ineligibleNote}
									</p>
								</div>
							</div>
						</div>
						<p className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-900/50">
							<Info size={13} aria-hidden="true" className="shrink-0" />
							Income is only one eligibility factor.
						</p>
					</div>
				</div>

				{/* Footer */}
				<div className="flex flex-col gap-3 border-t border-emerald-950/10 bg-emerald-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
					<div>
						<p className="text-sm font-semibold text-emerald-950">
							Want the full details?
						</p>
						<p className="mt-0.5 text-sm text-emerald-900/60">
							Requirements, documents and how to apply.
						</p>
					</div>
					<button
						type="button"
						onClick={handleViewClick}
						className={`group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-900 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-950 active:scale-[0.98] ${focusRing}`}
					>
						Explore scheme
						<ArrowUpRight
							size={18}
							aria-hidden="true"
							className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
						/>
					</button>
				</div>
			</article>
		</div>
	);
}
