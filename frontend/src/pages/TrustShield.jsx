import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, RefreshCw, Search } from "lucide-react";
import {
	scanLinkOrContent,
	getOfficialRegistry,
} from "../services/verifyService";
import { toast } from "sonner";
import { PageStyles, Stamp } from "../components/PageKit";
import { MotionStyles, CountUp, VerifyingCard } from "../components/MotionKit";
import HeroScamDemo from "../components/HeroScamDemo";

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

// Left column width shared by the scanner and rules sections so they line up.
const SIDE_COL = "lg:grid-cols-[18rem_1fr]";

const PRESETS = [
	{
		label: "Official NSP portal",
		type: "url",
		val: "https://scholarships.gov.in",
		desc: "Central government portal",
	},
	{
		label: "Fee request on WhatsApp",
		type: "text",
		val: "PM Scholarship 2025: All eligible 10th and 12th pass students get ₹25,000 direct bank transfer. Registration fee ₹499 via UPI to verify bank account. Send Aadhaar on WhatsApp 9876543210.",
		desc: "Forward that asks for a fee and Aadhaar",
	},
	{
		label: "Tata Trusts",
		type: "url",
		val: "https://www.tatatrusts.org",
		desc: "Established philanthropic foundation",
	},
	{
		label: "Lookalike domain",
		type: "url",
		val: "http://pm-scholarship-yojana2025.online/apply",
		desc: "Unofficial ending, no HTTPS",
	},
];

const SCAN_STEPS = [
	"Reading the domain and message",
	"Matching against the official registry",
	"Looking for fee, UPI and OTP traps",
	"Scoring what we found",
];

const VERDICTS = {
	VERIFIED_OFFICIAL: {
		headline: "This is an official government portal.",
		summary:
			"The address ends in .gov.in or .nic.in, endings that only government bodies can register.",
		stamp: "Official",
		tilt: -6,
		panel: "bg-emerald-50 border-emerald-950",
		stampClass: "border-emerald-700 text-emerald-800",
	},
	VERIFIED_CSR: {
		headline: "This belongs to a known foundation.",
		summary:
			"It matches a registered corporate or charitable foundation on our list, and we found no scam patterns in what you pasted.",
		stamp: "Verified",
		tilt: -6,
		panel: "bg-emerald-50 border-emerald-950",
		stampClass: "border-emerald-700 text-emerald-800",
	},
	HIGH_RISK_SUSPICIOUS: {
		headline: "Don\u2019t pay or send anything.",
		summary:
			"Government and genuine CSR scholarships never charge a fee, ask for a UPI payment, or promise cash before you apply. This matches how scams work.",
		stamp: "Do not pay",
		tilt: 6,
		panel: "bg-rose-50 border-rose-700",
		stampClass: "border-rose-700 text-rose-700",
	},
	UNVERIFIED: {
		headline: "We can\u2019t confirm this source.",
		summary:
			"It isn\u2019t on our official list. It could be a blog, an aggregator or a private listing. Find the scheme on the ministry\u2019s own website before you upload any documents.",
		stamp: "Unverified",
		tilt: -6,
		panel: "bg-yellow-50 border-emerald-950/30",
		stampClass: "border-amber-700 text-amber-800",
	},
};

const SEVERITY = {
	critical: { label: "Red flag", cls: "text-rose-700" },
	positive: { label: "Looks fine", cls: "text-emerald-800" },
	default: { label: "Heads up", cls: "text-amber-700" },
};

const registryDot = (type = "") => {
	const t = type.toLowerCase();
	if (t.includes("central") || t.includes("sovereign") || t.includes("gov"))
		return "bg-emerald-950";
	if (t.includes("csr") || t.includes("corp") || t.includes("tata"))
		return "bg-yellow-400";
	if (t.includes("state")) return "bg-emerald-600";
	return "bg-emerald-950/40";
};

