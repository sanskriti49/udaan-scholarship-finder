import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
	ArrowRight,
	ArrowUpRight,
	BookOpen,
	Check,
	CircleHelp,
	Columns3,
	Download,
	SlidersHorizontal,
	X,
	Info,
} from "lucide-react";
import {
	planText,
	safeSourceUrl,
	FIELDS,
	candidateStatus,
	sourceCheckText,
} from "./contracts";
import { findingGroup, researchSummary } from "./researchSummary.js";
import { studentCondition, studentFindings } from "./studentFindings.js";
import SourceDrawer from "./SourceDrawer";
import { AnswerNotice } from "./EvidenceAnswer";
import FindingsComparison from "./FindingsComparison";
import {
	BoardCurator,
	ConfusedDetective,
} from "../components/AnimatedIllustrations";

// How many findings a card shows before the rest move into "All conditions & sources".
const PREVIEW_LIMIT = 2;

const groups = {
	all: "All",
	promising: "Supporting findings",
	unconfirmed: "Still to check",
	excluded: "Restrictions",
};
const groupLabel = {
	promising: "Some conditions supported",
	unconfirmed: "More information needed",
	concern: "Eligibility concern",
	excluded: "Does not fit",
};
const stateWord = {
	supported: "Fits",
	contradicted: "Conflicts",
	unknown: "To check",
};
const tasks = [
	"Read the current official guideline",
	"Review unresolved eligibility conditions",
	"Confirm the current application window",
];

const host = (url) => {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return "source";
	}
};
const targetMessage = (status) =>
	({
		not_found:
			"We couldn’t locate this named scheme in the saved catalogue. Other awards have not been substituted. Try its official name or check the provider’s guideline.",
		excluded:
			"A recorded eligibility requirement conflicts with your stated conditions.",
		needs_evidence:
			"A possible record was found, but its eligibility could not be investigated within this research. It is not a recommendation.",
	})[status] ??
	"The findings below cover this scheme. Supported conditions and open questions are shown separately; full eligibility is not confirmed.";

/* ------------------------------------------------------------------
   2. Add this helper next to `host` / `targetMessage` (module level):
   ------------------------------------------------------------------ */
// "Course level: UG" -> ["Course level", "UG"]; text without a label returns [null, text].
const splitCondition = (text) => {
	const value = String(text ?? "");
	const i = value.indexOf(": ");
	return i > 0 ? [value.slice(0, i), value.slice(i + 2)] : [null, value];
};

