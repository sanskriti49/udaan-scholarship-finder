import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function HowItWorks() {
	const steps = [
		{
			num: "01",
			title: "Enter Your Academic Details",
			description:
				"Tell us your current degree, stream, social category, domicile state, and family income range. No confidential passwords or Aadhaar numbers required.",
			tag: "Simple Profile",
			illustration: (
				<svg
					viewBox="0 0 280 180"
					className="w-full h-36 mx-auto mb-4"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					{/* Ambient soft background bubble */}
					<ellipse cx="140" cy="110" rx="100" ry="45" fill="#D8F3DC" fillOpacity="0.4" />
					<circle cx="210" cy="50" r="30" fill="#EDF7F0" />
					
					{/* Base desk platform */}
					<rect x="40" y="145" width="200" height="8" rx="4" fill="#B7E4C7" />
					
					{/* Student Profile Card (unDraw style) */}
					<rect x="75" y="40" width="130" height="100" rx="12" fill="#FFFFFF" stroke="#52B788" strokeWidth="2" />
					
					{/* Card Header & Avatar */}
					<circle cx="140" cy="70" r="16" fill="#143621" />
					<circle cx="140" cy="65" r="7" fill="#D8F3DC" />
					<path d="M128 82C128 77 133 74 140 74C147 74 152 77 152 82" fill="#D8F3DC" />
					
					{/* Profile Fields */}
					<rect x="95" y="96" width="90" height="6" rx="3" fill="#2D6A4F" />
					<rect x="105" y="108" width="70" height="5" rx="2.5" fill="#74C69D" fillOpacity="0.6" />
					<rect x="115" y="120" width="50" height="4" rx="2" fill="#95D5B2" fillOpacity="0.8" />
					
					{/* Floating Graduation Mortarboard */}
					<path d="M50 70L80 58L110 70L80 82L50 70Z" fill="#143621" />
					<path d="M65 77V92C65 98 72 102 80 102C88 102 95 98 95 92V77" stroke="#143621" strokeWidth="1.5" />
					<path d="M106 72V90" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
					<circle cx="106" cy="92" r="2.5" fill="#D97706" />

					{/* Document bookmark accent */}
					<rect x="204" y="66" width="18" height="24" rx="3" fill="#2D6A4F" />
					<path d="M204 90L213 83L222 90V66H204V90Z" fill="#2D6A4F" />
				</svg>
			),
		},
		{
			num: "02",
			title: "Rule Engine Evaluates Match",
			description:
				"Our deterministic eligibility engine compares your criteria against 37+ parsed rule ASTs from official AICTE, UGC, NSP, State, and CSR circulars.",
			tag: "Rule Evaluation",
			illustration: (
				<svg
					viewBox="0 0 280 180"
					className="w-full h-36 mx-auto mb-4"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					{/* Ambient soft background bubble */}
					<ellipse cx="140" cy="110" rx="100" ry="45" fill="#D8F3DC" fillOpacity="0.4" />
					<circle cx="70" cy="50" r="25" fill="#EDF7F0" />
					
					{/* Base platform */}
					<rect x="40" y="145" width="200" height="8" rx="4" fill="#B7E4C7" />

					{/* Engine Evaluation Dashboard (unDraw style) */}
					<rect x="65" y="35" width="150" height="105" rx="12" fill="#FFFFFF" stroke="#2D6A4F" strokeWidth="2" />
					<rect x="65" y="35" width="150" height="24" rx="12" fill="#143621" />
					<circle cx="80" cy="47" r="3" fill="#D8F3DC" />
					<circle cx="90" cy="47" r="3" fill="#74C69D" />
					<circle cx="100" cy="47" r="3" fill="#52B788" />
					
					{/* Criteria Checklist Rows */}
					<rect x="80" y="70" width="85" height="6" rx="3" fill="#2D6A4F" />
					<circle cx="185" cy="73" r="6" fill="#D8F3DC" stroke="#2D6A4F" strokeWidth="1.5" />
					<path d="M182 73L184 75L188 71" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

					<rect x="80" y="88" width="70" height="6" rx="3" fill="#40916C" />
					<circle cx="185" cy="91" r="6" fill="#D8F3DC" stroke="#2D6A4F" strokeWidth="1.5" />
					<path d="M182 91L184 93L188 89" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

					<rect x="80" y="106" width="95" height="6" rx="3" fill="#52B788" />
					<circle cx="185" cy="109" r="6" fill="#D8F3DC" stroke="#2D6A4F" strokeWidth="1.5" />
					<path d="M182 109L184 111L188 107" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

					<rect x="80" y="124" width="60" height="5" rx="2.5" fill="#74C69D" fillOpacity="0.7" />

					{/* Floating Rule Ast Spark */}
					<circle cx="230" cy="65" r="14" fill="#D8F3DC" stroke="#52B788" strokeWidth="1.5" />
					<path d="M226 65L234 65M230 61L230 69" stroke="#143621" strokeWidth="2" strokeLinecap="round" />
				</svg>
			),
		},
		{
			num: "03",
			title: "Direct Verified Portals",
			description:
				"View exact eligibility citations, check missing certificate requirements, and jump straight to the designated government submission portal.",
			tag: "Direct Applications",
			illustration: (
				<svg
					viewBox="0 0 280 180"
					className="w-full h-36 mx-auto mb-4"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					{/* Ambient soft background bubble */}
					<ellipse cx="140" cy="110" rx="100" ry="45" fill="#D8F3DC" fillOpacity="0.4" />
					<circle cx="210" cy="45" r="28" fill="#EDF7F0" />
					
					{/* Base platform */}
					<rect x="40" y="145" width="200" height="8" rx="4" fill="#B7E4C7" />

					{/* Gazette Document Sheet (unDraw style) */}
					<rect x="85" y="35" width="110" height="105" rx="8" fill="#FFFFFF" stroke="#2D6A4F" strokeWidth="2" />
					<rect x="100" y="52" width="60" height="6" rx="3" fill="#143621" />
					<rect x="100" y="66" width="80" height="4" rx="2" fill="#74C69D" fillOpacity="0.8" />
					<rect x="100" y="76" width="75" height="4" rx="2" fill="#74C69D" fillOpacity="0.8" />
					<rect x="100" y="86" width="65" height="4" rx="2" fill="#74C69D" fillOpacity="0.8" />
					<rect x="100" y="96" width="50" height="4" rx="2" fill="#95D5B2" fillOpacity="0.8" />

					{/* Official Emblem Stamp */}
					<circle cx="140" cy="120" r="12" fill="#D8F3DC" stroke="#2D6A4F" strokeWidth="1.5" />
					<path d="M136 120L139 123L145 117" stroke="#143621" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

					{/* Launch Rocket / Gateway Arrow */}
					<path d="M210 110L235 85L225 75L200 100L210 110Z" fill="#143621" />
					<path d="M235 85L242 70L227 77L235 85Z" fill="#D97706" />
					<path d="M198 102L185 107L193 94L198 102Z" fill="#52B788" />
					<circle cx="217" cy="92" r="3" fill="#FFFFFF" />

					{/* Success Star Accent */}
					<path d="M60 65L63 55L66 65L76 68L66 71L63 81L60 71L50 68L60 65Z" fill="#D97706" />
				</svg>
			),
		},
	];

	return (
		<section className="py-16 md:py-24 px-5 sm:px-8 bg-white border-b border-slate-200/80">
			<div className="max-w-7xl mx-auto">
				{/* Section Header */}
				<div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
					<div className="max-w-2xl">
						<span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
							How Udaan Works
						</span>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-900 mt-2 leading-tight">
							From criteria matching to application submission,{" "}
							<span className="italic text-emerald-800 font-normal">simplified.</span>
						</h2>
						<p className="text-slate-600 text-base mt-3 leading-relaxed">
							Say goodbye to confusing notification PDFs. We turn legal circulars into simple, actionable steps for every student.
						</p>
					</div>

					<Link
						to="/eligibility"
						className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950 transition shrink-0 group"
					>
						<span>Check your eligibility now</span>
						<ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
					</Link>
				</div>

				{/* 3 Step Cards Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
					{steps.map((step) => (
						<div
							key={step.num}
							className="relative bg-[#FAF9F6] border border-slate-200/90 rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:border-emerald-300 hover:shadow-sm transition-all duration-200"
						>
							<div>
								{/* Step Header with Step Number */}
								<div className="flex items-center justify-between mb-4">
									<span className="text-[11px] font-bold tracking-wider uppercase text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-full">
										{step.tag}
									</span>
									<span className="text-2xl font-serif font-bold text-slate-300">
										{step.num}
									</span>
								</div>

								{/* Custom unDraw-style SVG Illustration */}
								<div className="p-2 bg-white/70 rounded-2xl border border-slate-100 mb-5">
									{step.illustration}
								</div>

								<h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug mb-2 font-sans">
									{step.title}
								</h3>

								<p className="text-sm text-slate-600 leading-relaxed font-normal">
									{step.description}
								</p>
							</div>

							<div className="pt-5 mt-5 border-t border-slate-200/70 flex items-center gap-2 text-xs font-semibold text-slate-700">
								<CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
								<span>Zero application fees</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

