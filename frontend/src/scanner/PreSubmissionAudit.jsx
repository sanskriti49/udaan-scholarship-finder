import { ArrowLeftRight, ArrowRight, Check, ChevronDown, CircleHelp, FileText, FolderOpen, Info, LockKeyhole, Plus, Trash2, UserRound } from "lucide-react";
import { useEffect, useRef } from "react";
import ScholarshipDoodle from "../components/ScholarshipDoodle.jsx";
import { ConfusedDetective } from "../components/AnimatedIllustrations.jsx";
import { auditCertificate, auditNames, MAX_COMPARISON_DOCUMENTS } from "./documentAudit.js";
import { auditDateLabel, auditDateTrail, markedNameParts } from "./auditPresentation.js";

export function PrivateDocumentSet({ declaredName, documents, onDeclare, onForget, onClear }) {
  return <section className="scanner-private-set" aria-labelledby="private-set-title">
    <header className="audit-desk-header">
      <div><span className="audit-kicker"><FolderOpen size={14} />YOUR APPLICATION DESK</span><h2 id="private-set-title">Your papers, <em>together.</em></h2><p>Compare names across your papers.</p><span className="audit-local-tag"><LockKeyhole size={12} />Only in this tab · cleared when you leave</span></div>
      <div className="audit-folder-art"><ScholarshipDoodle section="documents" /></div>
    </header>
    <div className="audit-desk-body">
      <div className="audit-application-name"><span className="audit-step-label"><UserRound size={16} />01 · Your reference name</span><label htmlFor="local-application-name">Name on your application (optional, local only)</label><input id="local-application-name" value={declaredName} onChange={event => onDeclare(event.target.value)} maxLength={200} autoComplete="off" spellCheck={false} placeholder="The full name you plan to submit" /><p>Type a name or choose one below. Your account stays unchanged.</p></div>
      <div className="audit-set-heading"><span className="audit-step-label"><FileText size={16} />02 · Your comparison papers</span><span className="audit-set-count">{documents.length} of {MAX_COMPARISON_DOCUMENTS} reviewed names kept in this tab</span></div>
      {documents.length > 0 ? <ul className="scanner-name-set">{documents.map((doc, index) => <li key={doc.id}>
        <div className="audit-paper-top"><span className="audit-paper-number"><FileText size={17} />PAPER {String(index + 1).padStart(2, "0")}</span><button type="button" onClick={() => onForget(doc.id)} aria-label={`Forget ${doc.name} from ${doc.label}`}><Trash2 size={15} /></button></div>
        <p className="audit-paper-type">{doc.label}</p><strong>{doc.name}</strong><span className="audit-paper-method">{doc.source === "manual" ? "Entered or edited by you" : "Machine-read · confirm spelling"}</span><button type="button" className="audit-use-name" onClick={() => onDeclare(doc.name)} aria-pressed={declaredName === doc.name} aria-label={`Use ${doc.name} for application name`}>{declaredName === doc.name ? <Check size={13} /> : <UserRound size={13} />}{declaredName === doc.name ? "Application name" : "Use for application"}<ArrowRight size={13} /></button>
      </li>)}</ul> : <div className="audit-empty-desk"><span className="audit-empty-paper" aria-hidden="true"><FileText size={30} /><Plus size={14} /></span><div><strong>Your first paper goes here.</strong><p>Scan a paper below, then <b>keep its reviewed name</b>.</p></div><span className="audit-empty-note">No files kept.<br />Just the names you choose.</span></div>}
      <div className="scanner-private-set-meta"><span><LockKeyhole size={12} />Names stay in this tab, off your account.</span>{(declaredName || documents.length > 0) && <button type="button" className="scanner-text-button" onClick={onClear}><Trash2 size={14} />Forget comparison names</button>}</div>
    </div>
  </section>;
}

function Finding({ finding, fields, renderEvidence }) {
  return <li className={`audit-finding is-${finding.tone}`}>
    <div className="audit-finding-copy"><div className="audit-finding-heading"><h4>{finding.title}</h4></div>
      <details className="audit-explanation"><summary>Advice & source details <ChevronDown size={13} aria-hidden="true" /></summary><div><p className="audit-next-step"><strong>Next step:</strong> {finding.next}</p><p>{finding.detail}</p>{finding.fields.map(key => fields[key] && (fields[key].value || fields[key].evidence?.length) ? <div className="audit-source-detail" key={key}>{fields[key].value && <p className="scanner-value">{fields[key].value}</p>}{renderEvidence(fields[key])}</div> : null)}</div></details>
    </div>
  </li>;
}

function NameText({ name, other, highlight }) {
  return markedNameParts(name, other, highlight).map((part, index) => part.changed ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>);
}

