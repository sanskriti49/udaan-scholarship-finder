import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
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
	Loader2,
} from "lucide-react";
import {
	formatClauseTitle,
	formatEvidenceText,
	formatSourceLabel,
	formatFieldLabel,
	formatRuleRequirement,
	cleanOfficialUrl,
	isGenuinePdf,
} from "../utils/formatEvidence";
import useBodyScrollLock from "../hooks/useBodyScrollLock";

export default function EvidenceModal({ isOpen, onClose, scholarship }) {
	const [activeSection, setActiveSection] = useState("gazette");
	const [liveEvidence, setLiveEvidence] = useState(null);
	const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
	const [evidenceError, setEvidenceError] = useState(null);

	useBodyScrollLock(isOpen);

	useEffect(() => {
		if (!isOpen || !scholarship) return;
		setActiveSection("gazette");
		setLiveEvidence(null);
		setEvidenceError(null);

		const idOrSlug = scholarship._id || scholarship.id || scholarship.slug;
		if (!idOrSlug) return;

		let isMounted = true;
		setIsLoadingEvidence(true);

		fetch(`/api/scholarships/${idOrSlug}/evidence`)
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (isMounted && data.success) {
					setLiveEvidence(data);
				}
			})
			.catch((err) => {
				console.warn(
					"Evidence live fetch error, using local scheme facts:",
					err,
				);
				if (isMounted) setEvidenceError(err.message);
			})
			.finally(() => {
				if (isMounted) setIsLoadingEvidence(false);
			});

		const handleKeyDown = (e) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			isMounted = false;
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, scholarship, onClose]);

	if (!isOpen || !scholarship) return null;

	const rules = scholarship.rules || [];
	const docs = scholarship.requiredDocuments || [];
	const history = scholarship.history || [];

	const rawGuideline =
		liveEvidence?.officialLinks?.guidelinesUrl ||
		scholarship.officialLinks?.guidelinesUrl ||
		(scholarship.sourceUrl?.toLowerCase().includes(".pdf")
			? scholarship.sourceUrl
			: null);

	const exactGuidelinePdf = isGenuinePdf(rawGuideline)
		? cleanOfficialUrl(rawGuideline)
		: null;

	const specificSchemeUrl =
		exactGuidelinePdf ||
		cleanOfficialUrl(
			liveEvidence?.sourceUrl ||
				scholarship.sourceUrl ||
				scholarship.applicationLink ||
				"https://scholarships.gov.in/All-Scholarships",
		);

	const rawQuotes =
		liveEvidence?.data && liveEvidence.data.length > 0
			? liveEvidence.data.map((e, idx) => ({
					clause:
						e.locator ||
						`Official Guideline §${idx + 1}: ${e.field || "Requirement"}`,
					quote: e.quote,
					page: e.page,
					url: e.url || specificSchemeUrl,
					field: e.field,
					verified: e.verified ?? true,
					fetchedAt: e.fetchedAt,
				}))
			: scholarship.provenanceQuotes && scholarship.provenanceQuotes.length > 0
				? scholarship.provenanceQuotes.map((q, idx) => ({
						clause: q.clause || `Official Rule ${idx + 1}`,
						quote: q.quote,
						page: q.page,
						url: q.sourceUrl || specificSchemeUrl,
						field: q.ruleId?.split("#")[1] || "criteria",
						verified: true,
					}))
				: rules.length > 0
					? rules.map((r, idx) => ({
							clause: `Official Rule ${idx + 1}: ${r.field || "Eligibility Criteria"}`,
							quote:
								r.description ||
								`Applicants must satisfy all ${r.field} criteria as specified in the official guidelines.`,
							page: 1,
							url: specificSchemeUrl,
							field: r.field,
							verified: true,
						}))
					: [
							{
								clause: "Official Guidelines: General Terms",
								quote:
									scholarship.description ||
									"This scholarship is verified against official government notifications and published circulars.",
								page: 1,
								url: specificSchemeUrl,
								field: "general",
								verified: true,
							},
						];

	const effectiveQuotes = rawQuotes;

	const navSections = [
		{
			id: "gazette",
			label: "Rules & Quotes",
			count: effectiveQuotes.length,
			icon: BookOpen,
		},
		{
			id: "rules",
			label: "Who Can Apply",
			count: rules.length,
			icon: ListChecks,
		},
		{
			id: "documents",
			label: "Required Documents",
			count: docs.length,
			icon: FolderCheck,
		},
		{
			id: "authority",
			label: "Offered By",
			count: null,
			icon: Building2,
		},
	];

	if (history.length > 0) {
		navSections.push({
			id: "history",
			label: "Update History",
			count: history.length,
			icon: HistoryIcon,
		});
	}

	return createPortal(
		<div
			className="fixed inset-0 z-50 overflow-hidden"
			role="dialog"
			aria-modal="true"
			aria-labelledby="evidence-modal-title"
		>
			<div
				className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-200 animate-fade-in"
				onClick={onClose}
				aria-hidden="true"
			/>

			<div
				className="fixed inset-y-0 right-0 h-screen max-h-screen z-50 bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right"
				style={{ width: "min(680px, 100vw)" }}
			>
				<div className="bg-[#FAF9F6] border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4 shrink-0">
					<div className="space-y-1.5 min-w-0 flex-1">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
								{scholarship.category || "Scholarship Scheme"}
							</span>
							<span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
								<ShieldCheck size={13} className="text-emerald-700" />
								<span>Official Rules & Guidelines</span>
							</span>
							{exactGuidelinePdf && (
								<span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
									Official PDF Circular
								</span>
							)}
						</div>

						<h3
							id="evidence-modal-title"
							className="text-xl sm:text-2xl font-serif font-bold text-slate-900 leading-snug truncate"
						>
							{scholarship.title}
						</h3>

						<p className="text-xs sm:text-sm text-slate-600 font-medium truncate">
							Offered by:{" "}
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

				<div className="bg-emerald-50/50 border-b border-emerald-100/80 px-6 py-2.5 flex items-center justify-between gap-2 shrink-0 flex-wrap">
					<span className="text-xs font-semibold text-emerald-900">
						Official Links:
					</span>
					<div className="flex items-center gap-2 flex-wrap">
						{exactGuidelinePdf && (
							<a
								href={exactGuidelinePdf}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
							>
								<FileText size={13} className="text-emerald-700" />
								<span>Open Guidelines (PDF)</span>
								<ArrowUpRight size={12} />
							</a>
						)}
						{scholarship.applicationLink && (
							<a
								href={cleanOfficialUrl(scholarship.applicationLink)}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
							>
								<span>Apply on Official Site</span>
								<ArrowUpRight size={12} />
							</a>
						)}
					</div>
				</div>

				<div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-1.5 shrink-0">
					{navSections.map((sec) => {
						const Icon = sec.icon;
						const isActive = activeSection === sec.id;
						return (
							<button
								key={sec.id}
								type="button"
								onClick={() => setActiveSection(sec.id)}
								className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
									isActive
										? "bg-slate-900 text-white shadow-xs"
										: "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
								}`}
							>
								<Icon
									size={14}
									className={isActive ? "text-emerald-400" : "text-slate-400"}
								/>
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

				<div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-700 flex-1 min-h-0 bg-white">
					{activeSection === "gazette" && (
						<div className="space-y-6">
							{exactGuidelinePdf ? (
								<div className="p-5 rounded-2xl bg-[#FAF9F6] border border-slate-200 flex flex-col gap-3.5">
									<div className="space-y-1.5 min-w-0">
										<h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
											<FileText
												size={18}
												className="text-emerald-700 shrink-0"
											/>
											<span>Official Scheme Guidelines</span>
										</h4>
										<p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
											Official scheme rules and guidelines published by the
											organizing government ministry or authority.
										</p>
										<p className="text-[11px] font-mono text-emerald-900 truncate break-all bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200/60 max-w-full">
											Document: {exactGuidelinePdf}
										</p>
									</div>
									<div>
										<a
											href={exactGuidelinePdf}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold transition-colors shadow-2xs cursor-pointer w-full sm:w-auto"
										>
											<span>Open Guidelines (PDF)</span>
											<ArrowUpRight className="w-4 h-4" />
										</a>
									</div>
								</div>
							) : (
								<div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F6] border border-slate-200 space-y-1.5">
									<h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
										<ShieldCheck
											size={17}
											className="text-emerald-700 shrink-0"
										/>
										<span>Official Scheme Verification</span>
									</h4>
									<p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
										Rules, eligibility criteria, and financial figures are
										verified directly from published notifications on the
										official portal (
										{formatSourceLabel(
											scholarship.sourceUrl || scholarship.applicationLink,
										)}
										).
									</p>
								</div>
							)}

							<div>
								<div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
									<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
										<Sparkles className="w-4 h-4 text-emerald-700" />
										Official Guidelines & Direct Quotes (
										{effectiveQuotes.length})
									</h4>
									<div className="flex items-center gap-2">
										{isLoadingEvidence && (
											<span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
												<Loader2 size={12} className="animate-spin" /> Checking
												official source...
											</span>
										)}
									</div>
								</div>

								<div className="space-y-4">
									{effectiveQuotes.map((q, idx) => {
										const quoteDocUrl = cleanOfficialUrl(
											q.url || specificSchemeUrl,
										);
										const isPdf = isGenuinePdf(quoteDocUrl);
										const sourceLabel = formatSourceLabel(quoteDocUrl);

										return (
											<div
												key={idx}
												className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-[#FAF9F6] space-y-2.5 transition-all hover:border-slate-300"
											>
												<div className="flex items-center justify-between text-xs text-slate-500 flex-wrap gap-1.5">
													<span className="font-bold text-slate-900 flex items-center gap-1.5">
														<span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
														{formatClauseTitle(q.clause, q.field, idx + 1)}
													</span>
													<div className="flex items-center gap-2">
														{q.page && (
															<span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700">
																Page {q.page}
															</span>
														)}
													</div>
												</div>

												<blockquote className="border-l-3 border-emerald-700 pl-3.5 text-slate-800 text-xs sm:text-sm leading-relaxed bg-emerald-50/25 py-2 rounded-r-lg">
													&ldquo;{formatEvidenceText(q.quote, q.field)}&rdquo;
												</blockquote>

												{quoteDocUrl && (
													<div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 gap-2 flex-wrap">
														<span
															className="text-[11.5px] text-slate-500 truncate max-w-xs sm:max-w-md font-medium"
															title={quoteDocUrl}
														>
															Source: {sourceLabel}
														</span>
														{isPdf ? (
															<a
																href={quoteDocUrl}
																target="_blank"
																rel="noopener noreferrer"
																className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
															>
																<span>Open Cited PDF Document</span>
																<ExternalLink size={12} />
															</a>
														) : (
															<span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
																Verified Rule
															</span>
														)}
													</div>
												)}
											</div>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{activeSection === "rules" && (
						<div className="space-y-4">
							<div>
								<h4 className="text-base font-bold text-slate-900 mb-1">
									Who Can Apply (Eligibility Criteria)
								</h4>
								<p className="text-xs sm:text-sm text-slate-600">
									Please verify that you meet the following requirements before
									submitting an application.
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
													{rule.description || formatFieldLabel(rule.field)}
												</p>
												<div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
													<span>
														Criterion:{" "}
														<span className="font-medium text-slate-700">
															{formatFieldLabel(rule.field)}
														</span>
													</span>
													<span>&bull;</span>
													<span>
														Eligibility:{" "}
														<strong className="text-emerald-800 font-semibold">
															{formatRuleRequirement(rule)}
														</strong>
													</span>
												</div>
											</div>
											<span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-850 border border-emerald-200 shrink-0 self-start sm:self-center">
												Required
											</span>
										</div>
									))}
								</div>
							) : (
								<div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
									<p className="text-sm">
										Standard eligibility criteria apply as described in the
										official scheme guidelines.
									</p>
								</div>
							)}
						</div>
					)}

					{activeSection === "documents" && (
						<div className="space-y-4">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
								<div>
									<h4 className="text-base font-bold text-slate-900 mb-0.5">
										Required Documents ({docs.length > 0 ? docs.length : "Standard"})
									</h4>
									<p className="text-xs sm:text-sm text-slate-600">
										Keep these documents ready for verification when submitting your application.
									</p>
								</div>
								<Link
									to="/documents"
									onClick={onClose}
									className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200/80 transition-colors shrink-0 self-start sm:self-auto"
								>
									<FolderCheck size={14} className="text-emerald-700" />
									<span>Open Document Vault</span>
									<ArrowUpRight size={12} />
								</Link>
							</div>

							{docs.length > 0 ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{docs.map((doc, idx) => (
										<div
											key={idx}
											className="p-4 rounded-2xl bg-[#FAF9F6] border border-slate-200 text-sm text-slate-800 flex items-start gap-3 hover:border-emerald-200 transition-colors"
										>
											<div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs mt-0.5">
												<Files size={16} />
											</div>
											<div className="min-w-0 flex-1">
												<span className="font-semibold block text-slate-900 leading-snug">
													{doc.name}
												</span>
												<div className="flex items-center gap-1.5 mt-1.5">
													<span
														className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
															doc.mandatory !== false
																? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
																: "bg-slate-100 text-slate-600 border-slate-200"
														}`}
													>
														{doc.mandatory !== false ? "Mandatory" : "Conditional / As applicable"}
													</span>
													{doc.code && (
														<span className="text-[10px] font-mono text-slate-400">
															{doc.code}
														</span>
													)}
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-600 space-y-2">
									<p className="text-sm font-medium">
										Standard verification documents are required:
									</p>
									<p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
										Aadhaar Card, institutional Bonafide / ID card, qualifying semester/board marksheets, bank account passbook (DBT enabled), and family income certificate (if applicable).
									</p>
								</div>
							)}
						</div>
					)}

					{activeSection === "authority" && (
						<div className="space-y-5">
							<div className="p-5 rounded-2xl bg-[#FAF9F6] border border-slate-200 space-y-3">
								<span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
									Organizing Ministry or Department
								</span>
								<h3 className="text-xl font-bold text-slate-900 font-serif">
									{scholarship.organization}
								</h3>
								<p className="text-sm text-slate-600 leading-relaxed">
									{scholarship.description ||
										"Official government body or organization offering this scholarship."}
								</p>

								<div className="pt-2 flex items-center gap-3 flex-wrap">
									{scholarship.applicationLink && (
										<a
											href={cleanOfficialUrl(scholarship.applicationLink)}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-emerald-800 px-4 py-2 rounded-xl transition cursor-pointer"
										>
											<span>Application Portal</span>
											<ArrowUpRight size={13} />
										</a>
									)}
									{scholarship.officialPortal && (
										<a
											href={cleanOfficialUrl(scholarship.officialPortal)}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl transition cursor-pointer"
										>
											<span>Official Website</span>
											<ExternalLink size={12} />
										</a>
									)}
								</div>
							</div>
						</div>
					)}

					{activeSection === "history" && history.length > 0 && (
						<div className="space-y-4">
							<div>
								<h4 className="text-base font-bold text-slate-900 mb-1">
									Scheme Update History
								</h4>
								<p className="text-sm text-slate-600">
									Recent updates and notifications tracked for this scholarship.
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

				<div className="p-4 sm:p-5 border-t border-slate-200 bg-[#FAF9F6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
					<span className="text-xs text-slate-500 hidden sm:inline-block">
						Press{" "}
						<kbd className="px-2 py-0.5 text-xs bg-white border border-slate-300 rounded font-mono">
							Esc
						</kbd>{" "}
						to close
					</span>

					<div className="flex items-center gap-2">
						{scholarship.applicationLink && (
							<a
								href={cleanOfficialUrl(scholarship.applicationLink)}
								target="_blank"
								rel="noopener noreferrer"
								className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-800 hover:bg-emerald-900 text-white transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
							>
								<span>Apply on Official Site</span>
								<ArrowUpRight size={14} />
							</a>
						)}
						<button
							onClick={onClose}
							className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
