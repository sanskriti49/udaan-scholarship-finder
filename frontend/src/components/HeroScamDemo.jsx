import { CheckCheck, Forward, Search } from "lucide-react";
import { Stamp } from "./PageKit";

/**
 * Hero illustration for TrustShield.
 * An annotated scam forward: the red-flag phrases get highlighted once on load,
 * a stamp lands on top, and the button runs the real scan on this exact message.
 *
 * Props:
 *  onScan  called when the user clicks "Scan this message"
 */

const FLAGS = [
	{ text: "₹25,000 direct bank transfer", tag: "Guaranteed cash" },
	{ text: "Registration fee ₹499 via UPI", tag: "Fee demand" },
	{ text: "Aadhaar on WhatsApp", tag: "ID sent over chat" },
];

// Message split into plain text and flagged phrases, in reading order.
const SEGMENTS = [
	{ t: "PM Scholarship 2025: All eligible 10th and 12th pass students get " },
	{ t: FLAGS[0].text, flag: 0 },
	{ t: ". " },
	{ t: FLAGS[1].text, flag: 1 },
	{ t: " to verify bank account. Send " },
	{ t: FLAGS[2].text, flag: 2 },
	{ t: " 9876543210." },
];

const HIGHLIGHT_START = 600; // ms before the first highlight sweeps in
const HIGHLIGHT_STEP = 450; // ms between highlights

export default function HeroScamDemo({ onScan }) {
	return (
		<div className="relative mx-auto w-full max-w-md lg:ml-auto">
			<style>{`
				.hsd-mark {
					background-image: linear-gradient(#fde047, #fde047);
					background-repeat: no-repeat;
					background-position: 0 90%;
					background-size: 0% 55%;
					-webkit-box-decoration-break: clone;
					box-decoration-break: clone;
					animation: hsd-sweep 520ms cubic-bezier(.2,.7,.2,1) forwards;
					animation-delay: var(--d, 0ms);
					padding: 0 2px;
					font-weight: 700;
				}
				@keyframes hsd-sweep { to { background-size: 100% 55%; } }

				.hsd-chip {
					opacity: 0;
					transform: translateY(4px);
					animation: hsd-chip-in 320ms ease-out forwards;
					animation-delay: var(--d, 0ms);
				}
				@keyframes hsd-chip-in { to { opacity: 1; transform: none; } }

				@media (prefers-reduced-motion: reduce) {
					.hsd-mark { animation: none; background-size: 100% 55%; }
					.hsd-chip { animation: none; opacity: 1; transform: none; }
				}
			`}</style>

			{/* Offset backing shape so the card has depth without a soft shadow */}
			<div
				aria-hidden
				className="absolute inset-0 translate-x-3 translate-y-3 rotate-[1.5deg] rounded-3xl border-[1.5px] border-emerald-950 bg-yellow-200"
			/>

			<figure className="relative -rotate-[1.5deg] rounded-3xl border-[1.5px] border-emerald-950 bg-white p-5 sm:p-6">
				<Stamp
					slam
					delay={0.2 + (HIGHLIGHT_START + HIGHLIGHT_STEP * 3) / 1000}
					tilt={6}
					className="absolute -top-4 right-4 border-rose-700 bg-white/90 text-sm text-rose-700"
				>
					Do not pay
				</Stamp>

				{/* Forward header */}
				<div className="flex items-center gap-2 border-b-[1.5px] border-dashed border-emerald-950/20 pb-3 text-xs font-semibold text-emerald-950/60">
					<Forward size={14} className="shrink-0 text-emerald-800" />
					<span>Forwarded many times</span>
				</div>

				{/* Message bubble */}
				<blockquote className="mt-4 rounded-2xl rounded-tl-sm border-[1.5px] border-emerald-950/15 bg-[#E9F0EA] p-4 text-[15px] leading-[1.75] text-emerald-950">
					{SEGMENTS.map((s, i) =>
						s.flag === undefined ? (
							<span key={i}>{s.t}</span>
						) : (
							<mark
								key={i}
								className="hsd-mark text-emerald-950"
								style={{
									"--d": `${HIGHLIGHT_START + s.flag * HIGHLIGHT_STEP}ms`,
								}}
							>
								{s.t}
							</mark>
						),
					)}
					<span className="mt-2 flex items-center justify-end gap-1 text-[11px] font-semibold text-emerald-950/45">
						<span>10:42</span>
						<CheckCheck size={13} className="text-emerald-800" />
					</span>
				</blockquote>

				{/* What was flagged */}
				<figcaption className="mt-4 flex flex-wrap gap-2">
					{FLAGS.map((f, i) => (
						<span
							key={f.tag}
							className="hsd-chip inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-rose-300 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800"
							style={{
								"--d": `${HIGHLIGHT_START + i * HIGHLIGHT_STEP + 250}ms`,
							}}
						>
							<span
								className="h-1.5 w-1.5 rounded-full bg-rose-600"
								aria-hidden
							/>
							{f.tag}
						</span>
					))}
				</figcaption>

				<button
					type="button"
					onClick={onScan}
					className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 active:translate-y-px focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
				>
					<Search size={14} />
					<span>Scan this message</span>
				</button>
			</figure>
		</div>
	);
}
