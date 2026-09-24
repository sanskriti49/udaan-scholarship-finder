import { ArrowRight, Clock, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

function FeaturedScholarships() {
	const scholarships = [
		{
			id: "aicte-pragati",
			title: "AICTE Pragati Scholarship for Girl Students",
			organization: "All India Council for Technical Education",
			description:
				"Supports meritorious female students admitted to the 1st year of technical degree programs across AICTE-approved institutions.",
			amount: "₹50,000",
			period: "/ year",
			deadline: "31 Oct 2026",
			category: "Women in STEM",
			query: "Pragati",
		},
		{
			id: "nsp-csss",
			title: "Central Sector Scheme of Scholarship (CSSS)",
			organization: "Ministry of Education (Govt of India)",
			description:
				"Merit-cum-means financial assistance for college and university students scoring above the 80th percentile in Class 12 board examinations.",
			amount: "₹12,000 - ₹20,000",
			period: "/ year",
			deadline: "30 Sep 2026",
			category: "Merit-cum-Means",
			query: "CSSS",
		},
		{
			id: "ugc-ishan-uday",
			title: "Ishan Uday Special Scholarship for NER",
			organization: "University Grants Commission (UGC)",
			description:
				"Special scholarship scheme providing ₹8,000/month for students from North Eastern Region pursuing general and technical degree courses.",
			amount: "₹8,000",
			period: "/ month",
			deadline: "31 Oct 2026",
			category: "Higher Education",
			query: "Ishan Uday",
		},
	];

	const getDaysLeft = (deadline) => {
		const today = new Date();
		const end = new Date(deadline);
		today.setHours(0, 0, 0, 0);
		end.setHours(0, 0, 0, 0);
		return Math.max(0, Math.ceil((end - today) / (1000 * 60 * 60 * 24)));
	};

	return (
		<section className="py-16 md:py-24 px-5 sm:px-8 bg-[#E9F0EA] border-b-[1.5px] border-emerald-950/15">
			<div className="max-w-7xl mx-auto">
				<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
					<div>
						<span className="text-xs font-bold uppercase tracking-wider text-emerald-950/60">
							Verified Opportunities
						</span>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-emerald-950 mt-1 leading-tight">
							Featured <span className="ud-display font-extrabold underline decoration-yellow-300 decoration-4 underline-offset-4">Schemes</span>
						</h2>
						<p className="mt-2 text-base text-emerald-950/70 font-sans max-w-xl font-medium">
							Hand-verified flagship scholarships with active funding pools.
						</p>
					</div>

					<Link
						to="/scholarships"
						className={`inline-flex items-center gap-1.5 text-sm font-bold text-emerald-950 underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950 transition group ${focusRing}`}
					>
						<span>View all 55+ verified schemes</span>
						<ArrowRight
							size={16}
							className="transition-transform duration-150 group-hover:translate-x-1"
						/>
					</Link>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{scholarships.map((s) => {
						const daysLeft = getDaysLeft(s.deadline);
						return (
							<article
								key={s.id}
								className="rounded-2xl border-[1.5px] border-emerald-950/15 bg-white p-6 sm:p-7 flex flex-col justify-between hover:border-emerald-950 transition-colors group shadow-2xs"
							>
								<div>
									<div className="flex items-center justify-between gap-2 mb-3">
										<span className="text-xs font-bold text-emerald-950/55 uppercase tracking-wider">
											{s.category}
										</span>
										<span className="inline-flex shrink-0 items-center gap-1 rounded-full border-[1.5px] border-emerald-950/20 bg-yellow-200 px-2.5 py-0.5 text-xs font-bold text-emerald-950">
											<Clock size={11} />
											{daysLeft} days left
										</span>
									</div>

									<h3 className="ud-display text-xl sm:text-2xl font-bold text-emerald-950 leading-tight group-hover:underline decoration-yellow-300 decoration-2 underline-offset-4">
										{s.title}
									</h3>

									<p className="text-sm font-medium text-emerald-950/55 mt-1">
										{s.organization}
									</p>

									<p className="mt-3 text-sm text-emerald-950/75 leading-relaxed line-clamp-3 font-medium">
										{s.description}
									</p>
								</div>

								<div className="mt-6 pt-5 border-t-[1.5px] border-dashed border-emerald-950/20 flex items-center justify-between gap-3">
									<div>
										<span className="ud-display text-2xl font-extrabold text-emerald-950">
											{s.amount}
										</span>
										<span className="text-xs font-semibold text-emerald-950/55 ml-1">
											{s.period}
										</span>
									</div>

									<Link
										to={`/scholarships?search=${encodeURIComponent(s.query)}`}
										className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 group-hover:bg-emerald-900 active:translate-y-px ${focusRing}`}
									>
										<span>View scheme</span>
										<ArrowUpRight size={14} />
									</Link>
								</div>
							</article>
						);
					})}
				</div>
			</div>
		</section>
	);
}

export default FeaturedScholarships;
