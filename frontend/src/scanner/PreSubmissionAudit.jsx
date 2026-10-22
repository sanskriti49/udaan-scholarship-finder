import { ArrowLeftRight, ArrowRight, CalendarDays, Check, ChevronDown, CircleHelp, FileText, Fingerprint, FolderOpen, Info, LockKeyhole, Plus, ScanLine, Trash2, UserRound } from "lucide-react";
import ScholarshipDoodle from "../components/ScholarshipDoodle.jsx";
import { ConfusedDetective } from "../components/AnimatedIllustrations.jsx";
import { auditCertificate, auditNames, MAX_COMPARISON_DOCUMENTS } from "./documentAudit.js";
import { auditDateLabel, auditDateTrail, markedNameParts } from "./auditPresentation.js";

export function PrivateDocumentSet({ declaredName, documents, onDeclare, onForget, onClear }) {
  return <section className="scanner-private-set" aria-labelledby="private-set-title">
    <header className="audit-desk-header">
      <div><span className="audit-kicker"><FolderOpen size={14} />YOUR APPLICATION DESK</span><h2 id="private-set-title">Your papers, <em>together.</em></h2><p>One application name. A few different papers.<br />Spot the little differences before you submit.</p><span className="audit-local-tag"><LockKeyhole size={12} />Only in this tab · cleared when you leave</span></div>
      <div className="audit-folder-art"><ScholarshipDoodle section="documents" /></div>
    </header>
    <div className="audit-desk-body">
      <div className="audit-application-name"><span className="audit-step-label"><UserRound size={16} />01 · Your reference name</span><label htmlFor="local-application-name">Name on your application (optional, local only)</label><input id="local-application-name" value={declaredName} onChange={event => onDeclare(event.target.value)} maxLength={200} autoComplete="off" spellCheck={false} placeholder="The full name you plan to submit" /><p>Type it here, or choose a reviewed name below. This does not update your account.</p></div>
      <div className="audit-set-heading"><span className="audit-step-label"><FileText size={16} />02 · Your comparison papers</span><span className="audit-set-count">{documents.length} of {MAX_COMPARISON_DOCUMENTS} reviewed names kept in this tab</span></div>
      {documents.length > 0 ? <ul className="scanner-name-set">{documents.map((doc, index) => <li key={doc.id}>
        <div className="audit-paper-top"><span className="audit-paper-number"><FileText size={17} />PAPER {String(index + 1).padStart(2, "0")}</span><button type="button" onClick={() => onForget(doc.id)} aria-label={`Forget ${doc.name} from ${doc.label}`}><Trash2 size={15} /></button></div>
        <p className="audit-paper-type">{doc.label}</p><strong>{doc.name}</strong><span className="audit-paper-method">{doc.source === "manual" ? "Entered or edited by you" : "Machine-read · confirm spelling"}</span><button type="button" className="audit-use-name" onClick={() => onDeclare(doc.name)} aria-pressed={declaredName === doc.name} aria-label={`Use ${doc.name} for application name`}>{declaredName === doc.name ? <Check size={13} /> : <UserRound size={13} />}{declaredName === doc.name ? "Application name" : "Use for application"}<ArrowRight size={13} /></button>
      </li>)}</ul> : <div className="audit-empty-desk"><span className="audit-empty-paper" aria-hidden="true"><FileText size={30} /><Plus size={14} /></span><div><strong>Your first paper goes here.</strong><p>Read an ID, marksheet or certificate below, check its name, then choose <b>Keep reviewed name</b>.</p></div><span className="audit-empty-note">No files kept.<br />Just the names you choose.</span></div>}
      <div className="scanner-private-set-meta"><span><LockKeyhole size={12} />Names stay in browser memory. Nothing is saved to your account.</span>{(declaredName || documents.length > 0) && <button type="button" className="scanner-text-button" onClick={onClear}><Trash2 size={14} />Forget comparison names</button>}</div>
    </div>
  </section>;
}

function Finding({ finding, fields, renderEvidence }) {
  const Icon = finding.tone === "note" ? Info : CircleHelp;
  return <li className={`audit-finding is-${finding.tone}`}>
    <span className="audit-finding-icon"><Icon size={18} aria-hidden="true" /></span><div className="audit-finding-copy"><div className="audit-finding-heading"><h4>{finding.title}</h4><span>{finding.tone === "note" ? "Recorded" : "Review"}</span></div><p className="audit-next-step">{finding.next}</p>
      <details className="audit-explanation"><summary>Why this appeared & source details <ChevronDown size={13} aria-hidden="true" /></summary><div><p>{finding.detail}</p>{finding.fields.map(key => fields[key] && (fields[key].value || fields[key].evidence?.length) ? <div className="audit-source-detail" key={key}>{fields[key].value && <p className="scanner-value">{fields[key].value}</p>}{renderEvidence(fields[key])}</div> : null)}</div></details>
    </div>
  </li>;
}

function NameText({ name, other, highlight }) {
  return markedNameParts(name, other, highlight).map((part, index) => part.changed ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>);
}

