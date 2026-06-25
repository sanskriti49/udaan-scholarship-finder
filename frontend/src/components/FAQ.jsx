import { useState } from "react";
import { Link } from "react-router-dom";

const faqs = [
	{
		question: "Who can apply for scholarships on Udaan?",
		answer:
			"Students from Class 1 to postgraduate level can explore scholarships based on eligibility criteria such as academic performance, income, category, gender, state, and course.",
	},
	{
		question: "Can I apply for multiple scholarships?",
		answer:
			"Yes. You can apply for multiple scholarships as long as you meet the eligibility criteria and the scholarship guidelines allow it.",
	},
	{
		question: "Are the scholarships verified?",
		answer:
			"Yes. We curate scholarships from trusted government portals, educational institutions, and recognized organizations to help you apply with confidence.",
	},
	{
		question: "What documents are usually required?",
		answer:
			"Common requirements include academic mark sheets, Aadhaar, income certificate, caste certificate (if applicable), bank account details, and recent passport-size photographs.",
	},
	{
		question: "Does Udaan charge any application fee?",
		answer:
			"No. Browsing scholarships and applying through official sources is completely free. Udaan never charges students to access scholarship information.",
	},
	{
		question: "How are application deadlines updated?",
		answer:
			"Our team regularly reviews scholarship listings and updates deadlines whenever official notifications are released.",
	},
	{
		question: "How do I know which scholarships I'm eligible for?",
		answer:
			"Use our filters to narrow opportunities by education level, state, category, gender, course, and scholarship type. Soon, you'll also receive personalized recommendations.",
	},
	{
		question: "How can I stay updated about new scholarships?",
		answer:
			"Create an account to bookmark opportunities, receive deadline reminders, and get notified when scholarships matching your profile become available.",
	},
];

function FaqItem({ question, answer, isOpen, onClick }) {
	return (
		<div
			className={`border rounded-2xl overflow-hidden transition-colors duration-150 cursor-pointer ${
				isOpen
					? "border-[#C0DD97]"
					: "border-gray-200/80 hover:border-[#C0DD97]"
			}`}
		>
			<button
				className="cursor-pointer w-full flex items-start justify-between gap-3 px-5 py-4 text-left bg-transparent"
				onClick={onClick}
				aria-expanded={isOpen}
			>
				<span className="text-[15.5px] font-medium text-gray-900 leading-snug">
					{question}
				</span>
				<span
					className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-150 ${
						isOpen ? "bg-[#5AAD1F] border-[#5AAD1F]" : "border-gray-300"
					}`}
				>
					<svg
						className={`w-2.5 h-2.5 transition-transform duration-200 ${
							isOpen ? "rotate-45 stroke-white" : "stroke-gray-400"
						}`}
						viewBox="0 0 12 12"
						fill="none"
						strokeWidth="2"
						strokeLinecap="round"
					>
						<line x1="6" y1="1" x2="6" y2="11" />
						<line x1="1" y1="6" x2="11" y2="6" />
					</svg>
				</span>
			</button>

			<div
				className={`grid transition-all duration-280 ease-in-out ${
					isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
				}`}
			>
				<div className="overflow-hidden">
					<p className="px-5 pb-4 text-[14px] text-gray-500 leading-relaxed">
						{answer}
					</p>
				</div>
			</div>
		</div>
	);
}

function FAQ() {
	const [openIndex, setOpenIndex] = useState(0);

	const left = faqs.filter((_, i) => i % 2 === 0);
	const right = faqs.filter((_, i) => i % 2 !== 0);

	const toggle = (globalIndex) =>
		setOpenIndex(openIndex === globalIndex ? null : globalIndex);

	return (
		<section className="font-pangea py-16 px-6 bg-white">
			<div className="max-w-3xl mx-auto">
				<div className="text-center mb-12">
					<div className="inline-flex items-center gap-1.5 bg-[#EAF3DE] border border-[#C0DD97] text-[#27500A] text-[11px] font-bold tracking-wider px-3 py-1 rounded-full mb-4">
						<span className="w-1.5 h-1.5 rounded-full bg-[#5AAD1F]" />
						FAQs
					</div>
					<h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
						Frequently asked <span className="text-[#3B7DC8]">questions</span>
					</h2>
					<p className="mt-3 text-md text-gray-500 max-w-md mx-auto leading-relaxed">
						Everything you need to know about discovering and applying for
						scholarships through Udaan.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
					{/* Left column */}
					<div className="flex flex-col gap-2.5">
						{left.map((faq, i) => {
							const globalIndex = i * 2;
							return (
								<FaqItem
									key={globalIndex}
									question={faq.question}
									answer={faq.answer}
									isOpen={openIndex === globalIndex}
									onClick={() => toggle(globalIndex)}
								/>
							);
						})}
					</div>

					{/* Right column */}
					<div className="flex flex-col gap-2.5">
						{right.map((faq, i) => {
							const globalIndex = i * 2 + 1;
							return (
								<FaqItem
									key={globalIndex}
									question={faq.question}
									answer={faq.answer}
									isOpen={openIndex === globalIndex}
									onClick={() => toggle(globalIndex)}
								/>
							);
						})}
					</div>
				</div>

				<p className="text-center text-[13px] text-gray-400 mt-10">
					Still have questions?{" "}
					<Link
						to="/support"
						className="cursor-pointer text-[#3B7DC8] font-semibold border-b border-transparent hover:border-[#3B7DC8] transition-colors"
					>
						Visit our support page →
					</Link>
				</p>
			</div>
		</section>
	);
}

export default FAQ;
