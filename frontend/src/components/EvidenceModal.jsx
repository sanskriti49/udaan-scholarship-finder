import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
	X,
	FileText,
	Clock,
	ArrowUpRight,
	ShieldCheck,
	CheckCircle2,
	Files,
	ExternalLink,
	Sparkles,
	BookOpen,
	ListChecks,
	FolderCheck,
	History as HistoryIcon,
	Building2,
	AlertCircle,
	FileSearch,
	Link2Off,
} from "lucide-react";
import {
	sanitizeUrl,
	isDeepLink,
	buildDeepAnchorUrl,
	evaluateCitationStatus,
} from "../utils/provenanceUtils";

export default function EvidenceModal({ isOpen, onClose, scholarship }) {
	const [activeSection, setActiveSection] = useState("gazette");

	useEffect(() => {
		if (!isOpen) return;
		setActiveSection("gazette");

		// Lock body scroll when modal is open
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const handleKeyDown = (e) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			document.body.style.overflow = originalOverflow;
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onClose]);

	if (!isOpen || !scholarship) return null;

	// Use genuine provenance quotes without fabricating synthetic ones
	const quotes = Array.isArray(scholarship.provenanceQuotes)
		? scholarship.provenanceQuotes
		: [];
	const rules = scholarship.rules || [];
	const docs = scholarship.requiredDocuments || [];
	const history = scholarship.history || [];

	// Determine specific scheme circular URL without falling back to generic portals
	const rawDirectDocUrl =
		scholarship.sourceUrl ||
		quotes.find((q) => isDeepLink(q.sourceUrl))?.sourceUrl ||
		null;
	const safeDirectDocUrl = sanitizeUrl(rawDirectDocUrl);
	const hasDeepDocLink = safeDirectDocUrl ? isDeepLink(safeDirectDocUrl) : false;

	const navSections = [
		{
			id: "gazette",
			label: "Gazette & Citations",
			count: quotes.length,
			icon: BookOpen,
		},
		{
			id: "rules",
			label: "Eligibility Rules",
			count: rules.length,
			icon: ListChecks,
		},
		{
			id: "documents",
			label: "Required Docs",
			count: docs.length,
			icon: FolderCheck,
		},
		{
			id: "authority",
			label: "Issuing Authority",
			count: null,
			icon: Building2,
		},
	];

	if (history.length > 0) {
		navSections.push({
			id: "history",
			label: "Audit Trail",
			count: history.length,
			icon: HistoryIcon,
		});
	}

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
				onClick={onClose}
			/>

			{/* Creative Interactive Popup Modal */}
			<div className="relative bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 z-10">
				{/* Top Header */}
				<div className="bg-[#FAF9F6] border-b border-slate-200 px-6 py-5 flex items-start justify-between gap-4">
					<div className="space-y-1.5 min-w-0 flex-1">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
								{scholarship.category || "Scholarship Scheme"}
							</span>
							<span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
								<ShieldCheck size={13} className="text-emerald-700" />
								<span>Official Gazette Details</span>
							</span>
						</div>

						<h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 leading-snug truncate">
							{scholarship.title}
						</h3>

						<p className="text-xs sm:text-sm text-slate-600 font-medium truncate">
							Authority:{" "}
							<span className="font-semibold text-slate-900">
								{scholarship.organization}
							</span>
						</p>
					</div>

					<button
						onClick={onClose}
						className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
						aria-label="Close dialog"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Creative Segmented Tab Menu */}
				<div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center gap-1.5 overflow-x-auto">
					{navSections.map((sec) => {
						const Icon = sec.icon;
						const isActive = activeSection === sec.id;
						return (
							<button
								key={sec.id}
								type="button"
								onClick={() => setActiveSection(sec.id)}
								className={`cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
									isActive
										? "bg-slate-900 text-white shadow-xs"
										: "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
								}`}
							>
								<Icon size={15} className={isActive ? "text-emerald-400" : "text-slate-400"} />
								<span>{sec.label}</span>
								{sec.count !== null && (
									<span
										className={`text-[11px] font-mono px-1.5 py-0.2 rounded-md ${
											isActive
												? "bg-slate-800 text-emerald-300"
												: "bg-slate-200 text-slate-600"
										}`}
									>
										{sec.count}
									</span>
								)}
							</button>
						);
					})}
				</div>

				{/* Interactive Body Content */}
				<div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-700 flex-1 bg-white">
					{/* SECTION 1: GAZETTE & REGULATORY CITATIONS */}
					{activeSection === "gazette" && (
						<div className="space-y-6">
							{/* Official Gazette Source Banner */}
							<div className="p-5 rounded-2xl bg-[#FAF9F6] border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
								<div className="space-y-1">
									<h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
										<FileText size={18} className="text-emerald-700" />
										Official Gazette & Guidelines
									</h4>
									<p className="text-sm text-slate-600 leading-relaxed">
										{hasDeepDocLink ? (
											<>
												Access the official statutory circular issued by{" "}
												<span className="font-semibold text-slate-800">
													{scholarship.organization}
												</span>
												.
											</>
										) : safeDirectDocUrl ? (
											<>
												Domain authority:{" "}
												<code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
													{new URL(safeDirectDocUrl).hostname}
												</code>
												. Exact statutory document circular link is pending audit.
											</>
										) : (
											<>
												Issuing authority:{" "}
												<span className="font-semibold text-slate-800">
													{scholarship.organization}
												</span>
												. Statutory circular document is undergoing verification.
											</>
										)}
									</p>
								</div>

								{hasDeepDocLink ? (
									<a
										href={safeDirectDocUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-2xs shrink-0 cursor-pointer"
										title="Open official statutory circular document"
										aria-label="Open official source circular"
									>
										<span>Open Source Circular</span>
										<ArrowUpRight className="w-3.5 h-3.5" />
									</a>
								) : safeDirectDocUrl ? (
									<span
										className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold shrink-0"
										title="Root domain only. Deep document link has not been ingested yet."
									>
										<Link2Off size={13} className="text-amber-700" />
										<span>Deep Link Pending Audit</span>
									</span>
								) : (
									<span
										className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold shrink-0"
										title="Circular document pending statutory verification"
									>
										<AlertCircle size={13} className="text-slate-400" />
										<span>Unlinked Circular</span>
									</span>
								)}
							</div>

							<div>
								<div className="flex items-center justify-between mb-3">
									<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
										<Sparkles className="w-4 h-4 text-emerald-700" />
										Audited Regulatory Quotes ({quotes.length})
									</h4>
									<span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
										{quotes.length > 0 ? "Verifiable Provenance" : "Audit Pending"}
									</span>
								</div>

								{quotes.length === 0 ? (
									<div className="p-8 text-center bg-[#FAF9F6] rounded-2xl border border-slate-200 text-slate-600 space-y-3">
										<div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-800 shadow-2xs">
											<FileSearch size={22} />
										</div>
										<h4 className="font-bold text-slate-900 text-base">
											No Statutory Quotes Ingested Yet
										</h4>
										<p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
											This scheme is actively being audited by the Udaan scraper pipeline. Exact regulatory clauses and PDF page anchors will appear here once statutory verification is complete.
										</p>
										{rules.length > 0 && (
											<button
												type="button"
												onClick={() => setActiveSection("rules")}
												className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
											>
												<ListChecks size={14} />
												<span>Inspect {rules.length} Evaluated Rules</span>
											</button>
										)}
									</div>
								) : (
									<div className="space-y-3.5">
										{quotes.map((q, idx) => {
											const citationStatus = evaluateCitationStatus(q);
											const confidencePercent =
												typeof q.confidenceScore === "number"
													? Math.round(q.confidenceScore * 100)
													: null;

											return (
												<div
													key={idx}
													className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-[#FAF9F6] space-y-3 shadow-2xs"
												>
													<div className="flex items-center justify-between gap-2 flex-wrap text-xs">
														<span className="font-bold text-slate-900 flex items-center gap-1.5">
															<span className="w-2 h-2 rounded-full bg-emerald-600" />
															{q.clause || `Clause Section ${idx + 1}`}
														</span>

														<div className="flex items-center gap-1.5 flex-wrap">
															{q.page && (
																<span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-700 shadow-2xs">
																	Page {q.page}
																</span>
															)}
															{q.textFragment && (
																<span
																	className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-semibold text-emerald-800 shadow-2xs"
																	title={`Text Fragment: ${q.textFragment}`}
																>
																	Text Anchor
																</span>
															)}
															{confidencePercent !== null && (
																<span
																	className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border shadow-2xs ${
																		confidencePercent >= 80
																			? "bg-emerald-50 text-emerald-800 border-emerald-200"
																			: "bg-amber-50 text-amber-800 border-amber-200"
																	}`}
																	title="Automated provenance extraction confidence"
																>
																	{confidencePercent}% match
																</span>
															)}
														</div>
													</div>

													<blockquote className="border-l-3 border-emerald-700 pl-3.5 italic text-slate-800 text-sm leading-relaxed bg-emerald-50/30 py-2 rounded-r-lg">
														&ldquo;{q.quote}&rdquo;
													</blockquote>

													{/* Citation Deep Link Actions & Indicators */}
													<div className="pt-1 flex items-center justify-between gap-3 border-t border-slate-200/60 flex-wrap text-xs">
														{citationStatus.badgeType === "deep_pdf" && citationStatus.anchorUrl && (
															<>
																<span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
																	<FileText size={13} className="text-emerald-700" />
																	<span>{citationStatus.badgeLabel}</span>
																</span>
																<a
																	href={citationStatus.anchorUrl}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
																	aria-label={`Open verified PDF citation for ${q.clause}`}
																>
																	<span>Inspect PDF Citation</span>
																	<ExternalLink size={12} />
																</a>
															</>
														)}

														{citationStatus.badgeType === "deep_html" && citationStatus.anchorUrl && (
															<>
																<span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
																	<Sparkles size={13} className="text-emerald-700" />
																	<span>Verified Web Citation</span>
																</span>
																<a
																	href={citationStatus.anchorUrl}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
																	aria-label={`Inspect source circular text anchor for ${q.clause}`}
																>
																	<span>Inspect Source Citation</span>
																	<ExternalLink size={12} />
																</a>
															</>
														)}

														{citationStatus.badgeType === "root_only" && (
															<div className="w-full flex items-center justify-between text-slate-500">
																<span className="inline-flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
																	<AlertCircle size={12} className="text-amber-600" />
																	<span>Root domain only &mdash; deep link disabled</span>
																</span>
																<span className="text-[11px] text-slate-400">
																	Deep link pending audit
																</span>
															</div>
														)}

														{citationStatus.badgeType === "unlinked" && (
															<div className="w-full flex items-center justify-between text-slate-500">
																<span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
																	<Link2Off size={12} className="text-slate-400" />
																	<span>Direct Deep Link Unavailable</span>
																</span>
																<span className="text-[11px] text-slate-400">
																	Statutory audit pending
																</span>
															</div>
														)}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</div>
					)}

					{/* SECTION 2: MANDATORY ELIGIBILITY RULES */}
					{activeSection === "rules" && (
						<div className="space-y-4">
							<div>
								<h4 className="text-base font-bold text-slate-900 mb-1">
									Eligibility Thresholds & Rule Engine Logic
								</h4>
								<p className="text-sm text-slate-600">
									These programmatic conditions are evaluated against student profiles to determine qualification.
								</p>
							</div>

							{rules.length > 0 ? (
								<div className="grid grid-cols-1 gap-3">
									{rules.map((rule, idx) => (
										<div
											key={idx}
											className="p-4 rounded-2xl bg-[#FAF9F6] border border-slate-200 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
										>
											<div className="space-y-1">
												<p className="font-bold text-slate-900 text-base">
													{rule.description || rule.field}
												</p>
												<div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
													<span>
														Field: <code className="font-mono text-slate-700 bg-white border border-slate-200 px-1 py-0.5 rounded">{rule.field}</code>
													</span>
													<span>&bull;</span>
													<span>
														Operator: <strong className="font-mono text-emerald-800">{rule.operator}</strong>
													</span>
													<span>&bull;</span>
													<span>
														Target: <code className="font-mono text-slate-800 bg-white border border-slate-200 px-1 py-0.5 rounded">{Array.isArray(rule.targetValue) ? rule.targetValue.join(", ") : String(rule.targetValue)}</code>
													</span>
												</div>
											</div>
											<span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-850 border border-emerald-200 shrink-0 self-start sm:self-center">
												Mandatory
											</span>
										</div>
									))}
								</div>
							) : (
								<div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
									<p className="text-sm">No fine-grained parameter constraints specified. Standard ministry rules apply.</p>
								</div>
							)}
						</div>
					)}

					{/* SECTION 3: REQUIRED DOCUMENTS */}
					{activeSection === "documents" && (
						<div className="space-y-4">
							<div>
								<h4 className="text-base font-bold text-slate-900 mb-1">
									Required Verification Certificates
								</h4>
								<p className="text-sm text-slate-600">
									Certificates and documentation required by the competent verification authority.
								</p>
							</div>

							{docs.length > 0 ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{docs.map((doc, idx) => (
										<div
											key={idx}
											className="p-4 rounded-2xl bg-[#FAF9F6] border border-slate-200 text-sm text-slate-800 flex items-center gap-3"
										>
											<div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs">
												<Files size={16} />
											</div>
											<span className="font-semibold">{doc.name}</span>
										</div>
									))}
								</div>
							) : (
								<div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
									<p className="text-sm">Standard identity and academic enrolment documentation required at time of application.</p>
								</div>
							)}
						</div>
					)}

					{/* SECTION 4: ISSUING AUTHORITY */}
					{activeSection === "authority" && (
						<div className="space-y-5">
							<div className="p-5 rounded-2xl bg-[#FAF9F6] border border-slate-200 space-y-3">
								<span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
									Official Administrative Authority
								</span>
								<h3 className="text-xl font-bold text-slate-900 font-serif">
									{scholarship.organization}
								</h3>
								<p className="text-sm text-slate-600 leading-relaxed">
									{scholarship.description || "Official government scholarship administrator authorized under statutory circulars."}
								</p>

								{sanitizeUrl(scholarship.officialPortal) && (
									<div className="pt-2">
										<a
											href={sanitizeUrl(scholarship.officialPortal)}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-1.5 rounded-xl transition"
										>
											<span>Visit Administrative Portal</span>
											<ExternalLink size={12} />
										</a>
									</div>
								)}
							</div>
						</div>
					)}

					{/* SECTION 5: AUDIT TRAIL */}
					{activeSection === "history" && history.length > 0 && (
						<div className="space-y-4">
							<div>
								<h4 className="text-base font-bold text-slate-900 mb-1">
									Policy Change Log & Revisions
								</h4>
								<p className="text-sm text-slate-600">
									Observed policy updates captured by Udaan crawlers and official circular gazettes.
								</p>
							</div>

							<div className="space-y-3">
								{history.map((ver, idx) => (
									<div
										key={idx}
										className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 text-sm space-y-1.5"
									>
										<div className="flex items-center justify-between text-slate-600">
											<span className="font-bold text-amber-950 capitalize">
												{ver.changeType?.replace(/_/g, " ").toLowerCase()}
											</span>
											<span className="text-xs text-slate-500 font-mono">
												{new Date(ver.observedAt).toLocaleDateString("en-IN", {
													day: "numeric",
													month: "short",
													year: "numeric",
												})}
											</span>
										</div>
										<p className="text-slate-800 leading-relaxed">
											{ver.summary}
										</p>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer Strip */}
				<div className="p-5 sm:p-6 border-t border-slate-200 bg-[#FAF9F6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
					<span className="text-xs text-slate-500 hidden sm:inline-block">
						Press <kbd className="px-2 py-0.5 text-xs bg-white border border-slate-300 rounded font-mono">Esc</kbd> to exit
					</span>

					<div className="flex items-center gap-2">
						{sanitizeUrl(scholarship.applicationLink) && (
							<a
								href={sanitizeUrl(scholarship.applicationLink)}
								target="_blank"
								rel="noopener noreferrer"
								className="flex-1 sm:flex-none px-4 py-2.5 rounded-full text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
							>
								<span>Official Portal</span>
								<ArrowUpRight size={13} />
							</a>
						)}
						<button
							onClick={onClose}
							className="flex-1 sm:flex-none px-5 py-2.5 rounded-full text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
						>
							Done
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body
	);
}

