import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
	Search,
	Download,
	CheckCircle2,
	FileText,
	ExternalLink,
	ArrowRight,
	BookOpen,
	Clock,
	Compass,
	Check,
	RotateCcw,
	Layers,
	GraduationCap,
} from "lucide-react";

const ROADMAP_STEPS = [
	{
		step: "01",
		title: "Finding & Shortlisting Scholarships",
		category: "Step 1: Discovery",
		description:
			"Learn how to target the highest-probability opportunities based on your state, category, and degree without getting overwhelmed.",
		time: "4 min read",
		path: "/how-to-apply",
		illustration: (
			<svg viewBox="0 0 240 140" className="w-full h-28 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
				<ellipse cx="120" cy="95" rx="80" ry="32" fill="#D8F3DC" fillOpacity="0.5" />
				<rect x="70" y="28" width="100" height="76" rx="10" fill="#FFFFFF" stroke="#2D6A4F" strokeWidth="2" />
				<rect x="82" y="42" width="76" height="7" rx="3.5" fill="#143621" />
				<rect x="82" y="55" width="55" height="5" rx="2.5" fill="#52B788" />
				<rect x="82" y="66" width="65" height="5" rx="2.5" fill="#74C69D" />
				<circle cx="150" cy="78" r="16" fill="#143621" />
				<circle cx="147" cy="75" r="7" stroke="#FFFFFF" strokeWidth="2" />
				<path d="M152 80L160 88" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
			</svg>
		),
	},
	{
		step: "02",
		title: "Mandatory Document Preparation",
		category: "Step 2: Paperwork",
		description:
			"A comprehensive checklist of certificates, issuing revenue officers, bonafide letters, and bank Aadhaar seeding rules.",
		time: "5 min read",
		path: "/how-to-apply",
		illustration: (
			<svg viewBox="0 0 240 140" className="w-full h-28 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
				<ellipse cx="120" cy="95" rx="80" ry="32" fill="#D8F3DC" fillOpacity="0.5" />
				<rect x="65" y="32" width="70" height="75" rx="8" fill="#FFFFFF" stroke="#74C69D" strokeWidth="1.5" />
				<rect x="85" y="24" width="80" height="85" rx="10" fill="#FFFFFF" stroke="#2D6A4F" strokeWidth="2" />
				<rect x="98" y="38" width="54" height="6" rx="3" fill="#143621" />
				<rect x="98" y="50" width="45" height="5" rx="2.5" fill="#52B788" />
				<rect x="98" y="61" width="50" height="5" rx="2.5" fill="#74C69D" />
				<circle cx="142" cy="85" r="11" fill="#2D6A4F" />
				<path d="M138 85L141 88L147 82" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		),
	},
	{
		step: "03",
		title: "Writing a Strong Personal Statement",
		category: "Step 3: Statement",
		description:
			"Use the proven 5-step narrative blueprint and the STAR framework to turn your challenges into a compelling story.",
		time: "6 min read",
		path: "/application-guide",
		illustration: (
			<svg viewBox="0 0 240 140" className="w-full h-28 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
				<ellipse cx="120" cy="95" rx="80" ry="32" fill="#D8F3DC" fillOpacity="0.5" />
				<rect x="75" y="25" width="90" height="82" rx="10" fill="#FFFFFF" stroke="#2D6A4F" strokeWidth="2" />
				<rect x="88" y="38" width="64" height="6" rx="3" fill="#143621" />
				<rect x="88" y="50" width="55" height="4" rx="2" fill="#52B788" />
				<rect x="88" y="60" width="60" height="4" rx="2" fill="#74C69D" />
				<rect x="88" y="70" width="40" height="4" rx="2" fill="#95D5B2" />
				{/* Fountain Pen Drawing */}
				<path d="M165 45L180 30L190 40L175 55L165 45Z" fill="#143621" />
				<path d="M165 45L155 58L168 55L165 45Z" fill="#D97706" />
				<circle cx="155" cy="58" r="1.5" fill="#FFFFFF" />
			</svg>
		),
	},
	{
		step: "04",
		title: "Submission Verification & Avoiding Errors",
		category: "Step 4: Final Submit",
		description:
			"Final verification steps: double-checking document dimensions, bank account statuses, and obtaining official receipts.",
		time: "3 min read",
		path: "/how-to-apply",
		illustration: (
			<svg viewBox="0 0 240 140" className="w-full h-28 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
				<ellipse cx="120" cy="95" rx="80" ry="32" fill="#D8F3DC" fillOpacity="0.5" />
				<rect x="70" y="30" width="100" height="74" rx="10" fill="#FFFFFF" stroke="#2D6A4F" strokeWidth="2" />
				{/* Submission Rocket / Plane Launch */}
				<path d="M120 42L140 78L120 70L100 78L120 42Z" fill="#143621" />
				<path d="M120 42L127 72L120 70V42Z" fill="#2D6A4F" />
				<circle cx="120" cy="58" r="3" fill="#D8F3DC" />
				<path d="M115 75L120 85L125 75" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
			</svg>
		),
	},
];

