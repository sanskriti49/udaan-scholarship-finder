import React, { useEffect } from "react";
import {
	X,
	ExternalLink,
	FileText,
	Clock,
	History,
	ArrowUpRight,
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
	const history = scholarship.history || [];
	const specificSchemeUrl = scholarship.sourceUrl || quotes[0]?.sourceUrl;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
				{/* Modal Header */}
				<div className="p-6 sm:p-7 border-b border-slate-100 flex items-start justify-between bg-[#FAF9F6]">
					<div className="space-y-1.5 pr-6">
						<span className="text-sm font-semibold uppercase tracking-wider text-slate-500">
							{scholarship.sourceType || "Official Scheme"}
						</span>
						<h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 leading-snug">
							{scholarship.title}
						</h3>
						<p className="text-sm text-slate-600 font-medium">
							Issuing Body: <span className="font-semibold text-slate-900">{scholarship.organization}</span>
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
					{/* Dedicated Scheme Page Banner */}
					{specificSchemeUrl && (
						<div className="p-5 rounded-2xl bg-[#FAF9F6] border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
							<div>
								<h4 className="font-bold text-slate-900 text-sm sm:text-base">
									Official Circular & Guidelines Page
								</h4>
								<p className="text-xs sm:text-sm text-slate-600 mt-1">
									Access the official instruction notice directly on the issuing authority portal.
								</p>
							</div>
							<a
								href={specificSchemeUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors shadow-2xs shrink-0"
							>
								<span>Open Source Circular</span>
								<ArrowUpRight className="w-4 h-4" />
							</a>
						</div>
					)}

					{/* Official Eligibility Rules & Quotes */}
					<div>
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
							<FileText className="w-4 h-4 text-emerald-800" />
							Eligibility Clauses ({quotes.length})
						</h4>

						{quotes.length === 0 ? (
							<div className="p-4 bg-[#FAF9F6] rounded-2xl text-sm text-slate-600 border border-slate-200/80">
								<p>
									This scheme is ingested directly from the official authority portal circular.
								</p>
							</div>
						) : (
							<div className="space-y-3.5">
								{quotes.map((q, idx) => (
									<div
										key={idx}
										className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white space-y-2 shadow-2xs"
									>
										<div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
											<span className="font-bold text-slate-800">
												{q.clause || `Clause §${idx + 1}`}
											</span>
											{q.page && <span>Page {q.page}</span>}
										</div>
										<blockquote className="border-l-2 border-emerald-700 pl-3.5 italic text-slate-700 text-sm leading-relaxed">
											"{q.quote}"
										</blockquote>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Update History if available */}
					{history.length > 0 && (
						<div>
							<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
								<Clock className="w-4 h-4 text-amber-700" />
								Observed Updates ({history.length})
							</h4>
							<div className="space-y-3">
								{history.map((ver, idx) => (
									<div
										key={idx}
										className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 text-sm space-y-1.5"
									>
										<div className="flex items-center justify-between text-slate-600">
											<span className="font-bold text-amber-950 capitalize text-sm">
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
										<p className="text-slate-800 leading-relaxed text-sm">{ver.summary}</p>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="p-5 sm:p-6 border-t border-slate-100 bg-[#FAF9F6] flex items-center justify-between gap-4">
					<span className="text-xs sm:text-sm text-slate-500">
						Press <kbd className="px-2 py-0.5 text-xs bg-white border border-slate-300 rounded font-mono">Esc</kbd> or click outside to dismiss
					</span>
					<button
						onClick={onClose}
						className="px-5 py-2.5 rounded-full text-sm font-semibold bg-slate-900 text-white hover:bg-emerald-800 transition-colors cursor-pointer"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	);
}

