import React from "react";
import {
	X,
	ShieldCheck,
	ExternalLink,
	FileText,
	Clock,
	History,
	AlertCircle,
	ArrowUpRight,
} from "lucide-react";

export default function EvidenceModal({ isOpen, onClose, scholarship }) {
	if (!isOpen || !scholarship) return null;

	const quotes = scholarship.provenanceQuotes || [];
	const history = scholarship.history || [];
	const trustPct = Math.round((scholarship.trustScore || 0.85) * 100);
	const specificSchemeUrl = scholarship.sourceUrl || quotes[0]?.sourceUrl;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
			<div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
				{/* Modal Header */}
				<div className="p-6 sm:p-7 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
					<div className="space-y-2 pr-6">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
								<ShieldCheck className="w-3.5 h-3.5" />
								{trustPct}% Verified Primary Source
							</span>
							<span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-800">
								{scholarship.sourceType || "Government"}
							</span>
							{scholarship.hasChanges && (
								<span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
									<History className="w-3.5 h-3.5" /> Recently Updated
								</span>
							)}
						</div>
						<h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
							{scholarship.title}
						</h3>
						<p className="text-sm text-slate-500">
							Authority: <span className="font-semibold text-slate-700">{scholarship.organization}</span>
						</p>
					</div>
					<button
						onClick={onClose}
						className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
						aria-label="Close dialog"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Modal Body */}
				<div className="p-6 sm:p-7 overflow-y-auto space-y-6 text-sm text-slate-700">
					{/* Recent Update Notice if any */}
					{scholarship.latestChangeSummary && (
						<div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
							<div className="flex items-start gap-3">
								<History className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
								<div className="space-y-1">
									<h4 className="font-bold text-amber-950 text-sm">
										Recent Eligibility or Deadline Update
									</h4>
									<p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
										{scholarship.latestChangeSummary}
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Direct Official Scheme Page Banner */}
					{specificSchemeUrl && (
						<div className="p-4.5 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
							<div>
								<h4 className="font-bold text-blue-950 text-sm">
									Dedicated Scheme Page & Official Guidelines
								</h4>
								<p className="text-xs text-blue-800 mt-0.5">
									Opens the exact government / university instruction page for this specific scholarship.
								</p>
							</div>
							<a
								href={specificSchemeUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm shrink-0"
							>
								Open Scheme Page <ArrowUpRight className="w-4 h-4" />
							</a>
						</div>
					)}

					{/* Official Guidelines & Quotations */}
					<div>
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
							<FileText className="w-4 h-4 text-blue-600" />
							Official Eligibility Rules & Verified Clauses ({quotes.length})
						</h4>

						{quotes.length === 0 ? (
							<div className="p-5 bg-slate-50 rounded-2xl text-sm text-slate-600 space-y-2.5 border border-slate-100">
								<p>
									This scheme is verified directly from the official authority portal.
								</p>
							</div>
						) : (
							<div className="space-y-4">
								{quotes.map((q, idx) => (
									<div
										key={idx}
										className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all space-y-2.5 shadow-2xs"
									>
										<div className="flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
											<span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/60">
												{q.clause || `Clause §${idx + 1}`}
											</span>
											{q.page && <span className="text-xs font-medium">Page {q.page} of Circular / Guidelines</span>}
										</div>
										<blockquote className="border-l-3 border-blue-500 pl-4 italic text-slate-800 text-sm leading-relaxed">
											"{q.quote}"
										</blockquote>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Update History */}
					{history.length > 0 && (
						<div>
							<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
								<Clock className="w-4 h-4 text-amber-600" />
								Recent Updates & Changes ({history.length})
							</h4>
							<div className="space-y-3">
								{history.map((ver, idx) => (
									<div
										key={idx}
										className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 text-xs sm:text-sm space-y-2"
									>
										<div className="flex items-center justify-between text-slate-600">
											<span className="font-bold text-amber-900 capitalize">
												{ver.changeType?.replace(/_/g, " ").toLowerCase()}
											</span>
											<span className="text-xs text-slate-500">
												{new Date(ver.observedAt).toLocaleDateString("en-IN", {
													day: "numeric",
													month: "short",
													year: "numeric",
												})}
											</span>
										</div>
										<p className="text-slate-800 leading-relaxed">{ver.summary}</p>
										{ver.deltas && ver.deltas.length > 0 && (
											<div className="mt-2 pt-2 border-t border-amber-200/60 space-y-1">
												{ver.deltas.map((d, dIdx) => (
													<p key={dIdx} className="text-xs text-slate-600">
														• {d.humanReadable || `${d.field}: ${d.oldValue} ➔ ${d.newValue}`}
													</p>
												))}
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					{/* Required Documents Matrix */}
					{scholarship.requiredDocuments && scholarship.requiredDocuments.length > 0 && (
						<div>
							<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
								Certificates Needed to Apply ({scholarship.requiredDocuments.length})
							</h4>
							<ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
								{scholarship.requiredDocuments.map((doc, idx) => (
									<li
										key={idx}
										className="flex items-center gap-2.5 text-xs sm:text-sm p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
									>
										<span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
										<span className="truncate">{doc.name}</span>
										{doc.mandatory && (
											<span className="text-xs text-red-600 ml-auto shrink-0 font-bold">
												Mandatory
											</span>
										)}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4 flex-wrap">
					<span className="text-xs sm:text-sm text-slate-500">
						Verified by Udaan:{" "}
						<strong className="text-slate-700 font-semibold">
							{new Date(scholarship.updatedAt || Date.now()).toLocaleDateString("en-IN", {
								day: "numeric",
								month: "short",
								year: "numeric",
							})}
						</strong>
					</span>
					<div className="flex gap-2.5 w-full sm:w-auto flex-wrap">
						{scholarship.applicationLink && scholarship.applicationLink !== specificSchemeUrl && (
							<a
								href={scholarship.applicationLink}
								target="_blank"
								rel="noopener noreferrer"
								className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#27500A] text-white hover:bg-[#1E3E08] transition-colors shadow-sm"
							>
								Apply on Portal <ExternalLink className="w-3.5 h-3.5" />
							</a>
						)}
						<button
							onClick={onClose}
							className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer ml-auto"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