function ReviewIllustration() {
  const scene = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        scene.current?.classList.add("is-in-view");
        observer.disconnect();
      }
    }, { threshold: .25 });
    observer.observe(scene.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={scene} className="audit-review-scene" aria-hidden="true">
    <svg className="audit-scene-papers" viewBox="0 0 230 180" fill="none" stroke="#365540" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      <ellipse cx="117" cy="166" rx="99" ry="9" fill="#e4e9d7" stroke="none" />
      <path d="M27 35 112 23 132 147 44 160Z" fill="#dad5ef" />
      <g className="audit-scene-paper">
        <path d="M42 16H119L138 35V151H42Z" fill="#fffdf3" />
        <path d="M119 16V35H138" fill="#f7dd88" />
        <path d="M56 47H118M56 55H101M56 121H117M56 130H108" stroke="#b0b99e" />
        <path d="M56 65H117V109H56Z" fill="#edf2e4" />
        <path d="M56 76H117M68 61V69M104 61V69" />
        <path d="M68 87H75M88 87H95M68 97H75M88 97H95" stroke="#889b79" />
        <path className="audit-scene-sweep" d="M49 55H131" stroke="#d2ab41" strokeWidth="5" opacity=".55" />
      </g>
      <path d="m19 69-7 3m12 7-5 5M154 19l4-6m5 12 7-1" stroke="#b4a4d3" />
      <path d="m157 137 4-8 3 8 8 3-8 3-3 8-4-8-8-3Z" fill="#f7dd88" />
    </svg>
    <ConfusedDetective size={142} className="audit-detective-art" />
  </div>;
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
    <header className="audit-review-header"><div><span className="audit-kicker">PRE-SUBMISSION REVIEW</span><h2 id="document-audit-title">A closer<br /><em>look.</em></h2><p className="audit-review-count">{prompts ? <><strong>{prompts}</strong> {prompts === 1 ? "detail" : "details"} to review</> : "Review your dates and names"}</p><span className="audit-advisory-tag">Advisory only</span></div><ReviewIllustration /></header>
    <div className="audit-review-body">
      <div className="audit-overview-strip"><span><b>{findings.length}</b> date observations</span><span><b>{comparisons.length}</b> name comparisons</span><span><LockKeyhole size={12} />On your device</span></div>
      {findings.length > 0 && <section className="scanner-audit-group" aria-labelledby="audit-dates-title"><div className="audit-group-heading"><h3 id="audit-dates-title"><span>01</span>Dates & validity</h3>{fy && <span className="audit-fy-label">{fy.label} · India time</span>}</div>
        {trail.length > 1 && <ol className="audit-date-trail" aria-label="Recorded dates in chronological order">{trail.map(point => <li key={point.id} className={`is-${point.id}`}><span className="audit-date-dot" aria-hidden="true" /><span>{point.label}</span><time dateTime={point.date}>{auditDateLabel(point.date)}</time></li>)}</ol>}
        <p className="scanner-audit-caption">FY dates alone do not determine acceptance.</p>
        <ul className="scanner-audit-findings">{primaryDates.map(finding => <Finding key={finding.id} finding={finding} fields={fields} renderEvidence={renderEvidence} />)}</ul>
        {otherDates.length > 0 && <details className="audit-additional-dates"><summary><Info size={14} />{otherDates.length} more recorded {otherDates.length === 1 ? "date detail" : "date details"}<ChevronDown size={14} /></summary><ul className="scanner-audit-findings">{otherDates.map(finding => <Finding key={finding.id} finding={finding} fields={fields} renderEvidence={renderEvidence} />)}</ul></details>}
      </section>}
      <section className="scanner-audit-group" aria-labelledby="audit-names-title"><div className="audit-group-heading"><h3 id="audit-names-title"><span>{findings.length ? "02" : "01"}</span>Name consistency</h3><span className="audit-fy-label">Compare spelling, not identity</span></div>
        {!comparisons.length && <div className="audit-current-name"><div><p>NAME ON THIS DOCUMENT</p><strong>{name || "Name needs a closer look"}</strong></div></div>}
        {!name && <div className="scanner-audit-empty"><CircleHelp size={20} /><p>Review “Name on this document” above. Missing or conflicting text remains unverified.</p></div>}
        {name && !comparisons.length && <div className="scanner-audit-empty"><ArrowLeftRight size={22} /><p>Add your application name above, or keep this reviewed name and read another paper.</p></div>}
        {comparisons.length > 0 && <><p className="scanner-audit-caption">Highlights show spelling differences. Confirm against the original.</p><ul className="audit-name-comparisons">{comparisons.map(result => <li key={result.id} className={`is-${result.kind === "exact" ? "note" : "review"}`}>
          <div className="audit-comparison-heading"><div><span className="scanner-audit-reference">Compared with {result.label}</span><h4>{result.title}</h4></div></div>
          <div className="scanner-compared-names"><div><span>THIS PAPER</span><p><NameText name={name || "Not readable"} other={result.name} highlight={!["exact", "unknown"].includes(result.kind)} /></p></div><ArrowLeftRight size={17} aria-label="compared with" /><div><span>{result.id === "declared" ? "YOUR APPLICATION" : "KEPT PAPER"}</span><p><NameText name={result.name} other={name} highlight={!["exact", "unknown"].includes(result.kind)} /></p></div></div>
          <details className="audit-explanation"><summary>What this means <ChevronDown size={13} /></summary><div><p>{result.detail}</p></div></details>
        </li>)}</ul></>}
      </section>
    </div>
    <footer className="audit-review-footer"><div><div><strong>{kept ? "Name kept for your next comparison." : "Compare with your next document."}</strong><p>{name?.length > 200 ? "Review the name; use up to 200 characters." : full ? "Six names are kept. Forget one above to make room." : "Reviewed name only · forgotten when you leave"}</p></div></div><div className="scanner-audit-actions"><button type="button" onClick={onKeep} disabled={!name || name.length > 200 || full} className="scanner-primary">{kept ? "Update kept name" : "Keep reviewed name for comparison"}</button><button type="button" onClick={onNext} className="scanner-text-button">Review another document <ArrowRight size={15} /></button></div></footer>
  </section>;
}
