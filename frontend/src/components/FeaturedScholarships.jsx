import { ArrowRight, Calendar, Clock } from "lucide-react";
import { Link } from "react-router-dom";

function FeaturedScholarships() {
	const scholarships = [
		{
			id: 1,
			title: "Central Sector Scholarship",
			description:
				"Merit-based financial assistance for college and university students with outstanding academic performance.",
			amount: "Up to ₹20,000",
			deadline: "5 Sept 2026",
			category: "Merit based",
			badgeClass: "bg-[#EAF3DE] text-[#27500A]",
		},
		{
			id: 2,
			title: "AICTE Pragati Scholarship",
			description:
				"Supports girl students pursuing technical education in AICTE-approved institutions across India.",
			amount: "₹50,000",
			deadline: "31 Oct 2026",
			category: "Women in STEM",
			badgeClass: "bg-[#E6F1FB] text-[#0C447C]",
		},
		{
			id: 3,
			title: "AICTE Saksham Scholarship",
			description:
				"Financial assistance for specially-abled students pursuing technical degree or diploma programmes.",
			amount: "₹50,000",
			deadline: "11 Aug 2026",
			category: "Accessibility",
			badgeClass: "bg-[#FAEEDA] text-[#633806]",
		},
	];

	const getDaysLeft = (deadline) => {
		const today = new Date();
		const end = new Date(deadline);

		today.setHours(0, 0, 0, 0);
		end.setHours(0, 0, 0, 0);

		return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
	};

	const formatDeadline = (deadline) =>
		new Date(deadline).toLocaleDateString("en-GB", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	return (
		<section className="font-pangea py-14 bg-[#f4f9ec] px-6">
			<div className="max-w-6xl mx-auto">
				<div className="mb-10">
					<div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-[#3B6D11] bg-[#EAF3DE] border border-[#C0DD97] px-3 py-1 rounded-full mb-4">
						<span className="w-1.5 h-1.5 rounded-full bg-[#5AAD1F]" />
						Featured opportunities
					</div>
					<div className="flex items-end justify-between flex-wrap gap-4">
						<div>
							<h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
								Scholarships{" "}
								<span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-600 to-teal-500">
									for you
								</span>
							</h2>
							<p className="mt-2 text-sm text-gray-500 leading-relaxed">
								Curated, verified opportunities — sorted by deadline, not noise.
							</p>
						</div>
						<Link
							to="/scholarships"
							className="group inline-flex items-center gap-1.5 text-[16px] font-semibold text-[#3B7DC8] pb-0.5 border-b-2 border-transparent hover:border-[#3B7DC8] transition-colors"
						>
							See all scholarships
							<ArrowRight
								size={16}
								className="transition-transform duration-200 group-hover/btn:translate-x-1"
							/>
						</Link>
					</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{scholarships.map((s) => (
						<div
							key={s.id}
							className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden flex flex-col hover:border-[#C0DD97] hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group"
						>
							<div className="p-5 flex flex-col gap-3 flex-1">
								<div className="flex items-center justify-between">
									<span
										className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${s.badgeClass}`}
									>
										{s.category}
									</span>
									<span className="font-inter flex items-center gap-1 text-[12px] font-semibold text-gray-400">
										<Clock size={12} />
										{getDaysLeft(s.deadline)} days left
									</span>
								</div>

								<div>
									<h3 className="text-[21px] font-pangea font-medium text-gray-900">
										{s.title}
									</h3>
									<div className="flex items-center gap-1.5 mt-1 text-[14px] text-gray-400">
										<Calendar size={14} /> Deadline{" "}
										{formatDeadline(s.deadline)}{" "}
									</div>
								</div>

								<p className="font-inter text-[14px] text-gray-500 leading-relaxed flex-1">
									{s.description}
								</p>
							</div>

							<div className="group/card border-t border-gray-100 px-5 py-3.5 flex items-center justify-between">
								<div className="flex flex-col gap-0.5">
									<span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
										Award
									</span>
									<span className="font-inter text-xl font-extrabold text-[#5AAD1F] tracking-tight leading-none">
										{s.amount}
										<span className="text-[11px] font-medium text-gray-400 tracking-normal">
											/yr
										</span>
									</span>
								</div>
								<button className="font-pangea group/btn cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-[#5AAD1F] text-white rounded-full transition-colors duration-200">
									Apply now
								</button>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

export default FeaturedScholarships;
