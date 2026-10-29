import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, BookOpen, FileText, X } from "lucide-react";
import useDialogFocus from "../hooks/useDialogFocus";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import { safeSourceUrl, sourceCheckText } from "./contracts";
import { citationLink } from '../utils/sourceNavigation.js';

export default function SourceDrawer({ source, onClose }) {
	const open = Boolean(source),
		ref = useDialogFocus(open);
	useBodyScrollLock(open);
	useEffect(() => {
		if (!open) return;
		const onKey = (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, onClose]);
	if (!open) return null;
	const evidence = source.evidence,
		url = safeSourceUrl(citationLink(evidence, { title: source.title }).href);
	return createPortal(
		<div
			className="nv-drawer-backdrop"
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<section
				className="nv-source-drawer"
				ref={ref}
				role="dialog"
				aria-modal="true"
				aria-labelledby="nv-source-title"
				tabIndex={-1}
			>
				<div className="nv-drawer-top">
					<span>
						<BookOpen size={17} />
						SOURCE NOTE
					</span>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close source note"
					>
						<X size={21} />
					</button>
				</div>
				<div className="nv-drawer-body">
					<span className="nv-preview-pill">
						Saved official source excerpt
					</span>
					<h2 id="nv-source-title">{source.title}</h2>
					<p className="nv-source-meta">
						{evidence.page ? `Page ${evidence.page}` : "Page not recorded"} ·{" "}
						{url ? new URL(url).hostname : "Source link unavailable"}
					</p>
					<div className="nv-document-page">
						<div>
							<FileText size={18} />
							<span>RECORDED SOURCE EXCERPT</span>
							<strong>{evidence.page || "—"}</strong>
						</div>
						<span className="nv-document-lines" aria-hidden="true" />
						<blockquote>“{evidence.quote}”</blockquote>
						<span
							className="nv-document-lines nv-lines-short"
							aria-hidden="true"
						/>
					</div>
					<div className="nv-margin-note">
						<BookOpen size={22} />
						<p>
							{source.relevance === "scheme_context" && <strong>Supporting scheme context. This excerpt did not match your question directly. </strong>}
							<strong>A quote is a starting point.</strong>Exact text was
							checked against the saved document. Interpretation and present-day
							applicability are not verified.
							{source.extractionNeedsReview
								? " The source extraction also requires manual review."
								: ""}
						</p>
					</div>
					<dl className="nv-provenance">
						<div>
							<dt>Source captured</dt>
							<dd>
								{evidence.fetchedAt &&
								Number.isFinite(Date.parse(evidence.fetchedAt))
									? new Date(evidence.fetchedAt).toLocaleString("en-IN")
									: "Not recorded"}
							</dd>
						</div>
						<div>
							<dt>Document date</dt>
							<dd>{source.documentDate || "Not recorded"}</dd>
						</div>
						<div>
							<dt>Official source check</dt>
							<dd>
								{sourceCheckText(source.sourceCheck)}
								{source.sourceCheck && (
									<small>
										{" "}
										Attempt recorded{" "}
										{new Date(source.sourceCheck.checkedAt).toLocaleString(
											"en-IN",
										)}
									</small>
								)}
							</dd>
						</div>
						<div>
							<dt>Source scope</dt>
							<dd>
								{source.scope === "linked_guideline"
									? "Linked guideline document"
									: "Scheme-bound source excerpt"}
							</dd>
						</div>
					</dl>
					{url && (
						<a
							className="nv-button"
							href={url}
							target="_blank"
							rel="noopener noreferrer"
						>
							Open original source <ArrowUpRight size={16} />
						</a>
					)}
					<p className="nv-drawer-footnote">
						A scheme’s recorded academic year is not automatically the year of
						this source document. Always check the current instructions.
					</p>
				</div>
			</section>
		</div>,
		document.body,
	);
}
