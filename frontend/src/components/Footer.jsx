import { Link } from "react-router-dom";
import { ArrowRight, ArrowUp, ArrowUpRight, LockKeyhole } from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "../hooks/useAuth";
import {
	PUBLIC_TOOLS,
	PUBLIC_GUIDES,
	ACCOUNT_FEATURES,
} from "../config/navigation";
import { authDestination } from "../utils/authNavigation";

const CATALOG = [
	{ label: "All scholarships", path: "/scholarships" },
	{ label: "Government schemes", path: "/scholarships?category=Government" },
	{ label: "Scholarships for women", path: "/scholarships?category=Women" },
	{ label: "STEM scholarships", path: "/scholarships?category=STEM" },
	{ label: "Recent updates", path: "/scholarships?hasChanges=true" },
];

const PORTALS = [
	["NSP", "https://scholarships.gov.in"],
	["AICTE", "https://www.aicte.gov.in/schemes/students-development-schemes"],
	["UGC", "https://www.ugc.gov.in"],
	["UP scholarship portal", "https://scholarship.up.gov.in"],
	["MahaDBT", "https://mahadbt.maharashtra.gov.in"],
	["Karnataka SSP", "https://ssp.postmatric.karnataka.gov.in"],
].map(([label, url]) => ({
	label,
	url,
	host: new URL(url).hostname.replace(/^www\./, ""),
}));

// Palette: forest ink, ivory paper, brass.
const FOREST = "#0f2c22";
const FOCUS =
	"focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d4a39]";
const FOCUS_DARK =
	"focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e4d3a3]";

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

// Only the trusted ending of a web address gets the highlighter.
function Host({ host }) {
	const m = host.match(/^(.*?)(gov\.in|nic\.in)$/);
	if (!m) return <>{host}</>;
	return (
		<>
			{m[1]}
			<mark className="bg-[#f1e6c0] px-0.5 font-semibold text-[#12332a]">
				{m[2]}
			</mark>
		</>
	);
}

// Brass postage stamp with a perforated edge and a paper plane (udaan = take-off).
function PostStamp() {
	const W = 92;
	const H = 112;
	const step = 9;
	const holes = [];
	for (let x = step / 2; x < W; x += step) holes.push([x, 0], [x, H]);
	for (let y = step / 2; y < H; y += step) holes.push([0, y], [W, y]);
	return (
		<svg
			viewBox={`0 0 ${W} ${H}`}
			className="h-28 w-[92px] drop-shadow-[0_8px_14px_rgba(0,0,0,0.35)]"
			aria-hidden="true"
		>
			<rect width={W} height={H} fill="#d5b36a" />
			{holes.map(([x, y], i) => (
				<circle key={i} cx={x} cy={y} r="3" fill={FOREST} />
			))}
			<rect
				x="9"
				y="9"
				width={W - 18}
				height={H - 18}
				fill="#163a2e"
				stroke="#0a1f18"
				strokeWidth="1.2"
			/>
			<path
				d="M22 54L70 30L56 82L44 62Z"
				fill="#f6f2e7"
				stroke="#0a1f18"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<path d="M44 62L70 30" stroke="#0a1f18" strokeWidth="1.5" />
			<text
				x={W / 2}
				y="98"
				textAnchor="middle"
				fontSize="8"
				fontWeight="700"
				letterSpacing="2"
				fill="#d5b36a"
			>
				UDAAN
			</text>
		</svg>
	);
}

// Circular postmark with wavy cancellation lines. Shows the current month.
function Postmark() {
	const now = new Date();
	const month = now.toLocaleString("en-IN", { month: "short" }).toUpperCase();
	return (
		<svg
			viewBox="0 0 220 110"
			className="h-24 w-48 text-[#a9bdb1]"
			fill="none"
			aria-hidden="true"
		>
			<defs>
				<path
					id="ft-postmark-arc"
					d="M58 55m-39 0a39 39 0 1 1 78 0a39 39 0 1 1-78 0"
				/>
			</defs>
			<g stroke="currentColor" strokeWidth="1.6" opacity=".6">
				<circle cx="58" cy="55" r="46" />
				<circle cx="58" cy="55" r="31" strokeWidth="1.2" />
				<path d="M108 32q10-8 20 0t20 0t20 0t20 0t20 0" />
				<path d="M108 46q10-8 20 0t20 0t20 0t20 0t20 0" />
				<path d="M108 60q10-8 20 0t20 0t20 0t20 0t20 0" />
				<path d="M108 74q10-8 20 0t20 0t20 0t20 0t20 0" />
			</g>
			<text fontSize="8.5" fontWeight="700" fill="currentColor" opacity=".6">
				<textPath
					href="#ft-postmark-arc"
					textLength="238"
					lengthAdjust="spacing"
				>
					UDAAN SCHOLARSHIP FINDER ·
				</textPath>
			</text>
			<g fill="currentColor" opacity=".6" textAnchor="middle" fontWeight="700">
				<text x="58" y="53" fontSize="12">
					{month}
				</text>
				<text x="58" y="68" fontSize="11">
					{now.getFullYear()}
				</text>
			</g>
		</svg>
	);
}