export default function TrustShield() {
	const scannerRef = useRef(null);

	const [activeTab, setActiveTab] = useState("url");
	const [urlInput, setUrlInput] = useState("");
	const [textInput, setTextInput] = useState("");
	const [analyzing, setAnalyzing] = useState(false);
	const [result, setResult] = useState(null);
	const [scanId, setScanId] = useState(0);
	const [registry, setRegistry] = useState([]);
	const [registryStatus, setRegistryStatus] = useState("loading");

	useEffect(() => {
		getOfficialRegistry()
			.then((res) => {
				if (res.success && res.registry) {
					setRegistry(res.registry);
					setRegistryStatus("ready");
				} else {
					setRegistryStatus("error");
				}
			})
			.catch((err) => {
				console.warn("Could not load official registry:", err?.message);
				setRegistryStatus("error");
			});
	}, []);

	// One path for every scan: form submit, presets and the hero demo.
	const runScan = async ({ url = "", text = "" }) => {
		if (analyzing) return;
		setAnalyzing(true);
		try {
			const res = await scanLinkOrContent({ url, text });
			if (!res.success) {
				toast.error(res.message || "The scan didn\u2019t finish. Try again.");
				return;
			}
			setResult(res.result);
			setScanId((n) => n + 1);
			const v = res.result.verdict;
			if (v === "VERIFIED_OFFICIAL" || v === "VERIFIED_CSR") {
				toast.success("Official or recognised source.");
			} else if (v === "HIGH_RISK_SUSPICIOUS") {
				toast.error("High risk. Read the red flags before you do anything.");
			} else {
				toast.info("We couldn\u2019t verify this source.");
			}
		} catch (err) {
			toast.error(
				err.response?.data?.message ||
					"Couldn\u2019t run the check. Check your connection and try again.",
			);
		} finally {
			setAnalyzing(false);
		}
	};

	const handleAnalyze = (e) => {
		if (e) e.preventDefault();
		const url = activeTab === "url" ? urlInput.trim() : "";
		const text = activeTab === "text" ? textInput.trim() : "";
		if (!url && !text) {
			toast.error("Paste a link or a message first.");
			return;
		}
		runScan({ url, text });
	};

	const applyPreset = (preset) => {
		const url = preset.type === "url" ? preset.val : "";
		const text = preset.type === "text" ? preset.val : "";
		setActiveTab(preset.type);
		setUrlInput(url);
		setTextInput(text);
		runScan({ url, text });
	};

	const verdict = result
		? (VERDICTS[result.verdict] ?? VERDICTS.UNVERIFIED)
		: null;

	return (
		<div className="ud-root min-h-screen bg-[#E9F0EA] pb-24 font-sans text-emerald-950">
			<PageStyles />
			<MotionStyles />

			{/* Hero */}
			<section className="mx-auto max-w-7xl px-5 pt-12 pb-16 sm:px-8 md:pt-20">
				<div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
					<div>
						<h1
							className="font-serif text-[2.5rem] font-medium leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl"
							style={{ textWrap: "balance" }}
						>
							Got a scholarship link or forward? Check it before you reply.
						</h1>
						<p className="mt-5 max-w-[52ch] text-base leading-relaxed text-emerald-950/75 sm:text-lg">
							Paste it below. We compare the address with official portals and
							look for fee, UPI and Aadhaar demands. Real government
							scholarships don&rsquo;t charge you to apply.
						</p>
					</div>

					<HeroScamDemo
						onScan={() => {
							applyPreset(PRESETS[1]);
							scannerRef.current?.scrollIntoView({
								behavior: "smooth",
								block: "start",
							});
						}}
					/>
				</div>
			</section>

			<div className="mx-auto max-w-7xl space-y-24 px-5 sm:px-8">
				{/* Scanner */}
				<section
					ref={scannerRef}
					className={`grid scroll-mt-8 gap-10 lg:gap-14 ${SIDE_COL}`}
				>
					<div className="lg:sticky lg:top-8 lg:self-start">
						<h2 className="font-serif text-3xl leading-tight">
							Check a link or a message
						</h2>
						<p className="mt-3 text-sm leading-relaxed text-emerald-950/70">
							Paste a website address, or the text of a WhatsApp forward or SMS.
							We don&rsquo;t store what you paste.
						</p>

						<p className="mt-8 text-sm font-semibold">Try an example</p>
						<ul className="mt-2 divide-y divide-emerald-950/10 border-y border-emerald-950/10">
							{PRESETS.map((p) => (
								<li key={p.label}>
									<button
										type="button"
										onClick={() => applyPreset(p)}
										disabled={analyzing}
										className={`group w-full cursor-pointer py-3 text-left disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
									>
										<span className="block text-sm font-semibold underline-offset-4 group-hover:underline">
											{p.label}
										</span>
										<span className="block text-xs text-emerald-950/60">
											{p.desc}
										</span>
									</button>
								</li>
							))}
						</ul>
					</div>

					<div>
						<form
							onSubmit={handleAnalyze}
							className="rounded-lg border-[1.5px] border-emerald-950 bg-white focus-within:ring-4 focus-within:ring-yellow-200"
						>
							<div
								role="tablist"
								aria-label="What are you checking?"
								className="flex gap-6 border-b border-emerald-950/15 px-5"
							>
								{[
									{ id: "url", label: "Website address" },
									{ id: "text", label: "Message text" },
								].map((tab) => (
									<button
										key={tab.id}
										type="button"
										role="tab"
										aria-selected={activeTab === tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={`-mb-px cursor-pointer border-b-2 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:underline ${
											activeTab === tab.id
												? "border-emerald-950 text-emerald-950"
												: "border-transparent text-emerald-950/55 hover:text-emerald-950"
										}`}
									>
										{tab.label}
									</button>
								))}
							</div>

							<div className="p-5">
								{activeTab === "url" ? (
									<input
										type="text"
										inputMode="url"
										aria-label="Website address to check"
										placeholder="https://"
										value={urlInput}
										onChange={(e) => setUrlInput(e.target.value)}
										className="w-full bg-transparent py-1 text-base font-medium text-emerald-950 placeholder:text-emerald-950/35 focus:outline-none"
									/>
								) : (
									<textarea
										rows={5}
										aria-label="Message text to check"
										placeholder="Paste the forward or SMS exactly as you got it"
										value={textInput}
										onChange={(e) => setTextInput(e.target.value)}
										className="w-full resize-y bg-transparent py-1 text-base leading-relaxed text-emerald-950 placeholder:text-emerald-950/35 focus:outline-none"
									/>
								)}
							</div>

							<div className="flex items-center justify-between gap-3 border-t border-emerald-950/15 px-5 py-3">
								<p className="text-xs text-emerald-950/60">
									Checks take a few seconds.
								</p>
								<button
									type="submit"
									disabled={analyzing}
									className={`inline-flex cursor-pointer items-center gap-2 rounded-md bg-emerald-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 active:translate-y-px disabled:opacity-60 ${focusRing}`}
								>
									{analyzing ? (
										<>
											<RefreshCw size={14} className="animate-spin" />
											<span>Checking</span>
										</>
									) : (
										<>
											<Search size={14} />
											<span>Check it</span>
										</>
									)}
								</button>
							</div>
						</form>

						<div className="mt-6 empty:mt-0">
							<VerifyingCard active={analyzing} steps={SCAN_STEPS} />
						</div>

						{/* Result */}
						{result && verdict && (
							<section
								key={scanId}
								aria-live="polite"
								className={`sk-in relative mt-10 rounded-lg border-[1.5px] ${verdict.panel}`}
							>
								<Stamp
									slam
									delay={0.2}
									tilt={verdict.tilt}
									className={`absolute -top-4 right-4 bg-white/80 text-sm sm:text-base ${verdict.stampClass}`}
								>
									{verdict.stamp}
								</Stamp>

								<div className="p-6 sm:p-8">
									<h3 className="max-w-[22ch] font-serif text-3xl leading-tight sm:text-4xl">
										{verdict.headline}
									</h3>
									<p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-emerald-950/80">
										{verdict.summary}
									</p>

									<div className="mt-6 flex items-center gap-4">
										<p className="font-serif text-4xl leading-none">
											<CountUp value={result.score || 0} duration={900} />
											<span className="text-lg text-emerald-950/50">
												{" "}
												/ 100
											</span>
										</p>
										<div>
											<p className="text-sm font-semibold">Trust score</p>
											<div className="sk-meter mt-1.5 w-40" aria-hidden>
												<span
													style={{
														width: `${Math.max(4, result.score || 0)}%`,
														background:
															result.score >= 70
																? "#2d6a4f"
																: result.score >= 40
																	? "#f59e0b"
																	: "#e11d48",
													}}
												/>
											</div>
										</div>
									</div>
								</div>

								{result.findings?.length > 0 && (
									<ul className="divide-y divide-emerald-950/10 border-t border-emerald-950/15">
										{result.findings.map((f, i) => {
											const sev = SEVERITY[f.severity] ?? SEVERITY.default;
											return (
												<li
													key={i}
													style={{ "--d": `${250 + i * 90}ms` }}
													className="sk-in grid grid-cols-[5.5rem_1fr] gap-x-4 px-6 py-4 sm:px-8"
												>
													<span className={`text-sm font-semibold ${sev.cls}`}>
														{sev.label}
													</span>
													<div>
														<p className="text-sm font-semibold">{f.title}</p>
														<p className="mt-0.5 text-sm leading-relaxed text-emerald-950/70">
															{f.description}
														</p>
													</div>
												</li>
											);
										})}
									</ul>
								)}

								{result.crossReferencedScheme && (
									<div className="flex flex-col gap-3 border-t border-emerald-950/15 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
										<div>
											<p className="text-sm text-emerald-950/65">
												This matches a scheme listed on Udaan
											</p>
											<p className="font-semibold">
												{result.crossReferencedScheme.title}
											</p>
											<p className="text-sm text-emerald-950/65">
												Issued by {result.crossReferencedScheme.organization}
											</p>
										</div>
										{result.crossReferencedScheme.officialPortal && (
											<a
												href={result.crossReferencedScheme.officialPortal}
												target="_blank"
												rel="noreferrer"
												className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border-[1.5px] border-emerald-950 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-yellow-200 ${focusRing}`}
											>
												<span>Open official portal</span>
												<ExternalLink size={13} />
											</a>
										)}
									</div>
								)}

								{result.verdict === "HIGH_RISK_SUSPICIOUS" && (
									<div className="flex flex-col gap-3 border-t border-rose-300 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
										<p className="text-sm font-semibold text-rose-800">
											Already paid or shared your Aadhaar? Report it today.
										</p>
										<a
											href="https://cybercrime.gov.in"
											target="_blank"
											rel="noreferrer"
											className={`inline-flex shrink-0 items-center gap-1.5 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 ${focusRing}`}
										>
											<span>Report on cybercrime.gov.in</span>
											<ExternalLink size={13} />
										</a>
									</div>
								)}
							</section>
						)}
					</div>
				</section>

				{/* Official portals */}
				<section>
					<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
						<div>
							<h2 className="font-serif text-3xl leading-tight">
								Official portals
							</h2>
							<p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-emerald-950/70">
								Government and foundation sites we match against. If a link
								isn&rsquo;t here, treat it as unverified until you&rsquo;ve
								checked it.
							</p>
						</div>
						<Link
							to="/scholarships"
							className={`inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950 ${focusRing}`}
						>
							<span>Browse all scholarships</span>
							<ArrowRight size={14} />
						</Link>
					</div>

					<div className="mt-6 border-t-[1.5px] border-emerald-950">
						{registryStatus === "loading" && (
							<p className="py-6 text-sm text-emerald-950/60">
								Loading the list&hellip;
							</p>
						)}
						{registryStatus === "error" && (
							<p className="py-6 text-sm text-emerald-950/70">
								The list didn&rsquo;t load. Refresh the page to try again.
							</p>
						)}
						{registry.map((item, idx) => (
							<div
								key={idx}
								className="grid gap-x-6 gap-y-1 border-b border-emerald-950/15 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_9rem_6rem] md:items-center"
							>
								<div className="min-w-0">
									<h3 className="font-semibold leading-snug">{item.name}</h3>
									<p className="line-clamp-2 text-sm text-emerald-950/65">
										{item.description}
									</p>
								</div>
								<span className="truncate font-mono text-xs text-emerald-950/70">
									{item.domain}
								</span>
								<span className="inline-flex items-center gap-2 text-xs font-semibold">
									<span
										className={`h-2 w-2 shrink-0 rounded-full ${registryDot(item.type)}`}
										aria-hidden
									/>
									<span className="truncate">{item.type}</span>
								</span>
								<a
									href={item.url}
									target="_blank"
									rel="noreferrer"
									className={`inline-flex items-center gap-1 text-sm font-semibold underline decoration-emerald-950/30 underline-offset-4 hover:decoration-emerald-950 md:justify-end ${focusRing}`}
								>
									<span>Visit</span>
									<ExternalLink size={12} />
								</a>
							</div>
						))}
					</div>
				</section>

				{/* Rules */}
				<section
					className={`grid gap-8 border-t-[1.5px] border-emerald-950 pt-10 lg:gap-14 ${SIDE_COL}`}
				>
					<h2 className="font-serif text-3xl leading-tight">
						Spotting a fake without us
					</h2>
					<ul className="divide-y divide-emerald-950/15">
						<li className="grid gap-x-8 gap-y-1 pb-6 sm:grid-cols-[14rem_1fr]">
							<h3 className="font-semibold">Applying costs nothing</h3>
							<p className="max-w-[58ch] text-sm leading-relaxed text-emerald-950/75">
								Central and state scholarship portals don&rsquo;t charge an
								application or processing fee. A message asking for ₹499 to
								&ldquo;register&rdquo; isn&rsquo;t from them.
							</p>
						</li>
						<li className="grid gap-x-8 gap-y-1 py-6 sm:grid-cols-[14rem_1fr]">
							<h3 className="font-semibold">Read how the address ends</h3>
							<p className="max-w-[58ch] text-sm leading-relaxed text-emerald-950/75">
								Government portals end in{" "}
								<code className="rounded-sm bg-emerald-950/5 px-1 font-mono text-[0.9em]">
									.gov.in
								</code>{" "}
								or{" "}
								<code className="rounded-sm bg-emerald-950/5 px-1 font-mono text-[0.9em]">
									.nic.in
								</code>
								. Be wary of lookalikes on .com, .online or .xyz. Foundations
								and universities use other endings, so look them up in the list
								above.
							</p>
						</li>
						<li className="grid gap-x-8 gap-y-1 pt-6 sm:grid-cols-[14rem_1fr]">
							<h3 className="font-semibold">
								Money comes to you, never from you
							</h3>
							<p className="max-w-[58ch] text-sm leading-relaxed text-emerald-950/75">
								Central scholarships are paid straight into your bank account
								through DBT. Nobody needs your UPI PIN, an OTP or a screenshot
								to &ldquo;release&rdquo; the amount.
							</p>
						</li>
					</ul>
				</section>
			</div>
		</div>
	);
}
