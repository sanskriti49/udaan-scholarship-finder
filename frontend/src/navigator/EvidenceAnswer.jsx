import { safeSourceUrl } from './contracts';
import { Link } from 'react-router-dom';
import { citationLink } from '../utils/sourceNavigation.js';

const failureText = {
  PARTIAL_VALIDATION: 'Some proposed answers did not pass source checks. Valid findings were kept; the others were withheld.',
  EVIDENCE_GAPS: 'The available sources leave some of your questions unanswered. Review the individual findings below.',
  QUOTE_BOUNDARY: 'A proposed answer quoted an incomplete source clause. That conclusion was withheld.',
  QUOTE_NOT_FOUND: 'A generated quotation did not exactly match its source. That conclusion was withheld.',
  EVIDENCE_MISSING: 'A proposed answer cited evidence that was not retrieved for this scholarship.',
  EVIDENCE_MISMATCH: 'A cited passage did not match the checked source record. That conclusion was withheld.',
  UNSUPPORTED_CONCLUSION: 'A proposed conclusion was not substantiated by the supplied evidence. It remains unconfirmed.',
  MALFORMED_ANSWER: 'The AI returned an unreadable answer. Your checked sources remain available.',
  EMPTY_ANSWER: 'The AI returned no findings to validate. Your checked sources are saved; the questions remain open.',
  INVALID_ANSWER_SCHEMA: 'The AI returned an answer in an unusable format. Your checked sources remain available.',
  INVALID_ASSESSMENT_SCHEMA: 'A proposed finding was incomplete or incorrectly structured and was withheld.',
  UNKNOWN_SCHEME: 'The AI referred to a scholarship outside the examined evidence. That finding was withheld.',
  UNKNOWN_REQUIREMENT: 'The AI answered a condition outside the validated question. That finding was withheld.',
  CONTRADICTORY_ASSESSMENTS: 'The generated findings contradicted each other. The affected conditions remain unconfirmed.',
  DEPENDENCY_UNRESOLVED: 'A proposed conclusion relied on another generated finding that could not be validated. The dependent conclusion was withheld.',
  DEPENDENCY_INVALID: 'A proposed finding relied on circular or invalid assumptions. It was withheld.',
  PROVIDER_TIMEOUT: 'The provider did not respond within the time allowed. Your checked sources are saved; no automatic retry is running.',
  PROVIDER_UNAVAILABLE: 'The AI provider could not be reached. Your checked sources are saved.',
  PROVIDER_AUTH: 'The AI service configuration needs attention. Your checked sources are saved.',
  PROVIDER_REQUEST_REJECTED: 'The AI provider rejected this request. Your checked sources are saved.',
  PROVIDER_RESPONSE_INVALID: 'The provider returned an incomplete or unusable answer. Your checked sources are saved.',
  MODEL_PROTOCOL: 'The AI returned an unsupported response. Your checked sources are saved.',
  INVALID_EVIDENCE_ANSWER: 'The generated answer failed a source check. This older result did not record which check failed.',
};

export function AnswerNotice({ answer }) {
  if (!answer) return null;
  const reasons = {
    INSUFFICIENT_EVIDENCE: 'The stored sources do not contain enough usable policy information to answer this question.',
    SOURCE_COVERAGE_GAP: 'The available documents did not provide usable policy evidence. This is a gap in source coverage; it does not mean you are ineligible.',
    MODEL_LIMIT: 'The AI allowance for this investigation was used. No extra request was made.',
    NOT_REQUESTED: 'You chose catalogue browsing without AI.',
    PROVIDER_QUOTA: 'The provider reached its allowance while preparing the explanation. Your source research was retained.',
    QUOTA_EXHAUSTED: 'The daily AI allowance was reached. Your source research was retained.',
    CONTEXT_LIMIT: 'The source material could not fit this investigation’s answer allowance. The saved sources remain available for review.',
  };
  const reasonText = answer.reason ? reasons[answer.reason] ?? failureText[answer.reason] : null;
  return <section className="nv-status-note" aria-label="Evidence answer status">
    <strong>{answer.status === 'answered' ? 'What the available evidence says' : answer.acceptedAssessments > 0 ? 'Partial findings — questions remain' : 'The key questions are still open'}</strong>
    <p>{reasonText ?? answer.message}</p>
    {answer.status === 'partial' && <p><a href="#nv-saved-findings">Review the saved findings and sources</a>{' · '}<Link to="/navigator">Revise your question</Link>. Neither action automatically starts AI research.</p>}
    {(answer.diagnostics?.length > 0 || answer.cacheHit) && <details><summary>Technical validation details</summary>{answer.cacheHit && <p>A saved explanation was reused after checking that the question, conditions and cited sources still match.</p>}<ul>{answer.diagnostics?.map((d, i) => <li key={i}><code>{d.code}</code>{d.requirementId ? ` · ${d.requirementId}` : ''}{d.index != null ? ` · assessment ${d.index + 1}` : ''}</li>)}</ul></details>}
  </section>;
}

