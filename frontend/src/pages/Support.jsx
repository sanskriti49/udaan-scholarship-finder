import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
	Send,
	Search,
	GraduationCap,
	FileText,
	CheckCircle2,
	Flag,
	Lightbulb,
	MessageCircle,
	Mail,
	Phone,
	MapPin,
	Plus,
	ArrowUpRight,
} from "lucide-react";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { faqs } from "../utils/faqs";
import Badge from "../components/Badge";

gsap.registerPlugin(ScrollToPlugin);

function Support() {
	const [activeFaq, setActiveFaq] = useState(0);
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

	useEffect(() => {
		gsap.set(window, { scrollTo: 0 });
	}, []);

	return (
		<main className="font-pangea bg-[#FDFCFA] text-gray-900 overflow-x-hidden">
			{/* Hero with Functional Search */}
			<section className="pt-24 pb-16 px-6">
				<div className="max-w-6xl mx-auto text-center">
					<Badge>Help Center</Badge>
					<h1 className="text-5xl md:text-8xl font-extrabold tracking-tight mt-4 mb-8">
						How can we <span className="italic text-[#5AAD1F]">help?</span>
					</h1>
					<div className="max-w-xl mx-auto relative group">
						<Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#5AAD1F] transition-colors" />
						<input
							type="text"
							placeholder="Search for issues, documents, scholarships..."
							className="w-full pl-16 pr-6 py-5 bg-white rounded-full border border-gray-200 shadow-sm focus:shadow-lg focus:border-[#5AAD1F] outline-none transition-all duration-300 text-base"
						/>
					</div>
				</div>
			</section>

			{/* Bento Grid for Quick Help */}
			<section className="py-12 px-6">
				<div className="max-w-6xl mx-auto grid grid-cols-3 gap-4 auto-rows-[160px]">
					{/* Large Featured Card */}
					<div className="col-span-3 md:col-span-2 md:row-span-2 bg-[#EAF3DE] rounded-3xl p-8 flex flex-col justify-between hover:shadow-lg hover:shadow-[#5AAD1F]/10 transition-shadow cursor-pointer">
						<GraduationCap className="w-10 h-10 text-[#5AAD1F]" />
						<div>
							<h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">
								Scholarship Help
							</h3>
							<p className="text-gray-600 mt-2 max-w-sm">
								Find scholarships that match your profile, course, and state.
							</p>
						</div>
					</div>

					{/* Standard Cards */}
					<div className="bg-white border border-gray-100 rounded-3xl p-6 flex flex-col justify-between hover:border-[#3B7DC8] transition-colors cursor-pointer">
						<FileText className="w-7 h-7 text-[#3B7DC8]" />
						<div>
							<h3 className="font-bold text-lg">Documents</h3>
							<p className="text-gray-500 text-sm mt-1">What to prepare</p>
						</div>
					</div>

					<div className="bg-white border border-gray-100 rounded-3xl p-6 flex flex-col justify-between hover:border-[#5AAD1F] transition-colors cursor-pointer">
						<CheckCircle2 className="w-7 h-7 text-[#5AAD1F]" />
						<div>
							<h3 className="font-bold text-lg">Eligibility</h3>
							<p className="text-gray-500 text-sm mt-1">Who can apply</p>
						</div>
					</div>

					<div className="bg-white border border-gray-100 rounded-3xl p-6 flex flex-col justify-between hover:border-[#E8884A] transition-colors cursor-pointer">
						<Flag className="w-7 h-7 text-[#E8884A]" />
						<div>
							<h3 className="font-bold text-lg">Report Listing</h3>
							<p className="text-gray-500 text-sm mt-1">Spot an error?</p>
						</div>
					</div>

					<div className="bg-white border border-gray-100 rounded-3xl p-6 flex flex-col justify-between hover:border-[#5AAD1F] transition-colors cursor-pointer">
						<Lightbulb className="w-7 h-7 text-[#E8884A]" />
						<div>
							<h3 className="font-bold text-lg">Suggest</h3>
							<p className="text-gray-500 text-sm mt-1">Add a scholarship</p>
						</div>
					</div>

					{/* Wide CTA Card */}
					<div className="col-span-3 md:col-span-1 bg-[#112915] text-white rounded-3xl p-6 flex items-center justify-between hover:bg-[#08170E] transition-colors cursor-pointer group">
						<div>
							<h3 className="font-bold text-xl text-white">Direct Support</h3>
							<p className="text-gray-400 text-sm mt-1">Get a reply in 24h</p>
						</div>
						<a
							href="#contact"
							className="bg-white text-[#112915] p-3 rounded-full group-hover:bg-[#5AAD1F] group-hover:text-white transition-colors"
						>
							<ArrowUpRight size={20} />
						</a>
					</div>
				</div>
			</section>

			{/* Contact Section - Clean Editorial Layout */}
			<section id="contact" className="py-24 px-6">
				<div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-16">
					<div>
						<Badge>Contact Support</Badge>
						<h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mt-4 mb-6">
							Let's talk.
						</h2>
						<p className="text-gray-500 mb-10 max-w-md">
							Tell us what's going on. Choose a topic so your query reaches the
							right team. We typically reply within a few hours during business
							days.
						</p>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								console.log("Support form submitted:", contactForm);
								alert("Message sent successfully!");
								setContactForm({
									name: "",
									email: "",
									topic: "Scholarship issue",
									message: "",
								});
							}}
							className="flex flex-col gap-8"
						>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
								<div className="flex flex-col gap-2">
									<label className="text-xs font-bold text-gray-400 tracking-widest uppercase">
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
										className="bg-transparent border-b border-gray-200 py-3 text-lg focus:border-[#5AAD1F] outline-none transition-colors"
									/>
								</div>
								<div className="flex flex-col gap-2">
									<label className="text-xs font-bold text-gray-400 tracking-widest uppercase">
										Email
									</label>
									<input
										type="email"
										required
										placeholder="priya@example.com"
										value={contactForm.email}
										onChange={(e) =>
											setContactForm({ ...contactForm, email: e.target.value })
										}
										className="bg-transparent border-b border-gray-200 py-3 text-lg focus:border-[#5AAD1F] outline-none transition-colors"
									/>
								</div>
							</div>

							<div className="flex flex-col gap-2">
								<label className="text-xs font-bold text-gray-400 tracking-widest uppercase">
									Topic
								</label>
								<select
									value={contactForm.topic}
									onChange={(e) =>
										setContactForm({ ...contactForm, topic: e.target.value })
									}
									className="bg-transparent border-b border-gray-200 py-3 text-lg focus:border-[#5AAD1F] outline-none transition-colors cursor-pointer"
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

							<div className="flex flex-col gap-2">
								<label className="text-xs font-bold text-gray-400 tracking-widest uppercase">
									Message
								</label>
								<textarea
									required
									placeholder="Describe your issue or question..."
									value={contactForm.message}
									onChange={(e) =>
										setContactForm({ ...contactForm, message: e.target.value })
									}
									className="bg-transparent border-b border-gray-200 py-3 text-lg focus:border-[#5AAD1F] outline-none transition-colors resize-none min-h-[80px]"
								/>
							</div>

							<div className="mt-4">
								<button
									type="submit"
									className="cursor-pointer inline-flex items-center gap-3 bg-[#112915] text-white text-base font-semibold px-10 py-4 rounded-full hover:bg-[#5AAD1F] transition-all duration-300 active:scale-95"
								>
									Send Message
									<Send size={18} />
								</button>
							</div>
						</form>
					</div>

					{/* Right column - Minimal contact info */}
					<div className="lg:border-l lg:border-gray-100 lg:pl-12 flex flex-col gap-10 h-fit">
						<div>
							<div className="flex items-center gap-4 mb-3">
								<Mail className="w-5 h-5 text-[#5AAD1F]" />
								<span className="text-xs font-bold text-gray-400 tracking-widest uppercase">
									Email
								</span>
							</div>
							<a
								href="mailto:support@udaan.com"
								className="text-xl font-medium hover:text-[#5AAD1F] transition-colors block"
							>
								support@udaan.com
							</a>
						</div>

						<div>
							<div className="flex items-center gap-4 mb-3">
								<Phone className="w-5 h-5 text-[#5AAD1F]" />
								<span className="text-xs font-bold text-gray-400 tracking-widest uppercase">
									Phone
								</span>
							</div>
							<p className="text-xl font-medium">+91 98765 43210</p>
							<p className="text-sm text-gray-400 mt-1">
								Mon - Fri: 9am - 6pm IST
							</p>
						</div>

						<div>
							<div className="flex items-center gap-4 mb-3">
								<MapPin className="w-5 h-5 text-[#5AAD1F]" />
								<span className="text-xs font-bold text-gray-400 tracking-widest uppercase">
									Office
								</span>
							</div>
							<p className="text-xl font-medium">Kolkata, India</p>
						</div>

						<div className="bg-[#EAF3DE] border border-[#C0DD97] rounded-2xl p-6 mt-4">
							<p className="text-sm text-gray-700 leading-relaxed">
								<strong className="text-[#27500A]">Pro tip:</strong> If you're
								reporting a scholarship issue, include the scholarship name,
								official link, and what looks incorrect.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Deep Green Contribute Section */}
			<section className="py-24 px-6 bg-[#112915] text-white rounded-t-[3rem] mt-12">
				<div className="max-w-5xl mx-auto">
					<div className="mb-16">
						<Badge>Contribute</Badge>
						<h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-4">
							Make Udaan better.
						</h2>
						<p className="text-gray-400 mt-4 max-w-lg">
							Your feedback directly improves listings for every student on the
							platform.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-16">
						<div>
							<Flag className="w-8 h-8 text-[#E8884A] mb-6" />
							<h3 className="text-2xl font-bold mb-2">Report a listing</h3>
							<p className="text-gray-400 mb-8">
								Spotted a wrong deadline, broken link, or incorrect amount?
							</p>
							<div className="flex flex-col gap-6">
								<input
									type="url"
									className="w-full bg-transparent border-b border-[#2A5436] py-3 focus:border-[#E8884A] outline-none text-white placeholder-gray-500 transition-colors"
									placeholder="Scholarship link (https://...)"
									value={reportForm.link}
									onChange={(e) =>
										setReportForm({ ...reportForm, link: e.target.value })
									}
								/>
								<textarea
									className="w-full bg-transparent border-b border-[#2A5436] py-3 focus:border-[#E8884A] outline-none text-white placeholder-gray-500 transition-colors resize-none"
									placeholder="What's wrong?"
									value={reportForm.issue}
									onChange={(e) =>
										setReportForm({ ...reportForm, issue: e.target.value })
									}
								></textarea>
								<button className="cursor-pointer self-start bg-[#E8884A] text-[#112915] px-6 py-3 rounded-full font-bold hover:bg-[#f09a5b] transition-colors flex items-center gap-2">
									Submit Report <ArrowUpRight size={18} />
								</button>
							</div>
						</div>

						<div>
							<Lightbulb className="w-8 h-8 text-[#5AAD1F] mb-6" />
							<h3 className="text-2xl font-bold mb-2">Suggest a scholarship</h3>
							<p className="text-gray-400 mb-8">
								Know a scholarship we haven't listed? Share it and we'll review
								it.
							</p>
							<div className="flex flex-col gap-6">
								<div className="grid grid-cols-2 gap-6">
									<input
										className="w-full bg-transparent border-b border-[#2A5436] py-3 focus:border-[#5AAD1F] outline-none text-white placeholder-gray-500 transition-colors"
										placeholder="Organisation"
										value={suggestForm.org}
										onChange={(e) =>
											setSuggestForm({ ...suggestForm, org: e.target.value })
										}
									/>
									<input
										className="w-full bg-transparent border-b border-[#2A5436] py-3 focus:border-[#5AAD1F] outline-none text-white placeholder-gray-500 transition-colors"
										placeholder="Scholarship name"
										value={suggestForm.name}
										onChange={(e) =>
											setSuggestForm({ ...suggestForm, name: e.target.value })
										}
									/>
								</div>
								<input
									type="url"
									className="w-full bg-transparent border-b border-[#2A5436] py-3 focus:border-[#5AAD1F] outline-none text-white placeholder-gray-500 transition-colors"
									placeholder="Website (https://...)"
									value={suggestForm.website}
									onChange={(e) =>
										setSuggestForm({ ...suggestForm, website: e.target.value })
									}
								/>
								<textarea
									className="w-full bg-transparent border-b border-[#2A5436] py-3 focus:border-[#5AAD1F] outline-none text-white placeholder-gray-500 transition-colors resize-none"
									placeholder="Additional notes"
									value={suggestForm.notes}
									onChange={(e) =>
										setSuggestForm({ ...suggestForm, notes: e.target.value })
									}
								></textarea>
								<button className="cursor-pointer self-start bg-[#5AAD1F] text-white px-6 py-3 rounded-full font-bold hover:bg-[#4A9A18] transition-colors flex items-center gap-2">
									Suggest Scholarship <ArrowUpRight size={18} />
								</button>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Interactive Two-Pane FAQ */}
			<section className="py-24 px-6 bg-[#112915] text-white">
				<div className="max-w-6xl mx-auto">
					<div className="mb-16 text-center">
						<Badge>FAQs</Badge>
						<h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-4">
							Common questions.
						</h2>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-16">
						{/* Left List */}
						<div className="border-t border-[#234828]">
							{faqs.map((f, i) => (
								<button
									key={i}
									onClick={() => setActiveFaq(i)}
									className={`cursor-pointer w-full text-left py-6 border-b border-[#234828] flex justify-between items-center transition-all duration-300 group ${
										activeFaq === i
											? "text-[#5AAD1F]"
											: "text-gray-300 hover:text-white"
									}`}
								>
									<span className="text-lg font-medium pr-6">{f.question}</span>
									<Plus
										className={`w-5 h-5 shrink-0 transition-transform duration-300 ${
											activeFaq === i ? "rotate-45" : ""
										}`}
									/>
								</button>
							))}
						</div>

						{/* Right Sticky Answer */}
						<div className="md:sticky md:top-12 h-fit bg-[#163322] p-10 rounded-3xl border border-[#234828]">
							<span className="text-sm text-[#5AAD1F] font-bold uppercase tracking-widest">
								Answer
							</span>
							<h3 className="text-2xl md:text-3xl font-bold text-white mt-4 mb-6">
								{faqs[activeFaq].question}
							</h3>
							<p className="text-gray-400 leading-relaxed text-lg">
								{faqs[activeFaq].answer}
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Minimal Footer CTA */}
			<div className="bg-[#FDFCFA] py-20 px-6 text-center">
				<h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
					Still can't find your answer?
				</h2>
				<p className="text-gray-500 mb-8 max-w-md mx-auto">
					Reach out to us directly. We'll get back to you within one business
					day.
				</p>
				<a
					href="#contact"
					className="inline-flex items-center gap-2 bg-[#112915] text-white text-base font-semibold px-8 py-4 rounded-full hover:bg-[#5AAD1F] transition-colors"
				>
					Contact us
				</a>
			</div>
		</main>
	);
}

export default Support;
