import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
	BookOpen,
	PenTool,
	Sparkles,
	CheckCircle,
	AlertCircle,
	ArrowRight,
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
	Play,
	Pause,
	RotateCcw,
	Star,
	Clock,
	BarChart3,
	ChevronDown,
	Volume2,
	VolumeX,
	Expand,
	Minimize,
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
	const [showTooltip, setShowTooltip] = useState(null);
	const [isPlaying, setIsPlaying] = useState(false);
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
			shortDesc: "Research the scholarship provider's values",
			fullDesc:
				"Research the scholarship provider's values and tailor your application to align with their mission. Look at past winners' essays if available, and understand what qualities they prioritize.",
			example:
				'"The [Scholarship Name] values innovation in education — so I focused on my ed-tech project rather than just listing grades."',
		},
		{
			id: "hook",
			icon: PenTool,
			title: "Start with a Hook",
			shortDesc: "Open with a compelling story or statement",
			fullDesc:
				"Open your essay with a compelling story or statement that grabs the reader's attention immediately. Avoid generic openings like 'I am applying for this scholarship because...'",
			example:
				'"At 2 AM, staring at a terminal window, I realized code wasn\'t just syntax — it was a way to solve real problems."',
		},
		{
			id: "show-dont-tell",
			icon: Lightbulb,
			title: "Show, Don't Tell",
			shortDesc: "Describe specific situations, not just qualities",
			fullDesc:
				'Instead of saying "I\'m a leader," describe a specific situation where you demonstrated leadership. Use concrete details, numbers, and outcomes.',
			example:
				"\"Instead of: 'I'm passionate about community service'\nTry: 'Every Saturday for two years, I tutored 15 students from low-income families, helping 12 of them improve their grades by at least one letter.\"",
		},
		{
			id: "authentic",
			icon: Users,
			title: "Be Authentic",
			shortDesc: "Share your genuine experiences and voice",
			fullDesc:
				"Share your genuine experiences and voice. Authenticity resonates more than a perfect-but-inauthentic essay. Don't use overly complex words or phrases that aren't natural to you.",
			example:
				'"Write as if you\'re talking to a respected mentor — professional but personal."',
		},
	];

	const essayStructure = [
		{
			title: "1. The Hook (10% of essay)",
			desc: "Start with a compelling anecdote, question, or statement that immediately engages the reader.",
			doExample:
				'"The first time I opened a terminal window, I felt like I\'d discovered a new language — one that could build worlds."',
			dontExample:
				'"I am writing to apply for the XYZ Scholarship because I believe I am a deserving candidate."',
			timeSuggestion: "1-2 sentences",
		},
		{
			title: "2. The Context (20% of essay)",
			desc: "Provide background on your journey, challenges, and the experiences that shaped you.",
			doExample:
				'"Growing up in a small town with limited STEM resources, I taught myself programming through free online courses, often studying by the light of my phone at night."',
			dontExample:
				'"I have always been interested in computers since I was young."',
			timeSuggestion: "1-2 paragraphs",
		},
		{
			title: "3. The Achievements (30% of essay)",
			desc: "Highlight specific accomplishments with measurable impact and personal growth.",
			doExample:
				'"I led a team of 12 to develop an app that connected 300+ students with free tutoring, resulting in a 40% improvement in test scores among regular users."',
			dontExample:
				'"I have won many awards and participated in various activities."',
			timeSuggestion: "2-3 paragraphs",
		},
		{
			title: "4. The Connection (25% of essay)",
			desc: "Connect your story to the scholarship's mission and why you're a perfect fit.",
			doExample:
				'"This scholarship\'s focus on technology for social good aligns perfectly with my goal of making education accessible to underserved communities."',
			dontExample: '"This scholarship would help me pay for college."',
			timeSuggestion: "1-2 paragraphs",
		},
		{
			title: "5. The Vision (15% of essay)",
			desc: "End with a forward-looking statement that reinforces your potential and gratitude.",
			doExample:
				'"With this support, I\'ll continue building technology that makes education accessible to all — and I hope to eventually create a platform that reaches 100,000 students."',
			dontExample: '"Thank you for considering my application."',
			timeSuggestion: "1 paragraph",
		},
	];

	const achievements = [
		{
			label: "Academic Excellence",
			description: "GPA, honors, awards, research projects",
			example:
				"Instead of 'Good grades,' try: 'Maintained 9.2 GPA while conducting research on renewable energy, published in college journal'",
			color: "bg-blue-100 text-blue-700",
		},
		{
			label: "Leadership",
			description: "Clubs, organizations, team lead roles",
			example:
				"Instead of 'Was president of club,' try: 'Led Computer Science Club of 45 members, organized 8 workshops, increased participation by 200%'",
			color: "bg-purple-100 text-purple-700",
		},
		{
			label: "Community Service",
			description: "Volunteering, social impact initiatives",
			example:
				"Instead of 'Did volunteer work,' try: 'Volunteered 200+ hours teaching digital literacy to 50+ elderly citizens, helping them connect with families online'",
			color: "bg-green-100 text-green-700",
		},
		{
			label: "Work Experience",
			description: "Internships, part-time jobs, projects",
			example:
				"Instead of 'Had an internship,' try: 'Completed 3-month internship at XYZ Tech, optimized database queries reducing load time by 35%'",
			color: "bg-orange-100 text-orange-700",
		},
		{
			label: "Skills & Certifications",
			description: "Languages, technical skills, certifications",
			example:
				"Instead of 'Know programming,' try: 'Proficient in Python, Java, and JavaScript with AWS Cloud Practitioner certification'",
			color: "bg-pink-100 text-pink-700",
		},
	];

	const mistakes = [
		{
			mistake: "Submitting a generic essay that could apply to any scholarship",
			fix: "Customize at least 3-4 sentences to specifically reference the scholarship's values and how you align with them",
			severity: "high",
		},
		{
			mistake: "Ignoring word limits and formatting requirements",
			fix: "Always check word count before submitting. Use a tool like WordCounter.net. Follow font, margin, and spacing requirements exactly",
			severity: "high",
		},
		{
			mistake:
				"Forgetting to proofread — typos and grammar errors hurt credibility",
			fix: "Read your essay backward, use Grammarly, and ask at least 2 other people to review it",
			severity: "high",
		},
		{
			mistake: "Not answering the prompt directly",
			fix: "Before writing, highlight key words in the prompt. After writing, check that each paragraph addresses some aspect of the prompt",
			severity: "medium",
		},
		{
			mistake: "Listing achievements without providing context or impact",
			fix: "For each achievement, add: What you did + How you did it + What was the measurable impact",
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
			const t = setTimeout(() => setShowConfetti(false), 2800);
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
					"#5AAD1F",
					"#F59E0B",
					"#3B82F6",
					"#EF4444",
					"#8B5CF6",
					"#EC4899",
				][i % 6],
				delay: Math.random() * 0.5,
				dur: 1.1 + Math.random() * 1.4,
				size: 4 + Math.random() * 5,
				round: Math.random() > 0.5,
			}))
		: [];

	return (
		<>
			<style jsx>{`
				@keyframes cfall {
					0% {
						transform: translateY(-8px) scale(1);
						opacity: 1;
					}
					100% {
						transform: translateY(300px) scale(0.4);
						opacity: 0;
					}
				}
				@keyframes fadeIn {
					from {
						opacity: 0;
						transform: translateY(8px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				@keyframes slideInLeft {
					from {
						opacity: 0;
						transform: translateX(-10px);
					}
					to {
						opacity: 1;
						transform: translateX(0);
					}
				}
				@keyframes pulse {
					0%,
					100% {
						transform: scale(1);
					}
					50% {
						transform: scale(1.05);
					}
				}
				@keyframes shimmer {
					0% {
						background-position: -200% 0;
					}
					100% {
						background-position: 200% 0;
					}
				}
				.animate-fadeIn {
					animation: fadeIn 0.4s ease-out forwards;
				}
				.animate-slideIn {
					animation: slideInLeft 0.3s ease-out forwards;
				}
				.animate-pulse {
					animation: pulse 2s ease-in-out infinite;
				}
				.shimmer {
					background: linear-gradient(
						90deg,
						transparent 0%,
						rgba(255, 255, 255, 0.4) 50%,
						transparent 100%
					);
					background-size: 200% 100%;
					animation: shimmer 2s infinite;
				}
				.scrollbar-thin::-webkit-scrollbar {
					width: 4px;
				}
				.scrollbar-thin::-webkit-scrollbar-track {
					background: transparent;
				}
				.scrollbar-thin::-webkit-scrollbar-thumb {
					background: #ddeccb;
					border-radius: 20px;
				}
				.scrollbar-thin::-webkit-scrollbar-thumb:hover {
					background: #c0dd97;
				}
			`}</style>

			<div className="min-h-screen bg-white text-gray-900 flex flex-col">
				{/* ── READING PROGRESS BAR ── */}
				<div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-100">
					<div
						className="h-full bg-[#5AAD1F] transition-all duration-150 ease-out"
						style={{ width: `${readingProgress}%` }}
					/>
				</div>

				{/* ── HERO ── */}
				<section className="relative overflow-hidden bg-[#F6FAF1] border-b border-[#DDECCB] py-12 sm:py-16 px-4 sm:px-6">
					<div className="absolute -top-24 -right-24 w-80 h-80 bg-[#5AAD1F]/4 rounded-full blur-3xl pointer-events-none" />
					<div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#5AAD1F]/4 rounded-full blur-3xl pointer-events-none" />

					{/* Confetti layer */}
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
								animation: `cfall ${p.dur}s ease-out ${p.delay}s forwards`,
							}}
						/>
					))}

					<div className="relative max-w-5xl mx-auto">
						{/* Breadcrumb / back link */}
						{/* <div className="mb-4 sm:mb-6 animate-slideIn">
							<Link
								to="/resources"
								className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#5AAD1F] transition-colors"
							>
								<ChevronRight className="w-4 h-4 rotate-180" />
								<span className="font-medium">Back to Resources</span>
							</Link>
						</div> */}

						<div className="text-center">
							<Badge>Writing Guide</Badge>
							<h1 className="text-4xl md:text-5xl lg:text-6xl font-pangea font-bold leading-tight mt-4 mb-3 animate-fadeIn">
								Write a Strong
								<br />
								<span className="text-[#5AAD1F]">Scholarship Application</span>
							</h1>
							<p className="font-dmsans text-sm sm:text-[15px] text-gray-500 leading-relaxed max-w-xl mx-auto px-2 animate-fadeIn">
								Master the art of application writing with proven strategies,
								expert tips, and real examples that will make your application
								stand out.
							</p>

							<div className="font-inter flex flex-wrap justify-center gap-4 sm:gap-6 mt-6 animate-fadeIn">
								<div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
									<Clock className="w-4 h-4 text-[#5AAD1F]" />
									<span>17 min total read</span>
								</div>
								<div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
									<Eye className="w-4 h-4 text-[#5AAD1F]" />
									<span>2.4k views this week</span>
								</div>
								<div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
									<Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
									<span>4.8/5 (156 ratings)</span>
								</div>
							</div>

							<div className="font-jakarta flex flex-wrap justify-center gap-3 mt-6 animate-fadeIn">
								<button
									onClick={() => setBookmarked(!bookmarked)}
									className={`cursor-pointer px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border ${
										bookmarked
											? "bg-[#EAF3DE] border-[#5AAD1F] text-[#5AAD1F] shadow-sm"
											: "bg-white border-gray-200/80 text-gray-600 hover:border-[#C0DD97] hover:bg-[#F6FAF1]"
									}`}
								>
									<Bookmark
										className={`w-4 h-4 ${bookmarked ? "fill-[#5AAD1F]" : ""}`}
									/>
									<span className="font-medium text-sm">
										{bookmarked ? "Saved" : "Save"}
									</span>
								</button>
								<button
									onClick={() => setLiked(!liked)}
									className={`cursor-pointer px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border ${
										liked
											? "bg-[#EAF3DE] border-[#5AAD1F] text-[#5AAD1F] shadow-sm"
											: "bg-white border-gray-200/80 text-gray-600 hover:border-[#C0DD97] hover:bg-[#F6FAF1]"
									}`}
								>
									<ThumbsUp
										className={`w-4 h-4 ${liked ? "fill-[#5AAD1F]" : ""}`}
									/>
									<span className="font-medium text-sm">
										{liked ? "Liked" : "Helpful"}
									</span>
								</button>
								<button className="cursor-pointer px-4 py-2.5 rounded-xl bg-white border border-gray-200/80 text-gray-600 hover:border-[#C0DD97] hover:bg-[#F6FAF1] transition-all flex items-center gap-2">
									<Share2 className="w-4 h-4" />
									<span className="font-medium text-sm">Share</span>
								</button>
								<button
									onClick={() => setIsFullscreen(!isFullscreen)}
									className="cursor-pointer px-4 py-2.5 rounded-xl bg-white border border-gray-200/80 text-gray-600 hover:border-[#C0DD97] hover:bg-[#F6FAF1] transition-all flex items-center gap-2"
								>
									{isFullscreen ? (
										<Minimize className="w-4 h-4" />
									) : (
										<Expand className="w-4 h-4" />
									)}
									<span className="font-medium text-sm">
										{isFullscreen ? "Exit Focus" : "Focus Mode"}
									</span>
								</button>
							</div>
						</div>
					</div>
				</section>

				<div
					className={`flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 ${
						isFullscreen ? "max-w-4xl" : ""
					}`}
				>
					<div
						className={`grid gap-8 ${isFullscreen ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-4"}`}
					>
						{!isFullscreen && (
							<div className="lg:col-span-1">
								<div className="sticky top-8 bg-white rounded-2xl shadow-sm border border-gray-200/80 p-4 space-y-1">
									<div className="font-raleway flex items-center justify-between mb-3">
										<p className="text-xs font-semibold text-[#5AAD1F] uppercase tracking-wider px-3">
											Guide Sections
										</p>
										<span className="text-xs font-medium text-gray-400">
											{completedSections.length}/{sections.length}
										</span>
									</div>

									<div className="h-1.5 bg-gray-100 rounded-full mx-3 mb-3 overflow-hidden">
										<div
											className="h-full bg-[#5AAD1F] rounded-full transition-all duration-500"
											style={{ width: `${progress}%` }}
										/>
									</div>

									{sections.map((section, i) => {
										const Icon = section.icon;
										const isActive = activeSection === section.id;
										const isComplete = completedSections.includes(section.id);
										return (
											<button
												key={section.id}
												onClick={() => setActiveSection(section.id)}
												className={`font-dmsans w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group ${
													isActive
														? "bg-[#EAF3DE] text-[#5AAD1F] shadow-sm"
														: "text-gray-600 hover:bg-[#F6FAF1] hover:text-[#5AAD1F]"
												}`}
												style={{ animationDelay: `${i * 50}ms` }}
											>
												<div className="relative">
													<Icon
														className={`w-4 h-4 ${isActive ? "text-[#5AAD1F]" : "text-gray-400"}`}
													/>
													{isComplete && (
														<div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#5AAD1F] rounded-full flex items-center justify-center">
															<Check className="w-1.5 h-1.5 text-white" />
														</div>
													)}
												</div>
												<span className="flex-1 text-left">
													{section.label}
												</span>
												<span className="text-[10px] text-gray-400 hidden sm:block">
													{section.time}
												</span>
												{isActive && (
													<ChevronRight className="w-4 h-4 text-[#5AAD1F]" />
												)}
											</button>
										);
									})}

									<div className="font-dmsans border-t border-gray-200/50 my-3 pt-3">
										<div className="px-3 py-2 bg-[#F6FAF1] rounded-xl border border-[#DDECCB]">
											<div className="flex items-center gap-2 text-xs text-[#5AAD1F]">
												<Zap className="w-3 h-3" />
												<span className="font-medium">Pro Tip</span>
											</div>
											<p className="text-xs text-gray-600 mt-1 leading-relaxed">
												Mark sections as complete to track your progress through
												the guide.
											</p>
										</div>
									</div>

									{/* Quick Actions */}
									<div className="font-dmsans border-t border-gray-200/50 my-3 pt-3 space-y-2">
										<button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-[#5AAD1F] hover:bg-[#F6FAF1] rounded-lg transition-colors">
											<RotateCcw className="w-3.5 h-3.5" />
											Reset Progress
										</button>
										<button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-[#5AAD1F] hover:bg-[#F6FAF1] rounded-lg transition-colors">
											<FileText className="w-3.5 h-3.5" />
											Download as PDF
										</button>
									</div>
								</div>
							</div>
						)}

						<div
							ref={contentRef}
							className={`${isFullscreen ? "w-full" : "lg:col-span-3"} space-y-8 pb-16 overflow-y-auto scrollbar-thin`}
							style={{
								maxHeight: isFullscreen ? "calc(100vh - 200px)" : "none",
							}}
						>
							{activeSection === "overview" && (
								<div className="animate-fadeIn space-y-8">
									<div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 md:p-8">
										<div className="flex items-center justify-between mb-4">
											<div className="flex items-center gap-3">
												<div className="p-2 bg-[#EAF3DE] rounded-xl">
													<BookOpen className="w-5 h-5 text-[#5AAD1F]" />
												</div>
												<h2 className="font-dmsans text-2xl font-bold text-gray-800">
													Why Your Application Matters
												</h2>
											</div>
											<button
												onClick={() => toggleSectionComplete("overview")}
												className={`font-pangea flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
													completedSections.includes("overview")
														? "bg-[#EAF3DE] text-[#5AAD1F]"
														: "bg-gray-100 text-gray-500 hover:bg-[#F6FAF1] hover:text-[#5AAD1F]"
												}`}
											>
												<CheckCircle
													className={`w-3.5 h-3.5 ${
														completedSections.includes("overview")
															? "fill-[#5AAD1F]"
															: ""
													}`}
												/>
												{completedSections.includes("overview")
													? "Completed"
													: "Mark Complete"}
											</button>
										</div>
										<p className="font-dmsans text-gray-600 leading-relaxed">
											Your scholarship application is more than just paperwork —
											it's your opportunity to tell your story, showcase your
											potential, and convince the selection committee that
											you're the perfect candidate. A well-crafted application
											can be the difference between being remembered and being
											overlooked.
										</p>

										<div className="font-dmsans grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
											{[
												{
													icon: Eye,
													label: "First Impression",
													value: "30 secs",
													desc: "Average review time per application",
													color: "bg-blue-50 border-blue-100",
												},
												{
													icon: Users,
													label: "Competition",
													value: "500+",
													desc: "Applicants per prestigious scholarship",
													color: "bg-purple-50 border-purple-100",
												},
												{
													icon: Award,
													label: "Success Rate",
													value: "5-15%",
													desc: "Typical acceptance rate",
													color: "bg-amber-50 border-amber-100",
												},
											].map((stat, i) => (
												<div
													key={i}
													className={`${stat.color} rounded-xl p-4 text-center border`}
												>
													<stat.icon className="w-5 h-5 text-[#5AAD1F] mx-auto mb-2" />
													<div className="text-2xl font-bold text-[#5AAD1F]">
														{stat.value}
													</div>
													<div className="text-sm font-medium text-gray-700">
														{stat.label}
													</div>
													<div className="text-xs text-gray-500 mt-1">
														{stat.desc}
													</div>
												</div>
											))}
										</div>

										{/* Visual Representation */}
										<div className="font-dmsans mt-6 bg-linear-to-r from-[#F6FAF1] to-[#EAF3DE] rounded-xl p-5 border border-[#DDECCB]">
											<div className="flex items-center gap-2 mb-3">
												<BarChart3 className="w-4 h-4 text-[#5AAD1F]" />
												<span className="text-sm font-medium text-gray-700">
													Application Success Formula
												</span>
											</div>
											<div className="grid grid-cols-5 gap-2">
												{[
													{ label: "Story", percent: "30%" },
													{ label: "Impact", percent: "25%" },
													{ label: "Clarity", percent: "20%" },
													{ label: "Fit", percent: "15%" },
													{ label: "Polish", percent: "10%" },
												].map((item, i) => (
													<div key={i} className="text-center">
														<div className="h-16 bg-white rounded-lg border border-[#DDECCB] relative overflow-hidden">
															<div
																className="absolute bottom-0 left-0 right-0 bg-[#5AAD1F]/20 rounded-b-lg"
																style={{ height: `${item.percent}` }}
															/>
															<div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#5AAD1F]">
																{item.percent}
															</div>
														</div>
														<div className="text-[10px] text-gray-600 mt-1 font-medium">
															{item.label}
														</div>
													</div>
												))}
											</div>
										</div>
									</div>

									{/* Tips Grid with Expand/Collapse */}
									<div className="font-dmsans ">
										<h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
											<Sparkles className="w-5 h-5 text-[#5AAD1F]" />
											Key Tips for Success
										</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{tips.map((tip, i) => {
												const Icon = tip.icon;
												const isExpanded = expandedTips[tip.id];
												return (
													<div
														key={i}
														className="bg-white rounded-2xl shadow-sm border border-gray-200/80 hover:shadow-md hover:border-[#C0DD97] transition-all group"
													>
														<div className="p-5">
															<div className="flex items-start gap-4">
																<div className="p-2.5 bg-[#EAF3DE] rounded-xl group-hover:scale-110 transition-transform">
																	<Icon className="w-5 h-5 text-[#5AAD1F]" />
																</div>
																<div className="flex-1">
																	<h4 className="font-semibold text-gray-800">
																		{tip.title}
																	</h4>
																	<p className="text-sm text-gray-500 mt-1">
																		{tip.shortDesc}
																	</p>
																</div>
																<button
																	onClick={() => toggleTipExpand(tip.id)}
																	className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
																>
																	<ChevronDown
																		className={`w-4 h-4 text-gray-400 transition-transform ${
																			isExpanded ? "rotate-180" : ""
																		}`}
																	/>
																</button>
															</div>

															{isExpanded && (
																<div className="mt-4 pt-4 border-t border-gray-100 animate-fadeIn">
																	<p className="text-sm text-gray-600 leading-relaxed">
																		{tip.fullDesc}
																	</p>
																	<div className="mt-3 bg-[#F6FAF1] rounded-lg p-3 border border-[#DDECCB]">
																		<div className="flex items-center justify-between">
																			<p className="text-xs text-gray-500 font-medium">
																				Example:
																			</p>
																			<button
																				onClick={() =>
																					copyToClipboard(tip.example, tip.id)
																				}
																				className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#5AAD1F] transition-colors"
																			>
																				{copiedId === tip.id ? (
																					<>
																						<Check className="w-3 h-3" />
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
																		<p className="text-xs text-[#5AAD1F] italic mt-1">
																			{tip.example}
																		</p>
																	</div>
																</div>
															)}
														</div>
													</div>
												);
											})}
										</div>
									</div>

									{/* Quote */}
									<div className="font-dmsans bg-[#F6FAF1] rounded-2xl p-6 md:p-8 border border-[#DDECCB]">
										<Quote className="w-8 h-8 text-[#5AAD1F]/60 mb-3" />
										<blockquote className="text-lg md:text-xl text-gray-700 italic leading-relaxed">
											"The scholarship essay is your chance to transform from a
											name on a page into a person with dreams, achievements,
											and a compelling future. Make every word count."
										</blockquote>
										<p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
											<span className="w-1.5 h-1.5 rounded-full bg-[#5AAD1F]" />
											Udaan Writing Team
										</p>
									</div>
								</div>
							)}

							{/* ── Essay Structure ── */}
							{activeSection === "structure" && (
								<div className="font-dmsans animate-fadeIn space-y-6">
									<div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 md:p-8">
										<div className="flex items-center justify-between mb-4">
											<div className="flex items-center gap-3">
												<div className="p-2 bg-[#EAF3DE] rounded-xl">
													<FileText className="w-5 h-5 text-[#5AAD1F]" />
												</div>
												<h2 className="text-2xl font-bold text-gray-800">
													Essay Structure That Works
												</h2>
											</div>
											<button
												onClick={() => toggleSectionComplete("structure")}
												className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
													completedSections.includes("structure")
														? "bg-[#EAF3DE] text-[#5AAD1F]"
														: "bg-gray-100 text-gray-500 hover:bg-[#F6FAF1] hover:text-[#5AAD1F]"
												}`}
											>
												<CheckCircle
													className={`w-3.5 h-3.5 ${
														completedSections.includes("structure")
															? "fill-[#5AAD1F]"
															: ""
													}`}
												/>
												{completedSections.includes("structure")
													? "Completed"
													: "Mark Complete"}
											</button>
										</div>
										<p className="text-gray-600 leading-relaxed mb-6">
											A clear, logical structure helps the reader follow your
											story and understand your key points.
										</p>

										{/* Visual Essay Structure */}
										<div className="bg-[#F6FAF1] rounded-xl p-5 border border-[#DDECCB] mb-6">
											<div className="flex items-center gap-2 mb-3">
												<BarChart3 className="w-4 h-4 text-[#5AAD1F]" />
												<span className="text-sm font-medium text-gray-700">
													Ideal Essay Structure
												</span>
											</div>
											<div className="flex h-8 rounded-lg overflow-hidden">
												{[
													{ width: "10%", color: "bg-[#5AAD1F]" },
													{ width: "20%", color: "bg-[#7BC950]" },
													{ width: "30%", color: "bg-[#A0E080]" },
													{ width: "25%", color: "bg-[#C5EDB0]" },
													{ width: "15%", color: "bg-[#E0F5D8]" },
												].map((segment, i) => (
													<div
														key={i}
														className={`${segment.color}`}
														style={{ width: segment.width }}
													/>
												))}
											</div>
											<div className="flex justify-between mt-2 text-[10px] text-gray-500">
												<span>Hook</span>
												<span>Context</span>
												<span>Achievements</span>
												<span>Connection</span>
												<span>Vision</span>
											</div>
										</div>

										<div className="space-y-4">
											{essayStructure.map((item, i) => (
												<div
													key={i}
													className="border border-[#DDECCB] rounded-xl overflow-hidden"
												>
													<div className="bg-[#F6FAF1] px-4 py-3 flex items-center justify-between">
														<h4 className="font-semibold text-gray-800">
															{item.title}
														</h4>
														<span className="text-xs text-[#5AAD1F] font-medium bg-[#EAF3DE] px-2 py-0.5 rounded">
															{item.timeSuggestion}
														</span>
													</div>
													<div className="p-4 space-y-3">
														<p className="text-sm text-gray-600">{item.desc}</p>

														<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
															<div className="bg-green-50 rounded-lg p-3 border border-green-100">
																<div className="flex items-center gap-1 mb-1">
																	<CheckCircle className="w-3 h-3 text-green-600" />
																	<span className="text-xs font-medium text-green-700">
																		Do This
																	</span>
																</div>
																<p className="text-xs text-gray-600 italic">
																	{item.doExample}
																</p>
															</div>
															<div className="bg-red-50 rounded-lg p-3 border border-red-100">
																<div className="flex items-center gap-1 mb-1">
																	<AlertCircle className="w-3 h-3 text-red-600" />
																	<span className="text-xs font-medium text-red-700">
																		Not This
																	</span>
																</div>
																<p className="text-xs text-gray-600 italic">
																	{item.dontExample}
																</p>
															</div>
														</div>
													</div>
												</div>
											))}
										</div>
									</div>

									{/* Writing Practice Section */}
									<div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 md:p-8">
										<div className="flex items-center gap-3 mb-4">
											<div className="p-2 bg-[#EAF3DE] rounded-xl">
												<PenTool className="w-5 h-5 text-[#5AAD1F]" />
											</div>
											<h3 className="text-lg font-bold text-gray-800">
												Practice Your Hook
											</h3>
										</div>
										<p className="text-sm text-gray-500 mb-4">
											Try writing a compelling opening for your scholarship
											essay. Focus on being specific and engaging.
										</p>
										<textarea
											className="w-full h-32 p-4 bg-[#F6FAF1] border border-[#DDECCB] rounded-xl text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] transition-all"
											placeholder="Start typing your hook here..."
										/>
										<div className="flex items-center justify-between mt-2">
											<span className="text-xs text-gray-400">
												0/500 characters
											</span>
											<button className="text-xs text-[#5AAD1F] font-medium hover:text-[#4A9A18] flex items-center gap-1">
												<Sparkles className="w-3 h-3" />
												Get AI Feedback
											</button>
										</div>
									</div>
								</div>
							)}

							{/* ── Achievements ── */}
							{activeSection === "achievements" && (
								<div className="font-dmsans animate-fadeIn space-y-6">
									<div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 md:p-8">
										<div className="flex items-center justify-between mb-4">
											<div className="flex items-center gap-3">
												<div className="p-2 bg-[#EAF3DE] rounded-xl">
													<Award className="w-5 h-5 text-[#5AAD1F]" />
												</div>
												<h2 className="text-2xl font-bold text-gray-800">
													How to Highlight Your Achievements
												</h2>
											</div>
											<button
												onClick={() => toggleSectionComplete("achievements")}
												className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
													completedSections.includes("achievements")
														? "bg-[#EAF3DE] text-[#5AAD1F]"
														: "bg-gray-100 text-gray-500 hover:bg-[#F6FAF1] hover:text-[#5AAD1F]"
												}`}
											>
												<CheckCircle
													className={`w-3.5 h-3.5 ${
														completedSections.includes("achievements")
															? "fill-[#5AAD1F]"
															: ""
													}`}
												/>
												{completedSections.includes("achievements")
													? "Completed"
													: "Mark Complete"}
											</button>
										</div>
										<p className="text-gray-600 leading-relaxed mb-6">
											Don't just list what you've done — show the impact, the
											skills you gained, and how it shaped you.
										</p>

										<div className="space-y-4">
											{achievements.map((item, i) => (
												<div
													key={i}
													className="border border-gray-200 rounded-xl overflow-hidden"
												>
													<div className="flex items-start gap-4 p-4">
														<div className="w-10 h-10 rounded-full bg-[#EAF3DE] flex items-center justify-center shrink-0">
															<span className="text-[#5AAD1F] font-bold text-lg">
																{i + 1}
															</span>
														</div>
														<div className="flex-1">
															<h4 className="font-semibold text-gray-800">
																{item.label}
															</h4>
															<p className="text-sm text-gray-500">
																{item.description}
															</p>
														</div>
														<span
															className={`px-2 py-0.5 rounded text-[10px] font-medium ${item.color}`}
														>
															{item.description.split(",")[0]}
														</span>
													</div>
													<div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
														<div className="flex items-center justify-between mb-1">
															<span className="text-xs font-medium text-gray-500">
																Example Transformation:
															</span>
															<button
																onClick={() =>
																	copyToClipboard(
																		item.example,
																		`achievement-${i}`,
																	)
																}
																className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#5AAD1F] transition-colors"
															>
																{copiedId === `achievement-${i}` ? (
																	<>
																		<Check className="w-3 h-3" />
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
														<p className="text-xs text-gray-600">
															{item.example}
														</p>
													</div>
												</div>
											))}
										</div>

										<div className="font-dmsans mt-6 p-4 bg-[#EAF3DE]/50 rounded-xl border border-[#C0DD97]">
											<h4 className="font-semibold text-gray-800 flex items-center gap-2">
												<Lightbulb className="w-4 h-4 text-[#5AAD1F]" />
												The STAR Method
											</h4>
											<p className="text-xs text-gray-600 mt-1 mb-3">
												Use this framework to structure your achievement
												descriptions:
											</p>
											<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
												{[
													{
														letter: "S",
														label: "Situation",
														desc: "Set the scene",
													},
													{
														letter: "T",
														label: "Task",
														desc: "Your responsibility",
													},
													{
														letter: "A",
														label: "Action",
														desc: "What you did",
													},
													{ letter: "R", label: "Result", desc: "The outcome" },
												].map((item, i) => (
													<div
														key={i}
														className="text-center p-2 bg-white rounded-lg border border-[#DDECCB]"
													>
														<span className="font-bold text-[#5AAD1F] block text-lg">
															{item.letter}
														</span>
														<span className="text-gray-600 text-xs font-medium block">
															{item.label}
														</span>
														<span className="text-gray-400 text-[10px] block">
															{item.desc}
														</span>
													</div>
												))}
											</div>
										</div>
									</div>
								</div>
							)}

							{/* ── Common Mistakes ── */}
							{activeSection === "common" && (
								<div className="font-dmsans animate-fadeIn space-y-6">
									<div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 md:p-8">
										<div className="flex items-center justify-between mb-4">
											<div className="flex items-center gap-3">
												<div className="p-2 bg-red-100 rounded-xl">
													<AlertCircle className="w-5 h-5 text-red-500" />
												</div>
												<h2 className="text-2xl font-bold text-gray-800">
													Common Mistakes to Avoid
												</h2>
											</div>
											<button
												onClick={() => toggleSectionComplete("common")}
												className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
													completedSections.includes("common")
														? "bg-[#EAF3DE] text-[#5AAD1F]"
														: "bg-gray-100 text-gray-500 hover:bg-[#F6FAF1] hover:text-[#5AAD1F]"
												}`}
											>
												<CheckCircle
													className={`w-3.5 h-3.5 ${
														completedSections.includes("common")
															? "fill-[#5AAD1F]"
															: ""
													}`}
												/>
												{completedSections.includes("common")
													? "Completed"
													: "Mark Complete"}
											</button>
										</div>
										<p className="text-gray-600 leading-relaxed mb-6">
											Even strong candidates get rejected due to avoidable
											errors. Here's what to watch out for:
										</p>

										<div className="space-y-3">
											{mistakes.map((item, i) => (
												<div
													key={i}
													className="border border-gray-200 rounded-xl overflow-hidden"
												>
													<div className="flex items-start gap-3 p-4 bg-red-50/30">
														<div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
															<span className="text-red-500 text-xs font-bold">
																✕
															</span>
														</div>
														<div className="flex-1">
															<div className="flex items-center gap-2 mb-1">
																<span className="text-gray-700 text-sm font-medium">
																	{item.mistake}
																</span>
																<span
																	className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
																		item.severity === "high"
																			? "bg-red-100 text-red-600"
																			: "bg-amber-100 text-amber-600"
																	}`}
																>
																	{item.severity}
																</span>
															</div>
														</div>
													</div>
													<div className="px-4 py-3 bg-green-50/50 border-t border-gray-100">
														<div className="flex items-center gap-1 mb-1">
															<CheckCircle className="w-3 h-3 text-green-600" />
															<span className="text-xs font-medium text-green-700">
																How to Fix
															</span>
														</div>
														<p className="text-xs text-gray-600">{item.fix}</p>
													</div>
												</div>
											))}
										</div>
									</div>

									<div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200/30">
										<h3 className="font-semibold text-green-800 flex items-center gap-2">
											<CheckCircle className="w-5 h-5 text-green-600" />
											Quick Fix Checklist
										</h3>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
											{[
												"Research the scholarship and its values",
												"Brainstorm and outline your essay",
												"Write a compelling opening hook",
												"Highlight specific achievements with context",
												"Connect your goals to the scholarship's mission",
												"Proofread and edit (read aloud!)",
												"Get feedback from a mentor or peer",
												"Format according to requirements",
											].map((item, i) => (
												<div
													key={i}
													className="flex items-center gap-2 text-sm text-gray-700"
												>
													<CheckCircle className="w-4 h-4 text-green-500" />
													<span>{item}</span>
												</div>
											))}
										</div>
									</div>
								</div>
							)}

							{/* ── Final Polish ── */}
							{activeSection === "final" && (
								<div className="font-dmsans animate-fadeIn space-y-6">
									<div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 md:p-8">
										<div className="flex items-center justify-between mb-4">
											<div className="flex items-center gap-3">
												<div className="p-2 bg-[#EAF3DE] rounded-xl">
													<Sparkles className="w-5 h-5 text-[#5AAD1F]" />
												</div>
												<h2 className="text-2xl font-bold text-gray-800">
													Final Polish & Submission
												</h2>
											</div>
											<button
												onClick={() => toggleSectionComplete("final")}
												className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
													completedSections.includes("final")
														? "bg-[#EAF3DE] text-[#5AAD1F]"
														: "bg-gray-100 text-gray-500 hover:bg-[#F6FAF1] hover:text-[#5AAD1F]"
												}`}
											>
												<CheckCircle
													className={`w-3.5 h-3.5 ${
														completedSections.includes("final")
															? "fill-[#5AAD1F]"
															: ""
													}`}
												/>
												{completedSections.includes("final")
													? "Completed"
													: "Mark Complete"}
											</button>
										</div>

										<div className="space-y-6">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												{[
													{
														title: "Read Aloud",
														desc: "Hear how your essay flows and catch awkward phrasing.",
														tip: "Record yourself reading to catch issues you might miss visually.",
													},
													{
														title: "Get Feedback",
														desc: "Ask mentors, teachers, or peers to review your work.",
														tip: "Give them specific questions: 'Is my hook compelling?' 'Is my connection clear?'",
													},
													{
														title: "Check Formatting",
														desc: "Ensure fonts, margins, and spacing match requirements.",
														tip: "Use the exact file format requested (PDF, DOCX, etc.).",
													},
													{
														title: "Proofread Twice",
														desc: "Check for typos, grammar, and punctuation errors.",
														tip: "Read backward sentence by sentence to focus on each word.",
													},
													{
														title: "Verify Word Count",
														desc: "Stay within the specified limits.",
														tip: "Most essays are 500-1000 words. Going over shows you can't follow directions.",
													},
													{
														title: "Save as PDF",
														desc: "Use the recommended format for submission.",
														tip: "Name your file professionally: 'Firstname_Lastname_ScholarshipName.pdf'",
													},
												].map((item, i) => (
													<div
														key={i}
														className="border border-gray-200 rounded-xl overflow-hidden"
													>
														<div className="flex items-start gap-3 p-4">
															<CheckCircle className="w-4 h-4 text-[#5AAD1F] shrink-0 mt-0.5" />
															<div>
																<h4 className="font-medium text-gray-800 text-sm">
																	{item.title}
																</h4>
																<p className="text-xs text-gray-500">
																	{item.desc}
																</p>
															</div>
														</div>
														<div className="px-4 py-2.5 bg-[#F6FAF1] border-t border-gray-100">
															<div className="flex items-center gap-1">
																<Lightbulb className="w-3 h-3 text-[#5AAD1F]" />
																<span className="text-[10px] text-[#5AAD1F] font-medium">
																	Pro tip:
																</span>
																<span className="text-[10px] text-gray-600">
																	{item.tip}
																</span>
															</div>
														</div>
													</div>
												))}
											</div>
										</div>
									</div>

									{/* CTA */}
									<div className="bg-linear-to-br from-[#5AAD1F] to-[#4A9A18] rounded-2xl p-8 text-white text-center relative overflow-hidden">
										<div className="absolute inset-0 opacity-10">
											<div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
											<div className="absolute bottom-0 right-0 w-48 h-48 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
										</div>
										<div className="relative">
											<h3 className="text-2xl font-bold mb-2">
												Ready to Write Your Application?
											</h3>
											<p className="text-green-100 mb-6 max-w-lg mx-auto">
												Use these strategies to craft a compelling application
												that stands out from the crowd.
											</p>
											<div className="flex flex-wrap justify-center gap-4">
												<button className="px-6 py-3 bg-white text-[#5AAD1F] rounded-xl font-semibold hover:bg-[#F6FAF1] transition-all flex items-center gap-2 shadow-lg hover:shadow-xl">
													<FileText className="w-4 h-4" />
													Download Template
												</button>
												<button className="px-6 py-3 bg-[#3D8813]/40 text-white rounded-xl font-semibold hover:bg-[#3D8813]/60 transition-all flex items-center gap-2 border border-white/20">
													<MessageCircle className="w-4 h-4" />
													Ask AI Assistant
												</button>
											</div>
										</div>
									</div>

									{/* Completion Message */}
									{allDone && (
										<div className="bg-[#F6FAF1] rounded-2xl p-6 border border-[#DDECCB] text-center animate-pulse">
											<div className="text-3xl mb-2">🎉</div>
											<h3 className="text-lg font-bold text-[#5AAD1F]">
												Congratulations!
											</h3>
											<p className="text-sm text-gray-600 mt-1">
												You've completed the entire guide. You're now ready to
												write a standout scholarship application!
											</p>
										</div>
									)}
								</div>
							)}

							{/* Navigation */}
							<div className="font-dmsans flex items-center gap-4 pt-4">
								<div className="flex-1 h-px bg-gray-200/50" />
								<span className="text-xs text-[#5AAD1F] font-medium">✦</span>
								<div className="flex-1 h-px bg-gray-200/50" />
							</div>

							<div className="font-dmsans flex justify-between items-center">
								<button
									onClick={() => {
										const currentIndex = sections.findIndex(
											(s) => s.id === activeSection,
										);
										const prevIndex =
											currentIndex > 0 ? currentIndex - 1 : sections.length - 1;
										setActiveSection(sections[prevIndex].id);
									}}
									className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#5AAD1F] transition-colors"
								>
									<ChevronRight className="w-4 h-4 rotate-180" />
									Previous
								</button>
								<span className="text-xs text-gray-400">
									{sections.findIndex((s) => s.id === activeSection) + 1} /{" "}
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
									className="flex items-center gap-2 text-sm text-[#5AAD1F] hover:text-[#4A9A18] transition-colors font-medium"
								>
									Next
									<ChevronRight className="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default ApplicationGuide;
