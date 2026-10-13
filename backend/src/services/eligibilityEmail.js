const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const safeUrl = value => {
	try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? escape(url.href) : null; }
	catch { return null; }
};
const source = (evidence, label) => {
	const url = safeUrl(evidence?.url);
	return url && evidence?.quote ? `<p><a href="${url}">${label}</a></p><blockquote>${escape(evidence.quote)}</blockquote>` : "";
};

export function eligibilityEmailContent(data) {
	const impact = data.data || {};
	return `<h2>${escape(data.title)}</h2><p>${escape(data.message)}</p>${(impact.changes || []).map(change =>
		`<section><p><strong>Before:</strong> ${escape(change.oldRequirement)}<br><strong>Now:</strong> ${escape(change.newRequirement)}<br><strong>Saved answer:</strong> ${escape(change.profileValue)}</p>${source(change.oldEvidence, "Previous source")}${source(change.newEvidence, "Updated source")}</section>`).join("")}
		<h3>Still needs review</h3><ul>${(impact.remainingUnknown || []).map(check => `<li>${escape(check.requirement || check.description)}</li>`).join("") || "<li>No unknown checks recorded.</li>"}</ul>
		${impact.remainingFailed?.length ? `<h3>Still does not pass</h3><ul>${impact.remainingFailed.map(check => `<li>${escape(check.requirement || check.description)}</li>`).join("")}</ul>` : ""}
		<p>${escape(impact.caveat)}</p>`;
}
