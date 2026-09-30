import { ArrowRight, Check, Clock, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

/* Shared scene: soft blob, floating circle, desk line. Each step only draws what's unique. */
function Scene({ label, circle = [210, 50, 30], children }) {
	const [cx, cy, r] = circle;
	return (
		<svg
			viewBox="0 0 280 180"
			role="img"
			aria-label={label}
			className="mx-auto h-36 w-full"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<ellipse
				cx="140"
				cy="110"
				rx="100"
				ry="45"
				fill="#D8F3DC"
				fillOpacity="0.4"
			/>
			<circle cx={cx} cy={cy} r={r} fill="#EDF7F0" />
			<rect x="40" y="145" width="200" height="8" rx="4" fill="#B7E4C7" />
			{children}
		</svg>
	);
}

const STEPS = [
	{
		title: "Tell us about you",
		tag: "About a minute",
		description:
			"Your degree, category, state and family income range. That's all. No passwords, no Aadhaar number.",
		footer: { Icon: Clock, text: "Three questions, one tap each" },
		art: (
			<Scene label="A student profile card with a graduation cap">
				<rect
					x="75"
					y="40"
					width="130"
					height="100"
					rx="12"
					fill="#FFFFFF"
					stroke="#064e3b"
					strokeWidth="1.5"
				/>
				<circle cx="140" cy="70" r="16" fill="#064e3b" />
				<circle cx="140" cy="65" r="7" fill="#FEF08A" />
				<path
					d="M128 82C128 77 133 74 140 74C147 74 152 77 152 82"
					fill="#D8F3DC"
				/>
				<rect x="95" y="96" width="90" height="6" rx="3" fill="#064e3b" />
				<rect
					x="105"
					y="108"
					width="70"
					height="5"
					rx="2.5"
					fill="#047857"
					fillOpacity="0.6"
				/>
				<rect
					x="115"
					y="120"
					width="50"
					height="4"
					rx="2"
					fill="#10b981"
					fillOpacity="0.8"
				/>
				<path d="M50 70L80 58L110 70L80 82L50 70Z" fill="#064e3b" />
				<path
					d="M65 77V92C65 98 72 102 80 102C88 102 95 98 95 92V77"
					stroke="#064e3b"
					strokeWidth="1.5"
				/>
				<path
					d="M106 72V90"
					stroke="#ca8a04"
					strokeWidth="2"
					strokeLinecap="round"
				/>
				<circle cx="106" cy="92" r="2.5" fill="#ca8a04" />
				<rect x="204" y="66" width="18" height="24" rx="3" fill="#064e3b" />
				<path d="M204 90L213 83L222 90V66H204V90Z" fill="#064e3b" />
			</Scene>
		),
	},
	{
		title: "We read the fine print",
		tag: "Rule check",
		description:
			"Your answers are checked against 55+ rules taken from official AICTE, UGC, NSP, state and CSR circulars. Same answers, same result, every time.",
		footer: { Icon: Check, text: "Matched to the official notice" },
		art: (
			<Scene
				label="A checklist window with three ticked rules"
				circle={[70, 50, 25]}
			>
				<rect
					x="65"
					y="35"
					width="150"
					height="105"
					rx="12"
					fill="#FFFFFF"
					stroke="#064e3b"
					strokeWidth="1.5"
				/>
				<rect x="65" y="35" width="150" height="24" rx="12" fill="#064e3b" />
				<circle cx="80" cy="47" r="3" fill="#FEF08A" />
				<circle cx="90" cy="47" r="3" fill="#A7F3D0" />
				<circle cx="100" cy="47" r="3" fill="#6EE7B7" />
				{[
					[70, 85, "#064e3b"],
					[88, 70, "#047857"],
					[106, 95, "#10b981"],
				].map(([y, w, c]) => (
					<g key={y}>
						<rect x="80" y={y} width={w} height="6" rx="3" fill={c} />
						<circle
							cx="185"
							cy={y + 3}
							r="6"
							fill="#FEF08A"
							stroke="#064e3b"
							strokeWidth="1.5"
						/>
						<path
							d={`M182 ${y + 3}L184 ${y + 5}L188 ${y + 1}`}
							stroke="#064e3b"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</g>
				))}
				<rect
					x="80"
					y="124"
					width="60"
					height="5"
					rx="2.5"
					fill="#047857"
					fillOpacity="0.7"
				/>
				<circle
					cx="230"
					cy="65"
					r="14"
					fill="#D8F3DC"
					stroke="#064e3b"
					strokeWidth="1.5"
				/>
				<path
					d="M226 65L234 65M230 61L230 69"
					stroke="#064e3b"
					strokeWidth="2"
					strokeLinecap="round"
				/>
			</Scene>
		),
	},
	{
		title: "Apply on the real portal",
		tag: "Direct links",
		description:
			"See which rule matched, which certificate you're missing, and jump straight to the official application page.",
		footer: { Icon: ArrowUpRight, text: "No middlemen, no fees" },
		art: (
			<Scene
				label="An application form with a tick and a paper plane"
				circle={[210, 45, 28]}
			>
				<rect
					x="85"
					y="35"
					width="110"
					height="105"
					rx="8"
					fill="#FFFFFF"
					stroke="#064e3b"
					strokeWidth="1.5"
				/>
				<rect x="100" y="52" width="60" height="6" rx="3" fill="#064e3b" />
				<rect
					x="100"
					y="66"
					width="80"
					height="4"
					rx="2"
					fill="#047857"
					fillOpacity="0.8"
				/>
				<rect
					x="100"
					y="76"
					width="75"
					height="4"
					rx="2"
					fill="#047857"
					fillOpacity="0.8"
				/>
				<rect
					x="100"
					y="86"
					width="65"
					height="4"
					rx="2"
					fill="#047857"
					fillOpacity="0.8"
				/>
				<rect
					x="100"
					y="96"
					width="50"
					height="4"
					rx="2"
					fill="#10b981"
					fillOpacity="0.8"
				/>
				<circle
					cx="140"
					cy="120"
					r="12"
					fill="#FEF08A"
					stroke="#064e3b"
					strokeWidth="1.5"
				/>
				<path
					d="M136 120L139 123L145 117"
					stroke="#064e3b"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path d="M210 110L235 85L225 75L200 100L210 110Z" fill="#064e3b" />
				<path d="M235 85L242 70L227 77L235 85Z" fill="#ca8a04" />
				<path d="M198 102L185 107L193 94L198 102Z" fill="#10b981" />
				<circle cx="217" cy="92" r="3" fill="#FFFFFF" />
				<path
					d="M60 65L63 55L66 65L76 68L66 71L63 81L60 71L50 68L60 65Z"
					fill="#ca8a04"
				/>
			</Scene>
		),
	},
];

export default function HowItWorks() {
	return (
		<section
			aria-labelledby="how-heading"
			className="border-b-[1.5px] border-emerald-950/15 bg-white px-5 py-16 sm:px-8 md:py-24"
		>
			<div className="mx-auto max-w-7xl">
				<div className="mb-12 max-w-2xl">
					<span className="text-sm font-bold text-emerald-950/60">
						How Udaan works
					</span>
					<h2
						id="how-heading"
						className="mt-1 font-serif text-3xl leading-tight text-emerald-950 sm:text-4xl md:text-5xl"
					>
						From “ugh, PDFs” to{" "}
						<span className="ud-display font-extrabold underline decoration-yellow-300 decoration-4 underline-offset-4">
							applied.
						</span>
					</h2>
					<p className="mt-3 text-base font-medium leading-relaxed text-emerald-950/70">
						We turn dense government circulars into a short checklist you can
						actually finish.
					</p>
				</div>

				<ol className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
					{STEPS.map((step, i) => (
						<li key={step.title} className="relative">
							<article className="card-fluid group flex h-full flex-col justify-between rounded-2xl border-[1.5px] border-emerald-950/15 bg-[#E9F0EA]/50 p-6 hover:border-emerald-950 hover:bg-white hover:shadow-[4px_4px_0px_0px_rgba(2,44,34,0.12)] sm:p-7">
								<div>
									<div className="mb-4 flex items-center justify-between">
										<span className="rounded-full border-[1.5px] border-emerald-950/20 bg-white px-3 py-1 text-xs font-bold text-emerald-950">
											{step.tag}
										</span>
										<span
											className="ud-display text-3xl font-extrabold text-emerald-950/30"
											aria-hidden="true"
										>
											{String(i + 1).padStart(2, "0")}
										</span>
									</div>

									<div className="mb-5 rounded-xl border-[1.5px] border-emerald-950/15 bg-white p-2 shadow-2xs">
										{step.art}
									</div>

									<h3 className="ud-display mb-2 text-lg font-bold leading-snug text-emerald-950 sm:text-xl">
										{step.title}
									</h3>
									<p className="text-sm font-medium leading-relaxed text-emerald-950/70">
										{step.description}
									</p>
								</div>

								<div className="mt-5 flex items-center gap-2 border-t-[1.5px] border-dashed border-emerald-950/20 pt-5 text-xs font-bold text-emerald-950">
									<span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-[1.5px] border-emerald-950 bg-white">
										<step.footer.Icon
											size={11}
											strokeWidth={3}
											aria-hidden="true"
										/>
									</span>
									<span>{step.footer.text}</span>
								</div>
							</article>

							{/* Arrow in the gap: this really is a sequence, so show the direction. */}
							{i < STEPS.length - 1 && (
								<span
									aria-hidden="true"
									className="absolute top-1/2 -right-7 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-emerald-950 bg-yellow-200 lg:-right-8 md:flex"
								>
									<ArrowRight size={14} strokeWidth={2.5} />
								</span>
							)}
						</li>
					))}
				</ol>

				{/* The conversion point lives at the end of the story, and works on mobile. */}
				<div className="mt-12 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
					<Link
						to="/eligibility"
						className={`group inline-flex min-h-[44px] items-center gap-2 rounded-full border-[1.5px] border-emerald-950 bg-emerald-800 px-6 py-2.5 text-sm font-bold text-white shadow-[3px_3px_0px_0px_rgba(2,44,34,1)] transition hover:-translate-y-0.5 hover:bg-emerald-900 active:translate-y-0 ${focusRing}`}
					>
						<span>Check what I qualify for</span>
						<ArrowRight
							size={16}
							className="transition-transform group-hover:translate-x-1"
						/>
					</Link>
					<span className="text-sm font-medium text-emerald-950/60">
						Takes about a minute.
					</span>
				</div>
			</div>
		</section>
	);
}
