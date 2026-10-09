import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
	Search,
	ArrowRight,
	ArrowUpRight,
	Sparkles,
	Compass,
	ShieldCheck,
	BookOpen,
} from "lucide-react";
import { CategoryMotifIcon } from "./CategoryMotif";
import { ShockedStudent } from "./AnimatedIllustrations";
import { SecretCornerKnock } from "./SignatureInteractions";
import HeroSchemeCard from "./HeroSchemeCard";
import "./hero.css";

const FLAGSHIP_DEADLINE = "2026-10-31";

const QUICK_TAGS = [
	{ label: "AICTE Pragati", query: "Pragati", category: "Women & Girls" },
	{ label: "Central Sector CSSS", query: "CSSS", category: "Merit-Based" },
	{ label: "Post-Matric", query: "Post-Matric", category: "Government" },
	{ label: "STEM grants", query: "STEM", category: "STEM & Tech Grants" },
];

const PLACEHOLDERS = [
	"Pragati",
	"B.Tech scholarship in UP",
	"girls in STEM",
	"Post-Matric",
	"PwD scholarships",
];

// Existing public-facing claims are retained, not independently verified here.
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
			(typeof window !== "undefined" &&
				window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
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
	const { user } = useAuth();
	const placeholder = useRotatingPlaceholder(
		PLACEHOLDERS,
		focused || searchQuery !== "",
	);

	// All navigation behavior and query encoding are unchanged.
	const go = (q) =>
		navigate(
			q ? `/scholarships?search=${encodeURIComponent(q)}` : "/scholarships",
		);

	const handleSearch = (e) => {
		e.preventDefault();
		go(searchQuery.trim());
	};

	return (
		<section className="uh-hero" aria-labelledby="uh-hero-heading">
			<div className="uh-grid-texture" aria-hidden="true" />
			<div className="uh-orbit uh-orbit-one" aria-hidden="true" />
			<div className="uh-orbit uh-orbit-two" aria-hidden="true" />

			<div className="uh-container">
				<div className="uh-topnote">
					<span className="uh-topnote-symbol" aria-hidden="true">
						<Sparkles size={14} strokeWidth={2.2} />
					</span>
					<span>Scholarships shouldn't feel like a treasure hunt.</span>
					<span className="uh-topnote-line" aria-hidden="true" />
					<span className="uh-topnote-aside">DISCOVER • CHECK • APPLY</span>
				</div>

				<div className="uh-layout">
					<div className="uh-copy">
						<div className="uh-headline-wrap">
							<h1 id="uh-hero-heading" className="uh-headline font-georgia">
								Big dreams.
								<br />
								<span className="uh-headline-highlight">Less digging.</span>
								<br />
								More possibilities.
							</h1>
							<div className="uh-headline-doodle" aria-hidden="true">
								<ShockedStudent
									size={70}
									showBubble
									bubbleText="Wait... ME?!"
								/>
							</div>
						</div>

						<p className="uh-description">
							Great scholarships shouldn't be hidden in endless PDFs. Discover
							options for your course, category, marks and family income and
							spend less time searching, more time applying.
						</p>

						<div className="uh-action-stack">
							<form
								className="uh-search-panel"
								onSubmit={handleSearch}
								role="search"
							>
								<div className="uh-search-panel-top">
									<span className="uh-mini-label">
										01 / SEARCH SCHOLARSHIPS
									</span>
									<span className="uh-mini-hint">
										Names, courses, states & more
									</span>
								</div>
								<div className="uh-search-controls">
									<label
										htmlFor="uh-scholarship-search"
										className="uh-search-input-wrap"
									>
										<Search size={20} strokeWidth={2} aria-hidden="true" />
										<span className="sr-only">
											Search scholarships by scheme, course or state
										</span>
										<input
											id="uh-scholarship-search"
											type="search"
											enterKeyHint="search"
											autoComplete="off"
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											onFocus={() => setFocused(true)}
											onBlur={() => setFocused(false)}
											placeholder={placeholder}
										/>
									</label>
									<button className="uh-search-button" type="submit">
										<span>Find scholarships</span>
										<ArrowRight size={19} aria-hidden="true" />
									</button>
								</div>
							</form>

							<div className="uh-assist-row">
								<div className="uh-assist-icon" aria-hidden="true">
									<Sparkles size={20} strokeWidth={1.9} />
								</div>
								<div className="uh-assist-copy">
									<strong>Don't know where to start?</strong>
									<span>
										{user
											? "Answer four quick questions. No Aadhaar number."
											: "Create a free account, then answer four quick questions."}
									</span>
								</div>
								<button
									type="button"
									className="uh-assist-button"
									onClick={() => navigate("/eligibility")}
								>
									<span>
										{user ? "Check my eligibility" : "Log in & check"}
									</span>
									<ArrowUpRight size={17} aria-hidden="true" />
								</button>
							</div>
						</div>

						<div
							className="uh-popular"
							role="group"
							aria-label="Popular scholarship searches"
						>
							<span className="uh-popular-label">POPULAR RIGHT NOW</span>
							<div className="uh-popular-list">
								{QUICK_TAGS.map((t) => (
									<button
										type="button"
										key={t.label}
										onClick={() => go(t.query)}
										className="uh-popular-tag"
									>
										<CategoryMotifIcon category={t.category} size={15} />
										<span>{t.label}</span>
										<ArrowUpRight size={13} aria-hidden="true" />
									</button>
								))}
								<div className="uh-secret-interaction">
									<SecretCornerKnock />
								</div>
							</div>
						</div>
					</div>

					<div className="uh-showcase">
						<HeroSchemeCard
							deadline={FLAGSHIP_DEADLINE}
							onView={(scheme) => {
								const q =
									typeof scheme === "string"
										? scheme
										: scheme?.searchQuery || "Central Sector";
								go(q);
							}}
						/>
						<div className="uh-showcase-foot">
							<span className="uh-foot-icon" aria-hidden="true">
								<ShieldCheck size={16} />
							</span>
							<span>
								Play with the income slider. It's a preview, not a final
								eligibility decision.
							</span>
						</div>
					</div>
				</div>

				<div className="uh-proof-section">
					<div className="uh-proof-heading">
						<div>
							<span className="uh-proof-eyebrow">WHY UDAAN?</span>
							<h2>Made to take the guesswork out.</h2>
						</div>
						<span className="uh-proof-aside">
							<BookOpen size={16} /> Better information. Better decisions.
						</span>
					</div>
					<ul className="uh-proof-grid" aria-label="Why students trust Udaan">
						{PROOF_POINTS.map((item, idx) => (
							<li className="uh-proof-item" key={item.title}>
								<div className="uh-proof-icon" aria-hidden="true">
									<CategoryMotifIcon category={item.icon} size={23} />
								</div>
								<div className="uh-proof-content">
									<div className="uh-proof-top">
										<span className="uh-proof-number">{item.stat}</span>

										<span className="uh-proof-ordinal">0{idx + 1}</span>
									</div>
									<strong>{item.title}</strong>
									<p>{item.desc}</p>
								</div>
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}

export default Hero;
