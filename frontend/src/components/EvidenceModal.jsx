import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
	X,
	FileText,
	ArrowUpRight,
	ShieldCheck,
	Check,
	ExternalLink,
	Sparkles,
	BookOpen,
	ListChecks,
	FolderCheck,
	History as HistoryIcon,
	Building2,
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
import useDialogFocus from "../hooks/useDialogFocus";
import { evidenceQuotes, documentItems } from "../utils/evidencePresentation.js";

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

function daysUntil(deadline) {
	if (!deadline) return null;
	return Math.max(
		0,
		Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24)),
	);
}

function deadlineMeta(deadline) {
	const days = daysUntil(deadline);
	if (days === null) return { text: "No fixed date", tone: "quiet" };
	if (days === 0) return { text: "Closes today", tone: "urgent" };
	if (days <= 10)
		return { text: `${days} day${days === 1 ? "" : "s"} left`, tone: "urgent" };
	if (days <= 30) return { text: `${days} days left`, tone: "soon" };
	return { text: `${days} days left`, tone: "quiet" };
}

function DeadlineChip({ deadline }) {
	const { text, tone } = deadlineMeta(deadline);
	const tones = {
		urgent: "border-rose-300 bg-rose-50 text-rose-800",
		soon: "border-emerald-950/20 bg-yellow-200 text-emerald-950",
		quiet: "border-emerald-950/15 bg-emerald-50 text-emerald-950/70",
	};
	return (
		<span
			className={`inline-flex shrink-0 items-center rounded-full border-[1.5px] px-2.5 py-1 text-xs font-bold ${tones[tone]}`}
		>
			{text}
		</span>
	);
}

export default function EvidenceModal({ isOpen, onClose, scholarship, appearance = "default", returnFocusRef }) {
	if (!isOpen || !scholarship) return null;
	return <EvidenceContent key={scholarship._id || scholarship.id || scholarship.slug || scholarship.title} isOpen={isOpen} onClose={onClose} scholarship={scholarship} appearance={appearance} returnFocusRef={returnFocusRef} />;
}

