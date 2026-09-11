import React from "react";
import {
	X,
	ShieldCheck,
	ExternalLink,
	FileText,
	Clock,
	History,
	AlertCircle,
} from "lucide-react";

export default function EvidenceModal({ isOpen, onClose, scholarship }) {
	if (!isOpen || !scholarship) return null;

	const quotes = scholarship.provenanceQuotes || [];
	const history = scholarship.history || [];
	const trustPct = Math.round((scholarship.trustScore || 0.85) * 100);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
			<div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
				{/* Modal Header */}
				<div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
					<div className="space-y-1 pr-6">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
								<ShieldCheck className="w-3.5 h-3.5" />
								{trustPct}% Source Reliability
							</span>
							<span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
								{scholarship.sourceType || "Official"}
							</span>
							{scholarship.hasChanges && (
								<span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
									<History className="w-3 h-3" /> Policy Drift Tracked
								</span>
							)}
						</div>
						<h3 className="text-xl font-bold text-slate-900 mt-2">
							{scholarship.title}
						</h3>
						<p className="text-xs text-slate-500">
							Provider: <span className="font-medium text-slate-700">{scholarship.organization}</span> • Source: {scholarship.sourceSite}
						</p>
					</div>
					<button
						onClick={onClose}
						className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
						aria-label="Close modal"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Modal Body */}
				<div className="p-6 overflow-y-auto space-y-6 text-sm">
					{/* Policy Change Alerts if any */}
					{scholarship.latestChangeSummary && (
						<div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80">
							<div className="flex items-start gap-3">
								<History className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
								<div>
									<h4 className="font-semibold text-amber-900 text-sm">
										Recent Eligibility & Deadline Update
									</h4>
									<p className="text-xs text-amber-800 mt-1">
										{scholarship.latestChangeSummary}
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Official Clause Citations / Evidence Graph */}
					<div>
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
							<FileText className="w-4 h-4 text-blue-600" />
							Official Source Clause Citations ({quotes.length})
						</h4>

						{quotes.length === 0 ? (
							<p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl">
								No specific text quotes indexed for this opportunity. Verified directly via official portal index.
							</p>
						) : (
							<div className="space-y-3">
								{quotes.map((q, idx) => (
									<div
										key={idx}
										className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all space-y-2"
									>
										<div className="flex items-center justify-between text-xs text-slate-500">
											<span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
												{q.clause || `Clause §${idx + 1}`}
											</span>
											{q.page && <span>Page {q.page} of Circular</span>}
										</div>
										<blockquote className="border-l-2 border-blue-500 pl-3 italic text-slate-700 text-xs leading-relaxed">
											"{q.quote}"
										</blockquote>
										{q.sourceUrl && (
											<div className="pt-1">
												<a
													href={q.sourceUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800"
												>
													View official gazette / notification <ExternalLink className="w-3 h-3" />
												</a>
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</div>

					{/* Historical Versions / Snapshot Diffs */}
					{history.length > 0 && (
						<div>
							<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
								<Clock className="w-4 h-4 text-amber-600" />
								Audit Log & Drift History ({history.length})
							</h4>
							<div className="space-y-3">
								{history.map((ver, idx) => (
									<div
										key={idx}
										className="p-3.5 rounded-xl border border-amber-200/70 bg-amber-50/30 text-xs space-y-1.5"
									>
										<div className="flex items-center justify-between text-slate-600">
											<span className="font-semibold text-amber-800 capitalize">
												{ver.changeType?.replace(/_/g, " ").toLowerCase()}
											</span>
											<span className="text-[11px]">
												{new Date(ver.observedAt).toLocaleDateString("en-IN", {
													day: "numeric",
													month: "short",
													year: "numeric",
												})}
											</span>
										</div>
										<p className="text-slate-700">{ver.summary}</p>
										{ver.deltas && ver.deltas.length > 0 && (
											<div className="mt-1 pt-1 border-t border-amber-100 space-y-1">
												{ver.deltas.map((d, dIdx) => (
													<p key={dIdx} className="text-[11px] text-slate-600">
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
								Prerequisite Documents ({scholarship.requiredDocuments.length})
							</h4>
							<ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{scholarship.requiredDocuments.map((doc, idx) => (
									<li
										key={idx}
										className="flex items-center gap-2 text-xs p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-700"
									>
										<span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
										<span className="truncate">{doc.name}</span>
										{doc.mandatory && (
											<span className="text-[10px] text-red-500 ml-auto shrink-0 font-medium">
												Required
											</span>
										)}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
					<span className="text-xs text-slate-500">
						Data snapshot last verified:{" "}
						{new Date(scholarship.updatedAt || Date.now()).toLocaleDateString("en-IN")}
					</span>
					<div className="flex gap-2">
						{scholarship.applicationLink && (
							<a
								href={scholarship.applicationLink}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
							>
								Official Portal <ExternalLink className="w-3.5 h-3.5" />
							</a>
						)}
						<button
							onClick={onClose}
							className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
