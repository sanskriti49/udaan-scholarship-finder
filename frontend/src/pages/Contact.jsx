import { Send } from "lucide-react";
import { useState } from "react";

function Contact() {
	const [formData, setFormData] = useState({
		fullName: "",
		email: "",
		subject: "",
		message: "",
	});

	const [openFaq, setOpenFaq] = useState(null);

	const faqs = [
		{
			question: "How do I apply for a scholarship?",
			answer:
				"Search for a scholarship matching your profile and click the explore button to view application details.",
		},
		{
			question: "Are the scholarships verified?",
			answer:
				"Yes, our team ensures 95%+ of listed scholarships are active and verified before they are published.",
		},
		{
			question: "How do I report incorrect information?",
			answer:
				"Drop us a message using the form above with the scholarship link, and our team will review it immediately.",
		},
	];

	const toggleFaq = (index) => {
		setOpenFaq(openFaq === index ? null : index);
	};

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prevData) => ({
			...prevData,
			[name]: value,
		}));
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		console.log("Form Data Submitted:", formData);
		alert("Message sent successfully!");
		setFormData({ fullName: "", email: "", subject: "", message: "" });
	};

	return (
		<div className="font-pangea relative overflow-hidden bg-linear-to-b from-white via-gray-50/50 to-white min-h-screen">
			<div className="mx-auto max-w-7xl px-6 pt-12 pb-24 md:pt-16 lg:px-8">
				{/* Header Section */}
				<div className="flex flex-col items-center text-center mb-16">
					<h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
						Get in touch with{" "}
						<span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-600 to-teal-500">
							our team.
						</span>
					</h1>
					<p className="text-gray-600 text-lg sm:text-xl max-w-2xl font-normal leading-relaxed">
						Have questions about a scholarship or need help with your
						application? Reach out to us and we'll guide you through your
						journey.
					</p>
				</div>

				{/* Contact Form & Info Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-stretch">
					{/* Form Section (Left) */}
					<div className="lg:col-span-7 flex flex-col">
						<div className="h-full flex flex-col bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10 relative group">
							<div className="absolute inset-0 bg-linear-to-tr from-emerald-600/5 to-blue-600/5 rounded-3xl transform scale-[1.01] -z-10" />

							<h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">
								Send us a Message
							</h2>

							<form
								onSubmit={handleSubmit}
								className="flex flex-col gap-5 grow justify-between"
							>
								<div className="flex flex-col gap-5">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
										<div className="flex flex-col gap-2">
											<label
												htmlFor="fullName"
												className="text-sm font-semibold text-gray-700"
											>
												Full Name
											</label>
											<input
												type="text"
												id="fullName"
												name="fullName"
												value={formData.fullName}
												onChange={handleChange}
												placeholder="John Doe"
												required
												className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
											/>
										</div>
										<div className="flex flex-col gap-2">
											<label
												htmlFor="email"
												className="text-sm font-semibold text-gray-700"
											>
												Email Address
											</label>
											<input
												type="email"
												id="email"
												name="email"
												value={formData.email}
												onChange={handleChange}
												placeholder="john@example.com"
												required
												className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
											/>
										</div>
									</div>

									<div className="flex flex-col gap-2">
										<label
											htmlFor="subject"
											className="text-sm font-semibold text-gray-700"
										>
											Subject
										</label>
										<input
											type="text"
											id="subject"
											name="subject"
											value={formData.subject}
											onChange={handleChange}
											placeholder="How can we help you?"
											required
											className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
										/>
									</div>

									<div className="flex flex-col gap-2">
										<label
											htmlFor="message"
											className="text-sm font-semibold text-gray-700"
										>
											Message
										</label>
										<textarea
											id="message"
											name="message"
											value={formData.message}
											onChange={handleChange}
											placeholder="Write your message here..."
											rows="5"
											required
											className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors resize-none h-full min-h-30"
										></textarea>
									</div>
								</div>

								<div className="mt-6 flex justify-end">
									<button
										type="submit"
										className="cursor-pointer inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
									>
										Send Message
										<Send size={18} />
									</button>
								</div>
							</form>
						</div>
					</div>

					{/* Info Section (Right) */}
					<div className="lg:col-span-5 flex flex-col gap-6 h-full">
						{/* Contact Information Card */}
						<div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex-1 flex flex-col justify-center">
							<h3 className="text-xl font-bold tracking-tight text-gray-900 mb-6">
								Contact Information
							</h3>
							<div className="flex flex-col gap-6">
								<div className="flex items-start gap-4">
									<div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
										<svg
											className="w-5 h-5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
											></path>
										</svg>
									</div>
									<div>
										<p className="text-sm font-semibold text-gray-900">
											Email Us
										</p>
										<a
											href="mailto:support@udaan.com"
											className="text-emerald-600 hover:text-emerald-700 text-md font-medium transition-colors"
										>
											support@udaan.com
										</a>
									</div>
								</div>
								<div className="flex items-start gap-4">
									<div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
										<svg
											className="w-5 h-5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
											></path>
										</svg>
									</div>
									<div>
										<p className="text-sm font-semibold text-gray-900">
											Call Us
										</p>
										<p className="text-gray-600 text-md">+91 98765 43210</p>
									</div>
								</div>
								<div className="flex items-start gap-4">
									<div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
										<svg
											className="w-5 h-5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
											></path>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
											></path>
										</svg>
									</div>
									<div>
										<p className="text-sm font-semibold text-gray-900">
											Visit Us
										</p>
										<p className="text-gray-600 text-md">Kolkata, India</p>
									</div>
								</div>
							</div>
						</div>

						{/* Support Hours Card */}
						<div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex-1 flex flex-col justify-center">
							<h3 className="text-xl font-bold tracking-tight text-gray-900 mb-6">
								Support Hours
							</h3>
							<ul className="flex flex-col gap-4">
								<li className="flex justify-between items-center pb-4 border-b border-gray-50">
									<span className="text-gray-600 font-medium">
										Monday - Friday
									</span>
									<span className="text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-lg text-sm">
										9:00 AM - 6:00 PM
									</span>
								</li>
								<li className="flex justify-between items-center">
									<span className="text-gray-600 font-medium">Saturday</span>
									<span className="text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-lg text-sm">
										10:00 AM - 2:00 PM
									</span>
								</li>
							</ul>
						</div>

						{/* Social Links */}
						<div className="flex items-center gap-4 justify-start">
							<a
								href="#"
								className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-emerald-600 hover:border-emerald-600 hover:shadow-md transition-all"
							>
								<span className="sr-only">GitHub</span>
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										fillRule="evenodd"
										d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
										clipRule="evenodd"
									/>
								</svg>
							</a>
							<a
								href="#"
								className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-emerald-600 hover:border-emerald-600 hover:shadow-md transition-all"
							>
								<span className="sr-only">LinkedIn</span>
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
								</svg>
							</a>
							<a
								href="#"
								className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-emerald-600 hover:border-emerald-600 hover:shadow-md transition-all"
							>
								<span className="sr-only">Twitter</span>
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.005 4.15H5.059z" />
								</svg>
							</a>
						</div>
					</div>
				</div>

				{/* Dropdown FAQ Section */}
				<div className="mt-24 max-w-3xl mx-auto">
					<div className="text-center mb-10">
						<h2 className="text-4xl font-bold tracking-tight text-gray-900">
							Frequently Asked Questions
						</h2>
						<p className="text-gray-600 mt-3">
							Find quick answers to common questions below.
						</p>
					</div>

					<div className="flex flex-col gap-4">
						{faqs.map((faq, index) => (
							<div
								key={index}
								className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md ${openFaq === index ? "border-emerald-300 ring-1 ring-emerald-100" : "border-gray-200"}`}
							>
								<button
									onClick={() => toggleFaq(index)}
									className="w-full px-6 py-5 text-left flex justify-between items-center focus:outline-none cursor-pointer"
								>
									<span className="font-semibold text-gray-900 text-lg">
										{faq.question}
									</span>
									<div
										className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${openFaq === index ? "bg-emerald-100" : "bg-gray-50"}`}
									>
										<svg
											className={`w-5 h-5 transition-transform duration-300 ${openFaq === index ? "rotate-180 text-emerald-600" : "text-gray-400"}`}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M19 9l-7 7-7-7"
											></path>
										</svg>
									</div>
								</button>
								<div
									className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? "max-h-40 pb-5 opacity-100" : "max-h-0 opacity-0"}`}
								>
									<p className="text-gray-600 text-md leading-relaxed border-t border-gray-300 pt-4">
										{faq.answer}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export default Contact;
