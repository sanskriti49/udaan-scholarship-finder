import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
	BookOpen,
	PenTool,
	Sparkles,
	CheckCircle,
	AlertCircle,
	Lightbulb,
	FileText,
	Target,
	Users,
	Award,
	ChevronRight,
	Quote,
	Share2,
	Bookmark,
	ThumbsUp,
	MessageCircle,
	Eye,
	Zap,
	Copy,
	Check,
	Star,
	Clock,
	BarChart3,
	ChevronDown,
	Expand,
	Minimize,
	RotateCcw,
} from "lucide-react";
import Badge from "../components/Badge";

const ApplicationGuide = () => {
	const [activeSection, setActiveSection] = useState("overview");
	const [bookmarked, setBookmarked] = useState(false);
	const [liked, setLiked] = useState(false);
	const [completedSections, setCompletedSections] = useState(() =>
		JSON.parse(localStorage.getItem("completedGuideSections") || "[]"),
	);
	const [expandedTips, setExpandedTips] = useState({});
	const [readingProgress, setReadingProgress] = useState(0);
	const [copiedId, setCopiedId] = useState(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [showConfetti, setShowConfetti] = useState(false);
	const contentRef = useRef(null);

	const sections = [
		{ id: "overview", label: "Overview", icon: BookOpen, time: "3 min read" },
		{
			id: "structure",
			label: "Essay Structure",
			icon: FileText,
			time: "5 min read",
		},
		{
			id: "achievements",
			label: "Highlight Achievements",
			icon: Award,
			time: "4 min read",
		},
		{
			id: "common",
			label: "Common Mistakes",
			icon: AlertCircle,
			time: "3 min read",
		},
		{ id: "final", label: "Final Polish", icon: Sparkles, time: "2 min read" },
	];

	const tips = [
		{
			id: "audience",
			icon: Target,
			title: "Know Your Audience",
			shortDesc: "Research the scholarship provider's core values",
			fullDesc:
				"Research the scholarship provider's values and tailor your application to align with their mission. Look at past winners' profiles and understand what specific qualities and social commitments they prioritize.",
			example:
				'"The scholarship values grassroots technological innovation, so I highlighted my village solar pump monitoring project rather than just listing course grades."',
		},
		{
			id: "hook",
			icon: PenTool,
			title: "Start with a Hook",
			shortDesc: "Open with a compelling personal story or reflection",
			fullDesc:
				"Open your essay with a compelling story or statement that grabs the reader's attention immediately. Avoid generic openings like 'I am applying for this scholarship because...'",
			example:
				'"At 2 AM, staring at a terminal window during our rural hackathon, I realized code wasn\'t just abstract logic; it was an immediate tool to solve local power outages."',
		},
		{
			id: "show-dont-tell",
			icon: Lightbulb,
			title: "Show, Don't Tell",
			shortDesc: "Describe specific situations, not just vague qualities",
			fullDesc:
				"Instead of saying 'I am a passionate leader,' describe a specific challenge where you mobilized peers. Use concrete metrics, timelines, and measurable outcomes.",
			example:
				"\"Instead of: 'I love community service'\nTry: 'Every Saturday for two years, I tutored 15 students from underserved schools, helping 12 of them pass their board exams.'\"",
		},
		{
			id: "authentic",
			icon: Users,
			title: "Be Authentic",
			shortDesc: "Share your genuine journey and real voice",
			fullDesc:
				"Share your genuine experiences and voice. Authenticity resonates far more than an impersonal essay packed with complex jargon. Write as if talking to a trusted mentor.",
			example:
				'"Write as if you\'re talking to a respected professor: professional, honest, and grounded."',
		},
	];

	const essayStructure = [
		{
			title: "1. The Hook (10% of essay)",
			desc: "Start with a compelling anecdote, pivotal moment, or observation that immediately engages the reviewer.",
			doExample:
				'"When our village experienced regular electricity cuts during board exam season, I designed a basic battery inverter system that kept our study hall lit."',
			dontExample:
				'"I am writing to apply for this scholarship because I believe I am very hardworking and deserving."',
			timeSuggestion: "1-2 sentences",
		},
		{
			title: "2. The Context (20% of essay)",
			desc: "Provide background on your educational journey, personal hurdles, and circumstances that shaped your aspirations.",
			doExample:
				'"Growing up in a tier-3 town with limited laboratory access, I taught myself physics and computing using open-source tools and public library terminals."',
			dontExample: '"I have always liked engineering since my childhood days."',
			timeSuggestion: "1-2 paragraphs",
		},
		{
			title: "3. The Achievements (30% of essay)",
			desc: "Highlight specific accomplishments with clear evidence, team dynamics, and quantitative impact.",
			doExample:
				'"I led a 4-member student team to build a low-cost water quality tester, which won the state science congress and was deployed in 3 local schools."',
			dontExample:
				'"I participated in many competitions and received various certificates."',
			timeSuggestion: "2-3 paragraphs",
		},
		{
			title: "4. The Connection (25% of essay)",
			desc: "Connect your specific academic path to the scholarship organization's mandate and mission.",
			doExample:
				'"This trust\'s focus on supporting first-generation women in STEM directly aligns with my goal of pursuing postgraduate research in renewable energy storage."',
			dontExample:
				'"This scholarship grant will help me pay for my college semester fees."',
			timeSuggestion: "1-2 paragraphs",
		},
		{
			title: "5. The Vision (15% of essay)",
			desc: "Conclude with an inspiring, forward-looking roadmap demonstrating your commitment to giving back.",
			doExample:
				'"With this backing, I will finish my degree debt-free and establish a free STEM mentorship chapter for underprivileged students in my home district."',
			dontExample: '"Thank you for considering my profile for this grant."',
			timeSuggestion: "1 paragraph",
		},
	];

	const achievements = [
		{
			label: "Academic Excellence",
			description: "CGPA, honors, state ranks, research papers",
			example:
				"Instead of 'Good marks in college,' try: 'Maintained an 8.9 CGPA across 6 semesters while conducting research on microgrid stability published in the college conference journal'",
			color: "bg-emerald-100/70 text-emerald-800 border-emerald-200",
		},
		{
			label: "Leadership & Initiatives",
			description: "Student clubs, event organizing, mentoring",
			example:
				"Instead of 'Was active in student club,' try: 'Led 35-member Engineering Society, raised ₹1.2L in sponsorships, and organized 6 practical workshops for 400+ attendees'",
			color: "bg-teal-100/70 text-teal-800 border-teal-200",
		},
		{
			label: "Social Impact & Community",
			description: "Volunteering, public outreach, NGO work",
			example:
				"Instead of 'Did social work,' try: 'Volunteered 180+ hours teaching digital literacy and online banking safety to 60+ senior citizens in my neighborhood'",
			color: "bg-sky-100/70 text-sky-800 border-sky-200",
		},
		{
			label: "Technical & Vocational Skills",
			description: "Projects, open-source code, certifications",
			example:
				"Instead of 'Know coding,' try: 'Proficient in Python and React; built an open-source blood donor matching portal used by 250+ local volunteers'",
			color: "bg-amber-100/70 text-amber-800 border-amber-200",
		},
	];

	const mistakes = [
		{
			mistake: "Submitting a one-size-fits-all essay across multiple schemes",
			fix: "Customize at least 3-4 sentences to specifically address the funding body's mandate, priority branches, and criteria",
			severity: "high",
		},
		{
			mistake: "Ignoring official document requirements or word constraints",
			fix: "Always verify word count (keep within ±5% of limit) and ensure files are named clearly (e.g., JaneDoe_StatementOfPurpose.pdf)",
			severity: "high",
		},
		{
			mistake: "Grammar typos or unverified eligibility claims",
			fix: "Read your statement aloud, run automated spellcheck, and have a mentor review your claims against your income/caste certificates",
			severity: "high",
		},
		{
			mistake: "Failing to answer the exact notification prompt",
			fix: "Underline the key words in the scheme's application circular before drafting, and check off each requirement during editing",
			severity: "medium",
		},
		{
			mistake: "Listing activities without measurable outcomes",
			fix: "Use the STAR method: Situation + Task + Action + Quantifiable Result for every project cited",
			severity: "medium",
		},
	];

	const copyToClipboard = (text, id) => {
		navigator.clipboard.writeText(text);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	const toggleSectionComplete = (sectionId) => {
		let next;
		if (completedSections.includes(sectionId)) {
			next = completedSections.filter((id) => id !== sectionId);
		} else {
			next = [...completedSections, sectionId];
		}
		setCompletedSections(next);
		localStorage.setItem("completedGuideSections", JSON.stringify(next));
	};

	const toggleTipExpand = (tipId) => {
		setExpandedTips((prev) => ({
			...prev,
			[tipId]: !prev[tipId],
		}));
	};

	const progress = Math.round(
		(completedSections.length / sections.length) * 100,
	);
	const allDone = completedSections.length === sections.length;

	useEffect(() => {
		if (allDone) {
			setShowConfetti(true);
			const t = setTimeout(() => setShowConfetti(false), 3000);
			return () => clearTimeout(t);
		}
	}, [allDone]);

	useEffect(() => {
		const handleScroll = () => {
			if (contentRef.current) {
				const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
				const scrollProgress =
					(scrollTop / (scrollHeight - clientHeight)) * 100;
				setReadingProgress(Math.min(scrollProgress, 100));
			}
		};

		const contentElement = contentRef.current;
		if (contentElement) {
			contentElement.addEventListener("scroll", handleScroll);
			return () => contentElement.removeEventListener("scroll", handleScroll);
		}
	}, []);

	const particles = showConfetti
		? Array.from({ length: 36 }, (_, i) => ({
				id: i,
				left: Math.random() * 100,
				color: [
					"#143621",
					"#2d6a4f",
					"#52b788",
					"#74c69d",
					"#d8f3dc",
					"#b7e4c7",
				][i % 6],
				delay: Math.random() * 0.5,
				dur: 1.1 + Math.random() * 1.4,
				size: 4 + Math.random() * 5,
				round: Math.random() > 0.5,
			}))
		: [];

	return (
		<div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col font-sans">
			{/* Top Reading Progress Bar */}
			<div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-200/60">
				<div
					className="h-full bg-emerald-800 transition-all duration-150 ease-out"
					style={{ width: `${readingProgress}%` }}
				/>
			</div>

			{/* Hero Header */}
			<section className="relative overflow-hidden bg-white border-b border-slate-200/80 py-12 sm:py-16 px-4 sm:px-6">
				<div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-900/5 rounded-full blur-3xl pointer-events-none" />
				<div className="absolute -bottom-20 -left-20 w-64 h-64 bg-teal-800/5 rounded-full blur-3xl pointer-events-none" />

				{/* Confetti Celebration */}
				{particles.map((p) => (
					<div
						key={p.id}
						className="absolute pointer-events-none z-20"
						style={{
							left: `${p.left}%`,
							top: 0,
							width: p.size,
							height: p.size,
							backgroundColor: p.color,
							borderRadius: p.round ? "50%" : "2px",
							animation: `fadeIn ${p.dur}s ease-out ${p.delay}s forwards`,
						}}
					/>
				))}

				<div className="relative max-w-4xl mx-auto text-center">
					<Badge>Scholarship Preparation Guide</Badge>
					<h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-slate-900 tracking-tight leading-tight mt-3 mb-4">
						Craft a Standout Scholarship Application
					</h1>
					<p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
						Strategic writing frameworks, STAR method templates, and common
						pitfalls to ensure your story resonates with review committees.
					</p>

					{/* Metadata Ticker */}
					<div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-6">
						<div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
							<Clock className="w-4 h-4 text-emerald-800" />
							<span>15 min read</span>
						</div>
						<div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
							<Eye className="w-4 h-4 text-emerald-800" />
							<span>Verified across 37+ Schemes</span>
						</div>
						<div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
							<Star className="w-4 h-4 text-amber-500 fill-amber-500" />
							<span>4.9/5 Student Rating</span>
						</div>
					</div>

					{/* Toolbar Actions */}
					<div className="flex flex-wrap justify-center gap-3 mt-6">
						<button
							onClick={() => setBookmarked(!bookmarked)}
							className={`cursor-pointer px-4 py-2.5 rounded-2xl transition flex items-center gap-2 border text-sm font-semibold ${
								bookmarked
									? "bg-emerald-50 border-emerald-700 text-emerald-900 shadow-2xs"
									: "bg-white border-slate-200 text-slate-700 hover:border-emerald-700/40 hover:bg-slate-50"
							}`}
						>
							<Bookmark
								className={`w-4 h-4 ${bookmarked ? "fill-emerald-800 text-emerald-800" : ""}`}
							/>
							<span>{bookmarked ? "Saved" : "Save Guide"}</span>
						</button>
						<button
							onClick={() => setLiked(!liked)}
							className={`cursor-pointer px-4 py-2.5 rounded-2xl transition flex items-center gap-2 border text-sm font-semibold ${
								liked
									? "bg-emerald-50 border-emerald-700 text-emerald-900 shadow-2xs"
									: "bg-white border-slate-200 text-slate-700 hover:border-emerald-700/40 hover:bg-slate-50"
							}`}
						>
							<ThumbsUp
								className={`w-4 h-4 ${liked ? "fill-emerald-800 text-emerald-800" : ""}`}
							/>
							<span>{liked ? "Helpful (Marked)" : "Mark Helpful"}</span>
						</button>
						<button
							onClick={() => setIsFullscreen(!isFullscreen)}
							className="cursor-pointer px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:border-emerald-700/40 hover:bg-slate-50 transition flex items-center gap-2 text-sm font-semibold"
						>
							{isFullscreen ? (
								<Minimize className="w-4 h-4" />
							) : (
								<Expand className="w-4 h-4" />
							)}
							<span>{isFullscreen ? "Exit Focus" : "Focus Mode"}</span>
						</button>
					</div>
				</div>
			</section>

			{/* Main Content Area */}
			<div
				className={`flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 ${
					isFullscreen ? "max-w-4xl" : ""
				}`}
			>
				<div
					className={`grid gap-8 ${
						isFullscreen ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-4"
					}`}
				>
					{/* Left Sidebar Navigation */}
					{!isFullscreen && (
						<div className="lg:col-span-1">
							<div className="sticky top-24 bg-white rounded-3xl border border-slate-200/80 p-4 space-y-2 shadow-2xs">
								<div className="flex items-center justify-between px-2 pt-1 mb-2">
									<p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
										Guide Chapters
									</p>
									<span className="text-xs font-semibold text-slate-500">
										{completedSections.length}/{sections.length}
									</span>
								</div>

								{/* Mini Progress */}
								<div className="h-1.5 bg-slate-100 rounded-full mx-2 mb-3 overflow-hidden">
									<div
										className="h-full bg-emerald-800 rounded-full transition-all duration-300"
										style={{ width: `${progress}%` }}
									/>
								</div>

								{/* Section List */}
								{sections.map((section) => {
									const Icon = section.icon;
									const isActive = activeSection === section.id;
									const isComplete = completedSections.includes(section.id);
									return (
										<button
											key={section.id}
											onClick={() => setActiveSection(section.id)}
											className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition text-xs font-semibold group cursor-pointer ${
												isActive
													? "bg-emerald-50 text-emerald-950 border border-emerald-700/20"
													: "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
											}`}
										>
											<div className="relative">
												<Icon
													className={`w-4 h-4 ${
														isActive ? "text-emerald-800" : "text-slate-400"
													}`}
												/>
												{isComplete && (
													<div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-700 rounded-full flex items-center justify-center">
														<Check className="w-1.5 h-1.5 text-white" />
													</div>
												)}
											</div>
											<span className="flex-1 text-left">{section.label}</span>
											{isActive && (
												<ChevronRight className="w-3.5 h-3.5 text-emerald-800" />
											)}
										</button>
									);
								})}

								{/* Pro Tip Box */}
								<div className="pt-3 border-t border-slate-100">
									<div className="p-3 bg-[#FAF9F6] rounded-2xl border border-slate-200/80">
										<div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
											<Zap className="w-3.5 h-3.5 text-emerald-800" />
											<span>Checklist Tip</span>
										</div>
										<p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
											Mark each section complete to unlock the ready-to-use
											essay templates.
										</p>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Right Content Panel */}
					<div
						ref={contentRef}
						className={`${
							isFullscreen ? "w-full" : "lg:col-span-3"
						} space-y-8 pb-16`}
					>
						{/* Overview Section */}
						{activeSection === "overview" && (
							<div className="space-y-6">
								<div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs">
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center gap-3">
											<div className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-900">
												<BookOpen className="w-5 h-5" />
											</div>
											<h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
												Why Your Statement of Purpose Matters
											</h2>
										</div>
										<button
											onClick={() => toggleSectionComplete("overview")}
											className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
												completedSections.includes("overview")
													? "bg-emerald-100 text-emerald-950 border border-emerald-300"
													: "bg-slate-100 text-slate-600 hover:bg-slate-200"
											}`}
										>
											<CheckCircle
												className={`w-3.5 h-3.5 ${
													completedSections.includes("overview")
														? "fill-emerald-800 text-white"
														: ""
												}`}
											/>
											{completedSections.includes("overview")
												? "Completed"
												: "Mark Complete"}
										</button>
									</div>

									<p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
										Scholarship evaluation committees review hundreds of
										identical qualification transcripts. Your application
										statement is your sole chance to present context,
										demonstrate resilience, and prove why funding you creates
										lasting social impact.
									</p>

									{/* Key Stats */}
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
										<div className="bg-[#FAF9F6] border border-slate-200/80 rounded-2xl p-4 text-center">
											<Eye className="w-5 h-5 text-emerald-800 mx-auto mb-2" />
											<div className="text-2xl font-serif font-bold text-slate-900">
												45 secs
											</div>
											<div className="text-xs font-bold text-slate-700 mt-0.5">
												Initial Skim Window
											</div>
											<div className="text-[11px] text-slate-500 mt-1">
												Reviewers look for clear structure & verified metrics
											</div>
										</div>
										<div className="bg-[#FAF9F6] border border-slate-200/80 rounded-2xl p-4 text-center">
											<Users className="w-5 h-5 text-teal-800 mx-auto mb-2" />
											<div className="text-2xl font-serif font-bold text-slate-900">
												10x
											</div>
											<div className="text-xs font-bold text-slate-700 mt-0.5">
												Higher Impact
											</div>
											<div className="text-[11px] text-slate-500 mt-1">
												For candidates using evidence-based outcome statements
											</div>
										</div>
										<div className="bg-[#FAF9F6] border border-slate-200/80 rounded-2xl p-4 text-center">
											<Award className="w-5 h-5 text-emerald-900 mx-auto mb-2" />
											<div className="text-2xl font-serif font-bold text-slate-900">
												₹50k - ₹4L
											</div>
											<div className="text-xs font-bold text-slate-700 mt-0.5">
												Average Grant Value
											</div>
											<div className="text-[11px] text-slate-500 mt-1">
												Across state & corporate merit-cum-means awards
											</div>
										</div>
									</div>

									{/* Success Formula */}
									<div className="mt-6 bg-[#FAF9F6] rounded-2xl p-5 border border-slate-200/80">
										<div className="flex items-center gap-2 mb-3">
											<BarChart3 className="w-4 h-4 text-emerald-800" />
											<span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
												Application Weightage Breakdown
											</span>
										</div>
										<div className="grid grid-cols-5 gap-2">
											{[
												{ label: "Personal Story", percent: "30%" },
												{ label: "Measurable Impact", percent: "25%" },
												{ label: "Course Alignment", percent: "20%" },
												{ label: "Need & Merit Fit", percent: "15%" },
												{ label: "Doc Clarity", percent: "10%" },
											].map((item, i) => (
												<div key={i} className="text-center">
													<div className="h-14 bg-white rounded-xl border border-slate-200 relative overflow-hidden flex flex-col justify-end p-1">
														<div
															className="bg-emerald-800/20 rounded-lg w-full"
															style={{ height: item.percent }}
														/>
														<div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-emerald-950">
															{item.percent}
														</div>
													</div>
													<div className="text-[10px] text-slate-600 mt-1.5 font-semibold">
														{item.label}
													</div>
												</div>
											))}
										</div>
									</div>
								</div>

								{/* Tips Grid */}
								<div>
									<h3 className="text-lg font-serif font-bold text-slate-900 mb-4 flex items-center gap-2">
										<Sparkles className="w-5 h-5 text-emerald-800" />
										Core Application Principles
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{tips.map((tip) => {
											const Icon = tip.icon;
											const isExpanded = expandedTips[tip.id];
											return (
												<div
													key={tip.id}
													className="bg-white rounded-3xl border border-slate-200/80 hover:border-emerald-700/30 hover:shadow-sm transition p-5"
												>
													<div className="flex items-start gap-3.5">
														<div className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-900 shrink-0">
															<Icon className="w-5 h-5" />
														</div>
														<div className="flex-1">
															<h4 className="font-bold text-slate-900 text-sm">
																{tip.title}
															</h4>
															<p className="text-xs text-slate-600 mt-0.5">
																{tip.shortDesc}
															</p>
														</div>
														<button
															onClick={() => toggleTipExpand(tip.id)}
															className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
														>
															<ChevronDown
																className={`w-4 h-4 transition-transform ${
																	isExpanded ? "rotate-180" : ""
																}`}
															/>
														</button>
													</div>

													{isExpanded && (
														<div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-2.5">
															<p className="text-xs text-slate-600 leading-relaxed font-normal">
																{tip.fullDesc}
															</p>
															<div className="bg-[#FAF9F6] rounded-2xl p-3 border border-slate-200/70">
																<div className="flex items-center justify-between mb-1">
																	<span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
																		Example Formulation
																	</span>
																	<button
																		onClick={() =>
																			copyToClipboard(tip.example, tip.id)
																		}
																		className="flex items-center gap-1 text-[10px] font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer"
																	>
																		{copiedId === tip.id ? (
																			<>
																				<Check className="w-3 h-3 text-emerald-700" />
																				Copied
																			</>
																		) : (
																			<>
																				<Copy className="w-3 h-3" />
																				Copy
																			</>
																		)}
																	</button>
																</div>
																<p className="text-xs text-slate-700 italic font-serif">
																	{tip.example}
																</p>
															</div>
														</div>
													)}
												</div>
											);
										})}
									</div>
								</div>

								{/* Editorial Quote */}
								<div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-sm">
									<div className="relative z-10">
										<Quote className="w-8 h-8 text-emerald-400/50 mb-3" />
										<blockquote className="text-base sm:text-lg font-serif italic text-emerald-50 leading-relaxed">
											"A great scholarship essay is not a list of past
											achievements; it is a clear contract showing how external
											support will enable you to solve problems for your
											community."
										</blockquote>
										<div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-300">
											<span className="w-2 h-2 rounded-full bg-emerald-400" />
											<span>Udaan Academic Advisory Council</span>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Structure Section */}
						{activeSection === "structure" && (
							<div className="space-y-6">
								<div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs">
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center gap-3">
											<div className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-900">
												<FileText className="w-5 h-5" />
											</div>
											<h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
												Five-Step Narrative Blueprint
											</h2>
										</div>
										<button
											onClick={() => toggleSectionComplete("structure")}
											className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
												completedSections.includes("structure")
													? "bg-emerald-100 text-emerald-950 border border-emerald-300"
													: "bg-slate-100 text-slate-600 hover:bg-slate-200"
											}`}
										>
											<CheckCircle
												className={`w-3.5 h-3.5 ${
													completedSections.includes("structure")
														? "fill-emerald-800 text-white"
														: ""
												}`}
											/>
											{completedSections.includes("structure")
												? "Completed"
												: "Mark Complete"}
										</button>
									</div>

									<p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal mb-6">
										Organize your essay so each paragraph directly targets what
										selection committees evaluate: hook, background context,
										proven track record, mission alignment, and long-term
										vision.
									</p>

									<div className="space-y-4">
										{essayStructure.map((item, i) => (
											<div
												key={i}
												className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs"
											>
												<div className="bg-[#FAF9F6] px-5 py-3.5 flex items-center justify-between border-b border-slate-200/80">
													<h4 className="font-bold text-slate-900 text-sm">
														{item.title}
													</h4>
													<span className="text-[11px] font-bold text-emerald-900 bg-emerald-100/70 px-2.5 py-0.5 rounded-lg">
														{item.timeSuggestion}
													</span>
												</div>
												<div className="p-5 space-y-3">
													<p className="text-xs sm:text-sm text-slate-600 font-normal">
														{item.desc}
													</p>
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
														<div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
															<div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-1">
																<CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
																<span>Strong Formulation</span>
															</div>
															<p className="text-xs text-slate-700 italic font-serif">
																{item.doExample}
															</p>
														</div>
														<div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3">
															<div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 mb-1">
																<AlertCircle className="w-3.5 h-3.5 text-rose-600" />
																<span>Weak / Generic</span>
															</div>
															<p className="text-xs text-slate-700 italic font-serif">
																{item.dontExample}
															</p>
														</div>
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						)}

						{/* Achievements Section */}
						{activeSection === "achievements" && (
							<div className="space-y-6">
								<div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs">
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center gap-3">
											<div className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-900">
												<Award className="w-5 h-5" />
											</div>
											<h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
												Framing Your Achievements (STAR Method)
											</h2>
										</div>
										<button
											onClick={() => toggleSectionComplete("achievements")}
											className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
												completedSections.includes("achievements")
													? "bg-emerald-100 text-emerald-950 border border-emerald-300"
													: "bg-slate-100 text-slate-600 hover:bg-slate-200"
											}`}
										>
											<CheckCircle
												className={`w-3.5 h-3.5 ${
													completedSections.includes("achievements")
														? "fill-emerald-800 text-white"
														: ""
												}`}
											/>
											{completedSections.includes("achievements")
												? "Completed"
												: "Mark Complete"}
										</button>
									</div>

									<p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal mb-6">
										Translate ordinary activities into measurable
										accomplishments by applying the STAR (Situation, Task,
										Action, Result) model.
									</p>

									{/* STAR Breakdown */}
									<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
										{[
											{
												letter: "S",
												label: "Situation",
												desc: "Define the problem context",
											},
											{
												letter: "T",
												label: "Task",
												desc: "Identify your specific role",
											},
											{
												letter: "A",
												label: "Action",
												desc: "Detail technical steps taken",
											},
											{
												letter: "R",
												label: "Result",
												desc: "Quantify the outcome & impact",
											},
										].map((item, i) => (
											<div
												key={i}
												className="p-3.5 bg-[#FAF9F6] border border-slate-200 rounded-2xl text-center"
											>
												<span className="text-xl font-serif font-black text-emerald-900 block">
													{item.letter}
												</span>
												<span className="text-xs font-bold text-slate-800 block mt-0.5">
													{item.label}
												</span>
												<span className="text-[11px] text-slate-500 block mt-0.5">
													{item.desc}
												</span>
											</div>
										))}
									</div>

									<div className="space-y-4">
										{achievements.map((item, i) => (
											<div
												key={i}
												className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs"
											>
												<div className="p-4 flex items-center justify-between bg-slate-50/60 border-b border-slate-100">
													<div>
														<h4 className="font-bold text-slate-900 text-sm">
															{item.label}
														</h4>
														<p className="text-xs text-slate-500">
															{item.description}
														</p>
													</div>
													<span
														className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${item.color}`}
													>
														Category {i + 1}
													</span>
												</div>
												<div className="p-4 bg-white">
													<p className="text-xs sm:text-sm text-slate-700 italic font-serif leading-relaxed">
														{item.example}
													</p>
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						)}

						{/* Common Mistakes */}
						{activeSection === "common" && (
							<div className="space-y-6">
								<div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs">
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center gap-3">
											<div className="p-2.5 bg-rose-50 rounded-2xl text-rose-800">
												<AlertCircle className="w-5 h-5" />
											</div>
											<h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
												Critical Pitfalls & Instant Fixes
											</h2>
										</div>
										<button
											onClick={() => toggleSectionComplete("common")}
											className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
												completedSections.includes("common")
													? "bg-emerald-100 text-emerald-950 border border-emerald-300"
													: "bg-slate-100 text-slate-600 hover:bg-slate-200"
											}`}
										>
											<CheckCircle
												className={`w-3.5 h-3.5 ${
													completedSections.includes("common")
														? "fill-emerald-800 text-white"
														: ""
												}`}
											/>
											{completedSections.includes("common")
												? "Completed"
												: "Mark Complete"}
										</button>
									</div>

									<div className="space-y-3 mt-6">
										{mistakes.map((item, i) => (
											<div
												key={i}
												className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs"
											>
												<div className="p-4 bg-rose-50/40 flex items-start gap-3">
													<div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
														✕
													</div>
													<div className="flex-1">
														<span className="text-xs font-bold text-slate-900 block">
															{item.mistake}
														</span>
													</div>
													<span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
														{item.severity} Risk
													</span>
												</div>
												<div className="p-4 bg-emerald-50/30 border-t border-slate-100 flex items-start gap-2.5">
													<CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
													<p className="text-xs text-slate-700 leading-relaxed font-normal">
														<strong className="text-emerald-950 font-semibold">
															How to fix:{" "}
														</strong>
														{item.fix}
													</p>
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						)}

						{/* Final Polish */}
						{activeSection === "final" && (
							<div className="space-y-6">
								<div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs">
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center gap-3">
											<div className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-900">
												<Sparkles className="w-5 h-5" />
											</div>
											<h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
												Submission Readiness Checklist
											</h2>
										</div>
										<button
											onClick={() => toggleSectionComplete("final")}
											className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
												completedSections.includes("final")
													? "bg-emerald-100 text-emerald-950 border border-emerald-300"
													: "bg-slate-100 text-slate-600 hover:bg-slate-200"
											}`}
										>
											<CheckCircle
												className={`w-3.5 h-3.5 ${
													completedSections.includes("final")
														? "fill-emerald-800 text-white"
														: ""
												}`}
											/>
											{completedSections.includes("final")
												? "Completed"
												: "Mark Complete"}
										</button>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
										{[
											"Matched criteria against official gazette notification circular",
											"Verified family income ceiling and valid issuing authority",
											"Prepared original caste / disability / EWS certificate PDFs (< 500KB)",
											"Structured personal statement using the 5-step narrative blueprint",
											"Formatted word count within mandatory limits (e.g. 500-800 words)",
											"Proofread by reading aloud or using grammar verification tools",
											"Ensured bank account is seeded with Aadhaar for DBT disbursement",
											"Kept application acknowledgement receipt & reference number saved",
										].map((item, i) => (
											<div
												key={i}
												className="p-3.5 bg-[#FAF9F6] border border-slate-200/80 rounded-2xl flex items-start gap-2.5"
											>
												<CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
												<span className="text-xs text-slate-700 font-medium leading-snug">
													{item}
												</span>
											</div>
										))}
									</div>

									{/* CTA Box */}
									<div className="mt-8 bg-emerald-950 text-white rounded-3xl p-6 sm:p-8 text-center space-y-3">
										<h3 className="text-xl font-serif font-bold text-white">
											Ready to Find Your Eligible Scholarships?
										</h3>
										<p className="text-xs sm:text-sm text-emerald-200/80 max-w-lg mx-auto font-normal">
											Run your criteria through Udaan’s evaluation engine to get
											instant eligibility verdicts.
										</p>
										<div className="pt-2">
											<Link
												to="/eligibility"
												className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-emerald-950 font-bold text-xs hover:bg-emerald-50 transition shadow-sm"
											>
												<span>Check My Eligibility Now</span>
												<ChevronRight className="w-4 h-4" />
											</Link>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Bottom Navigation */}
						<div className="flex items-center justify-between pt-6 border-t border-slate-200/80">
							<button
								onClick={() => {
									const currentIndex = sections.findIndex(
										(s) => s.id === activeSection,
									);
									const prevIndex =
										currentIndex > 0 ? currentIndex - 1 : sections.length - 1;
									setActiveSection(sections[prevIndex].id);
								}}
								className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-900 transition cursor-pointer"
							>
								<ChevronRight className="w-4 h-4 rotate-180" />
								<span>Previous Chapter</span>
							</button>
							<span className="text-xs font-semibold text-slate-400">
								{sections.findIndex((s) => s.id === activeSection) + 1} of{" "}
								{sections.length}
							</span>
							<button
								onClick={() => {
									const currentIndex = sections.findIndex(
										(s) => s.id === activeSection,
									);
									const nextIndex = (currentIndex + 1) % sections.length;
									setActiveSection(sections[nextIndex].id);
								}}
								className="flex items-center gap-2 text-xs font-bold text-emerald-900 hover:text-emerald-950 transition cursor-pointer"
							>
								<span>Next Chapter</span>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ApplicationGuide;
