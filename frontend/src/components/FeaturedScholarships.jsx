import { ArrowRight, Calendar, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

function FeaturedScholarships() {
	const scholarships = [
		{
			id: "aicte-pragati",
			title: "AICTE Pragati Scholarship for Girl Students",
			organization: "All India Council for Technical Education",
			description:
				"Supports meritorious female students admitted to the 1st year of technical degree programs across AICTE-approved institutions.",
			amount: "₹50,000",
			period: "per year",
			deadline: "31 Oct 2026",
			category: "Women in STEM",
			accentColor: "border-emerald-200 hover:border-emerald-400",
			query: "Pragati",
		},
		{
			id: "nsp-csss",
			title: "Central Sector Scheme of Scholarship (CSSS)",
			organization: "Ministry of Education (Govt of India)",
			description:
				"Merit-cum-means financial assistance for college and university students scoring above the 80th percentile in Class 12 board examinations.",
			amount: "₹12,000 - ₹20,000",
			period: "per year",
			deadline: "30 Sep 2026",
			category: "Merit-cum-Means",
			accentColor: "border-blue-200 hover:border-blue-400",
			query: "CSSS",
		},
		{
			id: "ugc-ishan-uday",
			title: "Ishan Uday Special Scholarship for NER",
			organization: "University Grants Commission (UGC)",
			description:
				"Special scholarship scheme providing ₹8,000/month for students from North Eastern Region pursuing general and technical degree courses.",
			amount: "₹8,000",
			period: "per month",
			deadline: "31 Oct 2026",
			category: "Higher Education",
			accentColor: "border-amber-200 hover:border-amber-400",
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
		<section className="py-16 md:py-20 px-5 sm:px-8 bg-[#FAF9F6] border-b border-slate-200/70">
			<div className="max-w-7xl mx-auto">
				<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
					<div>
						<span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
							Verified Opportunities
						</span>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-900 mt-1 leading-tight">
							Featured <span className="italic text-emerald-800 font-normal">Schemes</span>
						</h2>
						<p className="mt-2 text-base text-slate-600 font-sans max-w-xl">
							Hand-verified flagship scholarships with active funding pools.
						</p>
					</div>

					<Link
						to="/scholarships"
						className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:text-emerald-950 transition pb-0.5 group"
					>
						<span>View all 37+ verified schemes</span>
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
							<div
								key={s.id}
								className={`bg-white border ${s.accentColor} rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-200 group`}
							>
								<div>
									<div className="flex items-center justify-between gap-2 mb-4">
										<span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
											{s.category}
										</span>
										<span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
											<Clock size={12} className="text-slate-400" />
											{daysLeft} days left
										</span>
									</div>

									<h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug group-hover:text-emerald-800 transition-colors font-sans">
										{s.title}
									</h3>
									<p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 mb-3.5">
										{s.organization}
									</p>

									<p className="text-sm text-slate-600 leading-relaxed font-normal">
										{s.description}
									</p>
								</div>

								<div className="pt-5 mt-6 border-t border-slate-100 flex items-center justify-between gap-3">
									<div>
										<span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block">
											Financial Grant
										</span>
										<span className="text-xl font-serif font-bold text-slate-900">
											{s.amount}
										</span>
										<span className="text-xs text-slate-500 font-normal ml-1">
											/{s.period}
										</span>
									</div>

									<Link
										to={s.query ? `/scholarships?search=${encodeURIComponent(s.query)}` : "/scholarships"}
										className="px-4 py-2 bg-slate-900 hover:bg-emerald-800 text-white text-xs font-semibold rounded-full transition-colors shadow-2xs shrink-0 flex items-center gap-1"
									>
										<span>View Rules</span>
										<ArrowRight size={13} />
									</Link>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}

export default FeaturedScholarships;

