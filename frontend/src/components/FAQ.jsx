import { useState } from "react";
import { Link } from "react-router-dom";
import {
	Plus,
	Minus,
	HelpCircle,
	ArrowRight,
	MessageSquare,
	ShieldCheck,
} from "lucide-react";
import { faqs } from "../utils/faqs";
import faqIllustration from "../assets/images/faq.webp";

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

function FAQ() {
	const [openIndex, setOpenIndex] = useState(0);

	const toggle = (index) => setOpenIndex(openIndex === index ? null : index);

	return (
		<section className="py-16 md:py-24 px-5 sm:px-8 bg-[#FAF9F6]">
			<div className="max-w-7xl mx-auto">
				<div className="max-w-2xl mb-12">
					<span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
						Got Questions?
					</span>
					<h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-900 mt-2 leading-tight">
						Frequently Asked{" "}
						<span className="italic text-emerald-800 font-normal">
							Questions
						</span>
					</h2>
					<p className="text-slate-600 text-base mt-2 leading-relaxed">
						Clear answers on eligibility calculations, verified documents, and
						how to apply.
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
					<div className="lg:col-span-5 lg:sticky lg:top-24">
						<div className="border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-6">
							<div className="relative rounded-2xl overflow-hidden bg-gradient-to-br p-4 border border-emerald-100/60 flex items-center justify-center">
								<img
									src={faqIllustration}
									alt="Student asking scholarship questions"
									className="w-full max-h-120 object-fill"
								/>
							</div>

							<div className="space-y-2"></div>

							<div className="pt-2">
								<Link
									to="/support"
									className="w-full py-3 px-5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white text-[14.5px] font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs"
								>
									<MessageSquare size={16} />
									<span>Visit Help & Support Center</span>
									<ArrowRight size={14} />
								</Link>
							</div>
						</div>
					</div>

					<div className="lg:col-span-7 flex flex-col gap-3.5">
						{faqs.map((faq, i) => (
							<FaqItem
								key={i}
								question={faq.question}
								answer={faq.answer}
								isOpen={openIndex === i}
								onClick={() => toggle(i)}
							/>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

export default FAQ;