function FooterColumn({ title, children }) {
	return (
		<div>
			<h3 className="font-georgia text-lg font-medium">{title}</h3>
			<span
				className="mb-4 mt-2 block h-px w-8 bg-[#b8913f]"
				aria-hidden="true"
			/>
			{children}
		</div>
	);
}

function FooterLink({ to, children }) {
	return (
		<li>
			<Link
				to={to}
				className={`inline-flex min-h-9 items-center gap-2 py-1 text-[14.5px] text-[#4a5f54] underline-offset-4 decoration-[#b8913f]/70 transition-colors hover:text-[#12332a] hover:underline ${FOCUS}`}
			>
				{children}
			</Link>
		</li>
	);
}

// A ruled "address line" on the postcard.
const ROW = "border-b border-[#f6f2e7]/20";

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

export default function Footer() {
	const { user } = useAuth();

	return (
		<footer className="border-t border-[#12332a]/10 bg-[#f7f4ea] font-sans text-[#12332a]">
			<div className="mx-auto max-w-7xl px-5 pb-8 pt-12 sm:px-8 lg:px-10 lg:pt-16">
				{/* The one bold moment: a dark postcard with a stamp and ruled address lines */}
				<section
					aria-labelledby="footer-next-chapter"
					className="relative overflow-hidden rounded-[28px] text-[#f6f2e7]"
					style={{
						background: `radial-gradient(60% 90% at 100% 0%, rgba(201,169,97,0.2), transparent 62%), ${FOREST}`,
					}}
				>
					{/* Letterpress frame */}
					<div
						className="pointer-events-none absolute inset-3 rounded-[20px] border border-[#c9a961]/25"
						aria-hidden="true"
					/>

					<div className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16 lg:p-16">
						<div className="flex flex-col justify-center">
							<h2
								id="footer-next-chapter"
								className="font-georgia text-4xl font-normal leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
								style={{ textWrap: "balance" }}
							>
								Your next chapter.
								<br />
								<span className="italic text-[#e4d3a3]">
									Let&rsquo;s give it a start.
								</span>
							</h2>
							<p className="mt-6 max-w-md text-base leading-relaxed text-[#f6f2e7]/70">
								Find funding for the plans you keep coming back to. We&rsquo;ll
								help you figure out the next step.
							</p>
						</div>

						<div className="flex flex-col gap-8">
							<div
								className="relative ml-auto h-28 w-60 shrink-0"
								aria-hidden="true"
							>
								<div className="absolute right-0 top-0 rotate-3">
									<PostStamp />
								</div>
								<div className="absolute left-0 top-2 -rotate-6">
									<Postmark />
								</div>
							</div>

							<ul className="mt-auto">
								<li className={ROW}>
									<Link
										to="/scholarships"
										className={`group flex min-h-14 items-center justify-between gap-3 py-2.5 font-georgia text-2xl ${FOCUS_DARK}`}
									>
										Find a scholarship
										<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d5b36a] text-[#0f2c22] transition-transform duration-300 group-hover:rotate-45 motion-reduce:transform-none">
											<ArrowUpRight size={18} aria-hidden="true" />
										</span>
									</Link>
								</li>
								<li className={ROW}>
									<Link
										to="/eligibility"
										className={`group flex min-h-12 items-center justify-between gap-3 py-2.5 text-[15px] font-medium text-[#f6f2e7]/90 transition-colors hover:text-white ${FOCUS_DARK}`}
									>
										Check your eligibility
										<ArrowRight
											size={16}
											className="shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
											aria-hidden="true"
										/>
									</Link>
								</li>
								<li className={ROW}>
									<Link
										to="/how-to-apply"
										className={`group flex min-h-12 items-center justify-between gap-3 py-2.5 text-[15px] font-medium text-[#f6f2e7]/90 transition-colors hover:text-white ${FOCUS_DARK}`}
									>
										New here? Start with the basics
										<ArrowRight
											size={16}
											className="shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
											aria-hidden="true"
										/>
									</Link>
								</li>
							</ul>
						</div>
					</div>
				</section>

				{/* Brand + link columns */}
				<div className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-8">
					<div className="lg:col-span-4">
						<Logo size="md" tagline="A little help for your next big step." />
						<p className="mt-5 max-w-xs text-sm leading-relaxed text-[#4a5f54]">
							For the dreamers, the doers, and everyone still finding their way.
							Discover scholarships, explore possibilities, and take your next
							step with a little more confidence.
						</p>
					</div>

					<nav
						aria-label="Footer navigation"
						className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4"
					>
						<FooterColumn title="Find funding">
							<ul>
								{CATALOG.map((item) => (
									<FooterLink key={item.path} to={item.path}>
										{item.label}
									</FooterLink>
								))}
							</ul>
						</FooterColumn>

						<FooterColumn title="Your toolkit">
							<ul>
								{PUBLIC_TOOLS.map((item) => (
									<FooterLink key={item.path} to={item.path}>
										{item.label}
									</FooterLink>
								))}
							</ul>
						</FooterColumn>

						<FooterColumn title="Learn & prepare">
							<ul>
								{PUBLIC_GUIDES.map((item) => (
									<FooterLink key={item.path} to={item.path}>
										{item.label}
									</FooterLink>
								))}
							</ul>
						</FooterColumn>

						<FooterColumn title={user ? "Your account" : "Make it yours"}>
							{!user && (
								<p className="-mt-1 mb-2 text-[13px] leading-relaxed text-[#4a5f54]">
									Sign in to save your shortlist and manage alerts.
								</p>
							)}
							<ul>
								{ACCOUNT_FEATURES.map((item) => (
									<FooterLink
										key={item.path}
										to={user ? item.path : authDestination("/login", item.path)}
									>
										{item.label}
										{!user && (
											<LockKeyhole
												size={12}
												className="shrink-0 text-[#12332a]/40"
												aria-hidden="true"
											/>
										)}
									</FooterLink>
								))}
							</ul>
							{!user && (
								<Link
									to="/signup"
									className={`
      group mt-5 inline-flex w-max max-w-full
      items-center justify-center gap-3
      whitespace-nowrap rounded-full
      bg-[#12332a] px-5 py-3
      text-[13px] font-semibold text-[#f7f3e6]
      shadow-sm transition-all duration-200
      hover:-translate-y-0.5
      hover:bg-[#1d4a39]
      hover:shadow-md
      ${FOCUS}
    `}
								>
									<span>Create account</span>
									<ArrowUpRight
										size={15}
										className="shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
										aria-hidden="true"
									/>
								</Link>
							)}
						</FooterColumn>
					</nav>
				</div>

				{/* Official portals */}
				<section
					aria-labelledby="footer-portals"
					className="mt-16 grid gap-6 border-t border-[#12332a]/15 pt-10 lg:grid-cols-[16rem_1fr] lg:gap-12"
				>
					<div>
						<h2
							id="footer-portals"
							className="font-georgia text-3xl leading-tight"
						>
							Go to the source
						</h2>
						<p className="mt-2 text-sm leading-relaxed text-[#4a5f54]">
							Official scholarship portals. Each one opens in a new tab.
						</p>
					</div>
					<ul className="grid gap-x-10 border-t border-[#12332a]/10 sm:grid-cols-2 xl:grid-cols-3">
						{PORTALS.map((p) => (
							<li key={p.label} className="border-b border-[#12332a]/10">
								<a
									href={p.url}
									target="_blank"
									rel="noopener noreferrer"
									aria-label={`${p.label} (opens in a new tab)`}
									className={`group flex min-h-12 items-baseline justify-between gap-3 py-3 ${FOCUS}`}
								>
									<span className="text-[15px] font-semibold underline-offset-4 decoration-[#b8913f] group-hover:underline">
										{p.label}
									</span>
									<span className="flex min-w-0 items-center gap-1.5 font-mono text-xs text-[#4a5f54]">
										<span className="truncate">
											<Host host={p.host} />
										</span>
										<ArrowUpRight
											size={13}
											className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
											aria-hidden="true"
										/>
									</span>
								</a>
							</li>
						))}
					</ul>
				</section>

				{/* Colophon */}
				<div className="mt-12 flex flex-col gap-3 border-t border-[#12332a]/15 pt-6 text-xs leading-6 text-[#4a5f54] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
					<span>
						&copy; {new Date().getFullYear()} Udaan Scholarship Finder
					</span>
					<span className="font-georgia text-[13px] italic">
						Made for students, and every dream still taking shape.
					</span>
					<span className="flex items-center gap-5">
						<a
							className={`inline-flex min-h-10 items-center gap-1.5 underline-offset-4 hover:text-[#12332a] hover:underline ${FOCUS}`}
							href="https://github.com/sanskriti49/udaan-scholarship-finder"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="GitHub (opens in a new tab)"
						>
							GitHub <ArrowUpRight size={13} aria-hidden="true" />
						</a>
						<button
							type="button"
							onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
							className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-[#12332a]/20 px-4 transition-colors hover:border-[#b8913f] hover:bg-[#f1eee1] hover:text-[#12332a] ${FOCUS}`}
						>
							Back to top <ArrowUp size={13} aria-hidden="true" />
						</button>
					</span>
				</div>
			</div>
		</footer>
	);
}
