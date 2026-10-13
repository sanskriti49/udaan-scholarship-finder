import { Link } from "react-router-dom";
import { cleanOfficialUrl } from "../utils/formatEvidence.js";

function Source({ evidence, label }) {
	const url = cleanOfficialUrl(evidence?.url);
	if (!url || !evidence?.quote) return null;
	return <div className="nc-impact-source"><a href={url} target="_blank" rel="noopener noreferrer">{label} ↗</a><blockquote>{evidence.quote}</blockquote></div>;
}

export default function EligibilityChangeDetails({ impact, onNavigate }) {
	if (!Array.isArray(impact?.changes) || !impact.changes.length) return null;
	const label = { passed: "Now passes", failed: "No longer passes", unknown: "More information needed" };
	return <details className="nc-impact"><summary>See what changed for you</summary>
		{impact.changes.map(change => <section key={change.ruleId}>
			<strong>{label[change.currentStatus] || "Check changed"}</strong>
			<dl><dt>Before</dt><dd>{change.oldRequirement}</dd><dt>Now</dt><dd>{change.newRequirement}</dd><dt>Saved answer</dt><dd>{change.profileValue}</dd></dl>
			<Source evidence={change.oldEvidence} label="Previous source" /><Source evidence={change.newEvidence} label="Updated source" />
		</section>)}
		{impact.remainingUnknown?.length > 0 && <section><strong>Still needs review</strong><ul>{impact.remainingUnknown.map(check => <li key={check.ruleId}>{check.requirement || check.description}</li>)}</ul></section>}
		{impact.remainingFailed?.length > 0 && <section><strong>Still does not pass</strong><ul>{impact.remainingFailed.map(check => <li key={check.ruleId}>{check.requirement || check.description}</li>)}</ul></section>}
		<p>{impact.caveat}</p>
		<Link to="/eligibility" onClick={onNavigate}>Review your saved profile ↗</Link>
	</details>;
}
