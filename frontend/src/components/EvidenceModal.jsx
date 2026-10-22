import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, CalendarDays, Coins, FileText, FolderOpen, GitCompareArrows, ListChecks, Loader2, MapPin, NotebookPen, X } from "lucide-react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import useDialogFocus from "../hooks/useDialogFocus";
import { getScholarshipEvidence, getScholarshipHistory } from "../services/scholarshipService";
import { documentItems, evidenceQuotes } from "../utils/evidencePresentation.js";
import { citationLink, scholarshipSourceLinks } from "../utils/sourceNavigation.js";
import { cleanOfficialUrl, formatClauseTitle, formatFieldLabel, formatRuleRequirement } from "../utils/formatEvidence";
import { formatGrant } from "../utils/formatGrant";
import { deadlineInfo } from "../utils/scholarshipMeta";
import { policyDate, policyHistoryEntries, policyUpdateSummary } from "../utils/policyDiff.js";
import AddToCalendarButton from "./AddToCalendarButton";
import PolicyDiffViewer from "./PolicyDiffViewer";
import PolicyRuleTree from "./PolicyRuleTree";
import PreFlightChecklist from "./PreFlightChecklist";
import ScholarshipTranslator from "./ScholarshipTranslator";
import ScholarshipDoodle from "./ScholarshipDoodle";
import { CategoryMotifIcon } from "./CategoryMotif";
import "./scholarship-modal.css";

const sections = [
	{ id: "overview", label: "Overview", icon: BookOpen },
	{ id: "eligibility", label: "Eligibility", icon: ListChecks },
	{ id: "documents", label: "Documents", icon: FolderOpen },
	{ id: "changes", label: "Changes", icon: GitCompareArrows },
];
const validSection = value => sections.some(section => section.id === value) ? value : "eligibility";

function SectionHeading({ icon: Icon, title, children }) {
	return <div className="sch-section-intro sch-section-heading"><span className="sch-section-icon"><Icon size={21} aria-hidden="true" /></span><div><h3>{title}</h3>{children && <p>{children}</p>}</div></div>;
}

export default function EvidenceModal({ isOpen, scholarship, initialSection = "eligibility", ...props }) {
	if (!isOpen || !scholarship) return null;
	return <ScholarshipDialog key={scholarship._id || scholarship.id || scholarship.slug || scholarship.title} scholarship={scholarship} initialSection={initialSection} {...props} />;
}

function SourceExcerpts({ quotes, loading, error, onRetry, title }) {
	return <details className="sch-disclosure sch-evidence-disclosure">
		<summary>Source excerpts <span>{quotes.length}</span></summary>
		<div className="sch-disclosure-body">
			<p className="sch-muted">These are stored source quotations. Generated criteria above are explanations, not quotations.</p>
			{loading && <p className="sch-loading" role="status"><Loader2 size={15} className="animate-spin" />Checking stored excerpts…</p>}
			{error && <p className="sch-inline-error" role="alert">Source checking is unavailable. Stored excerpts remain unverified. <button type="button" className="sch-text-action" onClick={onRetry}>Try again</button></p>}
			{!loading && !quotes.length && <p className="sch-muted">No source excerpt is available for this listing. Check the provider's current instructions.</p>}
			{quotes.map((quote, index) => { const link = citationLink(quote, { title }); return <figure className="sch-source-quote" key={index}>
				<p className="sch-source-title">{formatClauseTitle(quote.clause, quote.field, index + 1)}</p>
				<blockquote>{quote.quote}</blockquote>
				<figcaption><span>{quote.verified ? "Excerpt checked against stored source" : "Not verified"}{quote.page ? ` · Page ${quote.page}` : ""}</span>
					{link.href && <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label} <ArrowUpRight size={13} /></a>}
					{link.rawUrl && <a href={link.rawUrl} target="_blank" rel="noopener noreferrer">Source data <ArrowUpRight size={13} /></a>}
				</figcaption>
			</figure>; })}
		</div>
	</details>;
}

