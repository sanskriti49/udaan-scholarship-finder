import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, GitCompareArrows, History, Loader2, Minus, Plus } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { replayScholarshipEligibility } from "../services/scholarshipService";
import { cleanOfficialUrl } from "../utils/formatEvidence.js";
import { citationLink } from "../utils/sourceNavigation.js";
import { formatPolicyRowValue, policyHistoryEntries, policyVersionPresentation, policyEvidence, policyDate, policyFieldLabel, policyUpdateSummary } from "../utils/policyDiff.js";
const outcomes = { passed: "Meets recorded criteria", failed: "Does not meet recorded criteria", unknown: "Needs information or review" };

export default function PolicyDiffViewer({ history = [], scholarship, userProfile = null, onNavigate }) {
	const { user } = useAuth();
	const [replay, setReplay] = useState(null);
	const requestRef = useRef(null);
	useEffect(() => () => requestRef.current?.abort(), []);
	const { changes, routine } = policyHistoryEntries(history);
	const hasProfile = userProfile && Object.keys(userProfile).length > 0;

	async function compareProfile(version, key) {
		requestRef.current?.abort();
		const controller = new AbortController(); requestRef.current = controller;
		setReplay({ key, loading: true });
		try {
			const result = await replayScholarshipEligibility(scholarship._id || scholarship.id || scholarship.slug,
				{ ...(hasProfile ? { profile: userProfile } : {}), ...(version.versionKey ? { versionKey: version.versionKey } : { targetDate: version.observedAt }) },
				{ signal: controller.signal });
			if (!result.success || !result.historical || !result.current) throw new Error("No comparison was returned for this change.");
			if (!controller.signal.aborted) setReplay({ key, result });
		} catch (error) {
			if (!controller.signal.aborted) setReplay({ key, error: error.response?.data?.message || error.message || "Comparison is unavailable. Please try again." });
		}
	}

	if (!changes.length && !routine.length) return (
		<div className="sch-empty-state">
			<span className="sch-empty-icon"><History size={23} aria-hidden="true" /></span>
			<h3>No recorded changes yet</h3>
			<p>There are no saved before-and-after terms to compare for this scholarship. This does not mean the provider has never changed its policy.</p>
		</div>
	);

	return <div className="sch-policy-history">
		<div className="sch-section-intro sch-section-heading">
			<span className="sch-section-icon"><GitCompareArrows size={21} aria-hidden="true" /></span>
			<div><h3>What changed</h3>
			<p>Compare changes to the recorded terms. Dates show when Udaan observed them, which may differ from the provider's announcement date.</p></div>
		</div>
		{routine.length > 0 && !changes.some(({ version }) => version.changeType !== "FIRST_OBSERVED") && <div className="sch-empty-state">
			<span className="sch-empty-icon"><History size={23} aria-hidden="true" /></span>
			<h3>No changed terms recorded</h3>
			<p>The saved updates repeat the same terms. Unchanged records are grouped below for reference.</p>
		</div>}
		{changes.map(({ version, rows }, index) => {
			const key = String(version._id || version.id || `${version.observedAt}-${index}`);
			const { label, tone, criteriaChanged, note } = policyVersionPresentation(version, rows);
			const date = policyDate(version.observedAt);
			const canReplay = criteriaChanged && (version.versionKey || date) && (scholarship._id || scholarship.id || scholarship.slug);
			return <details className="sch-history-entry" key={key} open={index === 0 && (version.changeType !== "FIRST_OBSERVED" || routine.length === 0)}>
				<summary className="sch-history-summary">
					<span className="sch-history-heading"><span className={`sch-change-label ${tone}`}>{label}</span>{date && <time dateTime={version.observedAt}>{date}</time>}</span>
					<span className="sch-history-description">{policyUpdateSummary(version, rows)}</span>
					{version.academicYear && <span className="sch-history-cycle">Academic year {version.academicYear}</span>}
					<span className="sch-history-count">{rows.length ? `${rows.length} changed ${rows.length === 1 ? "detail" : "details"}` : "View record"}<span aria-hidden="true">⌄</span></span>
				</summary>
				<div className="sch-history-body">
					{note && <p className="sch-history-note">{note}</p>}
					{version.comparisonIncomplete && rows.length > 0 && <p className="sch-history-note">Some comparison values are missing from this record. Confirm the current terms on the official source.</p>}
					{rows.length > 0 ? <div className="sch-diff-list">{rows.map(row => <section key={row.key} className="sch-diff-row" aria-label={`${policyFieldLabel(row.field)} change`}>
						<h4>{policyFieldLabel(row.field)}</h4>
						<div className="sch-diff-columns">
							<div className="sch-diff-before"><span className="sch-diff-caption"><Minus size={13} aria-hidden="true" />Before</span><p>{row.oldValue == null ? "Not previously recorded" : <del>{formatPolicyRowValue(row, "oldValue")}</del>}</p></div>
							<div className="sch-diff-after"><span className="sch-diff-caption"><Plus size={13} aria-hidden="true" />After this update</span><p>{row.newValue == null ? "No longer recorded" : <ins>{formatPolicyRowValue(row, "newValue")}</ins>}</p></div>
						</div>
					</section>)}</div> : <p className="sch-muted">{version.changeType === "FIRST_OBSERVED" ? "This is the first saved observation. An earlier policy was not recorded, so a comparison is unavailable." : "This entry contains an update summary, but no structured before-and-after values were saved."}</p>}
					<SourceExcerpts evidence={rows.length && Array.isArray(version.relatedEvidence) ? version.relatedEvidence : version.evidence} fields={rows.length ? rows.map(row => row.field) : null} title={scholarship?.officialTitle || scholarship?.title} />
					{canReplay && <div className="sch-replay">
						{user || hasProfile ? <button type="button" className="sch-text-action" disabled={replay?.loading} onClick={() => compareProfile(version, key)}>{replay?.key === key && replay.loading && <Loader2 size={14} className="animate-spin" />}Compare my eligibility at this date</button> : <Link className="sch-text-action" to="/eligibility" onClick={onNavigate}>Add a profile to compare your eligibility <ArrowUpRight size={14} /></Link>}
						{replay?.key === key && replay.loading && <p role="status" className="sch-muted">Checking the recorded rules against your profile…</p>}
						{replay?.key === key && replay.error && <p className="sch-inline-error" role="alert">{replay.error}</p>}
						{replay?.key === key && replay.result && <div className="sch-replay-result" role="status">
							<div className="sch-diff-columns"><div><span className="sch-diff-caption">At this date</span><p>{outcomes[replay.result.historical.status] || "Not verified"}</p></div><div><span className="sch-diff-caption">Current rules</span><p>{outcomes[replay.result.current.status] || "Not verified"}</p></div></div>
							<p className="sch-muted">This compares recorded criteria with the same profile. It does not confirm an award.</p>
						</div>}
					</div>}
				</div>
			</details>;
		})}
		{routine.length > 0 && <details className="sch-routine-history">
			<summary>{routine.length} unchanged {routine.length === 1 ? "record" : "records"}</summary>
			<p>These saved entries contain no change to the recorded terms. They are kept here for reference.</p>
			{routine.map(({ version }, index) => <div className="sch-routine-entry" key={String(version._id || version.id || index)}>
				<p><time dateTime={version.observedAt}>{policyDate(version.observedAt) || "Observation date not recorded"}</time> · Recorded terms unchanged</p>
				<SourceExcerpts evidence={version.evidence} title={scholarship?.officialTitle || scholarship?.title} />
			</div>)}
		</details>}
	</div>;
}

function SourceExcerpts({ evidence = [], fields = null, title }) {
	const excerpts = policyEvidence(Array.isArray(evidence) ? evidence : [], fields);
	if (!excerpts.length) return fields?.length ? <p className="sch-muted">No matching source excerpt was saved for these changed details. Check the official source before relying on this record.</p> : null;
	return <details className="sch-disclosure">
		<summary>Source excerpts for this update <span>{excerpts.length}</span></summary>
		<div className="sch-disclosure-body">{excerpts.map((item, index) => {
			const raw = cleanOfficialUrl(item.url || item.sourceUrl);
			const link = citationLink(item, { title });
			return <figure className="sch-source-quote" key={index}><blockquote>{item.quote}</blockquote><figcaption><span>Stored excerpt · Not verified{item.page ? ` · Page ${item.page}` : ""}</span>{raw && <a href={raw} target="_blank" rel="noopener noreferrer">Open source <ArrowUpRight size={13} /></a>}{link.href && link.href !== raw && <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label} <ArrowUpRight size={13} /></a>}{link.rawUrl && <a href={link.rawUrl} target="_blank" rel="noopener noreferrer">Source data <ArrowUpRight size={13} /></a>}</figcaption></figure>;
		})}</div>
	</details>;
}
