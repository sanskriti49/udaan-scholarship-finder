import React from "react";
import { Link } from "react-router-dom";
import { Search, FileText, Users, PenTool, CheckCircle2, ArrowRight, Sparkles, BookOpen, Clock, Calendar } from "lucide-react";

const STEPS = [
	{
		number: "01",
		title: "Research & Shortlist Eligible Schemes",
		description:
			"Start by filtering scholarships that match your exact level of study, social category, and state domicile. Don't limit yourself to national awards: state-level and corporate CSR grants often have higher approval odds.",
		details: [
			"Use Udaan's deterministic rule engine to match against 37+ verified schemes",
			"Check income ceilings and minimum CGPA criteria before preparing materials",
			"Track closing deadlines in a calendar: missing official cutoffs cannot be appealed",
		],
		icon: Search,
	},
	{
		number: "02",
		title: "Prepare Your Verified Document Folder",
		description:
			"Gather digital copies (PDF & JPEG under 2MB) of all mandatory government certificates. Having these verified ahead of time prevents last-minute portal crashes.",
		details: [
			"Latest academic mark sheets and provisional passing certificates",
			"Official Income Certificate issued by competent revenue authority (Tehsildar/SDM)",
			"Caste / Category certificate and State Domicile Certificate",
			"Bank account passbook front page (must be linked with student's Aadhaar)",
		],
		icon: FileText,
	},
	{
		number: "03",
		title: "Obtain Bonafide & Recommendation Letters",
		description:
			"Most merit-based and CSR grants require an institution bonafide certificate and recommendation letters from faculty or department heads.",
		details: [
			"Request your college administration for Bonafide certificate at least 2 weeks early",
			"Ask professors who know your academic and extracurricular contributions well",
			"Provide them with your CV and a summary of the scholarship criteria",
		],
		icon: Users,
	},
	{
		number: "04",
		title: "Draft a Compelling Statement of Purpose",
		description:
			"Your personal statement is your opportunity to demonstrate genuine financial need, academic ambition, and how the scholarship will enable your career goals.",
		details: [
			"Answer the prompt directly: explain how this grant directly alleviates your fees",
			"Highlight academic milestones, community involvement, and future aspirations",
			"Proofread thoroughly for clarity, honesty, and grammatical precision",
		],
		icon: PenTool,
	},
	{
		number: "05",
		title: "Verify Clauses & Submit on Designated Portal",
		description:
			"A minor formatting mistake or missing signature can disqualify an application. Double-check all uploaded attachments before hitting final submission.",
		details: [
			"Confirm every form field matches your official government ID exactly",
			"Verify that document uploads are crisp and readable within specified file limits",
			"Submit at least 48 hours before the deadline to avoid portal traffic bottlenecks",
		],
		icon: CheckCircle2,
	},
];

const TIPS = [
	{
		emoji: "📅",
		title: "Apply to Multiple Schemes",
		body: "Apply to 4 to 6 eligible grants simultaneously across central, state, and corporate CSR categories.",
	},
	{
		emoji: "🔁",
		title: "Maintain a Master Asset Kit",
		body: "Keep certified PDFs of your transcripts, income certificate, and SOP drafts organized in cloud storage.",
	},
	{
		emoji: "📬",
		title: "Track Application Status",
		body: "After submitting, log your Application ID and check portal verification status periodically.",
	},
];

export default function HowToApply() {
	return (
		<div className="min-h-screen bg-[#FAF9F6] text-slate-900">
			{/* Hero Section */}
			<section className="bg-white border-b border-slate-200/80 px-5 pt-12 pb-10 sm:pt-16 sm:pb-14 text-center">
				<div className="max-w-3xl mx-auto">
					<div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-800 uppercase mb-3">
						<span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
						<span>Student Application Guide</span>
					</div>

					<h1 className="text-3xl sm:text-5xl md:text-6xl font-serif text-slate-900 leading-[1.12] tracking-tight font-normal">
						How to Apply for a{" "}
						<span className="italic font-normal text-emerald-800">
							Scholarship
						</span>
					</h1>

					<p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto mt-3 font-normal">
						From finding the right match to hitting submit, follow these five clear steps to build a verified, winning application.
					</p>

					{/* Quick stats strip */}
					<div className="flex justify-center gap-8 sm:gap-12 mt-8 pt-7 border-t border-slate-100 max-w-lg mx-auto">
						{[
							{ num: "5 Steps", label: "Clear roadmap" },
							{ num: "100%", label: "Verified portals" },
							{ num: "₹0", label: "Application fee" },
						].map((s) => (
							<div key={s.label} className="text-center">
								<div className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
									{s.num}
								</div>
								<div className="text-xs text-slate-500 font-medium mt-0.5">
									{s.label}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Step by Step Timeline */}
			<section className="max-w-3xl mx-auto px-5 py-12 sm:py-16">
				<div className="space-y-6">
					{STEPS.map((step, idx) => {
						const IconComponent = step.icon;
						return (
							<div
								key={idx}
								className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-3xl p-6 sm:p-7 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col gap-4"
							>
								{/* Step Header */}
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs">
											<IconComponent size={18} />
										</div>
										<span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-full uppercase tracking-wider">
											Step {step.number}
										</span>
									</div>
								</div>

								<div>
									<h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug font-sans">
										{step.title}
									</h2>
									<p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal mt-2">
										{step.description}
									</p>
								</div>

								{/* Checklist details */}
								<div className="pt-3 border-t border-slate-100">
									<ul className="space-y-2">
										{step.details.map((d, i) => (
											<li
												key={i}
												className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-normal"
											>
												<span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100/70 flex items-center justify-center shrink-0 text-emerald-800">
													<CheckCircle2 size={12} />
												</span>
												<span>{d}</span>
											</li>
										))}
									</ul>
								</div>
							</div>
						);
					})}
				</div>
			</section>

			{/* Pro Tips Grid */}
			<section className="bg-white border-y border-slate-200/80 px-5 py-14">
				<div className="max-w-4xl mx-auto">
					<div className="text-center mb-10">
						<span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
							Application Strategy
						</span>
						<h2 className="text-2xl sm:text-3xl font-serif text-slate-900 mt-1 leading-tight">
							Pro Tips That Actually Make a Difference
						</h2>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						{TIPS.map((t) => (
							<div
								key={t.title}
								className="bg-[#FAF9F6] border border-slate-200/90 rounded-3xl p-6 hover:border-emerald-300 transition-all shadow-2xs flex flex-col justify-between"
							>
								<div>
									<div className="text-2xl mb-3">{t.emoji}</div>
									<h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1.5 font-sans">
										{t.title}
									</h3>
									<p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
										{t.body}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="px-5 py-16">
				<div className="max-w-2xl mx-auto bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 text-center shadow-2xs">
					<div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center mx-auto mb-4 text-emerald-800 shadow-2xs">
						<Sparkles size={20} />
					</div>
					<h2 className="text-2xl sm:text-3xl font-serif text-slate-900 mb-2 leading-tight">
						Ready to Find Your Scholarship?
					</h2>
					<p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-md mx-auto font-normal">
						Answer a few quick questions about your academic background to surface every scholarship you're eligible for.
					</p>

					<div className="flex flex-col sm:flex-row items-center justify-center gap-3">
						<Link
							to="/eligibility"
							className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-2xs hover:shadow-xs"
						>
							<span>Check My Eligibility</span>
							<ArrowRight size={14} />
						</Link>
						<Link
							to="/scholarships"
							className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs"
						>
							Browse All Scholarships
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}

