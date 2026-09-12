import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
	Mail,
	MapPin,
	Phone,
	Send,
	HelpCircle,
	AlertCircle,
	Sparkles,
	CheckCircle2,
	MessageSquare,
	ArrowRight,
	Plus,
	Minus,
} from "lucide-react";
import heroImg from "../assets/images/support2.webp";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { faqs } from "../utils/faqs";
import { toast } from "sonner";

gsap.registerPlugin(ScrollToPlugin);

const quickHelp = [
	{
		icon: "📚",
		bg: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
		title: "Scholarship Matching",
		desc: "How to filter and match schemes against your exact degree, caste, and income tier.",
	},
	{
		icon: "📄",
		bg: "bg-teal-50 text-teal-800 border-teal-200/80",
		title: "Required Documents",
		desc: "Checklist of mandatory certificates (Income, Domicile, Bonafide) before applying.",
	},
	{
		icon: "✅",
		bg: "bg-blue-50 text-blue-800 border-blue-200/80",
		title: "Eligibility Criteria",
		desc: "Understand official gazette clauses, minimum CGPA rules, and income cutoffs.",
	},
	{
		icon: "🚩",
		bg: "bg-rose-50 text-rose-800 border-rose-200/80",
		title: "Report Incorrect Listing",
		desc: "Found an outdated deadline or broken official circular? Let our team know.",
	},
	{
		icon: "💡",
		bg: "bg-amber-50 text-amber-800 border-amber-200/80",
		title: "Suggest a Scholarship",
		desc: "Know a university grant or state scholarship we haven't indexed yet? Submit it.",
	},
	{
		icon: "💬",
		bg: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
		title: "Direct Support Team",
		desc: "Still have questions? Send our team a message, we respond within 24 business hours.",
	},
];

function FaqItem({ question, answer, isOpen, onClick }) {
	return (
		<div
			className={`border rounded-2xl overflow-hidden transition-all duration-150 ${
				isOpen
					? "border-emerald-300 bg-white shadow-2xs"
					: "border-slate-200/80 bg-white hover:border-slate-300"
			}`}
		>
			<button
				className="w-full flex items-start justify-between gap-4 p-5 text-left cursor-pointer"
				onClick={onClick}
				aria-expanded={isOpen}
			>
				<span className="text-base font-bold text-slate-900 leading-snug font-sans">
					{question}
				</span>
				<span
					className={`mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center transition-colors ${
						isOpen
							? "bg-emerald-100 text-emerald-800"
							: "bg-slate-100 text-slate-500"
					}`}
				>
					{isOpen ? <Minus size={14} /> : <Plus size={14} />}
				</span>
			</button>
			<div
				className={`grid transition-all duration-200 ease-in-out ${
					isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
				}`}
			>
				<div className="overflow-hidden">
					<p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed font-normal">
						{answer}
					</p>
				</div>
			</div>
		</div>
	);
}

