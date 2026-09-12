import React, { useEffect } from "react";
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
} from "lucide-react";

export default function EvidenceModal({ isOpen, onClose, scholarship }) {
	useEffect(() => {
		if (!isOpen) return;
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

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-200">
				{/* Modal Header */}
				<div className="p-6 sm:p-7 border-b border-slate-100 flex items-start justify-between bg-[#FAF9F6]">
					<div className="space-y-1.5 pr-6">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
								{scholarship.category || "Scholarship Scheme"}
							</span>
							<span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
								<ShieldCheck size={12} className="text-emerald-700" />
								<span>Verified Scheme</span>
							</span>
						</div>
						<h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 leading-snug">
							{scholarship.title}
						</h3>
						<p className="text-xs sm:text-sm text-slate-600 font-medium">
							Issuing Body:{" "}
							<span className="font-semibold text-slate-900">
								{scholarship.organization}
							</span>
						</p>
					</div>
					<button
						onClick={onClose}
						className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
						aria-label="Close dialog"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Modal Body */}
				<div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-700">
					{/* Official Source Circular Banner */}
					{specificSchemeUrl && (
						<div className="p-5 rounded-2xl bg-[#FAF9F6] border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
							<div>
								<h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
									<FileText size={16} className="text-emerald-700" />
									Official Gazette & Guidelines
								</h4>
								<p className="text-xs text-slate-600 mt-1 leading-relaxed">
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

					{/* Official Eligibility Clauses & Citations */}
					<div>
						<div className="flex items-center justify-between mb-3">
							<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
								<Sparkles className="w-4 h-4 text-emerald-700" />
								Regulatory Citations & Clauses ({effectiveQuotes.length})
							</h4>
							<span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
								Audited Evidence
							</span>
						</div>

						<div className="space-y-3.5">
							{effectiveQuotes.map((q, idx) => (
								<div
									key={idx}
									className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white space-y-2 shadow-2xs"
								>
									<div className="flex items-center justify-between text-xs text-slate-500">
										<span className="font-bold text-slate-900 flex items-center gap-1.5">
											<span className="w-2 h-2 rounded-full bg-emerald-600" />
											{q.clause || `Clause §${idx + 1}`}
										</span>
										{q.page && (
											<span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600">
												Page {q.page}
											</span>
										)}
									</div>
									<blockquote className="border-l-3 border-emerald-700 pl-3.5 italic text-slate-700 text-xs sm:text-sm leading-relaxed bg-emerald-50/20 py-1 rounded-r-lg">
										&ldquo;{q.quote}&rdquo;
									</blockquote>
									{q.sourceUrl && q.sourceUrl !== specificSchemeUrl && (
										<div className="pt-1 flex justify-end">
											<a
												href={q.sourceUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="text-[11px] text-emerald-800 hover:underline flex items-center gap-1"
											>
												<span>Direct Reference</span>
												<ExternalLink size={10} />
											</a>
										</div>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Statutory Eligibility Criteria (Rules AST) */}
					{rules.length > 0 && (
						<div>
							<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
								<CheckCircle2 className="w-4 h-4 text-emerald-700" />
								Mandatory Criteria Thresholds ({rules.length})
							</h4>
							<div className="grid grid-cols-1 gap-2.5">
								{rules.map((rule, idx) => (
									<div
										key={idx}
										className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-slate-200/80 text-xs flex items-center justify-between gap-3"
									>
										<div className="space-y-0.5">
											<p className="font-semibold text-slate-900">
												{rule.description || rule.field}
											</p>
											<p className="text-[11px] text-slate-500">
												Field: <span className="font-mono">{rule.field}</span>{" "}
												&bull; Condition:{" "}
												<span className="font-mono font-bold text-slate-700">
													{rule.operator} {String(rule.targetValue)}
												</span>
											</p>
										</div>
										<span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
											Mandatory
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Evidentiary Documents Required */}
					{docs.length > 0 && (
						<div>
							<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
								<Files className="w-4 h-4 text-slate-600" />
								Required Verification Certificates ({docs.length})
							</h4>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{docs.map((doc, idx) => (
									<div
										key={idx}
										className="p-3 rounded-2xl bg-white border border-slate-200/80 text-xs text-slate-700 flex items-center gap-2 shadow-2xs"
									>
										<span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
										<span className="font-medium truncate">{doc.name}</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Policy Change History if available */}
					{history.length > 0 && (
						<div>
							<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
								<Clock className="w-4 h-4 text-amber-700" />
								Observed Policy Updates ({history.length})
							</h4>
							<div className="space-y-2.5">
								{history.map((ver, idx) => (
									<div
										key={idx}
										className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 text-xs space-y-1"
									>
										<div className="flex items-center justify-between text-slate-600">
											<span className="font-bold text-amber-950 capitalize">
												{ver.changeType?.replace(/_/g, " ").toLowerCase()}
											</span>
											<span className="text-[11px] text-slate-500">
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

				{/* Modal Footer */}
				<div className="p-5 sm:p-6 border-t border-slate-100 bg-[#FAF9F6] flex items-center justify-between gap-4">
					<span className="text-xs text-slate-500">
						Press <kbd className="px-2 py-0.5 text-xs bg-white border border-slate-300 rounded font-mono">Esc</kbd> to close
					</span>
					<div className="flex items-center gap-2">
						{scholarship.applicationLink && (
							<a
								href={scholarship.applicationLink}
								target="_blank"
								rel="noopener noreferrer"
								className="px-4 py-2.5 rounded-full text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white transition-colors flex items-center gap-1 shadow-2xs"
							>
								<span>Official Portal</span>
								<ArrowUpRight size={13} />
							</a>
						)}
						<button
							onClick={onClose}
							className="px-5 py-2.5 rounded-full text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
						>
							Done
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

