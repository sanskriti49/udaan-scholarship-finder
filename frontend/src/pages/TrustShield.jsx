import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
	ShieldCheck,
	ShieldAlert,
	AlertTriangle,
	CheckCircle2,
	ExternalLink,
	Search,
	Lock,
	Globe,
	HelpCircle,
	ArrowRight,
	Sparkles,
	RefreshCw,
	Info,
} from "lucide-react";
import {
	scanLinkOrContent,
	getOfficialRegistry,
} from "../services/verifyService";
import { toast } from "sonner";
import { PageStyles } from "../components/PageKit";

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

export default function TrustShield() {
	const [activeTab, setActiveTab] = useState("url");
	const [urlInput, setUrlInput] = useState("");
	const [textInput, setTextInput] = useState("");
	const [analyzing, setAnalyzing] = useState(false);
	const [result, setResult] = useState(null);
	const [registry, setRegistry] = useState([]);

	const presets = [
		{
			label: "Official NSP Portal",
			type: "url",
			val: "https://scholarships.gov.in",
			desc: "Central Government Sovereign Portal",
		},
		{
			label: "Suspicious Fee Request",
			type: "text",
			val: "PM Scholarship 2025: All eligible 10th and 12th pass students get ₹25,000 direct bank transfer. Registration fee ₹499 via UPI to verify bank account. Send Aadhaar on WhatsApp 9876543210.",
			desc: "Phishing WhatsApp forward with fee demand",
		},
		{
			label: "Tata Trusts CSR",
			type: "url",
			val: "https://www.tatatrusts.org",
			desc: "Verified Philanthropic Foundation",
		},
		{
			label: "Fake Unofficial TLD",
			type: "url",
			val: "http://pm-scholarship-yojana2025.online/apply",
			desc: "Unsecured lookalike domain",
		},
	];

	useEffect(() => {
		getOfficialRegistry()
			.then((res) => {
				if (res.success && res.registry) {
					setRegistry(res.registry);
				}
			})
			.catch((err) => {
				console.warn(
					"Could not load remote registry, using local fallback:",
					err?.message,
				);
			});
	}, []);

	const handleAnalyze = async (e) => {
		if (e) e.preventDefault();
		const targetUrl = activeTab === "url" ? urlInput.trim() : "";
		const targetText = activeTab === "text" ? textInput.trim() : "";

		if (!targetUrl && !targetText) {
			toast.error("Please enter a link or message text to scan.");
			return;
		}

		setAnalyzing(true);
		try {
			const res = await scanLinkOrContent({ url: targetUrl, text: targetText });
			if (res.success) {
				setResult(res.result);
				if (
					res.result.verdict === "VERIFIED_OFFICIAL" ||
					res.result.verdict === "VERIFIED_CSR"
				) {
					toast.success(
						"Verification complete: Official or recognized entity detected.",
					);
				} else if (res.result.verdict === "HIGH_RISK_SUSPICIOUS") {
					toast.error(
						"High risk detected! Review the warning indicators below.",
					);
				} else {
					toast.info("Analysis complete: Unverified third-party link.");
				}
			}
		} catch (err) {
			toast.error(
				err.response?.data?.message ||
					"Failed to analyze link. Please check your connection.",
			);
		} finally {
			setAnalyzing(false);
		}
	};

	const applyPreset = (preset) => {
		setActiveTab(preset.type);
		if (preset.type === "url") {
			setUrlInput(preset.val);
			setTextInput("");
		} else {
			setTextInput(preset.val);
			setUrlInput("");
		}
		setTimeout(() => {
			setAnalyzing(true);
			scanLinkOrContent({
				url: preset.type === "url" ? preset.val : "",
				text: preset.type === "text" ? preset.val : "",
			})
				.then((res) => {
					if (res.success) setResult(res.result);
				})
				.catch(() => {})
				.finally(() => setAnalyzing(false));
		}, 100);
	};

	const getVerdictDetails = (verdict, score) => {
		switch (verdict) {
			case "VERIFIED_OFFICIAL":
				return {
					title: "Official Government Portal",
					badge: "Statutory & Safe (100%)",
					badgeBg: "bg-emerald-800 text-white",
					cardBg: "bg-emerald-50/80 border-emerald-950",
					icon: ShieldCheck,
					summary:
						"This domain is an official Indian sovereign portal (.gov.in or .nic.in). It is statutory, safe, and backed by government gazette circulars.",
				};
			case "VERIFIED_CSR":
				return {
					title: "Recognized Philanthropic CSR",
					badge: "Verified Entity (" + score + "%)",
					badgeBg: "bg-emerald-950 text-white",
					cardBg: "bg-emerald-50/70 border-emerald-950",
					icon: ShieldCheck,
					summary:
						"This domain belongs to an established Indian corporate CSR or registered philanthropic foundation. No fraudulent patterns detected.",
				};
			case "HIGH_RISK_SUSPICIOUS":
				return {
					title: "High-Risk Fraud / Scam Warning",
					badge: "Critical Alert (" + score + "%)",
					badgeBg: "bg-rose-700 text-white",
					cardBg: "bg-rose-50/90 border-rose-700",
					icon: ShieldAlert,
					summary:
						"Severe red flags detected! Official government and CSR scholarships NEVER charge registration fees, ask for UPI transfers, or promise guaranteed cash without verification.",
				};
			default:
				return {
					title: "Unverified Third-Party Source",
					badge: "Caution (" + score + "%)",
					badgeBg: "bg-yellow-200 text-emerald-950 border border-emerald-950/20",
					cardBg: "bg-yellow-50/80 border-emerald-950/30",
					icon: AlertTriangle,
					summary:
						"This source is not recognized as a direct sovereign portal. It may be an aggregator, blog, or private listing. Verify on official ministry websites before submitting documents.",
				};
		}
	};

	const getRegistryTypeBadge = (type = "") => {
		const normalized = type.toLowerCase();
		if (
			normalized.includes("central") ||
			normalized.includes("sovereign") ||
			normalized.includes("gov")
		) {
			return {
				classes: "bg-emerald-950 text-white border-emerald-950",
				dot: "bg-yellow-200",
			};
		}
		if (
			normalized.includes("csr") ||
			normalized.includes("corp") ||
			normalized.includes("tata")
		) {
			return {
				classes: "bg-yellow-200 text-emerald-950 border-emerald-950/30",
				dot: "bg-emerald-900",
			};
		}
		if (normalized.includes("state")) {
			return {
				classes: "bg-emerald-100 text-emerald-950 border-emerald-950/20",
				dot: "bg-emerald-700",
			};
		}
		return {
			classes: "bg-white text-emerald-950 border-emerald-950/20",
			dot: "bg-emerald-950/40",
		};
	};

	return (
		<div className="ud-root min-h-screen bg-[#E9F0EA] pb-24 font-sans text-emerald-950">
			<PageStyles />

			{/* Hero Section */}
			<section className="mx-auto max-w-7xl px-5 pt-12 pb-10 sm:px-8 md:pt-16">
				<div className="max-w-3xl">
					<div className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-emerald-950/20 bg-white/70 px-3.5 py-1 text-xs font-bold text-emerald-950">
						<ShieldCheck size={14} className="text-emerald-800" />
						<span>Autonomous Fraud Prevention & Verification</span>
					</div>

					<h1 className="font-serif mt-4 text-[2.75rem] font-medium leading-[1.04] tracking-tight sm:text-6xl text-emerald-950">
						Anti-Scam &amp;{" "}
						<span className="ud-display font-extrabold underline decoration-yellow-300 decoration-4 underline-offset-4 text-emerald-950">
							Trust Shield
						</span>
					</h1>

					<p className="mt-4 max-w-[56ch] text-base leading-relaxed text-emerald-950/70 sm:text-lg">
						Verify external scholarship links, WhatsApp forwards, and SMS
						circulars before sharing personal details. Official government
						scholarships are legally 100% free to apply.
					</p>
				</div>
			</section>

			{/* Main Content Area */}
			<div className="mx-auto max-w-7xl px-5 sm:px-8 space-y-8">
				{/* Zero PII Guarantee Banner */}
				<div className="rounded-2xl border-[1.5px] border-emerald-950 bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-emerald-950">
					<div className="flex items-start sm:items-center gap-3.5">
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-emerald-950 bg-emerald-50 text-emerald-800">
							<Lock size={19} />
						</div>
						<div>
							<h3 className="ud-display text-lg font-bold text-emerald-950">
								Zero-Storage Privacy Guarantee
							</h3>
							<p className="mt-0.5 text-sm text-emerald-950/70 leading-relaxed font-medium">
								Udaan never records or stores the URLs, circular texts, or
								queries you submit. All audits are performed ephemerally with
								zero tracking.
							</p>
						</div>
					</div>
					<span className="shrink-0 rounded-full border-[1.5px] border-emerald-950 bg-yellow-200 px-3.5 py-1 text-xs font-bold text-emerald-950 self-start sm:self-center">
						Zero PII Stored
					</span>
				</div>

				{/* Verification Scanner Card */}
				<div className="rounded-2xl border-[1.5px] border-emerald-950 bg-white p-6 sm:p-8 space-y-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-[1.5px] border-dashed border-emerald-950/20 pb-5">
						<div>
							<h2 className="ud-display text-2xl font-bold text-emerald-950">
								Verify a Portal or Circular
							</h2>
							<p className="mt-1 text-sm text-emerald-950/65 font-medium">
								Scan for fee demands, fake guarantees, and unverified domains.
							</p>
						</div>

						{/* Pill Tab Switcher */}
						<div className="flex items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950/20 bg-[#E9F0EA] p-1 self-start sm:self-auto">
							<button
								type="button"
								onClick={() => setActiveTab("url")}
								className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition ${
									activeTab === "url"
										? "border-[1.5px] border-emerald-950 bg-emerald-950 text-white"
										: "text-emerald-950/75 hover:text-emerald-950"
								} ${focusRing}`}
							>
								Website URL
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("text")}
								className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition ${
									activeTab === "text"
										? "border-[1.5px] border-emerald-950 bg-emerald-950 text-white"
										: "text-emerald-950/75 hover:text-emerald-950"
								} ${focusRing}`}
							>
								Message / Text
							</button>
						</div>
					</div>

					{/* Quick Demonstration Presets */}
					<div className="space-y-2">
						<span className="text-xs font-bold text-emerald-950/60 uppercase tracking-wider">
							Quick Demonstration Presets:
						</span>
						<div className="flex flex-wrap gap-2">
							{presets.map((p, idx) => (
								<button
									key={idx}
									type="button"
									onClick={() => applyPreset(p)}
									className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950/20 bg-white px-3.5 py-1 text-xs font-semibold text-emerald-950 transition-colors hover:border-emerald-950 hover:bg-yellow-200/60 ${focusRing}`}
								>
									<Sparkles size={12} className="text-emerald-800" />
									<span>{p.label}</span>
								</button>
							))}
						</div>
					</div>

					{/* Scan Form */}
					<form onSubmit={handleAnalyze} className="space-y-4 pt-1">
						{activeTab === "url" ? (
							<div className="relative">
								<input
									type="text"
									placeholder="Paste scholarship URL (e.g., https://scholarships.gov.in or suspicious link)..."
									value={urlInput}
									onChange={(e) => setUrlInput(e.target.value)}
									className={`w-full rounded-2xl border-[1.5px] border-emerald-950 bg-white py-3.5 pl-4 pr-12 text-sm font-semibold text-emerald-950 placeholder:text-emerald-950/35 transition ${focusRing}`}
								/>
								<Globe
									size={18}
									className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-emerald-950/40"
								/>
							</div>
						) : (
							<div className="relative">
								<textarea
									rows={4}
									placeholder="Paste WhatsApp forward, SMS alert, or scholarship circular text here..."
									value={textInput}
									onChange={(e) => setTextInput(e.target.value)}
									className={`w-full rounded-2xl border-[1.5px] border-emerald-950 bg-white p-4 text-sm font-semibold text-emerald-950 placeholder:text-emerald-950/35 leading-relaxed transition ${focusRing}`}
								/>
							</div>
						)}

						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
							<div className="text-xs font-semibold text-emerald-950/65 flex items-center gap-1.5">
								<Info size={14} className="text-emerald-800 shrink-0" />
								<span>
									Government scholarships never ask for application fees or UPI
									transfers.
								</span>
							</div>

							<button
								type="submit"
								disabled={analyzing}
								className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-800 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 active:translate-y-px disabled:opacity-60 ${focusRing}`}
							>
								{analyzing ? (
									<>
										<RefreshCw size={14} className="animate-spin" />
										<span>Analyzing Security...</span>
									</>
								) : (
									<>
										<Search size={14} />
										<span>Run Trust Audit</span>
									</>
								)}
							</button>
						</div>
					</form>

					{/* Result Details */}
					{result &&
						(() => {
							const details = getVerdictDetails(result.verdict, result.score);
							const Icon = details.icon;
							return (
								<div
									className={`mt-6 rounded-2xl border-[1.5px] p-6 space-y-5 transition-all ${details.cardBg}`}
								>
									<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-[1.5px] border-dashed border-emerald-950/20 pb-4">
										<div className="flex items-center gap-3.5">
											<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-emerald-950 bg-white text-emerald-800">
												<Icon size={22} />
											</div>
											<div>
												<span
													className={`rounded-full px-3 py-0.5 text-xs font-bold ${details.badgeBg}`}
												>
													{details.badge}
												</span>
												<h3 className="ud-display mt-1 text-xl font-extrabold text-emerald-950">
													{details.title}
												</h3>
											</div>
										</div>

										<div className="text-left sm:text-right">
											<div className="text-xs font-semibold text-emerald-950/60">
												Calculated Trust Score
											</div>
											<div className="ud-display text-3xl font-extrabold text-emerald-950">
												{result.score}
												<span className="text-lg font-semibold text-emerald-950/50">
													/100
												</span>
											</div>
										</div>
									</div>

									<p className="text-[15px] leading-relaxed text-emerald-950/80 font-medium">
										{details.summary}
									</p>

									{result.findings && result.findings.length > 0 && (
										<div className="space-y-3 pt-2">
											<h4 className="ud-display text-xs font-bold uppercase tracking-wider text-emerald-950/65">
												Security &amp; Heuristic Findings
											</h4>
											<div className="space-y-2.5">
												{result.findings.map((finding, fIdx) => (
													<div
														key={fIdx}
														className={`flex items-start gap-3 rounded-xl border-[1.5px] bg-white p-4 text-sm ${
															finding.severity === "critical"
																? "border-rose-400 text-rose-950"
																: finding.severity === "positive"
																	? "border-emerald-950/20 text-emerald-950"
																	: "border-yellow-400 text-emerald-950"
														}`}
													>
														{finding.severity === "positive" ? (
															<CheckCircle2
																size={18}
																className="text-emerald-800 shrink-0 mt-0.5"
															/>
														) : finding.severity === "critical" ? (
															<ShieldAlert
																size={18}
																className="text-rose-600 shrink-0 mt-0.5"
															/>
														) : (
															<AlertTriangle
																size={18}
																className="text-yellow-600 shrink-0 mt-0.5"
															/>
														)}
														<div>
															<span className="block text-sm font-bold">
																{finding.title}
															</span>
															<span className="mt-0.5 block text-xs leading-relaxed text-emerald-950/75">
																{finding.description}
															</span>
														</div>
													</div>
												))}
											</div>
										</div>
									)}

									{result.crossReferencedScheme && (
										<div className="rounded-xl border-[1.5px] border-emerald-950 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
											<div>
												<div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
													Official Scheme Match in Udaan
												</div>
												<h4 className="ud-display text-base font-bold text-emerald-950 mt-0.5">
													{result.crossReferencedScheme.title}
												</h4>
												<p className="text-xs font-medium text-emerald-950/60 mt-0.5">
													Issued by: {result.crossReferencedScheme.organization}
												</p>
											</div>
											{result.crossReferencedScheme.officialPortal && (
												<a
													href={result.crossReferencedScheme.officialPortal}
													target="_blank"
													rel="noreferrer"
													className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-emerald-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-900 ${focusRing}`}
												>
													<span>Open Official Portal</span>
													<ExternalLink size={12} />
												</a>
											)}
										</div>
									)}

									{result.verdict === "HIGH_RISK_SUSPICIOUS" && (
										<div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t-[1.5px] border-dashed border-rose-300">
											<span className="text-sm font-bold text-rose-800">
												Never transfer money or send Aadhaar numbers via
												unverified channels.
											</span>
											<a
												href="https://cybercrime.gov.in"
												target="_blank"
												rel="noreferrer"
												className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-rose-700 px-5 py-2 text-xs font-bold text-white transition hover:bg-rose-800 ${focusRing}`}
											>
												<span>Report to Cyber Crime (cybercrime.gov.in)</span>
												<ExternalLink size={12} />
											</a>
										</div>
									)}
								</div>
							);
						})()}
				</div>

				{/* Directory Section */}
				<div className="space-y-5 pt-4">
					<div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b-[1.5px] border-emerald-950/15 pb-4">
						<div>
							<h2 className="ud-display text-2xl font-bold text-emerald-950">
								Verified Sovereign &amp; CSR Directory
							</h2>
							<p className="mt-1 text-sm text-emerald-950/65 font-medium">
								Official portals verified by ministry gazettes and statutory
								guidelines.
							</p>
						</div>
						<Link
							to="/scholarships"
							className={`inline-flex items-center gap-1 text-sm font-bold text-emerald-950 underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950 ${focusRing}`}
						>
							<span>Explore All Schemes</span>
							<ArrowRight size={14} />
						</Link>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
						{registry.map((item, idx) => (
							<div
								key={idx}
								className="rounded-2xl border-[1.5px] border-emerald-950/15 bg-white p-5 flex flex-col justify-between hover:border-emerald-950 transition-colors space-y-4"
							>
								<div>
									<div className="flex items-center justify-between gap-2 mb-2.5">
										{(() => {
											const badge = getRegistryTypeBadge(item.type);
											return (
												<span
													className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.classes}`}
												>
													<span
														className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`}
													/>
													<span className="truncate max-w-[130px]">
														{item.type}
													</span>
												</span>
											);
										})()}
										<span className="text-[11px] text-emerald-950/55 font-bold flex items-center gap-1">
											<Lock size={11} className="text-emerald-800" /> SSL
											Verified
										</span>
									</div>
									<h3 className="ud-display text-base font-bold text-emerald-950 leading-snug">
										{item.name}
									</h3>
									<p className="text-xs sm:text-sm text-emerald-950/65 mt-1 font-medium line-clamp-2">
										{item.description}
									</p>
								</div>

								<div className="pt-3 border-t-[1.5px] border-dashed border-emerald-950/15 flex items-center justify-between">
									<span className="text-xs text-emerald-950/50 font-mono truncate max-w-36 font-semibold">
										{item.domain}
									</span>
									<a
										href={item.url}
										target="_blank"
										rel="noreferrer"
										className={`inline-flex cursor-pointer items-center gap-1 rounded-full border-[1.5px] border-emerald-950/20 bg-white px-3 py-1 text-xs font-bold text-emerald-950 hover:bg-yellow-200 transition ${focusRing}`}
									>
										<span>Visit</span>
										<ExternalLink size={11} />
									</a>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Safety Rules Banner */}
				<div className="border-t-[1.5px] border-dashed border-emerald-950/20 pt-8 space-y-5">
					<h3 className="ud-display text-xl font-bold text-emerald-950 flex items-center gap-2">
						<HelpCircle size={20} className="text-emerald-800" /> Three Golden
						Rules for Scholarship Safety
					</h3>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
						<div className="rounded-2xl border-[1.5px] border-emerald-950/15 bg-white p-6 space-y-2 hover:border-emerald-950 transition-colors">
							<span className="inline-block rounded-full bg-yellow-200 px-2.5 py-0.5 text-xs font-bold text-emerald-950">
								Rule 01
							</span>
							<h4 className="ud-display text-base font-bold text-emerald-950 pt-1">
								100% Free Application
							</h4>
							<p className="text-sm text-emerald-950/70 leading-relaxed font-medium">
								Under Indian law, no government ministry, state department, or
								genuine CSR charges an application or processing fee.
							</p>
						</div>

						<div className="rounded-2xl border-[1.5px] border-emerald-950/15 bg-white p-6 space-y-2 hover:border-emerald-950 transition-colors">
							<span className="inline-block rounded-full bg-yellow-200 px-2.5 py-0.5 text-xs font-bold text-emerald-950">
								Rule 02
							</span>
							<h4 className="ud-display text-base font-bold text-emerald-950 pt-1">
								Verify Domain Extensions
							</h4>
							<p className="text-sm text-emerald-950/70 leading-relaxed font-medium">
								Official government portals always end in{" "}
								<span className="font-mono text-emerald-900 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-950/15">
									.gov.in
								</span>{" "}
								or{" "}
								<span className="font-mono text-emerald-900 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-950/15">
									.nic.in
								</span>
								. Watch out for lookalikes ending in .com or .xyz.
							</p>
						</div>

						<div className="rounded-2xl border-[1.5px] border-emerald-950/15 bg-white p-6 space-y-2 hover:border-emerald-950 transition-colors">
							<span className="inline-block rounded-full bg-yellow-200 px-2.5 py-0.5 text-xs font-bold text-emerald-950">
								Rule 03
							</span>
							<h4 className="ud-display text-base font-bold text-emerald-950 pt-1">
								Direct Benefit Transfer (DBT)
							</h4>
							<p className="text-sm text-emerald-950/70 leading-relaxed font-medium">
								Disbursements are credited directly to your Aadhaar-seeded bank
								account through PFMS. Nobody can disburse legitimate grants via
								cash or UPI.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
