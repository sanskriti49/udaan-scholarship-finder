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
	FileText,
	HelpCircle,
	ArrowRight,
	Sparkles,
	RefreshCw,
	Building2,
	Info,
} from "lucide-react";
import {
	scanLinkOrContent,
	getOfficialRegistry,
} from "../services/verifyService";
import { toast } from "sonner";

export default function TrustShield() {
	const [activeTab, setActiveTab] = useState("url"); 
	const [urlInput, setUrlInput] = useState("");
	const [textInput, setTextInput] = useState("");
	const [analyzing, setAnalyzing] = useState(false);
	const [result, setResult] = useState(null);
	const [registry, setRegistry] = useState([]);
	const [registryLoading, setRegistryLoading] = useState(true);

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
			})
			.finally(() => setRegistryLoading(false));
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
					color: "bg-emerald-800 text-white",
					border: "border-emerald-700",
					cardBg: "bg-emerald-50/70 border-emerald-200",
					icon: ShieldCheck,
					summary:
						"This domain is an official Indian sovereign portal (.gov.in or .nic.in). It is statutory, safe, and backed by government gazette circulars.",
				};
			case "VERIFIED_CSR":
				return {
					title: "Recognized Philanthropic CSR",
					badge: "Verified Entity (" + score + "%)",
					color: "bg-teal-800 text-white",
					border: "border-teal-700",
					cardBg: "bg-teal-50/70 border-teal-200",
					icon: ShieldCheck,
					summary:
						"This domain belongs to an established Indian corporate CSR or registered philanthropic foundation. No fraudulent patterns detected.",
				};
			case "HIGH_RISK_SUSPICIOUS":
				return {
					title: "High-Risk Fraud / Scam Warning",
					badge: "Critical Alert (" + score + "%)",
					color: "bg-rose-700 text-white",
					border: "border-rose-600",
					cardBg: "bg-rose-50/80 border-rose-200",
					icon: ShieldAlert,
					summary:
						"Severe red flags detected! Official government and CSR scholarships NEVER charge registration fees, ask for UPI transfers, or promise guaranteed cash without verification.",
				};
			default:
				return {
					title: "Unverified Third-Party Source",
					badge: "Caution (" + score + "%)",
					color: "bg-amber-700 text-white",
					border: "border-amber-600",
					cardBg: "bg-amber-50/70 border-amber-200",
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
				classes: "bg-slate-900 text-slate-100 border-slate-800 shadow-2xs",
				dot: "bg-emerald-400",
			};
		}
		if (
			normalized.includes("csr") ||
			normalized.includes("corp") ||
			normalized.includes("tata")
		) {
			return {
				classes: "bg-amber-500/10 text-amber-900 border-amber-300/60",
				dot: "bg-amber-600",
			};
		}
		if (normalized.includes("state")) {
			return {
				classes: "bg-indigo-50 text-indigo-900 border-indigo-200",
				dot: "bg-indigo-600",
			};
		}
		return {
			classes: "bg-stone-100 text-stone-700 border-stone-200",
			dot: "bg-stone-400",
		};
	};

	return (
		<div className="min-h-screen bg-[#FAF9F6] text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
			<div className="max-w-5xl mx-auto space-y-10">
				<div className="text-center max-w-3xl mx-auto">
					<div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-850 uppercase mb-3 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full">
						<ShieldCheck size={14} className="text-emerald-700" />
						<span>Autonomous Fraud Prevention & Verification</span>
					</div>
					<h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-900 leading-tight">
						Anti-Scam &{" "}
						<span className="italic text-emerald-800 font-normal">
							Trust Shield
						</span>
					</h1>
					<p className="text-sm sm:text-base text-slate-600 mt-3 font-normal leading-relaxed">
						Verify external scholarship links, WhatsApp forwards, and SMS
						circulars before sharing personal details. Official government
						scholarships are legally 100% free to apply.
					</p>
				</div>

				<div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-start sm:items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center shrink-0 text-emerald-800">
							<Lock size={18} />
						</div>
						<div>
							<h3 className="text-base font-bold text-slate-900">
								Zero-Storage Privacy Guarantee
							</h3>
							<p className="text-sm text-slate-600 leading-relaxed font-normal mt-0.5">
								Udaan never records or stores the URLs, circular texts, or
								queries you submit. All audits are performed ephemerally with
								zero tracking.
							</p>
						</div>
					</div>
					<span className="text-xs font-semibold text-emerald-850 bg-emerald-100/60 border border-emerald-300/60 px-3 py-1 rounded-full whitespace-nowrap self-start sm:self-center">
						Zero PII Stored
					</span>
				</div>

				<div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
					<div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-3">
						<div>
							<h2 className="text-xl font-bold text-slate-900">
								Verify a Portal or Circular
							</h2>
							<p className="text-sm text-emerald-950/80 mt-0.5">
								Scan for fee demands, fake guarantees, and unverified domains.
							</p>
						</div>

						<div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
							<button
								type="button"
								onClick={() => setActiveTab("url")}
								className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
									activeTab === "url"
										? "bg-white text-slate-900 shadow-2xs"
										: "text-slate-600 hover:text-slate-900"
								}`}
							>
								Website URL
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("text")}
								className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
									activeTab === "text"
										? "bg-white text-slate-900 shadow-2xs"
										: "text-slate-600 hover:text-slate-900"
								}`}
							>
								Message / Text
							</button>
						</div>
					</div>

					<div className="space-y-2">
						<span className="text-xs font-bold text-emerald-950/65 uppercase tracking-wider">
							Quick Demonstration Presets:
						</span>
						<div className="flex flex-wrap gap-2">
							{presets.map((p, idx) => (
								<button
									key={idx}
									type="button"
									onClick={() => applyPreset(p)}
									className="cursor-pointer text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 bg-[#FAF9F6] hover:bg-emerald-50/50 hover:border-emerald-300 text-emerald-950 transition flex items-center gap-1.5"
								>
									<Sparkles size={12} className="text-emerald-700" />
									<span>{p.label}</span>
								</button>
							))}
						</div>
					</div>

					<form onSubmit={handleAnalyze} className="space-y-4">
						{activeTab === "url" ? (
							<div className="relative">
								<input
									type="text"
									placeholder="Paste scholarship URL (e.g., https://scholarships.gov.in or suspicious link)..."
									value={urlInput}
									onChange={(e) => setUrlInput(e.target.value)}
									className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl pl-4 pr-12 py-3 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
								/>
								<Globe
									size={18}
									className="absolute right-4 top-3.5 text-slate-400"
								/>
							</div>
						) : (
							<div className="relative">
								<textarea
									rows={4}
									placeholder="Paste WhatsApp forward, SMS alert, or scholarship circular text here..."
									value={textInput}
									onChange={(e) => setTextInput(e.target.value)}
									className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl p-4 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition leading-relaxed"
								/>
							</div>
						)}

						<div className="flex items-center justify-between pt-2">
							<div className="text-xs text-slate-500 flex items-center gap-1.5">
								<Info size={14} className="text-slate-400" />
								<span>
									Government scholarships never ask for application fees or UPI
									transfers.
								</span>
							</div>
							<button
								type="submit"
								disabled={analyzing}
								className="cursor-pointer inline-flex items-center gap-2 bg-slate-900 hover:bg-emerald-900 text-white text-xs font-bold px-6 py-2.5 rounded-full transition shadow-2xs disabled:opacity-60"
							>
								{analyzing ? (
									<>
										<RefreshCw size={13} className="animate-spin" />
										<span>Analyzing Security...</span>
									</>
								) : (
									<>
										<Search size={13} />
										<span>Run Trust Audit</span>
									</>
								)}
							</button>
						</div>
					</form>

					{result &&
						(() => {
							const details = getVerdictDetails(result.verdict, result.score);
							const Icon = details.icon;
							return (
								<div
									className={`mt-6 rounded-2xl border p-5 sm:p-6 space-y-5 transition-all ${details.cardBg}`}
								>
									<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
										<div className="flex items-center gap-3">
											<div
												className={`w-10 h-10 rounded-xl flex items-center justify-center ${details.color}`}
											>
												<Icon size={20} />
											</div>
											<div>
												<span
													className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${details.color}`}
												>
													{details.badge}
												</span>
												<h3 className="text-lg font-bold text-slate-900 mt-1">
													{details.title}
												</h3>
											</div>
										</div>

										<div className="text-right sm:text-right">
											<div className="text-xs text-slate-500 font-medium">
												Calculated Trust Score
											</div>
											<div className="text-2xl font-serif font-bold text-slate-900">
												{result.score}/100
											</div>
										</div>
									</div>

									<p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
										{details.summary}
									</p>

									{result.findings && result.findings.length > 0 && (
										<div className="space-y-2.5 pt-2">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
												Security & Heuristic Findings
											</h4>
											<div className="space-y-2.5">
												{result.findings.map((finding, fIdx) => (
													<div
														key={fIdx}
														className={`p-3.5 rounded-xl border text-sm flex items-start gap-3 bg-white ${
															finding.severity === "critical"
																? "border-rose-300 text-rose-950"
																: finding.severity === "positive"
																	? "border-emerald-300 text-emerald-950"
																	: "border-amber-300 text-amber-950"
														}`}
													>
														{finding.severity === "positive" ? (
															<CheckCircle2
																size={18}
																className="text-emerald-700 shrink-0 mt-0.5"
															/>
														) : finding.severity === "critical" ? (
															<ShieldAlert
																size={18}
																className="text-rose-600 shrink-0 mt-0.5"
															/>
														) : (
															<AlertTriangle
																size={18}
																className="text-amber-600 shrink-0 mt-0.5"
															/>
														)}
														<div>
															<span className="font-bold block text-sm">
																{finding.title}
															</span>
															<span className="text-slate-600 mt-0.5 block font-normal text-sm leading-relaxed">
																{finding.description}
															</span>
														</div>
													</div>
												))}
											</div>
										</div>
									)}

									{result.crossReferencedScheme && (
										<div className="bg-white border border-emerald-300/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
											<div>
												<div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
													Official Scheme Match in Udaan
												</div>
												<h4 className="text-sm font-bold text-slate-900 mt-0.5">
													{result.crossReferencedScheme.title}
												</h4>
												<p className="text-xs text-slate-500 mt-0.5">
													Issued by: {result.crossReferencedScheme.organization}
												</p>
											</div>
											{result.crossReferencedScheme.officialPortal && (
												<a
													href={result.crossReferencedScheme.officialPortal}
													target="_blank"
													rel="noreferrer"
													className="cursor-pointer inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-1.5 rounded-xl transition shrink-0"
												>
													<span>Open Official Portal</span>
													<ExternalLink size={13} />
												</a>
											)}
										</div>
									)}

									{result.verdict === "HIGH_RISK_SUSPICIOUS" && (
										<div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-rose-200/80">
											<span className="text-sm text-rose-800 font-semibold">
												Never transfer money or send Aadhaar numbers via
												unverified channels.
											</span>
											<a
												href="https://cybercrime.gov.in"
												target="_blank"
												rel="noreferrer"
												className="cursor-pointer inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl transition shadow-2xs shrink-0"
											>
												<span>Report to Cyber Crime (cybercrime.gov.in)</span>
												<ExternalLink size={13} />
											</a>
										</div>
									)}
								</div>
							);
						})()}
				</div>

				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-bold text-slate-900">
								Verified Sovereign & CSR Directory
							</h2>
							<p className="text-sm text-slate-500 mt-0.5">
								Official portals verified by ministry gazettes and statutory
								guidelines.
							</p>
						</div>
						<Link
							to="/scholarships"
							className="text-sm font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
						>
							<span>Explore All Schemes</span>
							<ArrowRight size={14} />
						</Link>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{registry.map((item, idx) => (
							<div
								key={idx}
								className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-300 transition shadow-2xs space-y-3"
							>
								<div>
									<div className="flex items-center justify-between gap-2 mb-2">
										{(() => {
											const badge = getRegistryTypeBadge(item.type);
											return (
												<span
													className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight border ${badge.classes}`}
												>
													<span
														className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`}
													/>
													<span className="font-heading truncate max-w-[130px]">
														{item.type}
													</span>
												</span>
											);
										})()}
										<span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
											<Lock size={11} className="text-emerald-700" /> SSL
											Verified
										</span>
									</div>
									<h3 className="text-sm font-bold text-slate-900 leading-snug">
										{item.name}
									</h3>
									<p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal line-clamp-2">
										{item.description}
									</p>
								</div>

								<div className="pt-2 border-t border-slate-100 flex items-center justify-between">
									<span className="text-xs text-slate-400 font-mono truncate max-w-36">
										{item.domain}
									</span>
									<a
										href={item.url}
										target="_blank"
										rel="noreferrer"
										className="text-xs sm:text-sm font-bold text-slate-800 hover:text-emerald-800 flex items-center gap-1 transition"
									>
										<span>Visit</span>
										<ExternalLink size={12} />
									</a>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="bg-[#FAF9F6] border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
					<h3 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
						<HelpCircle size={18} className="text-emerald-800" /> Three Golden
						Rules for Scholarship Safety
					</h3>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
						<div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-2">
							<span className="font-bold text-slate-900 block text-base">
								1. 100% Free Application
							</span>
							<p className="text-slate-600 leading-relaxed font-normal text-sm">
								Under Indian law, no government ministry, state department, or
								genuine CSR charges an application or processing fee.
							</p>
						</div>
						<div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-2">
							<span className="font-bold text-slate-900 block text-base">
								2. Verify Domain Extensions
							</span>
							<p className="text-slate-600 leading-relaxed font-normal text-sm">
								Official government portals always end in{" "}
								<span className="font-mono text-emerald-800 font-semibold">
									.gov.in
								</span>{" "}
								or{" "}
								<span className="font-mono text-emerald-800 font-semibold">
									.nic.in
								</span>
								. Watch out for lookalikes ending in .com or .xyz.
							</p>
						</div>
						<div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-2">
							<span className="font-bold text-slate-900 block text-base">
								3. Direct Benefit Transfer (DBT)
							</span>
							<p className="text-slate-600 leading-relaxed font-normal text-sm">
								Disbursements are credited directly to your Aadhaar-seeded bank
								account through PFMS. Nobody can disburse grants via cash or
								UPI.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