const DOCUMENTS = [
	"Aadhaar Card (Identity & DOB)",
	"Income Certificate (Tehsildar/SDM)",
	"Caste / Category Certificate",
	"Previous Year Academic Mark Sheets",
	"College Bonafide Certificate",
	"Bank Passbook (Aadhaar Seeded)",
	"Passport Size Photographs",
	"Current Year College Fee Receipt",
];

const PORTALS = [
	{
		name: "National Scholarship Portal (NSP)",
		authority: "Ministry of Electronics & IT / Ministry of Education",
		desc: "Central sector schemes, post-matric fellowships, and state quota disbursements.",
		url: "https://scholarships.gov.in/All-Scholarships",
	},
	{
		name: "AICTE Fellowship & Schemes Portal",
		authority: "All India Council for Technical Education",
		desc: "Pragati, Saksham, Swanath, and PG GATE engineering stipends.",
		url: "https://fellowship.aicte.gov.in/",
	},
	{
		name: "UGC Student Financial Assistance",
		authority: "University Grants Commission",
		desc: "Ishan Uday (NER), Single Girl Child, and university rank holder grants.",
		url: "https://www.ugc.gov.in/Home/student_Corner",
	},
	{
		name: "UP State Scholarship Portal (Dashmottar)",
		authority: "Social Welfare Department, Uttar Pradesh",
		desc: "Pre-matric and post-matric fee reimbursement for Uttar Pradesh domicile students.",
		url: "https://scholarship.up.gov.in/",
	},
];

const DOWNLOADS = [
	{ title: "Scholarship Document Checklist 2026", type: "PDF", size: "280 KB" },
	{ title: "Student Academic Resume & CV Template", type: "DOCX", size: "140 KB" },
	{ title: "Statement of Purpose (SOP) Sample Drafts", type: "DOCX", size: "190 KB" },
	{ title: "Income Certificate Application Step-by-Step Guide", type: "PDF", size: "420 KB" },
];

const DOC_ICONS = {
	"Aadhaar Card (Identity & DOB)": "🪪",
	"Income Certificate (Tehsildar/SDM)": "💰",
	"Caste / Category Certificate": "📄",
	"Previous Year Academic Mark Sheets": "📊",
	"College Bonafide Certificate": "🏛️",
	"Bank Passbook (Aadhaar Seeded)": "🏦",
	"Passport Size Photographs": "📷",
	"Current Year College Fee Receipt": "🧾",
};