export function EvidenceAnswer({ entry }) {
  if (!entry.answer) return null;
  const established = entry.answer.conditions.filter(item => item.status !== 'unknown');
  const recorded = established.filter(item => item.status === 'supported' && item.basis === 'recorded_check');
  const interpreted = established.filter(item => !recorded.includes(item));
  const unknown = entry.answer.conditions.filter(item => item.status === 'unknown');
  const documentedUnknown = unknown.filter(item => item.evidence.length > 0);
  const unanswered = unknown.filter(item => !item.evidence.length);
  const evidence = item => item.evidence.map((proof, index) => {
    const citation = entry.citations.find(c => c.id === proof.evidenceId);
    return <blockquote key={`${proof.evidenceId}-${index}`}>
      {proof.quote.length > 240 ? <details><summary>Read the cited clause</summary><p>{proof.quote}</p></details> : <p>{proof.quote}</p>}
      {proof.quote !== citation.evidence.quote && <details><summary>Read the surrounding passage</summary><p className="nv-source-context">{citation.evidence.quote}</p></details>}
      <a href={safeSourceUrl(citationLink(citation.evidence, { title: entry.title }).href)} target="_blank" rel="noopener noreferrer">Read the supporting source{citation.evidence.locator ? ` · ${citation.evidence.locator}` : citation.evidence.page ? ` · page ${citation.evidence.page}` : ''}</a>
      {citation.documentDate && <span> · {citation.documentDate}</span>}
    </blockquote>;
  });
  return <section className="nv-status-note nv-evidence-answer" aria-label="Answers from source evidence">
    <h3>What the sources establish</h3>
    {entry.answer.concern && <p><strong>Eligibility concern — do not treat this as a recommended match.</strong> The source interpretation suggests an incompatible condition; verify it before applying.</p>}
    {recorded.length > 0 && <div className="nv-recorded-findings"><h4>Recorded conditions that fit</h4><p>{recorded.map(item => item.label).join(' · ')}</p><details><summary>Read these recorded checks</summary>{recorded.map(item => <article key={item.requirementId}><strong>{item.label}</strong><p>{item.explanation}</p>{evidence(item)}</article>)}</details></div>}
    {interpreted.map(item => <article className={`nv-answer-condition nv-answer-${item.status}`} key={item.requirementId}>
      <h4>{item.label}</h4>
      <p><strong>{({ supported: 'Supported for this condition', contradicted: 'Does not fit this condition', unknown: 'Still needs confirmation' })[item.status]}</strong>
        {' · '}{item.basis === 'source_interpretation' ? 'AI interpretation of the cited text' : item.basis === 'recorded_check' ? 'Recorded check' : 'Not established'}</p>
      <p>{item.explanation}</p>
      {evidence(item)}
    </article>)}
    {unknown.length > 0 && <section className="nv-answer-open" aria-label="Conditions still to confirm"><h4>Still needs confirmation</h4>
      {documentedUnknown.length > 0 && <ul>{documentedUnknown.map(item => <li key={item.requirementId}><strong>{item.label}</strong><p>{item.explanation}</p>{evidence(item)}</li>)}</ul>}
      {unanswered.length > 0 && <><p><strong>{unanswered[0].label}</strong></p><p>{unanswered[0].explanation}</p><details><summary>What information is still missing ({unanswered.length})</summary><ul>{unanswered.map(item => <li key={item.requirementId}><strong>{item.label}</strong><p>{item.explanation}</p>{item.validationCode && <p>{failureText[item.validationCode] ?? 'This proposed finding could not be validated and remains unconfirmed.'}</p>}</li>)}</ul></details></>}
    </section>}
    <p>{entry.answer.limitation}</p>
  </section>;
}
