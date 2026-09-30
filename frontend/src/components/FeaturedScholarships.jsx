import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { getScholarships } from "../services/scholarshipService";
import { CategoryMotifIcon, getCategoryTheme } from "./CategoryMotif";
import { CablesDoctor, DoodleSquiggleArrow } from "./AnimatedIllustrations";
import { ScholarshipCard, CardSkeleton, focusRing } from "./ScholarshipKit";
import { Reveal } from "./MotionKit";

const LENSES = [
	{ id: "deadline", label: "Closing soon", params: { sort: "deadline" } },
	{ id: "amount", label: "Biggest grants", params: { sort: "amount_high" } },
	{ id: "updated", label: "Just updated", params: { sort: "newest", hasChanges: "true" } },
];

// Filter values match the Browse page's category options exactly.
const DOORS = [
	{ category: "Women", title: "I'm a girl in college", sub: "Schemes reserved for women" },
	{ category: "Need based", title: "Money is tight at home", sub: "Income-linked support" },
	{ category: "SC / ST / OBC", title: "I have a caste certificate", sub: "Post-matric and more" },
	{ category: "Merit based", title: "My marks are strong", sub: "Merit-cum-means awards" },
	{ category: "Minority", title: "I'm from a minority community", sub: "Central and state schemes" },
	{ category: "Government", title: "Show me the big central ones", sub: "NSP and ministry schemes" },
];

function lensHref(lens) {
	const q = new URLSearchParams(lens.params);
	if (q.get("sort") === "deadline") q.delete("sort");
	const s = q.toString();
	return s ? `/scholarships?${s}` : "/scholarships";
}

