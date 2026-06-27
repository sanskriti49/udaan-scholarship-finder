import React, { useState } from "react";
import { Link } from "react-router-dom";
import logoImg from "../assets/images/logo.png";
import Badge from "../components/Badge";

const GUIDES = [
	{
		title: "How to Apply for Scholarships",
		description:
			"A complete step-by-step walkthrough from finding the right match to hitting submit.",
		icon: "📋",
		bg: "bg-[#EAF3DE]",
	},
	{
		title: "Writing a Strong Application",
		description:
			"Learn how to structure your essays and highlight your achievements effectively.",
		icon: "✍️",
		bg: "bg-[#E6F1FB]",
	},
	{
		title: "Common Mistakes to Avoid",
		description:
			"Don't let simple errors disqualify you. Review the most frequent application pitfalls.",
		icon: "⚠️",
		bg: "bg-[#FCEBEB]",
	},
	{
		title: "Interview Preparation",
		description:
			"Master the scholarship interview with these proven communication strategies.",
		icon: "🎤",
		bg: "bg-[#FAEEDA]",
	},
];

const DOCUMENTS = [
	"Aadhaar Card",
	"Income Certificate",
	"Caste Certificate",
	"Previous Mark Sheets",
	"Bonafide Certificate",
	"Bank Account Details",
	"Passport Size Photographs",
	"Fee Receipt of Current Course",
];

const PORTALS = [
	{ name: "National Scholarship Portal", color: "bg-[#5AAD1F]" },
	{ name: "AICTE Scholarships", color: "bg-[#3B7DC8]" },
	{ name: "UGC Scholarships", color: "bg-[#059669]" },
	{ name: "State Education Portals", color: "bg-[#14B8A6]" },
];

const EDU_RESOURCES = [
	{
		icon: "📚",
		title: "Entrance Exam Hub",
		desc: "JEE, NEET, CUET, GATE resources & mock tests.",
		bg: "bg-[#EAF3DE]",
	},
	{
		icon: "🗺️",
		title: "Career Guidance",
		desc: "Articles and roadmaps for various career trajectories.",
		bg: "bg-[#E6F1FB]",
	},
	{
		icon: "⏱️",
		title: "Time Management",
		desc: "Study tips and productivity hacks for top performers.",
		bg: "bg-[#FAEEDA]",
	},
];

const DOWNLOADS = [
	{ title: "Application Checklist", type: "PDF" },
	{ title: "Standard Resume Template", type: "DOCX" },
	{ title: "Statement of Purpose Draft", type: "DOCX" },
	{ title: "2026 Scholarship Calendar", type: "PDF" },
];

