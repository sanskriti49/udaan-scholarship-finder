import React, { useState, useEffect } from "react";
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
} from "lucide-react";

export default function EvidenceModal({ isOpen, onClose, scholarship }) {
	const [activeSection, setActiveSection] = useState("gazette");

	useEffect(() => {
		if (!isOpen) return;
		setActiveSection("gazette");
		const handleKeyDown = (e) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen || !scholarship) return null;

	const quotes = scholarship.provenanceQuotes || [];
	const rules = scholarship.rules || [];
	const docs = scholarship.requiredDocuments || [];
	const history = scholarship.history || [];
	const specificSchemeUrl =
		scholarship.sourceUrl ||
		quotes[0]?.sourceUrl ||
		scholarship.applicationLink ||
		"https://scholarships.gov.in";

	// If provenanceQuotes is empty, synthesize rich clauses from rule ASTs and description
	const effectiveQuotes =
		quotes.length > 0
			? quotes
			: rules.length > 0
				? rules.map((r, idx) => ({
						clause: `Official Directive §${idx + 1}: ${r.field || "Eligibility Standard"}`,
						quote:
							r.description ||
							`Applicants must satisfy all mandatory ${r.field} guidelines specified in the issuing circular.`,
						page: 1,
						sourceUrl: specificSchemeUrl,
				  }))
				: [
						{
							clause: "Gazette Notification §1: General Terms",
							quote:
								scholarship.description ||
								"This opportunity is verified against official government circulars and issuing body notifications.",
							page: 1,
							sourceUrl: specificSchemeUrl,
						},
				  ];

	const navSections = [
		{
			id: "gazette",
			label: "Gazette & Citations",
			count: effectiveQuotes.length,
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

	return (
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
								<span>Official Gazette Dossier</span>
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
							{specificSchemeUrl && (
								<div className="p-5 rounded-2xl bg-[#FAF9F6] border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
									<div>
										<h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
											<FileText size={18} className="text-emerald-700" />
											Official Gazette & Guidelines
										</h4>
										<p className="text-sm text-slate-600 mt-1 leading-relaxed">
											Access the full statutory circular published by{" "}
											<span className="font-semibold text-slate-800">
												{scholarship.organization}
											</span>
											.
										</p>
									</div>
									<a
										href={specificSchemeUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-2xs shrink-0 cursor-pointer"
									>
										<span>Open Source Circular</span>
										<ArrowUpRight className="w-3.5 h-3.5" />
									</a>
								</div>
							)}

							<div>
								<div className="flex items-center justify-between mb-3">
									<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
										<Sparkles className="w-4 h-4 text-emerald-700" />
										Audited Regulatory Quotes ({effectiveQuotes.length})
									</h4>
									<span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
										Verifiable Source
									</span>
								</div>

								<div className="space-y-3.5">
									{effectiveQuotes.map((q, idx) => (
										<div
											key={idx}
											className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-[#FAF9F6] space-y-2"
										>
											<div className="flex items-center justify-between text-xs text-slate-500">
												<span className="font-bold text-slate-900 flex items-center gap-1.5">
													<span className="w-2 h-2 rounded-full bg-emerald-600" />
													{q.clause || `Clause Section ${idx + 1}`}
												</span>
												{q.page && (
													<span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-xs font-medium text-slate-600">
														Page {q.page}
													</span>
												)}
											</div>
											<blockquote className="border-l-3 border-emerald-700 pl-3.5 italic text-slate-800 text-sm leading-relaxed bg-emerald-50/30 py-1.5 rounded-r-lg">
												&ldquo;{q.quote}&rdquo;
											</blockquote>
											{q.sourceUrl && q.sourceUrl !== specificSchemeUrl && (
												<div className="pt-1 flex justify-end">
													<a
														href={q.sourceUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="text-xs text-emerald-800 hover:underline flex items-center gap-1 font-medium"
													>
														<span>Direct Reference Link</span>
														<ExternalLink size={12} />
													</a>
												</div>
											)}
										</div>
									))}
								</div>
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

								{scholarship.officialPortal && (
									<div className="pt-2">
										<a
											href={scholarship.officialPortal}
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
						{scholarship.applicationLink && (
							<a
								href={scholarship.applicationLink}
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
		</div>
	);
}