function EvidenceContent({ isOpen, onClose, scholarship, appearance, returnFocusRef }) {
	const dialogRef = useDialogFocus(isOpen && Boolean(scholarship), returnFocusRef);
	const [activeSection, setActiveSection] = useState("gazette");
	const [liveEvidence, setLiveEvidence] = useState(null);
	const [isLoadingEvidence, setIsLoadingEvidence] = useState(Boolean(scholarship._id || scholarship.id || scholarship.slug));

	useBodyScrollLock(isOpen);

	useEffect(() => {
		if (!isOpen || !scholarship) return;

		const idOrSlug = scholarship._id || scholarship.id || scholarship.slug;
		if (!idOrSlug) return;

		let isMounted = true;

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
	const docs = documentItems(scholarship, liveEvidence);
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
				null,
		);

	const effectiveQuotes = evidenceQuotes(scholarship, liveEvidence);

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
			label: "Documents to review",
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
			className={`${appearance === "paper" ? "sd-dialog" : ""} fixed inset-0 z-[70] overflow-hidden`}
			role="dialog"
			aria-modal="true"
			aria-labelledby="evidence-modal-title"
		>
			<div
				className="animate-fade-in fixed inset-0 bg-emerald-950/45 backdrop-blur-[2px]"
				onClick={onClose}
				aria-hidden="true"
			/>

			<div
				ref={dialogRef}
				tabIndex={-1}
				className={`${appearance === "paper" ? "sd-evidence-panel sd-dialog-panel" : "bg-white h-screen max-h-screen"} animate-slide-in-right fixed inset-y-0 right-0 flex flex-col border-l-[1.5px] border-emerald-950 text-emerald-950`}
				style={{ width: "min(680px, 100vw)" }}
			>
				{/* Modal Header */}
				<div className="sd-evidence-header flex shrink-0 items-start justify-between gap-4 border-b-[1.5px] border-emerald-950 bg-emerald-50 px-6 py-5">
					<div className="min-w-0 flex-1">
						<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold text-emerald-950/55">
							<span>{scholarship.category || "Scholarship Scheme"}</span>
							<span aria-hidden>·</span>
							<span className="inline-flex items-center gap-1 text-emerald-800">
								<ShieldCheck size={13} />
								Criteria & source evidence
							</span>
							{exactGuidelinePdf && (
								<>
									<span aria-hidden>·</span>
									<span className="font-semibold text-emerald-950/70">
										Official PDF
									</span>
								</>
							)}
						</p>

						<h2
							id="evidence-modal-title"
							className="font-serif mt-2 text-2xl font-extrabold leading-tight text-emerald-950 sm:text-3xl"
						>
							{scholarship.title}
						</h2>

						<div className="mt-2 flex flex-wrap items-center gap-3">
							<p className="text-sm font-medium text-emerald-950/65">
								Offered by:{" "}
								<span className="font-bold text-emerald-950">
									{scholarship.organization}
								</span>
							</p>
							{scholarship.deadline && (
								<DeadlineChip deadline={scholarship.deadline} />
							)}
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-emerald-950 bg-white hover:bg-yellow-200 ${focusRing}`}
						aria-label="Close dialog"
					>
						<X size={17} />
					</button>
				</div>

				{/* Quick Official Links Banner */}
				<div className="sd-evidence-links flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-[1.5px] border-dashed border-emerald-950/20 bg-emerald-50/50 px-6 py-2.5 text-xs">
					<span className="font-bold text-emerald-950/70">Official Links:</span>
					<div className="flex flex-wrap items-center gap-2">
						{exactGuidelinePdf && (
							<a
								href={exactGuidelinePdf}
								target="_blank"
								rel="noopener noreferrer"
								className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950/25 bg-white px-3 py-1 font-bold text-emerald-950 hover:bg-yellow-200 ${focusRing}`}
							>
								<FileText size={12} className="text-emerald-800" />
								<span>Open Guidelines (PDF)</span>
								<ArrowUpRight size={11} />
							</a>
						)}
						{scholarship.applicationLink && (
							<a
								href={cleanOfficialUrl(scholarship.applicationLink)}
								target="_blank"
								rel="noopener noreferrer"
								className={`inline-flex cursor-pointer items-center gap-1 rounded-full bg-emerald-800 px-3.5 py-1 font-bold text-white transition hover:bg-emerald-900 active:translate-y-px ${focusRing}`}
							>
								<span>Apply on Official Site</span>
								<ArrowUpRight size={11} />
							</a>
						)}
					</div>
				</div>

				{/* Navigation Tabs */}
				<div className="sd-evidence-tabs flex shrink-0 items-center gap-1.5 overflow-x-auto border-b-[1.5px] border-emerald-950 bg-white px-4 py-3 sm:px-6" role="group" aria-label="Scholarship file sections">
					{navSections.map((sec) => {
						const Icon = sec.icon;
						const isActive = activeSection === sec.id;
						return (
							<button
								key={sec.id}
								type="button"
								onClick={() => setActiveSection(sec.id)}
								aria-pressed={isActive}
								className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-[13px] font-bold transition-colors ${focusRing} ${
									isActive
										? "border-emerald-950 bg-emerald-950 text-white"
										: "border-emerald-950/20 bg-white text-emerald-950/80 hover:border-emerald-950 hover:text-emerald-950"
								}`}
							>
								<Icon
									size={13}
									className={
										isActive ? "text-yellow-200" : "text-emerald-950/60"
									}
								/>
								<span>{sec.label}</span>
								{sec.count !== null && (
									<span
										className={`rounded-full px-1.5 py-0.2 text-[11px] font-bold ${
											isActive
												? "bg-yellow-200 text-emerald-950"
												: "bg-emerald-100 text-emerald-950/70"
										}`}
									>
										{sec.count}
									</span>
								)}
							</button>
						);
					})}
				</div>

				{/* Modal Scrollable Content Area */}
				<div className="sd-evidence-content min-h-0 flex-1 space-y-6 overflow-y-auto bg-white px-6 py-6 text-sm text-emerald-950 sm:px-8">
					{activeSection === "gazette" && (
						<div className="space-y-6">
							{exactGuidelinePdf ? (
								<div className="space-y-3 rounded-2xl border-[1.5px] border-emerald-950 bg-emerald-50/70 p-5">
									<div className="space-y-1">
										<h4 className="font-serif flex items-center gap-2 text-base font-bold text-emerald-950">
											<FileText size={17} className="text-emerald-800" />
											Official Scheme Guidelines
										</h4>
										<p className="text-[14px] leading-relaxed text-emerald-950/75">
											Official scheme rules and guidelines published by the
											organizing government ministry or authority.
										</p>
										<p className="max-w-full truncate rounded-lg border-[1.5px] border-emerald-950/20 bg-white px-3 py-1 font-mono text-[11px] text-emerald-950/75">
											Document: {exactGuidelinePdf}
										</p>
									</div>
									<div>
										<a
											href={exactGuidelinePdf}
											target="_blank"
											rel="noopener noreferrer"
											className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-800 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-900 ${focusRing}`}
										>
											<span>Open Guidelines (PDF)</span>
											<ArrowUpRight size={14} />
										</a>
									</div>
								</div>
							) : (
								<div className="space-y-1 rounded-2xl border-[1.5px] border-emerald-950/20 bg-emerald-50/50 p-4">
									<h4 className="font-serif flex items-center gap-2 text-base font-bold text-emerald-950">
										<ShieldCheck size={16} className="text-emerald-800" />
										Source evidence
									</h4>
									<p className="text-[14px] leading-relaxed text-emerald-950/75">
										Review the excerpts below and confirm current instructions with the provider (
										{formatSourceLabel(
											scholarship.sourceUrl || scholarship.applicationLink,
										)}
										).
									</p>
								</div>
							)}

							<div>
								<div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
									<h4 className="font-serif flex items-center gap-1.5 text-base font-bold text-emerald-950">
										<Sparkles size={16} className="text-emerald-800" />
										Source excerpts (
										{effectiveQuotes.length})
									</h4>
									{isLoadingEvidence && (
										<span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-950/55">
											<Loader2 size={12} className="animate-spin" /> Verifying
											stored excerpts...
										</span>
									)}
								</div>

								<div className="space-y-4">
									{effectiveQuotes.length === 0 && <p className="rounded-xl border border-emerald-950/20 p-4 text-sm">No source excerpt is available for this listing. Recorded criteria are explanations, not quotations; check the provider's instructions.</p>}
									{effectiveQuotes.map((q, idx) => {
										const quoteDocUrl = cleanOfficialUrl(
											q.url || specificSchemeUrl,
										);
										const isPdf = isGenuinePdf(quoteDocUrl);
										const sourceLabel = formatSourceLabel(quoteDocUrl);

										return (
											<div
												key={idx}
												className="space-y-2.5 rounded-xl border-[1.5px] border-emerald-950/20 bg-white p-4 transition-colors hover:border-emerald-950"
											>
												<div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
													<span className="flex items-center gap-1.5 text-sm font-bold text-emerald-950">
														<FileText size={13} className="text-emerald-800 shrink-0" />
														{formatClauseTitle(q.clause, q.field, idx + 1)}
													</span>
													{q.page && (
														<span className="rounded-sm bg-yellow-200 px-1.5 py-0.5 text-xs font-bold text-emerald-950">
															Page {q.page}
														</span>
													)}
													<span className="text-xs font-semibold text-emerald-950/60">{q.verified ? "Excerpt checked against stored source" : "Not verified"}</span>
												</div>

												<blockquote className="border-l-2 border-yellow-400 pl-3 text-[14px] italic leading-relaxed text-emerald-950/85">
													{formatEvidenceText(q.quote)}
												</blockquote>

												{quoteDocUrl && (
													<div className="flex flex-wrap items-center justify-between gap-2 border-t-[1.5px] border-dashed border-emerald-950/15 pt-2.5 text-xs">
														<span
															className="max-w-[260px] truncate font-medium text-emerald-950/55 sm:max-w-md"
															title={quoteDocUrl}
														>
															Source: {sourceLabel}
														</span>
														{isPdf ? (
															<a
																href={quoteDocUrl}
																target="_blank"
																rel="noopener noreferrer"
																className="inline-flex shrink-0 items-center gap-1 font-bold text-emerald-950 underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950"
															>
																<span>Open Cited PDF</span>
																<ExternalLink size={11} />
															</a>
														) : (
															<a href={quoteDocUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">Open source page</a>
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
								<h4 className="font-serif text-lg font-bold text-emerald-950">
									Who Can Apply (Eligibility Criteria)
								</h4>
								<p className="text-sm text-emerald-950/65">
									These recorded criteria are explanations, not source quotations. Review the source excerpts and current provider instructions before applying.
								</p>
							</div>

							{rules.length > 0 ? (
								<ul className="divide-y divide-dashed divide-emerald-950/20 rounded-xl border-[1.5px] border-emerald-950/20 bg-white">
									{rules.map((rule, idx) => (
										<li
											key={idx}
											className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4"
										>
											<div className="space-y-1">
												<p className="text-[15px] font-semibold text-emerald-950">
													{rule.description || formatFieldLabel(rule.field)}
												</p>
												<div className="flex flex-wrap items-center gap-2 text-xs text-emerald-950/55">
													<span>
														Criterion:{" "}
														<strong className="font-semibold text-emerald-950/75">
															{formatFieldLabel(rule.field)}
														</strong>
													</span>
													<span aria-hidden>·</span>
													<span>
														Requirement:{" "}
														<strong className="font-semibold text-emerald-950/75">
															{formatRuleRequirement(rule)}
														</strong>
													</span>
												</div>
											</div>
											<span className="shrink-0 rounded-sm bg-yellow-200 px-2 py-0.5 text-[13px] font-bold text-emerald-950 self-start sm:self-center">
												{formatRuleRequirement(rule)}
											</span>
										</li>
									))}
								</ul>
							) : (
								<div className="rounded-2xl border-[1.5px] border-emerald-950/20 bg-emerald-50/30 p-8 text-center text-emerald-950/60">
									<p className="text-sm font-medium">
										Eligibility criteria have not been recorded. Check the provider's current instructions.
									</p>
								</div>
							)}
						</div>
					)}

					{activeSection === "documents" && (
						<div className="space-y-4">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
								<div>
									<h4 className="font-serif text-lg font-bold text-emerald-950">
										Documents to review ({docs.length})
									</h4>
									<p className="text-sm text-emerald-950/65">
										Source-cited requirements are labelled below. Other items are preparation suggestions; confirm the provider's document list.
									</p>
								</div>
								<Link
									to="/documents"
									onClick={onClose}
									className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-emerald-950 underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950 self-start sm:self-auto"
								>
									<FolderCheck size={14} className="text-emerald-800" />
									<span>Open document checklist</span>
									<ArrowUpRight size={12} />
								</Link>
							</div>

							{docs.length > 0 ? (
								<ul className="grid gap-2.5 sm:grid-cols-2">
									{docs.map((doc, idx) => (
										<li
											key={idx}
											className="flex items-start gap-2.5 rounded-xl border-[1.5px] border-emerald-950/20 bg-white p-3.5 transition-colors hover:border-emerald-950"
										>
											<span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-[1.5px] border-emerald-950 bg-white">
												{doc.mandatory && (
													<Check size={11} strokeWidth={3.5} />
												)}
											</span>
											<span className="min-w-0 flex-1">
												<span className="block text-sm font-semibold leading-snug text-emerald-950">
													{doc.name}
												</span>
												<span className="mt-1 flex items-center gap-1.5">
													<span className="text-xs font-semibold text-emerald-950/55">
														{doc.sourceCited ? (doc.mandatory ? "Required per cited instructions" : "Listed in cited instructions") : "Preparation suggestion — not verified"}
													</span>
													{doc.code && (
														<span className="rounded bg-emerald-50 px-1.5 py-0.2 font-mono text-[10px] text-emerald-950/50">
															{doc.code}
														</span>
													)}
												</span>
											</span>
										</li>
									))}
								</ul>
							) : (
								<div className="rounded-2xl border-[1.5px] border-emerald-950/20 bg-emerald-50/30 p-6 text-center text-emerald-950/70">
									<p className="text-sm font-semibold">
										Document requirements have not been verified.
									</p>
									<p className="mt-1.5 text-xs text-emerald-950/60 leading-relaxed max-w-lg mx-auto">
										Check the provider's current document list before preparing your application.
									</p>
								</div>
							)}
						</div>
					)}

					{activeSection === "authority" && (
						<div className="space-y-5">
							<div className="rounded-2xl border-[1.5px] border-emerald-950/20 bg-emerald-50/50 p-6 space-y-3">
								<span className="text-xs font-bold uppercase tracking-wider text-emerald-950/50 block">
									Organizing Ministry or Department
								</span>
								<h3 className="font-serif text-2xl font-bold text-emerald-950">
									{scholarship.organization}
								</h3>
								<p className="text-[15px] leading-relaxed text-emerald-950/75">
									{scholarship.description ||
										scholarship.summary ||
										"Provider details have not been recorded."}
								</p>

								<div className="pt-2 flex flex-wrap items-center gap-3">
									{scholarship.applicationLink && (
										<a
											href={cleanOfficialUrl(scholarship.applicationLink)}
											target="_blank"
											rel="noopener noreferrer"
											className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 active:translate-y-px ${focusRing}`}
										>
											<span>Application Portal</span>
											<ArrowUpRight size={14} />
										</a>
									)}
									{(scholarship.officialPortal || scholarship.sourceUrl) && (
										<a
											href={cleanOfficialUrl(
												scholarship.officialPortal || scholarship.sourceUrl,
											)}
											target="_blank"
											rel="noopener noreferrer"
											className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950 bg-white px-5 py-2.5 text-sm font-bold text-emerald-950 hover:bg-yellow-200 transition ${focusRing}`}
										>
											<span>Official Website</span>
											<ExternalLink size={13} />
										</a>
									)}
								</div>
							</div>
						</div>
					)}

					{activeSection === "history" && history.length > 0 && (
						<div className="space-y-4">
							<div>
								<h4 className="font-serif text-lg font-bold text-emerald-950 mb-1">
									Scheme Update History
								</h4>
								<p className="text-sm text-emerald-950/65">
									Recent updates and notifications tracked for this scholarship.
								</p>
							</div>

							<div className="space-y-3">
								{history.map((ver, idx) => (
									<div
										key={idx}
										className="rounded-xl border-[1.5px] border-emerald-950/20 bg-yellow-100/60 p-4 space-y-1.5 text-sm"
									>
										<div className="flex items-center justify-between text-emerald-950">
											<span className="font-bold capitalize">
												{ver.changeType?.replace(/_/g, " ").toLowerCase()}
											</span>
											<span className="font-mono text-xs text-emerald-950/60">
												{new Date(ver.observedAt).toLocaleDateString("en-IN", {
													day: "numeric",
													month: "short",
													year: "numeric",
												})}
											</span>
										</div>
										<p className="text-emerald-950/85 leading-relaxed">
											{ver.summary}
										</p>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="sd-evidence-actions flex shrink-0 flex-wrap items-center justify-between gap-3 border-t-[1.5px] border-emerald-950 bg-emerald-50 px-6 py-4">
					<span className="hidden text-xs font-semibold text-emerald-950/55 sm:inline">
						Press{" "}
						<kbd className="rounded border-[1.5px] border-emerald-950/20 bg-white px-1.5 py-0.5 font-mono text-xs font-bold text-emerald-950">
							Esc
						</kbd>{" "}
						to close
					</span>

					<div className="flex items-center gap-2.5 ml-auto">
						{scholarship.applicationLink && (
							<a
								href={cleanOfficialUrl(scholarship.applicationLink)}
								target="_blank"
								rel="noopener noreferrer"
								className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 active:translate-y-px ${focusRing}`}
							>
								<span>Apply on official site</span>
								<ArrowUpRight size={15} />
							</a>
						)}
						<button
							type="button"
							onClick={onClose}
							className={`cursor-pointer rounded-full border-[1.5px] border-emerald-950 bg-white px-5 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-yellow-200 active:translate-y-px ${focusRing}`}
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
