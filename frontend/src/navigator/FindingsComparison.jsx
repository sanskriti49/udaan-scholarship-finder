import { Check, CircleHelp, Columns3, X, BookOpen } from 'lucide-react';
import { findingGroup } from './researchSummary.js';
import { studentCondition, studentFindings } from './studentFindings.js';
import { FIELDS } from './contracts';

const labels = { promising: 'Some conditions fit', unconfirmed: 'Still needs checking', concern: 'Eligibility concern', excluded: 'Does not fit' };
const statuses = { supported: 'Fits this condition', contradicted: 'Does not fit this condition', unknown: 'Still to check' };

export default function FindingsComparison({ entries, requirements, onInspect, onClose, panelRef }) {
  const conditions = new Map();
  for (const entry of entries) {
    for (const condition of [...(entry.retrieval?.conditions ?? []), ...(entry.answer?.conditions ?? [])]) {
      const id = condition.requirementId ?? condition.id;
      if (id && !conditions.has(id)) conditions.set(id, studentCondition({ ...condition, requirementId: id }, requirements));
    }
  }
  return <section className="nv-comparison" ref={panelRef} tabIndex={-1} aria-label="Compare selected scholarships">
    <header><div><span className="nv-eyebrow"><Columns3 size={15} /> THE COMPARISON DESK</span><h2>Same question. Different conditions.</h2><p>A condition that fits does not confirm full eligibility.</p></div><button type="button" className="nv-close-comparison" onClick={onClose} aria-label="Close comparison"><X size={23} /></button></header>
    {!conditions.size && <p className="nv-comparison-footnote">These notes do not yet have individual eligibility findings. You can inspect the saved sources; suitability remains unconfirmed.</p>}
    <div className="nv-comparison-scroll" tabIndex={0} role="region" aria-label="Scholarship conditions comparison; scroll horizontally on small screens">
      <table><caption className="nv-sr">Retained findings only. Missing assessments remain unknown.</caption><thead><tr><th scope="col">What matters</th>{entries.map(entry => <th scope="col" key={entry.schemeId}><span className={`nv-comparison-status is-${findingGroup(entry)}`}>{labels[findingGroup(entry)]}</span><span className="nv-comparison-title">{entry.title}</span>{(entry.stale || entry.sourceChecks?.some(check => check.status === 'changed')) && <small>Guidance needs a current-source check.</small>}</th>)}</tr></thead>
        <tbody>{[...conditions].map(([id, label]) => <tr key={id}><th scope="row">{label}</th>{entries.map(entry => {
          const finding = entry.answer?.conditions.find(item => item.requirementId === id);
          const condition = finding?.status === 'unknown' || studentFindings(entry).established.includes(finding) ? finding : undefined;
          const status = condition?.status ?? 'unknown';
          const Icon = status === 'supported' ? Check : status === 'contradicted' ? X : CircleHelp;
          return <td key={entry.schemeId} className={`nv-comparison-cell is-${status}`}><strong><Icon size={16} />{statuses[status]}</strong>
            {condition ? <details><summary>What we know</summary><p>{condition.explanation}</p>{condition.basis === 'recorded_check' && <small>From saved eligibility rules.</small>}{condition.evidence.map((proof, index) => {
              const citation = entry.citations.find(item => item.id === proof.evidenceId);
              return citation && <button type="button" key={proof.evidenceId + index} className="nv-proof-button" onClick={() => onInspect(entry, citation)}><BookOpen size={13} />Read source</button>;
            })}</details> : <p>This condition has not been assessed.</p>}
          </td>;
        })}</tr>)}
        <tr><th scope="row">Source material</th>{entries.map(entry => <td key={entry.schemeId}>{entry.citations.length} saved excerpt{entry.citations.length === 1 ? '' : 's'}{entry.citations.map((citation,index)=><button type="button" key={citation.id} className="nv-proof-button" onClick={()=>onInspect(entry,citation)}><BookOpen size={13} />Read source {index+1}</button>)}</td>)}</tr>
        <tr><th scope="row">Before applying</th>{entries.map(entry => <td key={entry.schemeId}>{findingGroup(entry) === 'excluded' ? entry.qualification?.reasons[0] || 'An established restriction conflicts with this request.' : findingGroup(entry) === 'concern' ? 'An eligibility conflict needs resolving. Do not treat this as a recommended match.' : entry.matching.missingFields.length ? `Still needed: ${entry.matching.missingFields.map(field => FIELDS[field].label).join(', ')}.` : 'Confirm the remaining conditions and current application window.'}{entry.sourceChecks?.some(check => check.status === 'changed') && <p>The official source has changed; review current guidance.</p>}</td>)}</tr>
        </tbody></table>
    </div>
    <p className="nv-comparison-footnote">Comparing uses your saved findings. No AI request is made.</p>
  </section>;
}