export default function FeaturedScholarships() {
	const navigate = useNavigate();
	const railRef = useRef(null);
	const [lens, setLens] = useState(LENSES[0]);
	const [state, setState] = useState({ loading: true, error: false, items: [] });

	useEffect(() => {
		let alive = true;
		getScholarships({ ...lens.params, limit: 10 })
			.then((res) => alive && setState({ loading: false, error: !res.success, items: res.data || [] }))
			.catch(() => alive && setState({ loading: false, error: true, items: [] }));
		return () => {
			alive = false;
		};
	}, [lens]);

	const pickLens = (l) => {
		if (l.id === lens.id) return;
		setState((st) => ({ ...st, loading: true }));
		setLens(l);
		railRef.current?.scrollTo({ left: 0 });
	};

	const nudge = (dir) => {
		const el = railRef.current;
		if (el) el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.85, 700), behavior: "smooth" });
	};

	const open = (s) => navigate(`/scholarships?search=${encodeURIComponent(s.title)}`);
	const { loading, error, items } = state;

	return (
		<section className="border-b-[1.5px] border-emerald-950/15 bg-[#E9F0EA] py-14 md:py-20">
			<div className="mx-auto max-w-7xl px-5 sm:px-8">
				<div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
					<div>
						<span className="text-xs font-bold uppercase tracking-wider text-emerald-950/60">
							Live from the scheme tracker
						</span>
						<h2 className="mt-1 font-serif text-3xl leading-tight text-emerald-950 sm:text-4xl md:text-5xl">
							What's{" "}
							<span className="ud-display font-extrabold underline decoration-yellow-300 decoration-4 underline-offset-4">
								open right now
							</span>
						</h2>
					</div>
					<div className="flex items-center gap-2">
						<div role="tablist" aria-label="Sort the shortlist" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-1 md:mx-0 md:px-0">
							{LENSES.map((l) => (
								<button
									key={l.id}
									type="button"
									role="tab"
									aria-selected={l.id === lens.id}
									onClick={() => pickLens(l)}
									className={`sk-chip min-h-[44px] shrink-0 cursor-pointer whitespace-nowrap rounded-full border-[1.5px] px-4 text-sm font-bold ${focusRing} ${
										l.id === lens.id
											? "border-emerald-950 bg-yellow-200 text-emerald-950"
											: "border-emerald-950/20 bg-white text-emerald-950/70 hover:border-emerald-950"
									}`}
								>
									{l.label}
								</button>
							))}
						</div>
						<div className="hidden gap-1.5 lg:flex">
							{[-1, 1].map((d) => (
								<button
									key={d}
									type="button"
									onClick={() => nudge(d)}
									aria-label={d < 0 ? "Scroll back" : "Scroll forward"}
									className={`sk-chip flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-emerald-950 bg-white ${focusRing}`}
								>
									{d < 0 ? <ArrowLeft size={17} /> : <ArrowRight size={17} />}
								</button>
							))}
						</div>
					</div>
				</div>

				<div
					ref={railRef}
					role="tabpanel"
					aria-busy={loading}
					aria-label={`${lens.label} scholarships`}
					className="sk-rail -mx-5 mt-8 scroll-px-5 px-5 pb-4 pt-1 sm:-mx-8 sm:scroll-px-8 sm:px-8"
				>
					{loading ? (
						[1, 2, 3, 4].map((i) => (
							<div key={i} className="w-[84vw] max-w-[340px]">
								<CardSkeleton />
							</div>
						))
					) : error || items.length === 0 ? (
						<div className="flex w-full items-center gap-5 rounded-2xl border-[1.5px] border-dashed border-emerald-950/30 bg-white/60 p-6">
							<CablesDoctor size={72} className="shrink-0" />
							<div>
								<p className="ud-display text-xl font-bold">
									{error ? "The tracker is catching its breath." : "Nothing in this shelf right now."}
								</p>
								<Link
									to="/scholarships"
									className={`mt-2 inline-flex items-center gap-1 text-sm font-bold underline decoration-yellow-300 decoration-2 underline-offset-4 ${focusRing}`}
								>
									Browse every scheme <ArrowRight size={14} />
								</Link>
							</div>
						</div>
					) : (
						<>
							{items.map((s, i) => (
								<div key={s._id || s.slug} className="w-[84vw] max-w-[340px]">
									<ScholarshipCard s={s} index={i} onOpen={() => open(s)} />
								</div>
							))}
							<Link
								to={lensHref(lens)}
								className={`sk-card group flex w-[60vw] max-w-[220px] flex-col items-center justify-center gap-3 rounded-2xl border-[1.5px] border-dashed border-emerald-950/40 bg-white/50 p-6 text-center font-bold ${focusRing}`}
							>
								<DoodleSquiggleArrow size={44} />
								See all {lens.label.toLowerCase()}
							</Link>
						</>
					)}
				</div>

				<Reveal className="mt-14">
					<div className="flex flex-wrap items-end justify-between gap-3">
						<h3 className="ud-display text-2xl font-bold sm:text-3xl">Start from where you are</h3>
						<p className="text-sm font-medium text-emerald-950/60">Pick the one that sounds most like you.</p>
					</div>
					<ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{DOORS.map((d) => {
							const t = getCategoryTheme(d.category);
							return (
								<li key={d.category}>
									<Link
										to={`/scholarships?category=${encodeURIComponent(d.category)}`}
										className={`sk-card group flex h-full min-h-[76px] items-center gap-3.5 rounded-2xl border-[1.5px] border-emerald-950/20 bg-white p-4 ${focusRing}`}
									>
										<span
											className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[1.5px] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
											style={{ background: t.colors.headerBg, borderColor: t.colors.border }}
										>
											<CategoryMotifIcon category={d.category} size={28} />
										</span>
										<span className="min-w-0 flex-1">
											<span className="block font-bold leading-snug">{d.title}</span>
											<span className="block text-xs font-medium text-emerald-950/55">{d.sub}</span>
										</span>
										<ArrowRight size={16} className="shrink-0 text-emerald-950/30 transition group-hover:translate-x-1 group-hover:text-emerald-950" />
									</Link>
								</li>
							);
						})}
						<li className="sm:col-span-2">
							<Link
								to="/eligibility"
								className={`sk-card group flex h-full min-h-[76px] items-center gap-3.5 rounded-2xl border-[1.5px] border-emerald-950 bg-yellow-200 p-4 shadow-[3px_3px_0_0_#022c22] ${focusRing}`}
							>
								<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-emerald-950 bg-white transition-transform duration-300 group-hover:rotate-12">
									<Sparkles size={22} />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block font-bold leading-snug">None of these? Let us work it out.</span>
									<span className="block text-xs font-medium text-emerald-950/70">
										A few taps about your course, income and state. We check every scheme's rules for you.
									</span>
								</span>
								<ArrowRight size={18} className="shrink-0 transition group-hover:translate-x-1" />
							</Link>
						</li>
					</ul>
				</Reveal>
			</div>
		</section>
	);
}
