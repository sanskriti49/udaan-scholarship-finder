import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowUpRight, BookOpen } from "lucide-react";
import { faqs } from "../utils/faqs";
import faqIllustration from "../assets/images/faq.webp";

const TOPICS = ["All questions", ...new Set(faqs.map((item) => item.category))];
const FOCUS =
	"focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#34634e]";

export default function FAQ() {
	const baseId = useId();
	const [topic, setTopic] = useState("All questions");
	const [openId, setOpenId] = useState("public-access");
	const visible = faqs.filter(
		(item) => topic === "All questions" || item.category === topic,
	);

	return (
		<section
			aria-labelledby="faq-heading"
			className="border-t border-[#193f32]/10 bg-[#faf9f3] px-5 py-14 font-sans text-[#193f32] sm:px-8 lg:py-20"
		>
			<div className="mx-auto max-w-7xl">
				<div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
					<div>
						<p className="mb-4 text-[11px] font-bold uppercase tracking-[.15em] text-[#637761]">
							A few things worth knowing
						</p>
						<h2
							id="faq-heading"
							className="text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl"
						>
							Good questions.
							<br />
							<span className="font-georgia font-normal italic">
								Straight answers.
							</span>
						</h2>
					</div>
					<p className="max-w-sm text-sm leading-7 text-[#52675b]">
						What you can do here, what the checks mean, and where to go next.
					</p>
				</div>
				<div className="grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-14">
					<aside className="order-2 rounded-3xl border border-[#193f32]/10 bg-[#edf1e5] p-6 lg:order-1 lg:sticky lg:top-28">
						<img
							src={faqIllustration}
							alt=""
							loading="lazy"
							className="mx-auto mb-5 hidden h-48 w-full object-contain mix-blend-multiply lg:block"
						/>
						<h3 className="font-display text-2xl font-semibold">
							One step at a time.
						</h3>
						<p className="mt-3 text-sm leading-7 text-[#52675b]">
							Start with the application guide if you’re figuring out the
							process. For a specific scheme, its official notice is the place
							to confirm the details.
						</p>
						<Link
							to="/how-to-apply"
							className={`mt-5 flex min-h-12 items-center justify-between gap-3 rounded-full bg-[#193f32] px-5 text-sm font-semibold text-[#fffdf5] hover:bg-[#2b5d47] ${FOCUS}`}
						>
							<span className="flex items-center gap-2">
								<BookOpen size={16} aria-hidden="true" /> How to apply
							</span>
							<ArrowUpRight size={17} aria-hidden="true" />
						</Link>
						<Link
							to="/support"
							className={`mt-2 flex min-h-11 items-center justify-between px-3 text-sm font-medium hover:underline hover:underline-offset-4 ${FOCUS}`}
						>
							More help & answers <ArrowUpRight size={16} aria-hidden="true" />
						</Link>
					</aside>
					<div className="order-1 min-w-0 lg:order-2">
						<div
							aria-label="Filter questions by topic"
							role="group"
							className="mb-5 flex flex-wrap gap-2"
						>
							{TOPICS.map((label) => (
								<button
									key={label}
									type="button"
									aria-pressed={topic === label}
									onClick={() => {
										setTopic(label);
										setOpenId(null);
									}}
									className={`min-h-11 cursor-pointer rounded-full border px-4 text-xs font-semibold transition-colors ${FOCUS} ${topic === label ? "border-[#193f32] bg-[#193f32] text-white" : "border-[#193f32]/15 bg-transparent text-[#52675b] hover:bg-[#edf1e5]"}`}
								>
									{label}
								</button>
							))}
						</div>

						<div className="space-y-3">
							{visible.map((item) => {
								const id = `${baseId}-${item.id}`;
								const isOpen = openId === item.id;
								return (
									<div
										key={item.id}
										className={`rounded-2xl border transition-colors ${isOpen ? "border-[#b3c5a8] bg-white" : "border-[#193f32]/10 bg-[#fffdf6] hover:border-[#b3c5a8]"}`}
									>
										<h3>
											<button
												id={`${id}-button`}
												type="button"
												aria-expanded={isOpen}
												aria-controls={`${id}-panel`}
												onClick={() => setOpenId(isOpen ? null : item.id)}
												className={`flex min-h-16 w-full cursor-pointer items-center justify-between gap-4 rounded-2xl p-5 text-left sm:px-6 ${FOCUS}`}
											>
												<span className="font-sans text-[15px] font-semibold leading-6 sm:text-base">
													{item.question}
												</span>
												<span
													className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-transform motion-reduce:transition-none ${isOpen ? "rotate-45 bg-[#f4db76]" : "bg-[#edf1e5]"}`}
													aria-hidden="true"
												>
													<Plus size={16} />
												</span>
											</button>
										</h3>
										<div
											id={`${id}-panel`}
											role="region"
											aria-labelledby={`${id}-button`}
											hidden={!isOpen}
											className="px-5 pb-5 sm:px-6"
										>
											<p className="max-w-prose text-sm leading-7 text-[#52675b]">
												{item.answer}
											</p>
											<Link
												to={item.path}
												className={`mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline decoration-[#b3c5a8] underline-offset-4 hover:decoration-[#193f32] ${FOCUS}`}
											>
												{item.linkLabel}
												<ArrowUpRight size={15} aria-hidden="true" />
											</Link>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
