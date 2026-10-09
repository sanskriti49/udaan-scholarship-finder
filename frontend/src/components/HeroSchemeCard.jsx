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
import "./hero.css";

// Scheme metadata and numerical behavior are retained from the existing component.
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

	// Adds keyboard arrow/Home/End support to the existing tab buttons.
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
		<div className="uh-card-stack">
			<article
				className="uh-scheme-card"
				aria-label="Interactive scholarship preview"
			>
				<div className="uh-card-masthead">
					<div className="uh-card-masthead-title">
						<span className="uh-card-masthead-icon" aria-hidden="true">
							<Landmark size={16} />
						</span>
						<span>SCHOLARSHIP SPOTLIGHT</span>
					</div>
					<span className="uh-card-page">
						0{activeIdx + 1} <span>/ 0{SCHEMES.length}</span>
					</span>
				</div>

				<div
					className="uh-card-tabs"
					role="tablist"
					aria-label="Popular scholarship examples"
				>
					{SCHEMES.map((s, idx) => (
						<button
							ref={(element) => {
								tabRefs.current[idx] = element;
							}}
							type="button"
							role="tab"
							aria-selected={idx === activeIdx}
							aria-controls="uh-scheme-tab-panel"
							id={`uh-scheme-tab-${idx}`}
							tabIndex={idx === activeIdx ? 0 : -1}
							key={s.id}
							onClick={() => handleSwitch(idx)}
							onKeyDown={(e) => handleTabKeyDown(e, idx)}
							className={`uh-card-tab ${idx === activeIdx ? "is-active" : ""}`}
						>
							{s.tab}
						</button>
					))}
				</div>

				<div
					id="uh-scheme-tab-panel"
					role="tabpanel"
					aria-labelledby={`uh-scheme-tab-${activeIdx}`}
					className="uh-card-body"
				>
					<div className="uh-card-meta">
						<span className={`uh-scheme-tag ${activeScheme.badgeTheme}`}>
							<CategoryMotifIcon category={activeScheme.category} size={18} />
							{activeScheme.tag}
						</span>
						<TearOffCountdown
							deadline={activeScheme.deadline || deadline}
							compact
						/>
					</div>

					<div className="uh-card-title-block" key={activeScheme.id}>
						<h3 className="uh-card-title font-georgia">{activeScheme.title}</h3>
						<p>{activeScheme.authority}</p>
					</div>

					<div className="uh-grant-block">
						<div className="uh-grant-content">
							<span className="uh-grant-label">POTENTIAL SUPPORT</span>
							<div className="uh-grant-amount">
								₹
								<CountUp
									key={activeScheme.id}
									value={activeScheme.payout}
									duration={800}
								/>
								<span>{activeScheme.payoutSub}</span>
							</div>
							<span className="uh-grant-detail">
								{activeScheme.payoutLabel}
							</span>
						</div>
						<div className="uh-grant-character" aria-hidden="true">
							<CoinHugger size={71} />
						</div>
					</div>

					<div className="uh-income-section">
						<div className="uh-income-heading">
							<div className="uh-income-heading-left">
								<SlidersHorizontal size={17} aria-hidden="true" />
								<label htmlFor="hero-income">Annual family income</label>
							</div>
							<output htmlFor="hero-income" className="uh-income-amount">
								{lakh(income)} <small>/ yr</small>
							</output>
						</div>
						<p className="uh-income-caption">
							Drag the slider to explore this scheme's income limit.
						</p>

						<div className="uh-range-wrap">
							<input
								id="hero-income"
								className="uh-income-range"
								type="range"
								min="0"
								max={activeScheme.max}
								step="25000"
								value={income}
								onChange={(e) => setIncome(+e.target.value)}
								aria-valuetext={`${lakh(income)} annual family income`}
								style={{
									background: `linear-gradient(to right, #8dd8ae 0 ${limitPct}%, #f3c8b9 ${limitPct}% 100%)`,
								}}
							/>
							<div className="uh-range-ticks" aria-hidden="true">
								<span>₹0</span>
								<span
									className="uh-range-limit"
									style={{ left: `${limitPct}%` }}
								>
									{lakh(activeScheme.limit)} limit
								</span>
								<span>{lakh(activeScheme.max)}</span>
							</div>
						</div>

						<div
							className={`uh-income-verdict ${ok ? "is-within" : "is-over"}`}
							aria-live="polite"
						>
							<span className="uh-verdict-icon" aria-hidden="true">
								{ok ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}
							</span>
							<div key={`${activeScheme.id}-${ok}`}>
								<strong>
									{ok
										? "Within the income limit"
										: "Above this scheme's income limit"}
								</strong>
								<p>
									{ok ? activeScheme.eligibleNote : activeScheme.ineligibleNote}
								</p>
							</div>
						</div>
						<p className="uh-verdict-disclaimer">
							<Info size={13} aria-hidden="true" /> Income is only one
							eligibility factor.
						</p>
					</div>
				</div>

				<div className="uh-card-bottom">
					<div>
						<span className="uh-card-bottom-overline">
							WANT THE FULL DETAILS?
						</span>
						<p>Requirements, documents & how to apply.</p>
					</div>
					<button
						type="button"
						className="uh-view-button"
						onClick={handleViewClick}
					>
						<span>Explore scheme</span>
						<ArrowUpRight size={18} aria-hidden="true" />
					</button>
				</div>
			</article>
		</div>
	);
}