function Support() {
	const [openFaq, setOpenFaq] = useState(0);

	useEffect(() => {
		gsap.set(window, { scrollTo: 0 });
	}, []);

	const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);

	const [contactForm, setContactForm] = useState({
		name: "",
		email: "",
		topic: "Scholarship issue",
		message: "",
	});
	const [reportForm, setReportForm] = useState({ link: "", issue: "" });
	const [suggestForm, setSuggestForm] = useState({
		org: "",
		name: "",
		website: "",
		notes: "",
	});

	const faqLeft = faqs.filter((_, i) => i % 2 === 0);
	const faqRight = faqs.filter((_, i) => i % 2 !== 0);

	const handleContactSubmit = (e) => {
		e.preventDefault();
		toast.success("Support ticket created! We'll reply within 24 hours.");
		setContactForm({
			name: "",
			email: "",
			topic: "Scholarship issue",
			message: "",
		});
	};

	const handleReportSubmit = (e) => {
		e.preventDefault();
		toast.success("Thank you for helping keep Udaan accurate!");
		setReportForm({ link: "", issue: "" });
	};

	const handleSuggestSubmit = (e) => {
		e.preventDefault();
		toast.success("Scholarship suggestion submitted for verification!");
		setSuggestForm({ org: "", name: "", website: "", notes: "" });
	};

	return (
		<main className="bg-[#FAF9F6] text-slate-900 min-h-screen">
			{/* Hero Section */}
			<section className="bg-white border-b border-slate-200/80 py-12 md:py-16 px-5 sm:px-8 relative overflow-hidden">
				<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
					<div className="lg:col-span-7 flex flex-col gap-5">
						<div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-800 uppercase">
							<span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
							<span>Help & Support Center</span>
						</div>

						<h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-slate-900 leading-[1.12] tracking-tight font-normal">
							We're here{" "}
							<span className="italic font-normal text-emerald-800">
								when you need us.
							</span>
						</h1>

						<p className="text-slate-600 text-base sm:text-lg max-w-xl leading-relaxed font-sans">
							Searching for scholarships, experiencing an application issue, or
							spotted an updated gazette notice? Jump to the section that fits
							or contact our team directly.
						</p>

						<div className="pt-2 flex flex-wrap items-center gap-3">
							<a
								href="#contact"
								className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm rounded-2xl transition shadow-2xs hover:shadow-xs flex items-center gap-2"
							>
								<span>Contact Support</span>
								<ArrowRight size={15} />
							</a>
							<a
								href="#report"
								className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-2xl border border-slate-200 transition shadow-2xs"
							>
								Report / Suggest Scheme
							</a>
						</div>
					</div>

					<div className="lg:col-span-5 flex justify-center">
						{/* <div className="relative w-full max-w-md rounded-3xl p-4 sm:p-5 shadow-2xs"> */}
						<div className="relative rounded-2xl overflow-hidden p-2">
							<img
								src={heroImg}
								alt="Udaan Support Desk"
								className="w-full max-h-80 object-contain mx-auto"
							/>
						</div>
						{/* </div> */}
					</div>
				</div>
			</section>

			{/* Quick Help Category Cards */}
			<section className="py-14 px-5 sm:px-8 max-w-7xl mx-auto">
				<div className="max-w-2xl mb-10">
					<span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
						Browse Topics
					</span>
					<h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-slate-900 mt-1 leading-tight">
						What do you need{" "}
						<span className="italic text-emerald-800 font-normal">
							help with?
						</span>
					</h2>
					<p className="text-sm text-slate-600 mt-2 font-normal">
						Quickly navigate to verified resources or jump straight to our
						assistance form.
					</p>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{quickHelp.map((c, i) => (
						<div
							key={i}
							className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-3xl p-6 transition-all duration-200 shadow-2xs hover:shadow-xs flex flex-col justify-between"
						>
							<div>
								<div
									className={`w-10 h-10 rounded-2xl ${c.bg} border flex items-center justify-center text-lg mb-4`}
								>
									{c.icon}
								</div>
								<h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5 font-sans">
									{c.title}
								</h3>
								<p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
									{c.desc}
								</p>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Contact Form Section */}
			<section
				id="contact"
				className="py-16 px-5 sm:px-8 bg-white border-y border-slate-200/80"
			>
				<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
					{/* Left: Contact Form */}
					<div className="lg:col-span-7 bg-[#FAF9F6] border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs">
						<span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
							Direct Inquiries
						</span>
						<h2 className="text-3xl sm:text-4xl font-serif text-slate-900 mt-1 mb-2 leading-tight">
							Send a Message
						</h2>
						<p className="text-sm text-slate-600 mb-6 leading-relaxed font-normal">
							Tell us what's going on. We typically reply within a few hours on
							business days.
						</p>

						<form onSubmit={handleContactSubmit} className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="flex flex-col gap-1.5">
									<label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
										Full Name
									</label>
									<input
										type="text"
										required
										placeholder="Priya Sharma"
										value={contactForm.name}
										onChange={(e) =>
											setContactForm({ ...contactForm, name: e.target.value })
										}
										className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition"
									/>
								</div>

								<div className="flex flex-col gap-1.5">
									<label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
										Email Address
									</label>
									<input
										type="email"
										required
										placeholder="priya@example.com"
										value={contactForm.email}
										onChange={(e) =>
											setContactForm({ ...contactForm, email: e.target.value })
										}
										className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition"
									/>
								</div>
							</div>

							<div className="flex flex-col gap-1.5">
								<label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
									Topic
								</label>
								<select
									value={contactForm.topic}
									onChange={(e) =>
										setContactForm({ ...contactForm, topic: e.target.value })
									}
									className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition cursor-pointer"
								>
									<option>Scholarship issue</option>
									<option>Eligibility question</option>
									<option>Technical problem</option>
									<option>Suggest a scholarship</option>
									<option>Report incorrect information</option>
									<option>Feedback</option>
									<option>Other</option>
								</select>
							</div>

							<div className="flex flex-col gap-1.5">
								<label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
									Message
								</label>
								<textarea
									required
									rows={4}
									placeholder="Describe your issue or question..."
									value={contactForm.message}
									onChange={(e) =>
										setContactForm({ ...contactForm, message: e.target.value })
									}
									className="w-full bg-white border border-slate-300 rounded-2xl p-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition resize-none"
								/>
							</div>

							<div className="pt-2">
								<button
									type="submit"
									className="px-6 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm rounded-2xl transition shadow-2xs hover:shadow-xs flex items-center gap-2 cursor-pointer"
								>
									<span>Send Message</span>
									<Send size={15} />
								</button>
							</div>
						</form>
					</div>

					{/* Right: Contact Details & Pro Tip */}
					<div className="lg:col-span-5 flex flex-col gap-6">
						<div className="bg-[#FAF9F6] border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-6">
							<h3 className="text-lg font-bold text-slate-900 font-sans">
								Direct Channels
							</h3>

							<div className="flex items-start gap-3.5">
								<div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200/70">
									<Mail size={16} />
								</div>
								<div>
									<span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
										Email Support
									</span>
									<a
										href="mailto:support@udaan.com"
										className="text-sm font-semibold text-slate-800 hover:text-emerald-800 transition-colors"
									>
										support@udaan.com
									</a>
								</div>
							</div>

							<div className="flex items-start gap-3.5">
								<div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200/70">
									<Phone size={16} />
								</div>
								<div>
									<span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
										Student Helpline
									</span>
									<p className="text-sm font-semibold text-slate-800">
										+91 98765 43210
									</p>
									<p className="text-xs text-slate-500 mt-0.5">
										Mon - Fri: 9am - 6pm IST
									</p>
								</div>
							</div>

							<div className="flex items-start gap-3.5">
								<div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200/70">
									<MapPin size={16} />
								</div>
								<div>
									<span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
										Headquarters
									</span>
									<p className="text-sm font-semibold text-slate-800">
										Kolkata, India
									</p>
								</div>
							</div>
						</div>

						{/* Pro Tip Card */}
						<div className="bg-emerald-50/70 border border-emerald-200/80 rounded-3xl p-6">
							<h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1 flex items-center gap-1.5">
								<Sparkles size={14} className="text-emerald-700" /> Pro Tip for
								Faster Resolution
							</h4>
							<p className="text-xs sm:text-sm text-emerald-800/90 leading-relaxed font-normal">
								When reporting an issue with a scholarship listing, please
								include the scheme name and official circular link so our
								verification crawlers can cross-check it immediately.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Report / Suggest Scheme Section */}
			<section id="report" className="py-16 px-5 sm:px-8 max-w-7xl mx-auto">
				<div className="max-w-2xl mb-10">
					<span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
						Crowdsourced Accuracy
					</span>
					<h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-slate-900 mt-1 leading-tight">
						Report or Suggest a{" "}
						<span className="italic text-emerald-800 font-normal">Scheme</span>
					</h2>
					<p className="text-sm text-slate-600 mt-2 font-normal">
						Help us keep verified listings up to date for thousands of students
						across India.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Report Card */}
					<div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs flex flex-col justify-between">
						<div>
							<div className="flex items-center gap-2.5 mb-2">
								<div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-sm">
									🚩
								</div>
								<h3 className="text-lg font-bold text-slate-900 font-sans">
									Report Incorrect Listing
								</h3>
							</div>
							<p className="text-xs text-slate-600 mb-4 font-normal">
								Found a wrong deadline, broken link, or incorrect income
								ceiling?
							</p>

							<form onSubmit={handleReportSubmit} className="space-y-3">
								<div>
									<label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
										Scholarship Name or URL
									</label>
									<input
										type="text"
										required
										placeholder="e.g. AICTE Pragati or https://..."
										value={reportForm.link}
										onChange={(e) =>
											setReportForm({ ...reportForm, link: e.target.value })
										}
										className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
									/>
								</div>
								<div>
									<label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
										What needs updating?
									</label>
									<textarea
										required
										rows={3}
										placeholder="Describe what's incorrect..."
										value={reportForm.issue}
										onChange={(e) =>
											setReportForm({ ...reportForm, issue: e.target.value })
										}
										className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 resize-none"
									/>
								</div>
								<button
									type="submit"
									className="px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition cursor-pointer"
								>
									Submit Correction
								</button>
							</form>
						</div>
					</div>

					{/* Suggest Card */}
					<div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs flex flex-col justify-between">
						<div>
							<div className="flex items-center gap-2.5 mb-2">
								<div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-sm">
									💡
								</div>
								<h3 className="text-lg font-bold text-slate-900 font-sans">
									Suggest a New Scholarship
								</h3>
							</div>
							<p className="text-xs text-slate-600 mb-4 font-normal">
								Know a scholarship from an NGO, state department, or corporate
								foundation?
							</p>

							<form onSubmit={handleSuggestSubmit} className="space-y-3">
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
											Issuing Body
										</label>
										<input
											type="text"
											required
											placeholder="e.g. Tata Trusts"
											value={suggestForm.org}
											onChange={(e) =>
												setSuggestForm({ ...suggestForm, org: e.target.value })
											}
											className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
										/>
									</div>
									<div>
										<label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
											Scheme Name
										</label>
										<input
											type="text"
											required
											placeholder="e.g. STEM Grant"
											value={suggestForm.name}
											onChange={(e) =>
												setSuggestForm({ ...suggestForm, name: e.target.value })
											}
											className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
										/>
									</div>
								</div>
								<div>
									<label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
										Official Website / Circular URL
									</label>
									<input
										type="url"
										placeholder="https://..."
										value={suggestForm.website}
										onChange={(e) =>
											setSuggestForm({
												...suggestForm,
												website: e.target.value,
											})
										}
										className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
									/>
								</div>
								<button
									type="submit"
									className="px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition cursor-pointer"
								>
									+ Suggest Scheme
								</button>
							</form>
						</div>
					</div>
				</div>
			</section>

			{/* Frequently Asked Questions */}
			<section className="py-16 px-5 sm:px-8 bg-white border-t border-slate-200/80">
				<div className="max-w-5xl mx-auto">
					<div className="max-w-2xl mb-10">
						<span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
							Help Articles
						</span>
						<h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-slate-900 mt-1 leading-tight">
							Frequently Asked{" "}
							<span className="italic text-emerald-800 font-normal">
								Questions
							</span>
						</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex flex-col gap-4">
							{faqLeft.map((f, i) => (
								<FaqItem
									key={i * 2}
									question={f.question}
									answer={f.answer}
									isOpen={openFaq === i * 2}
									onClick={() => toggleFaq(i * 2)}
								/>
							))}
						</div>
						<div className="flex flex-col gap-4">
							{faqRight.map((f, i) => (
								<FaqItem
									key={i * 2 + 1}
									question={f.question}
									answer={f.answer}
									isOpen={openFaq === i * 2 + 1}
									onClick={() => toggleFaq(i * 2 + 1)}
								/>
							))}
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}

export default Support;