export default function ResearchPlan({ research, query }) {
	const { run } = research,
		plan = run?.plan;
	const [source, openSource] = useState(null),
		[filter, setFilter] = useState("all"),
		[downloadNote, setDownloadNote] = useState("");
	const [checked, setChecked] = useState([]);
	const [comparisonIds, setComparisonIds] = useState([]),
		[comparing, setComparing] = useState(false);
	const comparisonRef = useRef(null),
		compareButtonRef = useRef(null);
	const summary = plan ? researchSummary(plan) : null;
	// Store IDs, not copied findings: refreshed server results remain authoritative.
	const selected = comparisonIds
		.map((id) => summary?.entries.find((entry) => entry.schemeId === id))
		.filter(Boolean);
	const toggleComparison = (id) =>
		setComparisonIds((current) => {
			const valid = current.filter((value) =>
				summary.entries.some((entry) => entry.schemeId === value),
			);
			return valid.includes(id)
				? valid.filter((value) => value !== id)
				: valid.length < 3
					? [...valid, id]
					: valid;
		});
	function openComparison() {
		setComparing(true);
		requestAnimationFrame(() => {
			comparisonRef.current?.focus({ preventScroll: true });
			comparisonRef.current?.scrollIntoView({
				behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
					? "auto"
					: "smooth",
				block: "start",
			});
		});
	}
	function download() {
		const url = URL.createObjectURL(
			new Blob([planText(run)], { type: "text/plain;charset=utf-8" }),
		);
		const link = document.createElement("a");
		link.href = url;
		link.download = "udaan-research-notes.txt";
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		setDownloadNote(
			"Your notes include the findings, open questions and original sources.",
		);
	}
	function inspect(entry, citation) {
		openSource({
			...citation,
			title: entry.title,
			sourceCheck: entry.sourceChecks?.find(
				(c) =>
					c.snapshotId === String(citation.evidence.snapshotId) &&
					c.url === citation.evidence.url,
			),
		});
	}
	const requirementName = (item) =>
		studentCondition(item, plan?.intent?.requirements);
	const filtered =
		summary?.entries.filter(
			(entry) =>
				filter === "all" ||
				(filter === "excluded"
					? ["excluded", "concern"].includes(findingGroup(entry))
					: findingGroup(entry) === filter),
		) ?? [];
	const sourceButton = (entry, proof, index = 0) => {
		const citation = entry.citations.find((c) => c.id === proof.evidenceId);
		return (
			citation && (
				<button
					type="button"
					className="rp-proof"
					key={proof.evidenceId + index}
					onClick={() => inspect(entry, citation)}
				>
					<BookOpen size={13} /> Read source
					{citation.evidence.page ? ` (p. ${citation.evidence.page})` : ""}
				</button>
			)
		);
	};
	const targetRestrictions = (target) =>
		target.status === "reviewed"
			? []
			: (plan.coverage?.excluded
					.filter((entry) => target.excludedIds.includes(entry.schemeId))
					.flatMap((entry) => {
						const conditions = entry.conditions.filter(
							(condition) =>
								condition.status === "mismatch" &&
								condition.ruleRequirements?.length,
						);
						const reasons = conditions.length
							? conditions.map(
									(condition) =>
										`${studentCondition(condition, plan.intent?.requirements)} conflicts with the requirement: ${condition.ruleRequirements.join("; ")}`,
								)
							: (entry.qualification?.reasons ?? []);
						return reasons.map(
							(reason) =>
								`${entry.title}${entry.region ? ` (${entry.region})` : ""}: ${reason}`,
						);
					}) ?? []);

	// Secondary information is gathered into one quiet panel instead of four stacked sections.
	const targets = plan?.targets ?? [];
	const gaps = (plan?.research?.gaps ?? [])
		.filter((gap) => gap.kind !== "interpretation_needed")
		.slice(0, 3);
	const needsAttention = targets.filter(
		(target) => target.status !== "reviewed",
	).length;
	const hasPanel =
		targets.length > 0 || gaps.length > 0 || Boolean(plan?.answer);
	const notes = plan
		? [
				plan.preparation === "collected_evidence" &&
					"Research paused. These notes use saved sources without another AI call.",
				!plan.answer &&
					plan.preparation === "catalogue" &&
					`These notes use the saved catalogue${plan.aiAssistance !== "search_planning" ? " without AI assistance" : ""}. Some of your conditions may still need checking.`,
				plan.intent?.status === "unavailable" &&
					"We couldn’t reliably understand all your conditions. These are catalogue possibilities, rather than personalised recommendations.",
			].filter(Boolean)
		: [];

	const asked = plan?.intent
		? plan.intent.requirements?.length
			? plan.intent.requirements.map((item) => ({
					key: item.id,
					text: studentCondition(item, plan.intent.requirements),
				}))
			: (plan.intent.constraints ?? []).map((text, i) => ({ key: i, text }))
		: [];

	return (
		<>
			<header className="rp-head">
				<div className="rp-head-text">
					<h1>
						{plan && !plan.entries.length
							? "Let’s narrow this down."
							: "Here’s what we found."}
					</h1>
					{plan && (
						<p className="rp-question">
							<span>“{run.goal}”</span>
							<Link to="/navigator" state={{ brief: run.goal }}>
								Edit question <ArrowUpRight size={14} />
							</Link>
						</p>
					)}
				</div>
				<div className="rp-head-side">
					<span className="rp-head-art" aria-hidden="true">
						{plan?.entries.length ? (
							<BoardCurator size={104} />
						) : (
							<ConfusedDetective size={104} />
						)}
					</span>
					{plan && (
						<button
							className="nv-button nv-button-paper"
							onClick={download}
							type="button"
						>
							<Download size={16} /> Save notes
						</button>
					)}
				</div>
			</header>
			<p className="rp-save-note" role="status">
				{downloadNote}
			</p>

			{!plan ? (
				<section className="nv-empty">
					<BookOpen size={36} />
					<h2>
						{research.loading
							? "Opening your findings…"
							: "Your findings will appear here."}
					</h2>
					<p>Start with a question, or open one of your saved searches.</p>
					<Link className="nv-button" to={`/navigator/investigation${query}`}>
						Open research <ArrowRight size={16} />
					</Link>
				</section>
			) : (
				<>
					{notes.length > 0 && (
						<div className="rp-notes" role="status">
							{notes.map((text) => (
								<p key={text}>{text}</p>
							))}
						</div>
					)}
					{plan.intent?.status === "needs_clarification" ? (
						<section
							className="rp-verdict is-ask"
							aria-label="Request interpretation"
						>
							<span className="rp-verdict-mark">
								<CircleHelp size={24} />
							</span>
							<div>
								<h2>One thing to clear up.</h2>
								<p>
									{plan.intent.ambiguities[0] ||
										"Which course or condition should we focus on?"}
								</p>
								<Link
									className="nv-text-link"
									to="/navigator"
									state={{ brief: run.goal }}
								>
									Clarify your question <ArrowRight size={15} />
								</Link>
							</div>
						</section>
					) : (
						<section
							className={`rp-verdict ${summary.counts.promising ? "is-good" : "is-open"}`}
							aria-label="Your research takeaway"
						>
							<span className="rp-verdict-mark">
								{summary.counts.promising ? (
									<Check size={24} />
								) : (
									<CircleHelp size={24} />
								)}
							</span>
							<div>
								<h2>{summary.heading}</h2>
								<p>{summary.message}</p>
								{summary.nextField && (
									<p className="rp-verdict-next">
										<strong>Still needed:</strong> {summary.nextField}{" "}
										<Link
											to="/navigator"
											state={{ brief: run.goal, focusDetails: true }}
										>
											Add a detail <ArrowRight size={14} />
										</Link>
									</p>
								)}
								{plan.entries.length > 0 && (
									<div className="rp-spread" aria-hidden="true">
										{summary.counts.promising > 0 && (
											<i
												data-group="promising"
												style={{ flexGrow: summary.counts.promising }}
											/>
										)}
										{summary.counts.unconfirmed > 0 && (
											<i
												data-group="unconfirmed"
												style={{ flexGrow: summary.counts.unconfirmed }}
											/>
										)}
										{summary.counts.excluded + summary.counts.concern > 0 && (
											<i
												data-group="excluded"
												style={{
													flexGrow:
														summary.counts.excluded + summary.counts.concern,
												}}
											/>
										)}
									</div>
								)}
							</div>
						</section>
					)}
					{hasPanel && (
						<details className="rp-panel" open={needsAttention > 0}>
							<summary>
								Open questions and notes
								{needsAttention + gaps.length > 0 && (
									<span className="rp-count">
										{needsAttention + gaps.length}
									</span>
								)}
							</summary>
							<div className="rp-panel-body">
								{targets.length > 0 && (
									<section aria-label="The schemes you asked about">
										<h3>The schemes you asked about</h3>
										<ul>
											{targets.map((target) => {
												const restrictions = [
													...new Set(targetRestrictions(target)),
												];
												return (
													<li key={target.id}>
														<strong>{target.name}</strong>
														<p>{targetMessage(target.status)}</p>
														{restrictions.length > 0 && (
															<ul>
																{restrictions.map((reason, index) => (
																	<li key={index}>{reason}</li>
																))}
															</ul>
														)}
													</li>
												);
											})}
										</ul>
									</section>
								)}
								{gaps.length > 0 && (
									<section aria-label="What could not be established">
										<h3>What still needs an answer</h3>
										<ul>
											{gaps.map((gap) => (
												<li key={gap.schemeId || "catalogue"}>
													<strong>{gap.title}</strong>
													<p>{gap.message}</p>
													{gap.missingFields?.length > 0 && (
														<p>
															Still needed:{" "}
															{gap.missingFields
																.map((field) => FIELDS[field].label)
																.join(", ")}
														</p>
													)}
												</li>
											))}
										</ul>
										{plan.research.stopReason === "budget_exhausted" && (
											<p>
												This search reached its research allowance. The findings
												below are preserved; unexamined conditions remain open.
											</p>
										)}
									</section>
								)}
								{plan.answer && (
									<section aria-label="About these findings">
										<h3>
											{plan.answer.status === "partial"
												? "Why some questions are still open"
												: "About these findings"}
										</h3>
										<AnswerNotice answer={plan.answer} />
									</section>
								)}
							</div>
						</details>
					)}
					{plan.entries.length > 0 && (
						<>
							<nav
								className="rp-filters"
								aria-label="Filter scholarship findings"
							>
								{Object.entries(groups).map(([key, label]) => {
									const count =
										key === "all"
											? summary.entries.length
											: key === "excluded"
												? summary.counts.excluded + summary.counts.concern
												: summary.counts[key];
									return (
										<button
											type="button"
											key={key}
											data-group={key}
											aria-pressed={filter === key}
											onClick={() => setFilter(key)}
										>
											{label}
											<span>{count}</span>
										</button>
									);
								})}
							</nav>

							{comparing && selected.length >= 2 && (
								<FindingsComparison
									entries={selected}
									requirements={plan.intent?.requirements ?? []}
									onInspect={inspect}
									panelRef={comparisonRef}
									onClose={() => {
										setComparing(false);
										compareButtonRef.current?.focus();
									}}
								/>
							)}

							<section
								id="nv-saved-findings"
								className="rp-list"
								aria-label="Scholarship findings"
							>
								{filtered.length === 0 && (
									<p className="rp-empty-filter">
										No options in this group. Try another filter.
									</p>
								)}
								{filtered.map((entry) => {
									const group = findingGroup(entry),
										findings = studentFindings(entry, plan.intent?.requirements),
										mismatch = candidateStatus(entry) === "excluded";
									const firstReason = entry.qualification?.reasons[0];
									const isSelected = selected.some(
										(item) => item.schemeId === entry.schemeId,
									);
									const preview =
										findings.visible?.slice(0, PREVIEW_LIMIT) ?? [];
									const hiddenCount =
										(findings.visible?.length ?? 0) - preview.length;
									return (
										<article
											key={entry.schemeId}
											className={`rp-card is-${group}`}
											data-finding-group={group}
										>
											<span className="rp-tab">{groupLabel[group]}</span>
											<header className="rp-card-head">
												<div>
													<h2>{entry.title}</h2>
													{entry.organization && (
														<p className="rp-issuer">{entry.organization}</p>
													)}
												</div>
												<button
													className="rp-compare"
													type="button"
													aria-label={`Compare ${entry.title}`}
													aria-pressed={isSelected}
													disabled={selected.length === 3 && !isSelected}
													title="Compare up to three options using saved findings"
													onClick={() => toggleComparison(entry.schemeId)}
												>
													{isSelected ? (
														<Check size={14} />
													) : (
														<Columns3 size={14} />
													)}
													{isSelected ? "Selected" : "Compare"}
												</button>
											</header>

											{(entry.stale ||
												entry.sourceChecks?.some(
													(c) => c.status === "changed",
												)) && (
												<p className="rp-freshness">
													This guidance may have changed. Check the current
													official conditions.
												</p>
											)}

											{mismatch ? (
												<p className="rp-blocker">
													<X size={17} />
													{firstReason ||
														"A required condition does not match the information used for this search."}
												</p>
											) : findings.hasFindings ? (
												<div
													className="rp-findings"
													role="region"
													aria-label="Answers from source evidence"
												>
													{preview.map((item) => (
														<div
															className={`rp-finding is-${item.status}`}
															key={item.requirementId}
														>
															<span
																className="rp-finding-icon"
																aria-hidden="true"
															>
																{item.status === "supported" ? (
																	<Check size={15} />
																) : item.status === "contradicted" ? (
																	<X size={15} />
																) : (
																	<CircleHelp size={15} />
																)}
															</span>
															<div>
																<p className="rp-finding-title">
																	<strong>{requirementName(item)}</strong>
																	<span>
																		{stateWord[item.status] ??
																			stateWord.unknown}
																	</span>
																</p>
																<p className="rp-finding-text">
																	{item.explanation}
																</p>
																{item.evidence.length > 0 && (
																	<div className="rp-proofs">
																		{item.evidence.map((proof, index) =>
																			sourceButton(entry, proof, index),
																		)}
																	</div>
																)}
															</div>
														</div>
													))}
													{hiddenCount > 0 && (
														<p className="rp-hidden-count">
															{hiddenCount} more{" "}
															{hiddenCount === 1 ? "finding" : "findings"} in
															the details below.
														</p>
													)}
												</div>
											) : (
												<p className="rp-unknown">
													We still need evidence to check this option.
												</p>
											)}

											{findings.unanswered.length > 0 && (
												<p className="rp-open">
													<CircleHelp size={15} />
													<span>
														Still open:{" "}
														{findings.unanswered
															.slice(0, 2)
															.map(requirementName)
															.join(", ")}
														{findings.unanswered.length > 2
															? ` and ${findings.unanswered.length - 2} more`
															: ""}
													</span>
												</p>
											)}

											{!mismatch &&
												group !== "concern" &&
												safeSourceUrl(entry.applicationLink) && (
													<a
														className="rp-provider"
														href={safeSourceUrl(entry.applicationLink)}
														target="_blank"
														rel="noopener noreferrer"
													>
														Visit official application page{" "}
														<ArrowUpRight size={15} />
													</a>
												)}

											<details className="rp-more">
												<summary>
													All conditions & sources
													<span>
														{entry.citations.length}{" "}
														{entry.citations.length === 1
															? "passage"
															: "passages"}
													</span>
												</summary>
												<div className="rp-more-body">
													{entry.answer?.conditions?.length > 0 && (
														<section aria-label="All eligibility findings">
															<h3>Conditions we looked at</h3>
															<ul className="rp-conditions">
																{entry.answer.conditions.map((item) => (
																	<li key={item.requirementId}>
																		<p className="rp-finding-title">
																			<strong>{requirementName(item)}</strong>
																			<span className={`is-${item.status}`}>
																				{stateWord[item.status] ??
																					stateWord.unknown}
																			</span>
																		</p>
																		<p>
																			{item.evidence.length ||
																			item.status !== "unknown"
																				? item.explanation
																				: "The available sources do not establish this yet."}
																		</p>
																		{item.evidence.length > 0 && (
																			<div className="rp-proofs">
																				{item.evidence.map((proof, index) =>
																					sourceButton(entry, proof, index),
																				)}
																			</div>
																		)}
																	</li>
																))}
															</ul>
														</section>
													)}
													{!entry.answer && entry.qualification && (
														<section aria-label="Why this result">
															<h3>
																{mismatch
																	? "Why it does not fit"
																	: entry.qualification.status === "supported"
																		? "Conditions our records support"
																		: "What still needs checking"}
															</h3>
															<ul className="rp-plain">
																{(mismatch
																	? entry.qualification.reasons
																	: entry.qualification.status === "supported"
																		? entry.qualification.supported
																		: entry.qualification.unresolved
																).map((text, i) => (
																	<li key={i}>{text}</li>
																))}
															</ul>
														</section>
													)}
													{entry.citations.length > 0 && (
														<section aria-label="Sources">
															<h3>Sources</h3>
															<div className="rp-sources">
																{entry.citations.map((citation, i) => (
																	<button
																		className="rp-source"
																		type="button"
																		key={citation.id}
																		onClick={() => inspect(entry, citation)}
																	>
																		<BookOpen size={16} />
																		<span>
																			Source {i + 1}
																			<small>
																				{host(citation.evidence.url)}
																				{citation.evidence.page
																					? `, page ${citation.evidence.page}`
																					: ""}
																			</small>
																		</span>
																		<ArrowUpRight size={14} />
																	</button>
																))}
															</div>
														</section>
													)}
													<section aria-label="Dates and recorded checks">
														<h3>Dates and recorded checks</h3>
														<dl className="rp-facts">
															<div>
																<dt>Deadline</dt>
																<dd>
																	{entry.deadline
																		? new Date(
																				entry.deadline,
																			).toLocaleDateString("en-IN")
																		: "Not recorded"}
																</dd>
															</div>
															<div>
																<dt>Academic year</dt>
																<dd>{entry.academicYear || "Not recorded"}</dd>
															</div>
															<div>
																<dt>Rule checks</dt>
																<dd>
																	{entry.matching.passedCount} passed,{" "}
																	{entry.matching.failedCount} failed,{" "}
																	{entry.matching.unknownCount} unknown
																</dd>
															</div>
														</dl>
														{entry.statusReason && <p>{entry.statusReason}</p>}
														{entry.matching.missingFields.length > 0 && (
															<p>
																Missing details:{" "}
																{entry.matching.missingFields
																	.map((field) => FIELDS[field].label)
																	.join(", ")}
															</p>
														)}
														{entry.sourceChecks?.length ? (
															entry.sourceChecks.map((check) => (
																<p key={check.snapshotId}>
																	{sourceCheckText(check)} on{" "}
																	{new Date(check.checkedAt).toLocaleString(
																		"en-IN",
																	)}
																</p>
															))
														) : (
															<p>
																Official source checks were not performed by
																this investigation. These excerpts come from
																saved sources.
															</p>
														)}
													</section>
												</div>
											</details>
										</article>
									);
								})}
							</section>
						</>
					)}
					{selected.length > 0 && (
						<section className="rp-tray" aria-label="Comparison tray">
							<strong>
								<Columns3 size={18} /> {selected.length} of 3 selected
							</strong>
							<div className="rp-tray-items">
								{selected.map((entry) => (
									<button
										type="button"
										key={entry.schemeId}
										aria-label={`Remove ${entry.title} from comparison`}
										onClick={() => toggleComparison(entry.schemeId)}
									>
										<span>{entry.title}</span>
										<X size={13} />
									</button>
								))}
							</div>
							<small>
								{selected.length === 1
									? "Choose one more to compare."
									: "Uses saved findings, no AI call."}
							</small>
							<button
								type="button"
								ref={compareButtonRef}
								className="rp-tray-go"
								disabled={selected.length < 2}
								onClick={openComparison}
							>
								Compare {selected.length}{" "}
								{selected.length === 1 ? "option" : "options"}{" "}
								<ArrowRight size={15} />
							</button>
						</section>
					)}
					<section className="rp-refine">
						<p>
							<strong>Want to narrow it down?</strong> Add a detail and we’ll
							check again.
						</p>
						<Link
							className="nv-button"
							to="/navigator"
							state={{ brief: run.goal }}
						>
							Refine your question <ArrowRight size={16} />
						</Link>
					</section>
					<details className="rp-research">
						<summary>
							<span className="rp-research-icon" aria-hidden="true">
								<SlidersHorizontal size={16} />
							</span>
							<span className="rp-research-title">
								<strong>Research details</strong>
								<small>How your question was read and what was checked</small>
							</span>
						</summary>
						<div className="rp-research-body">
							<p className="rp-research-note">
								<Info size={16} />
								<span>
									These findings cover saved sources and recorded rules. The
									scholarship provider confirms final eligibility and current
									dates.
								</span>
							</p>

							<div className="rp-research-col">
								{plan.intent && (
									<section
										aria-label={
											plan.intent.status === "needs_clarification"
												? "How your question was read"
												: "Request interpretation"
										}
									>
										<h3 className="rp-sub">What you asked for</h3>
										{asked.length > 0 && (
											<ul className="rp-asked-list">
												{asked.map(({ key, text }) => {
													const [label, value] = splitCondition(text);
													return (
														<li key={key}>
															{label && <span>{label}</span>}
															<strong>{value}</strong>
														</li>
													);
												})}
											</ul>
										)}
										{plan.intent.unresolved.length > 0 && (
											<p className="rp-unresolved">
												<CircleHelp size={15} />
												<span>
													Still to check: {plan.intent.unresolved.join(", ")}.
													These conditions have not been resolved.
												</span>
											</p>
										)}
									</section>
								)}

								{plan.coverage && (
									<section aria-label="Retrieval coverage">
										<h3 className="rp-sub">What was checked</h3>
										<dl className="rp-stats">
											<div>
												<dt>examined</dt>
												<dd>{plan.coverage.reviewed.length}</dd>
											</div>
											<div>
												<dt>left for further research</dt>
												<dd>{plan.coverage.deferred.length}</dd>
											</div>
											<div>
												<dt>excluded by recorded conditions</dt>
												<dd>{plan.coverage.excluded.length}</dd>
											</div>
										</dl>
									</section>
								)}
							</div>

							<section
								className="rp-checklist"
								aria-label="Optional application checklist"
							>
								<div className="rp-checklist-head">
									<h3 className="rp-sub">Optional application checklist</h3>
									<span>
										{checked.length} of {tasks.length} done
									</span>
								</div>
								<div
									className="rp-progress"
									role="progressbar"
									aria-label="Checklist progress"
									aria-valuemin={0}
									aria-valuemax={tasks.length}
									aria-valuenow={checked.length}
								>
									<i
										style={{
											transform: `scaleX(${checked.length / tasks.length})`,
										}}
									/>
								</div>
								<ul className="rp-tasks">
									{tasks.map((task) => (
										<li key={task}>
											<label className="rp-task">
												<input
													type="checkbox"
													checked={checked.includes(task)}
													onChange={() =>
														setChecked((current) =>
															current.includes(task)
																? current.filter((t) => t !== task)
																: [...current, task],
														)
													}
												/>
												<span>{task}</span>
											</label>
										</li>
									))}
								</ul>
								<p className="rp-checklist-note">
									Personal reminders only. Ticking a box does not verify
									eligibility or submit an application.
								</p>
							</section>

							<div className="rp-research-foot">
								<Link
									className="rp-history"
									to={`/navigator/investigation${query}`}
								>
									Open activity history <ArrowRight size={15} />
								</Link>
							</div>
						</div>
					</details>
				</>
			)}
			<SourceDrawer source={source} onClose={() => openSource(null)} />
		</>
	);
}
