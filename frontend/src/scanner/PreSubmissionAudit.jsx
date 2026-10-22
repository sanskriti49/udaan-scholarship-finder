import { CalendarDays, Fingerprint, ShieldCheck, Trash2, ArrowRight } from "lucide-react";
import { auditCertificate, auditNames, MAX_COMPARISON_DOCUMENTS } from "./documentAudit.js";

export function PrivateDocumentSet({ declaredName, documents, onDeclare, onForget, onClear }) {
  return <section className="scanner-private-set" aria-labelledby="private-set-title">
    <div className="scanner-audit-title"><ShieldCheck size={22} aria-hidden="true" /><div><h2 id="private-set-title">Your private document set</h2><p>Keep reviewed names from up to six papers and compare them before applying. Everything clears when you leave or reload.</p></div></div>
    <label htmlFor="local-application-name">Name on your application (optional, local only)</label>
    <input id="local-application-name" value={declaredName} onChange={event => onDeclare(event.target.value)} maxLength={200} autoComplete="off" spellCheck={false} placeholder="Enter the full name you plan to submit" />
    <div className="scanner-private-set-meta"><span>{documents.length} of {MAX_COMPARISON_DOCUMENTS} reviewed names kept in this tab</span>{(declaredName || documents.length > 0) && <button type="button" className="scanner-text-button" onClick={onClear}><Trash2 size={14} />Forget comparison names</button>}</div>
    {documents.length > 0 && <ul className="scanner-name-set">{documents.map(doc => <li key={doc.id}><div><strong>{doc.name}</strong><span>{doc.label} · {doc.source === "manual" ? "Entered or edited by you" : "Machine-read; confirm spelling"}</span></div><button type="button" onClick={() => onForget(doc.id)} aria-label={`Forget ${doc.name} from ${doc.label}`}><Trash2 size={16} /></button></li>)}</ul>}
  </section>;
}

export default function PreSubmissionAudit({ type, fields, declaredName, documents, savedId, onKeep, onNext, renderEvidence }) {
  const { fy, findings } = auditCertificate(type, fields);
  const comparisons = auditNames(fields.studentName, documents, declaredName, savedId);
  const name = fields.studentName?.ambiguous ? "" : fields.studentName?.value?.trim();
  const full = documents.length >= MAX_COMPARISON_DOCUMENTS && !documents.some(doc => doc.id === savedId);
  const prompts = findings.filter(f => f.tone !== "note").length + comparisons.filter(c => c.kind !== "exact").length;
  return <section className="scanner-audit" aria-labelledby="document-audit-title">
    <div className="scanner-audit-title"><Fingerprint size={24} aria-hidden="true" /><div><p className="scanner-eyebrow">BEFORE YOU SUBMIT</p><h2 id="document-audit-title">A second look at your papers</h2><p>{prompts ? `${prompts} ${prompts === 1 ? "prompt" : "prompts"} to review` : "Local observations"} · Advisory only. These checks never block you or establish identity.</p></div></div>
    {findings.length > 0 && <div className="scanner-audit-group"><h3><CalendarDays size={18} aria-hidden="true" />Certificate dates {fy && <span>{fy.label} · India time</span>}</h3><p className="scanner-audit-caption">April 1 is the FY boundary, not a universal certificate expiry date. The provider's current instructions decide what it accepts.</p><ul className="scanner-audit-findings">{findings.map(finding => <li key={finding.id} className={`is-${finding.tone}`}><strong>{finding.title}</strong><p>{finding.detail}</p><p className="scanner-next"><b>Next:</b> {finding.next}</p>{finding.fields.some(key => fields[key]?.value || fields[key]?.evidence?.length) && <details><summary>Details behind this observation</summary>{finding.fields.map(key => fields[key] && <div key={key}>{fields[key].value && <p className="scanner-value">{fields[key].value}</p>}{renderEvidence(fields[key])}</div>)}</details>}</li>)}</ul></div>}
    <div className="scanner-audit-group"><h3><Fingerprint size={18} aria-hidden="true" />Name consistency</h3><p className="scanner-audit-caption">Initials and similar spellings can still belong to different people. Confirm OCR before requesting a correction.</p>
      {!name && <p className="scanner-audit-empty">Review “Name on this document” above. Unreadable or conflicting names remain unverified.</p>}
      {name && !comparisons.length && <p className="scanner-audit-empty">Add your application name above, or keep this reviewed name and read another document to compare.</p>}
      {comparisons.length > 0 && <ul className="scanner-audit-findings">{comparisons.map(result => <li key={result.id} className={result.kind === "exact" ? "is-note" : "is-review"}><span className="scanner-audit-reference">Compared with {result.label}</span><strong>{result.title}</strong><p className="scanner-compared-names"><span>{name || "Not readable"}</span><span aria-label="compared with">↔</span><span>{result.name}</span></p><p>{result.detail}</p></li>)}</ul>}
      <div className="scanner-audit-actions"><button type="button" onClick={onKeep} disabled={!name || name.length > 200 || full} className="scanner-secondary">{savedId && documents.some(doc => doc.id === savedId) ? "Update kept name" : "Keep reviewed name for comparison"}</button><button type="button" onClick={onNext} className="scanner-text-button">Review another document <ArrowRight size={15} /></button></div><p className="scanner-audit-caption">{name?.length > 200 ? "Review the holder's name; the comparison set accepts up to 200 characters." : full ? "Six names are already kept. Forget one above to add another." : "Keeping a name is an explicit action. Only the name and document type stay in memory; no file or full OCR text is kept in this set."}</p>
    </div>
  </section>;
}