function ScholarshipDialog({ scholarship, onClose, returnFocusRef, initialSection, actions, interactionsBlocked = false, userProfile }) {
	const dialogRef = useDialogFocus(true, returnFocusRef);
	const bodyRef = useRef(null);
	const titleRef = useRef(null);
	const tabRefs = useRef([]);
	const uniqueId = useId();
	const [activeSection, setActiveSection] = useState(() => validSection(initialSection));
	const [titleClipped, setTitleClipped] = useState(false);
	const id = scholarship._id || scholarship.id || scholarship.slug;
	const [evidence, setEvidence] = useState({ data: null, loading: Boolean(id), error: false });
	const [evidenceAttempt, setEvidenceAttempt] = useState(0);
	const [history, setHistory] = useState({ data: Array.isArray(scholarship.history) ? scholarship.history : [], state: id ? "idle" : "loaded" });
	useBodyScrollLock(true);
	useEffect(() => {
		const title = titleRef.current;
		let cancelled = false;
		const measure = () => {
			if (cancelled || !title) return;
			// Font ascenders/descenders can add a few scroll pixels to a complete line.
			const lineHeight = Number.parseFloat(getComputedStyle(title).lineHeight) || 0;
			setTitleClipped(title.scrollHeight - title.clientHeight > Math.max(2, lineHeight / 2));
		};
		const observer = new ResizeObserver(measure);
		if (title) observer.observe(title);
		const frame = requestAnimationFrame(measure);
		document.fonts?.ready.then(measure);
		return () => { cancelled = true; observer.disconnect(); cancelAnimationFrame(frame); };
	}, []);

	useEffect(() => {
		if (!id) return;
		const controller = new AbortController();
		getScholarshipEvidence(id, { signal: controller.signal }).then(response => {
			if (!response.success || !Array.isArray(response.data)) throw new Error("Invalid evidence response");
			if (!controller.signal.aborted) setEvidence({ data: response, loading: false, error: false });
		}).catch(() => {
			if (!controller.signal.aborted) setEvidence({ data: null, loading: false, error: true });
		});
		return () => controller.abort();
	}, [id, evidenceAttempt]);

	useEffect(() => {
		if (!id || activeSection !== "changes" || ["loaded", "error"].includes(history.state)) return;
		const controller = new AbortController();
		getScholarshipHistory(id, { signal: controller.signal }).then(response => {
			if (!response.success || !Array.isArray(response.data)) throw new Error("Invalid history response");
			if (!controller.signal.aborted) setHistory({ data: response.data, state: "loaded" });
		}).catch(() => {
			if (!controller.signal.aborted) setHistory(previous => ({ ...previous, state: "error" }));
		});
		return () => controller.abort();
	}, [id, activeSection, history.state]);

	useEffect(() => {
		if (interactionsBlocked) return;
		const onKeyDown = event => {
			if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); onClose(); }
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [onClose, interactionsBlocked]);

	function selectSection(section) {
		setActiveSection(section);
		bodyRef.current?.scrollTo({ top: 0 });
	}
	function moveTab(event, index) {
		const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
		if (!keys.includes(event.key)) return;
		event.preventDefault();
		const next = event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + sections.length) % sections.length;
		selectSection(sections[next].id); tabRefs.current[next]?.focus();
	}
	const quotes = evidenceQuotes(scholarship, evidence.data);
	const documents = documentItems(scholarship, evidence.data);
	const rules = Array.isArray(scholarship.rules) ? scholarship.rules : [];
	const grant = formatGrant(scholarship.amount);
	const deadlineDate = policyDate(scholarship.deadline);
	const deadline = deadlineInfo(deadlineDate ? scholarship.deadline : null, scholarship.status);
	const { sourceUrl, sourceLabel, guidelinesUrl, guidelinesLabel } = scholarshipSourceLinks(scholarship, evidence.data);
	const applicationUrl = cleanOfficialUrl(scholarship.applicationLink);
	const evaluation = scholarship.evaluation;
	const status = evaluation?.status || (evaluation ? evaluation.isEligible ? "passed" : evaluation.failedRules?.length ? "failed" : "unknown" : null);
	const latestRecordedChange = policyHistoryEntries(history.data).changes.find(entry => entry.version.changeType !== "FIRST_OBSERVED");
	const latestChange = history.state === "loaded" ? latestRecordedChange ? policyUpdateSummary(latestRecordedChange.version, latestRecordedChange.rows) : null : scholarship.latestChangeSummary;
	const profile = userProfile || scholarship.userProfile;
	const retryEvidence = () => { setEvidence(previous => ({ ...previous, loading: true, error: false })); setEvidenceAttempt(attempt => attempt + 1); };

	return createPortal(<div className="sch-modal-overlay" aria-hidden={interactionsBlocked || undefined} inert={interactionsBlocked || undefined}
		onClick={event => { if (event.target === event.currentTarget && !interactionsBlocked) onClose(); }}>
		<div ref={dialogRef} tabIndex={-1} className="sch-modal" role="dialog" aria-modal="true" aria-labelledby={`${uniqueId}-title`}>
			<header className="sch-modal-header">
				<div className="sch-modal-heading">
					<div className="sch-eyebrow"><span className="sch-category-tag"><CategoryMotifIcon category={scholarship.category} size={20} />{scholarship.category || "Scholarship"}</span>{scholarship.level && <span className="sch-level-tag">{scholarship.level}</span>}</div>
					<h2 ref={titleRef} id={`${uniqueId}-title`} title={scholarship.title}>{scholarship.title}</h2>
					<div className="sch-provider-line">{scholarship.organization && <p className="sch-provider">{scholarship.organization}</p>}{scholarship.state && <span className="sch-location"><MapPin size={12} aria-hidden="true" />{scholarship.state}</span>}</div>
				</div>
				<div className="sch-header-art"><ScholarshipDoodle section={activeSection} /></div>
				<button type="button" onClick={onClose} className="sch-modal-close" aria-label="Close scholarship details"><X size={20} /></button>
			</header>
			<div className="sch-modal-tabs" role="tablist" aria-label="Scholarship details">
				{sections.map(({ icon: Icon, ...section }, index) => <button key={section.id} type="button" role="tab" id={`${uniqueId}-${section.id}`} ref={element => { tabRefs.current[index] = element; }}
					aria-selected={activeSection === section.id} aria-controls={`${uniqueId}-panel`} tabIndex={activeSection === section.id ? 0 : -1}
					onKeyDown={event => moveTab(event, index)} onClick={() => selectSection(section.id)}><Icon size={18} aria-hidden="true" /><span>{section.label}</span></button>)}
			</div>
			<div ref={bodyRef} id={`${uniqueId}-panel`} className="sch-modal-body" role="tabpanel" aria-labelledby={`${uniqueId}-${activeSection}`} tabIndex={0}>
				<ScholarshipTranslator title={scholarship.title} scholarshipId={scholarship._id || scholarship.id || scholarship.slug} className="mb-3" />
				{(titleClipped || scholarship.title?.length > 120) && <details className="sch-disclosure sch-full-title"><summary>Full scholarship name</summary><p className="sch-disclosure-body sch-about">{scholarship.title}</p></details>}
				{activeSection === "overview" && <div className="sch-section-stack">
					<div className="sch-overview-facts">
						<div className="sch-award"><p className="sch-fact-label"><Coins size={17} aria-hidden="true" />Award</p><p className={`sch-award-value${grant.isNarrative ? " is-narrative" : ""}`}>{grant.main} {grant.period && <span>{grant.period}</span>}</p>{grant.details && <p className="sch-muted">{grant.details}</p>}</div>
						<div className="sch-deadline"><p className="sch-fact-label"><CalendarDays size={17} aria-hidden="true" />Application deadline</p><p className="sch-deadline-date">{deadlineDate || "Not announced"}</p>{(deadlineDate || ["closed", "upcoming"].includes(scholarship.status)) && <p className={`sch-deadline-status${deadline.tone === "closed" ? " is-closed" : ""}`}>{deadline.text}</p>}{deadlineDate && deadline.tone !== "closed" && <AddToCalendarButton scholarship={scholarship} variant="pill" />}</div>
					</div>
					{grant.options?.length > 1 && <details className="sch-disclosure"><summary>Award breakdown</summary><ul className="sch-disclosure-body sch-rate-list">{grant.options.map((option, index) => <li key={index}><span>{option.course || option.label || `Rate ${index + 1}`}</span><span>₹{option.value?.toLocaleString("en-IN")}{option.period ? ` / ${option.period}` : ""}{option.months ? ` · ${option.months} months` : ""}</span></li>)}</ul></details>}
					<section className="sch-about-section"><SectionHeading icon={NotebookPen} title="About this scholarship" /><p className="sch-about">{scholarship.description || scholarship.summary || "A description has not been recorded. Check the provider's current instructions."}</p></section>
					{latestChange && <button type="button" className="sch-update-note" onClick={() => selectSection("changes")}><span><strong>Recently updated</strong><span>{latestChange}</span></span><span className="sch-update-link">View changes →</span></button>}
					<section className="sch-official-info"><h3>Official information</h3><div className="sch-source-links">{sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{sourceLabel} <ArrowUpRight size={14} /></a>}{guidelinesUrl && sourceUrl !== guidelinesUrl && <a href={guidelinesUrl} target="_blank" rel="noopener noreferrer">{guidelinesLabel} <ArrowUpRight size={14} /></a>}{!sourceUrl && !guidelinesUrl && <p className="sch-muted">An official source link has not been recorded.</p>}</div><p className="sch-muted">Some providers publish several schemes on one page. Passage links help locate this scholarship; confirm the current terms before applying.</p></section>
				</div>}
				{activeSection === "eligibility" && <div className="sch-section-stack">
					<SectionHeading icon={ListChecks} title="Who can apply">These are the recorded criteria. Additional conditions may apply.</SectionHeading>
					{status && <p className={`sch-profile-outcome is-${status}`}>{status === "passed" ? "Your profile meets the recorded criteria." : status === "failed" ? "Your profile does not meet this recorded policy." : "More information or review is needed to check your profile."}</p>}
					{scholarship.ruleTree ? <PolicyRuleTree tree={scholarship.ruleTree} evaluation={evaluation?.evaluationTree} /> : rules.length > 0 ? <dl className="sch-criteria">{rules.map((rule, index) => <div key={rule.id || index}><dt>{formatFieldLabel(rule.field)}</dt><dd>{formatRuleRequirement(rule) || "Needs review"}</dd></div>)}</dl> : <p className="sch-empty-state">Eligibility criteria have not been recorded. Check the provider's current instructions.</p>}
					<SourceExcerpts quotes={quotes} loading={evidence.loading} error={evidence.error} onRetry={retryEvidence} title={scholarship.officialTitle || scholarship.title} />
					{!evaluation && <Link className="sch-text-action" to="/eligibility" onClick={onClose}>Check against my profile <ArrowUpRight size={14} /></Link>}
				</div>}
				{activeSection === "documents" && <div className="sch-section-stack">
					<SectionHeading icon={FolderOpen} title="Documents to prepare">Source-cited instructions and preparation suggestions are labelled separately.</SectionHeading>
					{documents.length ? <ul className="sch-documents">{documents.map((document, index) => <li key={document.code || index}><FileText size={18} aria-hidden="true" /><div><p>{document.name}</p><span>{document.sourceCited ? document.mandatory ? "Required per cited instructions" : "Listed in cited instructions" : "Preparation suggestion — not verified"}</span></div></li>)}</ul> : <p className="sch-empty-state">Document requirements have not been verified. Check the provider's current document list.</p>}
					<Link className="sch-text-action" to={id ? `/scanner?scholarship=${encodeURIComponent(id)}` : "/scanner"} onClick={onClose}>Review a document <ArrowUpRight size={14} /></Link>
					<details className="sch-disclosure"><summary>Your preparation checklist</summary><div className="sch-disclosure-body"><PreFlightChecklist scholarship={scholarship} /></div></details>
				</div>}
				{activeSection === "changes" && <div className="sch-section-stack">
					{["idle", "loading"].includes(history.state) && <p role="status" className="sch-loading"><Loader2 size={16} className="animate-spin" />Loading recorded changes…</p>}
					{history.state === "error" && <div className="sch-inline-error" role="alert"><p>We couldn't load the change history.{history.data.length ? " Previously loaded records are shown below." : " Try again to see whether saved versions are available."}</p><button type="button" className="sch-text-action" onClick={() => setHistory(previous => ({ ...previous, state: "loading" }))}>Try again</button></div>}
					{(history.data.length > 0 || history.state === "loaded") && <PolicyDiffViewer history={history.data} scholarship={scholarship} userProfile={profile} onNavigate={onClose} />}
				</div>}
			</div>
			<footer className="sch-modal-footer"><p>Applications are handled by the provider.</p><div className="sch-footer-actions">{actions}{(applicationUrl || sourceUrl) && <a className="sch-primary-action" href={applicationUrl || sourceUrl} target="_blank" rel="noopener noreferrer">{applicationUrl && deadline.tone !== "closed" ? "Apply on official site" : "Visit provider"}<ArrowUpRight size={16} /><span className="sr-only"> (opens in a new tab)</span></a>}</div></footer>
		</div>
	</div>, document.body);
}