export default function PreSubmissionAudit({ type, fields, declaredName, documents, savedId, onKeep, onNext, renderEvidence }) {
  const { fy, findings } = auditCertificate(type, fields);
  const comparisons = auditNames(fields.studentName, documents, declaredName, savedId);
  const name = fields.studentName?.ambiguous ? "" : fields.studentName?.value?.trim();
  const kept = documents.some(doc => doc.id === savedId);
  const full = documents.length >= MAX_COMPARISON_DOCUMENTS && !kept;
  const prompts = findings.filter(f => f.tone !== "note").length + comparisons.filter(c => c.kind !== "exact").length;
  const primaryDates = findings.filter(f => f.tone !== "note" || f.id === "fy-issue");
  if (!primaryDates.length && findings.length) primaryDates.push(findings[0]);
  const otherDates = findings.filter(f => !primaryDates.includes(f));
  const trail = auditDateTrail(fields, fy, findings.some(f => f.id === "fy-issue"));
  return <section className="scanner-audit" aria-labelledby="document-audit-title">
    <header className="audit-review-header"><div><span className="audit-kicker"><ScanLine size={14} />PRE-SUBMISSION REVIEW</span><h2 id="document-audit-title">Little details.<br /><em>A clearer next step.</em></h2><p>{prompts ? `${prompts} ${prompts === 1 ? "prompt" : "prompts"} worth a closer look.` : "A few useful observations from your paper."} You can keep going while you review.</p><span className="audit-advisory-tag">Advisory only · no identity or approval decision</span></div><ConfusedDetective size={122} className="audit-detective-art" /></header>
    <div className="audit-review-body">
      <div className="audit-overview-strip"><span><CalendarDays size={16} /><b>{findings.length}</b> date observations</span><span><Fingerprint size={16} /><b>{comparisons.length}</b> name comparisons</span><span><LockKeyhole size={14} />On your device</span></div>
      {findings.length > 0 && <section className="scanner-audit-group" aria-labelledby="audit-dates-title"><div className="audit-group-heading"><h3 id="audit-dates-title"><span>01</span>Dates & validity</h3>{fy && <span className="audit-fy-label">{fy.label} · India time</span>}</div>
        {trail.length > 1 && <ol className="audit-date-trail" aria-label="Recorded dates in chronological order">{trail.map(point => <li key={point.id} className={`is-${point.id}`}><span className="audit-date-dot" aria-hidden="true">{point.id === "issue" ? <FileText size={14} /> : point.id === "today" ? <ScanLine size={14} /> : <CalendarDays size={14} />}</span><span>{point.label}</span><time dateTime={point.date}>{auditDateLabel(point.date)}</time></li>)}</ol>}
        <p className="scanner-audit-caption">The FY begins April 1. That is a calendar boundary; the provider's instructions determine certificate acceptance.</p>
        <ul className="scanner-audit-findings">{primaryDates.map(finding => <Finding key={finding.id} finding={finding} fields={fields} renderEvidence={renderEvidence} />)}</ul>
        {otherDates.length > 0 && <details className="audit-additional-dates"><summary><Info size={14} />{otherDates.length} more recorded {otherDates.length === 1 ? "date detail" : "date details"}<ChevronDown size={14} /></summary><ul className="scanner-audit-findings">{otherDates.map(finding => <Finding key={finding.id} finding={finding} fields={fields} renderEvidence={renderEvidence} />)}</ul></details>}
      </section>}
      <section className="scanner-audit-group" aria-labelledby="audit-names-title"><div className="audit-group-heading"><h3 id="audit-names-title"><span>{findings.length ? "02" : "01"}</span>Name consistency</h3><span className="audit-fy-label">Compare spelling, not identity</span></div>
        <div className="audit-current-name"><span><UserRound size={18} /></span><div><p>ON THIS DOCUMENT</p><strong>{name || "Name needs a closer look"}</strong></div><FileText size={26} aria-hidden="true" /></div>
        {!name && <div className="scanner-audit-empty"><CircleHelp size={20} /><p>Review “Name on this document” above. Missing or conflicting text remains unverified.</p></div>}
        {name && !comparisons.length && <div className="scanner-audit-empty"><ArrowLeftRight size={22} /><p>Add your application name above, or keep this reviewed name and read another paper.</p></div>}
        {comparisons.length > 0 && <><p className="scanner-audit-caption">Highlighted parts are written differently. Initials and similar spellings still need your confirmation.</p><ul className="audit-name-comparisons">{comparisons.map(result => <li key={result.id} className={`is-${result.kind === "exact" ? "note" : "review"}`}>
          <div className="audit-comparison-heading"><span className="audit-comparison-icon">{result.id === "declared" ? <UserRound size={17} /> : <FileText size={17} />}</span><div><span className="scanner-audit-reference">Compared with {result.label}</span><h4>{result.title}</h4></div><span className="audit-comparison-badge">{result.kind === "exact" ? "Spelling agrees" : "Take a look"}</span></div>
          <div className="scanner-compared-names"><div><span>THIS PAPER</span><p><NameText name={name || "Not readable"} other={result.name} highlight={!["exact", "unknown"].includes(result.kind)} /></p></div><ArrowLeftRight size={17} aria-label="compared with" /><div><span>{result.id === "declared" ? "YOUR APPLICATION" : "KEPT PAPER"}</span><p><NameText name={result.name} other={name} highlight={!["exact", "unknown"].includes(result.kind)} /></p></div></div>
          <details className="audit-explanation"><summary>What this means <ChevronDown size={13} /></summary><div><p>{result.detail}</p></div></details>
        </li>)}</ul></>}
      </section>
    </div>
    <footer className="audit-review-footer"><div><span className="audit-save-icon">{kept ? <Check size={19} /> : <Plus size={19} />}</span><div><strong>{kept ? "This name is in your private set." : "Bring the next paper into the picture."}</strong><p>{name?.length > 200 ? "Review the name; use up to 200 characters." : full ? "Six names are kept. Forget one above to make room." : "Only a reviewed name is kept. Your file and full text stay out of the comparison set."}</p></div></div><div className="scanner-audit-actions"><button type="button" onClick={onKeep} disabled={!name || name.length > 200 || full} className="scanner-primary">{kept ? "Update kept name" : "Keep reviewed name for comparison"}</button><button type="button" onClick={onNext} className="scanner-text-button">Review another document <ArrowRight size={15} /></button></div></footer>
  </section>;
}