export default function Resources() {
	const [checkedDocs, setCheckedDocs] = useState(() =>
		JSON.parse(localStorage.getItem("checkedDocs") || "[]")
	);
	const [activeRoadmapStep, setActiveRoadmapStep] = useState(0);

	const toggleDoc = (doc) => {
		const next = checkedDocs.includes(doc)
			? checkedDocs.filter((d) => d !== doc)
			: [...checkedDocs, doc];
		setCheckedDocs(next);
		localStorage.setItem("checkedDocs", JSON.stringify(next));
	};

	const resetDocs = () => {
		setCheckedDocs([]);
		localStorage.setItem("checkedDocs", "[]");
	};

	const progress = Math.round((checkedDocs.length / DOCUMENTS.length) * 100);
	const allDone = checkedDocs.length === DOCUMENTS.length;
	const remaining = DOCUMENTS.length - checkedDocs.length;

	/* SVG Ring Math */
	const RING = 144;
	const SW = 10;
	const radius = (RING - SW) / 2;
	const circ = 2 * Math.PI * radius;
	const dashOff = circ - (progress / 100) * circ;

	return (
		<div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans">
			{/* Hero Header */}
			<section className="bg-white border-b border-slate-200/80 py-14 sm:py-20 px-5 sm:px-8 text-center relative overflow-hidden">
				<div className="max-w-3xl mx-auto space-y-4">
					<span className="text-sm font-bold uppercase tracking-wider text-emerald-800">
						Student Knowledge Base
					</span>

					<h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-slate-900 leading-tight font-normal">
						Everything you need to{" "}
						<span className="italic text-emerald-800 font-normal">
							succeed and get funded.
						</span>
					</h1>

					<p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
						Structured application roadmap, document readiness checklists, downloadable templates, and direct links to official government submission portals.
					</p>
				</div>
			</section>

			{/* ========================================================= */}
			{/* ACTUAL ROADMAP / STEP-BY-STEP PATH SECTION */}
			{/* ========================================================= */}
			<section className="py-16 sm:py-20 px-5 sm:px-8 max-w-7xl mx-auto">
				<div className="max-w-2xl mb-12">
					<span className="text-sm font-bold uppercase tracking-wider text-emerald-800">
						Application Roadmap
					</span>
					<h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-900 mt-1 leading-tight">
						Step-by-Step Learning <span className="italic text-emerald-800 font-normal">Path</span>
					</h2>
					<p className="text-base text-slate-600 mt-2 font-normal">
						Follow this structured milestone path from initial eligibility discovery to final application submission.
					</p>
				</div>

				{/* Visual Interactive Roadmap */}
				<div className="relative">
					{/* Connecting Track Line for Desktop */}
					<div className="hidden lg:block absolute top-1/2 left-10 right-10 h-1.5 bg-slate-200 -translate-y-12 z-0 rounded-full" />
					<div
						className="hidden lg:block absolute top-1/2 left-10 h-1.5 bg-emerald-700 -translate-y-12 z-0 rounded-full transition-all duration-500"
						style={{
							width: `${(activeRoadmapStep / (ROADMAP_STEPS.length - 1)) * 90}%`,
						}}
					/>

					{/* Roadmap Nodes Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
						{ROADMAP_STEPS.map((s, idx) => {
							const isActive = activeRoadmapStep === idx;
							const isPassed = activeRoadmapStep >= idx;

							return (
								<div
									key={s.step}
									onClick={() => setActiveRoadmapStep(idx)}
									className={`bg-white border rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 cursor-pointer ${
										isActive
											? "border-emerald-700 shadow-md ring-2 ring-emerald-700/20"
											: "border-slate-200/90 hover:border-slate-300 shadow-2xs"
									}`}
								>
									<div>
										{/* Milestone Node Badge */}
										<div className="flex items-center justify-between mb-4">
											<div className="flex items-center gap-2">
												<div
													className={`w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-base transition-colors ${
														isPassed
															? "bg-emerald-900 text-white shadow-2xs"
															: "bg-slate-100 text-slate-500"
													}`}
												>
													{s.step}
												</div>
												<span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-800">
													{s.category}
												</span>
											</div>
											<span className="text-xs sm:text-sm text-slate-500 font-medium">
												{s.time}
											</span>
										</div>

										{/* Custom Vector Illustration */}
										<div className="p-3 bg-[#FAF9F6] rounded-2xl border border-slate-100 mb-5">
											{s.illustration}
										</div>

										{/* Milestone Title & Description */}
										<h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 leading-snug">
											{s.title}
										</h3>
										<p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
											{s.description}
										</p>
									</div>

									{/* Action Button */}
									<div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
										<Link
											to={s.path}
											onClick={(e) => e.stopPropagation()}
											className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950 transition group"
										>
											<span>Read Guide</span>
											<ArrowRight
												size={16}
												className="transition-transform group-hover:translate-x-1"
											/>
										</Link>
										{isActive && (
											<span className="w-2 h-2 rounded-full bg-emerald-700 inline-block" />
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* ========================================================= */}
			{/* DOCUMENT READINESS CHECKLIST */}
			{/* ========================================================= */}
			<section className="py-16 sm:py-20 px-5 sm:px-8 bg-white border-y border-slate-200/80">
				<div className="max-w-7xl mx-auto">
					<div className="max-w-2xl mb-12">
						<span className="text-sm font-bold uppercase tracking-wider text-emerald-800">
							Document Readiness
						</span>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-900 mt-1 leading-tight">
							Mandatory Certificate <span className="italic text-emerald-800 font-normal">Checklist</span>
						</h2>
						<p className="text-base text-slate-600 mt-2 font-normal">
							Track which documents you have digitized (PDF / JPEG under 2MB) so you can apply in minutes without scrambling at deadlines.
						</p>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start">
						{/* Progress Gauge */}
						<div className="bg-[#FAF9F6] border border-slate-200/90 rounded-3xl p-7 flex flex-col items-center justify-center text-center shadow-2xs">
							<div className="relative">
								<svg width={RING} height={RING} className="transform -rotate-90">
									<circle
										cx={RING / 2}
										cy={RING / 2}
										r={radius}
										fill="none"
										stroke="#E2E8F0"
										strokeWidth={SW}
									/>
									<circle
										cx={RING / 2}
										cy={RING / 2}
										r={radius}
										fill="none"
										stroke={allDone ? "#059669" : "#2D6A4F"}
										strokeWidth={SW}
										strokeDasharray={circ}
										strokeDashoffset={dashOff}
										strokeLinecap="round"
										className="transition-all duration-700 ease-out"
									/>
								</svg>
								<div className="absolute inset-0 flex flex-col items-center justify-center">
									<span className="text-4xl font-serif font-bold text-slate-900 leading-none">
										{progress}%
									</span>
									<span className="text-xs font-bold tracking-widest text-slate-500 uppercase mt-1">
										Ready
									</span>
								</div>
							</div>

							<div className="mt-5">
								<p className="text-base font-bold text-slate-900">
									{allDone ? "All Documents Ready!" : `${remaining} document${remaining !== 1 ? "s" : ""} remaining`}
								</p>
								<p className="text-sm text-slate-600 mt-1.5 leading-relaxed max-w-xs">
									{allDone
										? "You have every standard certificate ready for direct upload."
										: "Prepare digital copies before applying to avoid application rejection."}
								</p>
							</div>
						</div>

						{/* Document Checklist Items */}
						<div className="bg-[#FAF9F6] border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs">
							<div className="flex items-center justify-between mb-5">
								<span className="text-sm font-bold text-slate-700 uppercase tracking-wider">
									Collected: <span className="text-emerald-800 font-extrabold">{checkedDocs.length}</span> of {DOCUMENTS.length}
								</span>
								{checkedDocs.length > 0 && (
									<button
										onClick={resetDocs}
										className="text-sm text-slate-500 hover:text-rose-600 transition cursor-pointer font-medium"
									>
										Reset checklist
									</button>
								)}
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
								{DOCUMENTS.map((doc, idx) => {
									const isChecked = checkedDocs.includes(doc);
									return (
										<button
											key={idx}
											onClick={() => toggleDoc(doc)}
											className={`flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left cursor-pointer ${
												isChecked
													? "bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs"
													: "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
											}`}
										>
											<div
												className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
													isChecked
														? "bg-emerald-800 border-emerald-800 text-white"
														: "bg-white border-slate-300"
												}`}
											>
												{isChecked && <Check size={14} />}
											</div>
											<span className="text-base">{DOC_ICONS[doc]}</span>
											<span className="text-sm sm:text-base font-medium truncate">
												{doc}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ========================================================= */}
			{/* OFFICIAL PORTALS DIRECTORY */}
			{/* ========================================================= */}
			<section className="py-16 sm:py-20 px-5 sm:px-8 max-w-7xl mx-auto">
				<div className="max-w-2xl mb-12">
					<span className="text-sm font-bold uppercase tracking-wider text-emerald-800">
						Authoritative Links
					</span>
					<h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-900 mt-1 leading-tight">
						Official Government <span className="italic text-emerald-800 font-normal">Portals</span>
					</h2>
					<p className="text-base text-slate-600 mt-2 font-normal">
						Always submit applications through official government web domains. Udaan indexes scholarship guidelines directly from these verified authorities.
					</p>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{PORTALS.map((portal, i) => (
						<a
							key={i}
							href={portal.url}
							target="_blank"
							rel="noopener noreferrer"
							className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-3xl p-6 sm:p-7 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
						>
							<div>
								<span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
									{portal.authority}
								</span>
								<h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-800 transition-colors font-sans leading-snug">
									{portal.name}
								</h3>
								<p className="text-sm text-slate-600 mt-2 leading-relaxed font-normal">
									{portal.desc}
								</p>
							</div>

							<div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-emerald-800">
								<span>Open Portal</span>
								<ExternalLink size={15} className="transition-transform group-hover:translate-x-0.5" />
							</div>
						</a>
					))}
				</div>
			</section>

			{/* ========================================================= */}
			{/* DOWNLOADABLE TOOLKITS */}
			{/* ========================================================= */}
			<section className="py-16 sm:py-20 px-5 sm:px-8 bg-white border-y border-slate-200/80">
				<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
					<div className="lg:col-span-6 space-y-4">
						<span className="text-sm font-bold uppercase tracking-wider text-emerald-800">
							Free Resources
						</span>
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-900 leading-tight">
							Standard Application Templates
						</h2>
						<p className="text-base text-slate-600 leading-relaxed font-normal">
							Save hours of manual drafting. Download our pre-formatted templates for student CVs, statements of purpose, and application tracking spreadsheets.
						</p>
					</div>

					<div className="lg:col-span-6 flex flex-col gap-3">
						{DOWNLOADS.map((item, idx) => (
							<div
								key={idx}
								className="flex items-center justify-between p-4 sm:p-5 bg-[#FAF9F6] border border-slate-200/90 hover:border-emerald-300 rounded-2xl transition shadow-2xs group cursor-pointer"
							>
								<div className="flex items-center gap-3.5">
									<span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase bg-emerald-100 text-emerald-800">
										{item.type}
									</span>
									<div>
										<span className="text-sm sm:text-base font-semibold text-slate-800 group-hover:text-emerald-800 transition-colors block">
											{item.title}
										</span>
										<span className="text-xs text-slate-500 font-medium">
											{item.size}
										</span>
									</div>
								</div>
								<Download size={18} className="text-slate-400 group-hover:text-emerald-800 transition-colors" />
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ========================================================= */}
			{/* BOTTOM CTA */}
			{/* ========================================================= */}
			<section className="px-5 py-16 sm:py-20 max-w-7xl mx-auto">
				<div className="bg-[#FAF9F6] border border-slate-200/90 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xs">
					<div className="space-y-2 text-center md:text-left">
						<h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
							Ready to check which schemes match your profile?
						</h3>
						<p className="text-base text-slate-600">
							Run your academic criteria through Udaan's deterministic rule engine in under 60 seconds.
						</p>
					</div>

					<div className="flex items-center gap-3.5 shrink-0">
						<Link
							to="/eligibility"
							className="px-6 py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-bold transition shadow-2xs hover:shadow-xs flex items-center gap-2"
						>
							<span>Check Eligibility</span>
							<ArrowRight size={15} />
						</Link>
						<Link
							to="/scholarships"
							className="px-6 py-3.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition shadow-2xs"
						>
							Explore Catalog
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}