export default function Resources() {
	const [searchQuery, setSearchQuery] = useState("");
	const [checkedDocs, setCheckedDocs] = useState(() =>
		JSON.parse(localStorage.getItem("checkedDocs") || "[]"),
	);

	const toggleDoc = (doc) => {
		const newList = checkedDocs.includes(doc)
			? checkedDocs.filter((d) => d !== doc)
			: [...checkedDocs, doc];
		setCheckedDocs(newList);
		localStorage.setItem("checkedDocs", JSON.stringify(newList));
	};

	// const [checked, setChecked] = useState([]);
	// const toggle = (doc) => {
	// 	setChecked((prev) =>
	// 		prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc],
	// 	);
	// };
	// const progress = Math.round((checked.length / DOCUMENTS.length) * 100);
	return (
		<div className="min-h-screen bg-white text-gray-900 font-pangea">
			<section className="bg-[#F6FAF1] border-b border-[#DDECCB] py-16 px-6">
				<div className="max-w-5xl mx-auto text-center">
					<Badge>Student knowledge base</Badge>
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mt-4 mb-3">
						Everything you need to{" "}
						<span className="text-[#5AAD1F]">succeed and get funded</span>
					</h1>
					<p className="text-[16px] text-gray-500 leading-relaxed max-w-xl mx-auto">
						Guides, document checklists, templates, and essential resources to
						maximize your chances of securing a scholarship.
					</p>
					{/* Search bar */}
					<div className="max-w-md mx-auto mt-6">
						<div className="relative">
							<svg
								className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
							<input
								type="text"
								placeholder="Search resources..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full bg-white border border-[#DDECCB] rounded-full px-11 py-3 text-[14px] outline-none focus:border-[#5AAD1F] focus:ring-2 focus:ring-[#5AAD1F]/10 transition text-gray-900 placeholder-gray-400"
							/>
						</div>
					</div>
				</div>
			</section>

			{/* Application Guides */}
			<section className="py-14 px-6">
				<div className="max-w-5xl mx-auto">
					<div className="mb-8">
						<Badge>Guides</Badge>
						<h2 className="text-2xl font-semibold mt-1.5">
							Application guides
						</h2>
						<p className="text-[14px] text-gray-500 mt-1">
							Everything you need to put together a winning scholarship
							application.
						</p>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
						{GUIDES.map((guide, idx) => (
							<div
								key={idx}
								className="border border-gray-200/80 hover:border-[#C0DD97] hover:shadow-md rounded-2xl p-6 cursor-pointer transition-all duration-200 flex flex-col group bg-white"
							>
								<div
									className={`w-10 h-10 rounded-xl ${guide.bg} flex items-center justify-center text-xl mb-4`}
								>
									{guide.icon}
								</div>
								<h3 className="text-[18px] font-semibold text-gray-900 mb-1.5 leading-snug">
									{guide.title}
								</h3>
								<p className="font-inter text-[13px] text-gray-500 leading-relaxed flex-1">
									{guide.description}
								</p>
								<div className="hover:text-green-600 mt-5 flex items-center gap-1 text-[#5AAD1F] text-[13px] font-bold group-hover:gap-2.5 transition-all duration-200">
									Read guide
									<svg
										className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2.5"
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			<hr className="border-gray-100 mx-6" />

			<section className="py-14 px-6">
				<div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Document Checklist */}
					{/* ==================== FIXED DOCUMENT CHECKLIST ==================== */}
					<div className="bg-white border border-gray-200/80 rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow duration-200">
						<div className="mb-6">
							<Badge>Documents</Badge>
							<h2 className="text-xl font-semibold mt-1.5 mb-1.5">
								Master document checklist
							</h2>
							<p className="text-[13px] text-gray-500 leading-relaxed">
								Keep these ready in digital format (PDF/JPEG) before starting
								any application.
							</p>
						</div>

						{/* Progress Tracker Bar */}
						<div className="mb-5">
							<div className="flex items-center justify-between text-sm mb-1.5">
								<span className="font-semibold text-gray-700">
									Application Readiness
								</span>
								<span className="text-[#5AAD1F] font-bold">
									{Math.round((checkedDocs.length / DOCUMENTS.length) * 100)}%
								</span>
							</div>
							<div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
								<div
									className="h-full bg-[#5AAD1F] transition-all duration-300"
									style={{
										width: `${(checkedDocs.length / DOCUMENTS.length) * 100}%`,
									}}
								/>
							</div>
						</div>

						{/* Checklist Interactive Elements Grid */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
							{DOCUMENTS.map((doc, idx) => {
								const isChecked = checkedDocs.includes(doc);
								return (
									<label
										key={idx}
										className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all duration-150 ${
											isChecked
												? "bg-[#EAF3DE]/50 border-[#C0DD97] text-[#27500A]"
												: "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
										}`}
									>
										<input
											type="checkbox"
											checked={isChecked}
											onChange={() => toggleDoc(doc)}
											className="w-4 h-4 accent-[#5AAD1F] cursor-pointer"
										/>
										<span
											className={`text-[13px] font-medium ${isChecked ? "line-through opacity-75" : ""}`}
										>
											{doc}
										</span>
									</label>
								);
							})}
						</div>
					</div>

					{/* Educational Resources */}
					<div className="flex flex-col gap-4">
						<div className="bg-white border border-gray-200/80 rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow duration-200 flex-1">
							<div className="mb-6">
								<Badge>Resources</Badge>
								<h2 className="text-xl font-extrabold  mt-1.5 mb-1.5">
									Educational resources
								</h2>
								<p className="text-[13px] text-gray-500 leading-relaxed">
									Beyond scholarships — tools to help you study smarter.
								</p>
							</div>
							<div className="flex flex-col gap-3">
								{EDU_RESOURCES.map((res, idx) => (
									<div
										key={idx}
										className="flex items-start gap-3.5 p-4 border border-gray-200/80 hover:border-[#C0DD97] hover:bg-[#F6FAF1] rounded-xl cursor-pointer transition-all duration-150 group"
									>
										<div
											className={`w-10 h-10 rounded-xl ${res.bg} flex items-center justify-center text-lg shrink-0`}
										>
											{res.icon}
										</div>
										<div className="flex-1">
											<h4 className="text-[14px] font-bold text-gray-900 group-hover:text-[#5AAD1F] transition-colors">
												{res.title}
											</h4>
											<p className="text-[13px] text-gray-500 mt-0.5 leading-relaxed">
												{res.desc}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</section>

			<hr className="border-gray-100 mx-6" />

			{/* Official Portals */}
			<section className="py-14 px-6">
				<div className="max-w-5xl mx-auto">
					<div className="mb-8">
						<Badge>Government portals</Badge>
						<h2 className="text-2xl font-extrabold  mt-1.5">
							Official scholarship portals
						</h2>
						<p className="text-[14px] text-gray-500 mt-1">
							Always apply through verified government sources.
						</p>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
						{PORTALS.map((portal, idx) => (
							<a
								key={idx}
								href="#"
								className="group relative overflow-hidden bg-white border border-gray-200/80 hover:border-[#C0DD97] hover:shadow-md rounded-2xl p-5 flex items-center justify-between transition-all duration-200"
							>
								<div
									className={`absolute left-0 top-0 w-1 h-full ${portal.color} rounded-l-2xl`}
								/>
								<span className="font-jakarta font-bold text-[15px] text-gray-800 pl-3 group-hover:pl-4 transition-all duration-200">
									{portal.name}
								</span>
								<svg
									className="w-4 h-4 text-gray-400 group-hover:text-[#5AAD1F] group-hover:translate-x-1 transition-all shrink-0 ml-2"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</a>
						))}
					</div>
				</div>
			</section>

			<hr className="border-gray-100 mx-6" />

			{/* Downloads */}
			<section className="py-14 px-6 bg-[#F6FAF1] border-y border-[#DDECCB]">
				<div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
					<div>
						<Badge>Downloads</Badge>
						<h2 className="text-2xl font-bold mt-1.5 mb-2">
							Templates & downloads
						</h2>
						<p className="text-[14px] text-gray-500 leading-relaxed mb-6 max-w-sm">
							Save hours of formatting. Pre-built templates for resumes,
							statements of purpose, and scholarship tracking.
						</p>
						<button className="cursor-pointer inline-flex items-center gap-2 bg-[#5AAD1F] hover:bg-[#4A9A18] active:bg-[#3D8813] text-white text-[15px] font-semibold px-6 py-3 rounded-full transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]">
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
								/>
							</svg>
							Download complete toolkit (.zip)
						</button>
					</div>

					<div className="flex flex-col gap-2.5">
						{DOWNLOADS.map((item, idx) => (
							<div
								key={idx}
								className="flex items-center justify-between p-4 bg-white border border-gray-200/80 hover:border-[#C0DD97] hover:shadow-sm rounded-xl cursor-pointer transition-all duration-150 group"
							>
								<div className="flex items-center gap-3">
									<span
										className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${
											item.type === "PDF"
												? "bg-[#FCEBEB] text-[#791F1F]"
												: "bg-[#E6F1FB] text-[#1a4a8a]"
										}`}
									>
										{item.type}
									</span>
									<span className="text-[14px] font-medium text-gray-800 group-hover:text-[#5AAD1F] transition-colors">
										{item.title}
									</span>
								</div>
								<svg
									className="w-4 h-4 text-gray-400 group-hover:text-[#5AAD1F] group-hover:translate-y-0.5 transition-all shrink-0"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
									/>
								</svg>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Bottom CTA */}
			<section className="py-10 px-6">
				<div className="max-w-5xl mx-auto bg-[#EAF3DE] border border-[#C0DD97] rounded-2xl px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
					<div>
						<h3 className="text-lg font-extrabold text-gray-900 mb-1">
							Ready to find your match?
						</h3>
						<p className="text-[14px] text-gray-600 max-w-md leading-relaxed">
							Put your new knowledge to work. Check eligibility or browse the
							complete directory.
						</p>
					</div>
					<div className="flex flex-wrap gap-3 shrink-0">
						<button className="cursor-pointer w-full md:w-fit bg-[#5AAD1F] text-white text-[15px] font-semibold px-6 py-2.5 rounded-full hover:bg-[#4A9A18] active:bg-[#3D8813] transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]">
							Check eligibility
						</button>
						<button className="cursor-pointer w-full md:w-fit bg-white border border-[#C0DD97] text-[#27500A] text-[15px] font-semibold px-6 py-2.5 rounded-full hover:bg-[#F6FAF1] hover:border-[#5AAD1F] transition-all duration-200">
							Browse scholarships
						</button>
					</div>
				</div>
			</section>
		</div>
	);
}
