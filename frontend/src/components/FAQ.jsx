import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Minus, ArrowRight, MessageSquare } from "lucide-react";
import { faqs } from "../utils/faqs";
import faqIllustration from "../assets/images/faq.webp";

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

function FaqItem({ question, answer, isOpen, onClick }) {
	return (
		<div
			className={`border-[1.5px] rounded-2xl overflow-hidden transition-colors ${
				isOpen
					? "border-emerald-950 bg-white"
					: "border-emerald-950/15 bg-white hover:border-emerald-950"
			}`}
		>
			<button
				type="button"
				className={`w-full flex items-start justify-between gap-4 p-5 text-left cursor-pointer ${focusRing}`}
				onClick={onClick}
				aria-expanded={isOpen}
			>
				<span className="ud-display text-base sm:text-lg font-bold text-emerald-950 leading-snug">
					{question}
				</span>
				<span
					className={`mt-0.5 w-7 h-7 shrink-0 rounded-full border-[1.5px] border-emerald-950 flex items-center justify-center transition-colors ${
						isOpen
							? "bg-yellow-200 text-emerald-950"
							: "bg-emerald-50 text-emerald-950"
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
					<p className="px-5 pb-5 text-sm sm:text-[15px] text-emerald-950/75 leading-relaxed font-medium">
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
		<section className="py-16 md:py-24 px-5 sm:px-8 bg-[#E9F0EA] border-b-[1.5px] border-emerald-950/15">
			<div className="max-w-7xl mx-auto">
				<div className="max-w-2xl mb-12">
					<span className="text-xs font-bold uppercase tracking-wider text-emerald-950/60">
						Got Questions?
					</span>
					<h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-emerald-950 mt-1 leading-tight">
						Frequently Asked{" "}
						<span className="ud-display font-extrabold underline decoration-yellow-300 decoration-4 underline-offset-4">
							Questions
						</span>
					</h2>
					<p className="text-emerald-950/70 text-base mt-2 leading-relaxed font-medium">
						Clear answers on eligibility calculations, verified documents, and
						how to apply.
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
					<div className="lg:col-span-5 lg:sticky lg:top-24">
						<div className="rounded-2xl  bg-white p-6 space-y-6 shadow-2xs">
							<div className="relative rounded-xl overflow-hidden bg-emerald-50/50 p-4 border-[1.5px] border-emerald-950/15 flex items-center justify-center">
								<img
									src={faqIllustration}
									alt="Student asking scholarship questions"
									className="w-full max-h-96 object-contain"
									loading="lazy"
								/>
							</div>

							<div>
								<h3 className="ud-display text-lg font-bold text-emerald-950">
									Need direct assistance?
								</h3>
								<p className="text-sm text-emerald-950/70 mt-1 leading-relaxed font-medium">
									Our team tracks official portal helplines, application
									windows, and dispute escalation guidelines.
								</p>
							</div>

							<Link
								to="/support"
								className={`w-full py-3 px-5 rounded-full bg-emerald-800 hover:bg-emerald-900 active:translate-y-px text-white text-sm font-bold flex items-center justify-center gap-2 transition ${focusRing}`}
							>
								<MessageSquare size={16} />
								<span>Visit Help &amp; Support Center</span>
								<ArrowRight size={14} />
							</Link>
						</div>
					</div>

					<div className="lg:col-span-7 space-y-3.5">
						{faqs.map((faq, index) => (
							<FaqItem
								key={index}
								question={faq.question}
								answer={faq.answer}
								isOpen={openIndex === index}
								onClick={() => toggle(index)}
							/>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

export default FAQ;
