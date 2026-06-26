import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import faqImage from "../assets/images/faq.png";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { faqs } from "../utils/faqs";
gsap.registerPlugin(ScrollToPlugin);

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

	useEffect(() => {
		gsap.set(window, { scrollTo: 0 });
	}, []);
	const left = faqs.filter((_, i) => i % 2 === 0);
	const right = faqs.filter((_, i) => i % 2 !== 0);
	const toggle = (globalIndex) =>
		setOpenIndex(openIndex === globalIndex ? null : globalIndex);

	return (
		<section className="font-pangea py-20 px-6 bg-white">
			<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-12 items-start">
				<div className="hidden lg:block sticky top-28">
					<div className="relative rounded-4xl bg-[#f6f2e6] border border-[#DDECCB] p-8 overflow-hidden">
						<div className="absolute -top-16 -right-16 w-44 h-44 bg-[#C0DD97]/40 rounded-full blur-2xl" />
						<div className="absolute -bottom-16 -left-16 w-44 h-44 bg-[#C0DD97]/30 rounded-full blur-2xl" />

						<img src={faqImage} />

						<div className="relative z-10 mt-3">
							<div className="inline-flex items-center gap-1.5 bg-white border border-[#C0DD97] text-[#27500A] text-[11px] font-bold tracking-wider px-3 py-1 rounded-full mb-4">
								<span className="w-1.5 h-1.5 rounded-full bg-[#5AAD1F]" />
								Student Help
							</div>
							<h2 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
								Got questions before applying?
							</h2>
							<p className="mt-3 text-gray-500 text-[15px] leading-relaxed">
								Understand eligibility, documents, deadlines, and how Udaan
								helps you find verified scholarships faster.
							</p>
						</div>
					</div>
				</div>

				<div>
					<div className="text-center lg:text-left mb-10">
						<div className="inline-flex items-center gap-1.5 bg-[#EAF3DE] border border-[#C0DD97] text-[#27500A] text-[11px] font-bold tracking-wider px-3 py-1 rounded-full mb-4">
							<span className="w-1.5 h-1.5 rounded-full bg-[#5AAD1F]" />
							FAQs
						</div>
						<h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
							Frequently asked{" "}
							<span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-600 to-teal-500">
								questions
							</span>
						</h2>
						<p className="mt-3 text-md text-gray-500 max-w-md mx-auto lg:mx-0 leading-relaxed">
							Everything you need to know about discovering and applying for
							scholarships through Udaan.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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

					<p className="text-center lg:text-left text-[13px] text-gray-400 mt-10">
						Still have questions?{" "}
						<Link
							to="/support"
							className="cursor-pointer text-[#3B7DC8] font-semibold border-b border-transparent hover:border-[#3B7DC8] transition-colors"
						>
							Visit our support page →
						</Link>
					</p>
				</div>
			</div>
		</section>
	);
}

export default FAQ;
