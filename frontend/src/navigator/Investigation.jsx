import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
	ArrowRight,
	ArrowUpRight,
	Check,
	Compass,
	Pause,
	Play,
	Square,
	Undo2,
	Search,
	BookOpen,
} from "lucide-react";
import { SceneStage, StageRail, NowLine, CountdownRing, Meter } from './InvestigationStage';
import { investigationActivity } from './investigationActivity';
import HomeStateSelect from "./HomeStateSelect";
import ResearchRecovery from './ResearchRecovery';
import {
	FIELDS,
	selectedProfile,
	researchQuotaNotice,
	researchRetryTime,
} from "./contracts";
import { authDestination } from "../utils/authNavigation";

const TOOL_LABELS = {
	searchScholarships: "Find scholarships",
	findGuidelinePassages: "Read scholarship guidelines",
	checkOfficialSource: "Check the official page",
	retrieveOfficialGuideline: 'Open the official guideline',
	evaluateMatches: "Check eligibility conditions",
	requestClarification: "Ask about missing details",
	finishInvestigation: "Put findings together",
	unknown: "Unsupported tool request",
};
const STATES = {
	ready: "Progress saved",
	running: "Research in progress",
	awaiting_input: "A quick check-in",
	completed: "Research notes ready",
	cancelled: "Investigation cancelled",
	partial: "Research needs attention",
	interrupted: "Progress saved after interruption",
	quota_exhausted: "Research allowance reached",
};

function Clarification({ run, research }) {
	const [answers, setAnswers] = useState({}),
		[error, setError] = useState("");
	const submit = (event) => {
		event.preventDefault();
		try {
			const chosen = selectedProfile(answers, run.clarification.fields);
			if (!Object.keys(chosen).length) {
				setError("Provide a requested detail, or skip for now.");
				return;
			}
			research.drive(run, { skip: false, answers: chosen });
			setAnswers({});
			setError("");
		} catch (e) {
			setError(e.message);
		}
	};
	return (
		<form className="nv-clarification" autoComplete="off" onSubmit={submit}>
			<span className="nv-eyebrow">A QUICK CHECK-IN</span>
			<h2>
				A little context.
				<br />A clearer comparison.
			</h2>
			<p>
				These optional answers help check scholarship conditions. Skip any you prefer to
				leave unknown.
			</p>
			<div className="nv-field-grid">
				{run.clarification.fields.map((field) => {
					const definition = FIELDS[field],
						props = {
							id: `nv-answer-${field}`,
							value: answers[field] ?? "",
							onChange: (event) => {
								setAnswers((current) => ({
									...current,
									[field]: event.target.value,
								}));
								setError("");
							},
						};
					return (
						<label key={field} htmlFor={props.id}>
							{definition.label}
							{field === "state" ? (
								<HomeStateSelect {...props} />
							) : definition.options ? (
								<select {...props}>
									<option value="">Not provided</option>
									{definition.options.map((option) => {
										const [value, label] = Array.isArray(option)
											? option
											: [option, option];
										return (
											<option key={value} value={value}>
												{label}
											</option>
										);
									})}
								</select>
							) : (
								<input
									{...props}
									type={definition.max === undefined ? "text" : "number"}
									min={definition.max === undefined ? undefined : 0}
									max={definition.max}
									step="any"
									maxLength={200}
									placeholder="Leave blank if unknown"
								/>
							)}
						</label>
					);
				})}
			</div>
			<small>
				Used privately to check eligibility for this question. Stored
				until completion, cancellation or expiry (up to 7 days); your account
				profile is unchanged.
			</small>
			{error && (
				<p className="nv-field-error" role="alert">
					{error}
				</p>
			)}
			<div>
				<button className="nv-button" disabled={research.busy} type="submit">
					Use selected details <ArrowRight size={16} />
				</button>
				<button
					className="nv-text-link"
					disabled={research.busy}
					type="button"
					onClick={() => {
						setAnswers({});
						research.drive(run, { skip: true, answers: {} });
					}}
				>
					Skip for now
				</button>
			</div>
		</form>
	);
}

export default function Investigation({ research, signedIn, query }) {
	const { run, busy, loading } = research;
	const navigate = useNavigate();
	const [preparingNotes, setPreparingNotes] = useState(false);
	const [reviewing, setReviewing] = useState(false);
	const [now, setNow] = useState(() => Date.now()),
		[pausing, setPausing] = useState(false);
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);
	const activity = investigationActivity(run, busy);
	const retryAt = ["cancelled", "completed"].includes(run?.status)
		? null
		: run?.error?.retryAt;
	const remaining = retryAt
		? Math.max(0, Math.ceil((Date.parse(retryAt) - now) / 1000))
		: 0;
	const quotaNotice = researchQuotaNotice(run),
		retryTime = researchRetryTime(retryAt);
	const interpretationStopped = ['catalogue_v1', 'adaptive_v2'].includes(run?.workflow) && !run.catalogueNoAI
        && ['MODEL_PROTOCOL', 'INVALID_RESEARCH_INTENT', 'PROVIDER_RESPONSE_INVALID', 'PROVIDER_AUTH', 'PROVIDER_REQUEST_REJECTED', 'PROVIDER_TIMEOUT', 'PROVIDER_UNAVAILABLE'].includes(run.error?.code)
        && run.usage.modelCalls > 0 && run.usage.toolCalls === 0;
    const retryable =
		run && !interpretationStopped &&
		!["MODEL_LIMIT", "TOOL_LIMIT", "CONTEXT_LIMIT", "MODEL_CHANGED"].includes(
			run.error?.code,
		) &&
		!["running", "completed", "cancelled", "awaiting_input"].includes(
			run.status,
		);
	const canUseEvidence = run && !busy && ["ready", "partial", "interrupted", "quota_exhausted"].includes(run.status)
		&& run.collectedPassageCount > 0 && !["SOURCE_CHANGED", "SCHEME_UNAVAILABLE", "CHECKPOINT_INVALID"].includes(run.error?.code);
	const canResearchCatalogue = run && !busy && !canUseEvidence && ["ready", "partial", "interrupted", "quota_exhausted"].includes(run.status);
	const continuesWithAI = !['catalogue_v1', 'adaptive_v2'].includes(run?.workflow) || (!run.catalogueNoAI && run.usage.modelCalls < run.limits.maxModelCalls);
	async function reviewFailedQuestion() {
		if (reviewing || busy || !interpretationStopped) return;
		setReviewing(true);
		try {
			const brief = run.goal, cancelled = await research.cancel();
			if (cancelled?.status === 'cancelled') navigate('/navigator', { state: { brief } });
		} finally { setReviewing(false); }
	}
	async function finishCollectedEvidence() {
		setPreparingNotes(true);
		try { const next = await research.prepareNotes(); if (next?.plan) navigate(`/navigator/plan?run=${next.runId}`); }
		finally { setPreparingNotes(false); }
	}
	async function searchWithoutAI() {
		setPreparingNotes(true);
		try { const next = await research.researchCatalogue(); if (next?.plan) navigate(`/navigator/plan?run=${next.runId}`); }
		finally { setPreparingNotes(false); }
	}
	return (
		<>
			<header className="nv-page-heading">
				<div>
					{/* <p className="nv-eyebrow">THE INVESTIGATION DESK</p> */}
					<h1>
						Looking for <span className="nv-highlight">what fits.</span>
					</h1>
					<p>
						Your progress stays here. No need to keep starting over.
					</p>
				</div>
				<Link className="nv-text-link" to="/navigator">
					<Undo2 size={15} /> Your research desk
				</Link>
			</header>
			{!run ? (
				<div className="nv-empty">
					<Compass size={44} strokeWidth={1} />
					<h2>
						{loading
							? "Opening your notes…"
							: signedIn
								? "Every trail starts with a question."
								: "Your research stays with you."}
					</h2>
					<p>
						{loading
							? "Reading saved progress; no AI calls are made."
							: "Start a brief or open a saved investigation from your desk."}
					</p>
					<Link
						className="nv-button"
						to={
							signedIn ? "/navigator" : authDestination("/login", "/navigator")
						}
					>
						{signedIn ? "Open the research desk" : "Sign in to research"}
						<ArrowRight size={16} />
					</Link>
				</div>
			) : (
				<>
					<div className={`nv-question-strip${activity.working ? " is-busy" : ""}`}>
						<span>YOUR BRIEF</span>
						<p>{run.goal}</p>
						<span className="nv-sample-label">Private investigation</span>
					</div>
					<div className="nv-workspace">
						<details className="nv-trail nv-activity-disclosure" aria-label="Research activity"><summary>See activity history <span>{run.events.length} updates</span></summary>
							<div className="nv-trail-head">
								<span className="nv-eyebrow">THE PAPER TRAIL</span>
								<span>{run.events.length} events</span>
							</div>
							<ol>
								{run.events.length ? (
									run.events.map((event) => (
										<li
											key={event.sequence}
											className={
												event.type.endsWith("completed")
													? "nv-trail-done"
													: event.type.endsWith("failed")
														? "nv-trail-failed"
														: activity.working && event === run.events.at(-1) && event.type.endsWith("started") ? "nv-trail-current nv-trail-live" : "nv-trail-current"
											}
										>
											<span className="nv-trail-icon">
												{event.type.endsWith("completed") ? (
													<Check size={16} />
												) : event.tool ? (
													<BookOpen size={16} />
												) : (
													<Search size={16} />
												)}
											</span>
											<div>
												<strong>
													{event.action === 'research_decision' ? 'Choose the next useful research step' : event.action === "prepare_notes" ? "Prepare notes from collected evidence" : event.tool
														? TOOL_LABELS[event.tool] || "Research tool"
														: event.action === 'answer_evidence' ? 'Explain the source evidence' : event.type === "model_failed" ? "Request interpretation unavailable" : run.workflow === "catalogue_v1" ? "Understand your question" : "Choose the next research step"}
												</strong>
													<span className={event.resultCount != null ? "nv-result-count" : undefined}>
													{event.type.endsWith("started")
														? "Started"
														: event.type.endsWith("failed")
															? "Could not complete"
																: event.tool === "findGuidelinePassages" && event.resultCount != null ? `${event.resultCount} source excerpts` : "Completed"}
												</span>
											</div>
										</li>
									))
								) : (
									<li>
										<span className="nv-trail-icon">
											<Compass size={16} />
										</span>
										<div>
											<strong>Your brief is ready</strong>
											<p>Activity appears here when you continue research.</p>
										</div>
									</li>
								)}
							</ol>
							<p className="nv-trail-caption">
								Tool activity is recorded by the server. It is not the model’s
								private reasoning.
							</p>
						</details>
						<section
							className={`nv-work-panel${activity.working ? " is-busy" : ""}`}
							aria-label="Investigation workspace"
						>
							<div className="nv-work-toolbar">
								<span className="nv-state" role="status">
									<span
										className={`nv-state-dot ${busy || run.status === "running" ? "" : "nv-dot-paused"}`}
									/>
									{preparingNotes ? "Preparing collected evidence…" : busy
										? pausing
											? "Pausing after this step…"
											: "Research in progress"
										: quotaNotice?.label || STATES[run.status]}
								</span>
								<div>
									{busy && (
										<button
											type="button"
											disabled={pausing}
											onClick={() => {
												research.pause();
												setPausing(true);
											}}
										>
											<Pause size={14} />
											Pause after this step
										</button>
									)}
									{!["completed", "cancelled"].includes(run.status) && (
										<button type="button" onClick={research.cancel}>
											<Square size={12} />
											Cancel research
										</button>
									)}
								</div>
							</div>
							<div className="nv-work-content">
                                <StageRail events={run.events} busy={busy} status={run.status} />
								{run.status === "awaiting_input" && !busy ? (
									<Clarification
										key={`${run.runId}-${run.revision}`}
										run={run}
										research={research}
									/>
								) : (
									<div className="nv-status-view">
										<SceneStage mood={activity.mood} chips={activity.chips}>{remaining > 0 && <CountdownRing key={retryAt} remaining={remaining} />}</SceneStage>
                                        {activity.label && <NowLine label={activity.label} />}
										<span className="nv-eyebrow">
											{activity.working
												? "FOLLOWING THE SOURCES"
												: "A CLEAR STOPPING POINT"}
										</span>
										<h2>
											{activity.working
												? "Finding your next step."
												: run.status === "completed"
													? run.plan.answer?.status === 'partial' ? 'Some questions are still open.' : run.plan.entries.length
														? "Your research notes are in."
														: "The evidence stops here."
													: run.status === "cancelled"
														? "This trail can wait."
														: run.status === "quota_exhausted"
															? "A pause, with your place saved."
															: interpretationStopped ? "Your question hasn’t been researched yet." : "Right where you left it."}
										</h2>
										<p>
											{preparingNotes ? "Preparing notes from the saved excerpts and recorded rules. This does not contact AI." : activity.working
												? "We’re checking scholarships against your question."
												: run.status === "completed"
													? run.plan.answer?.status === 'partial' ? 'Open your findings to see what fits and what still needs checking.' : run.plan.entries.length
														? "Review the supporting passages and unresolved conditions before applying."
														: "No sufficiently supported shortlist could be prepared from the recorded catalogue. That does not mean no scholarship exists."
													: run.status === "cancelled"
														? "Research has stopped and its temporary eligibility inputs have been cleared."
														: quotaNotice && !canUseEvidence ? "AI research paused before usable excerpts were saved. You can search and prepare catalogue notes without AI." : run.error?.message ||
															"Your current checkpoint is saved. Continue when you’re ready; opening this page does not start AI calls."}
										</p>
										{quotaNotice && (
											<div className="nv-status-note" role="status">
												<strong>{quotaNotice.label}</strong>
												<p>{quotaNotice.message}</p>
												{retryTime && (
													<p>
														{remaining > 0
															? "Continue after"
															: "The recorded retry time has passed:"}{" "}
														<time dateTime={retryAt}>{retryTime}</time>.
														{remaining <= 0
															? " You can explicitly try continuing; availability will be checked again."
															: ""}
													</p>
												)}
												<p>No automatic retries are running.</p>
											</div>
										)}
										{!quotaNotice && remaining > 0 && (
											<div className="nv-status-note" role="status">
												Continue after {retryTime}. No automatic retries are
												running.
											</div>
										)}
										{run.status === "completed" && (
											<Link
												className="nv-button"
												to={`/navigator/plan${query}`}
											>
												Open research plan <ArrowRight size={16} />
											</Link>
										)}
										{interpretationStopped && <div>
											<button className="nv-button" type="button" disabled={reviewing || busy} onClick={reviewFailedQuestion}>Review and retry <ArrowRight size={16} /></button>
											<p>Closes this failed attempt and keeps your question ready to edit. AI runs only after you press Start research.</p>
										</div>}
										{(canUseEvidence || canResearchCatalogue) && <ResearchRecovery hasEvidence={canUseEvidence} count={run.collectedPassageCount} disabled={research.available === false || preparingNotes || reviewing} onRecover={canUseEvidence ? finishCollectedEvidence : searchWithoutAI} />}
										{!busy && retryable && (
											<button
												className={canUseEvidence ? "nv-button nv-button-paper" : "nv-button"}
												title={continuesWithAI ? "Makes another AI request and uses your provider allowance." : "Continues catalogue research without another AI request."}
												type="button"
												disabled={(continuesWithAI && remaining > 0) || research.available === false}
												onClick={() => {
													setPausing(false);
													research.drive(run);
												}}
											>
												<Play size={16} />
												Continue research
											</button>
										)}
										{canUseEvidence && <p className="nv-tiny">Continuing AI research uses more allowance and may be rate limited again.</p>}
										{!busy &&
											["running", "interrupted"].includes(run.status) && (
												<button
													className="nv-text-link"
													type="button"
													onClick={research.refresh}
												>
													Refresh saved progress
												</button>
											)}
										{!busy && run.status !== "completed" && (
											<Link className="nv-text-link" to="/scholarships">
												Explore the catalogue <ArrowUpRight size={15} />
											</Link>
										)}
									</div>
								)}
								<details className="nv-receipts nv-resource-details"><summary>Usage & research details</summary><div className="nv-usage" aria-label="Investigation usage">
									<span>
										<strong>
											{run.usage.modelCalls}/{run.limits.maxModelCalls}
										</strong>{" "}
										model calls
                                        <Meter value={run.usage.modelCalls} max={run.limits.maxModelCalls} label="Model call allowance used" />
									</span>
									<span>
										<strong>
											{run.usage.toolCalls}/{run.limits.maxToolCalls}
										</strong>{" "}
										tool calls
                                        <Meter value={run.usage.toolCalls} max={run.limits.maxToolCalls} label="Tool call allowance used" />
									</span>
									<span>
										<strong>
											{run.usage.inputTokens + run.usage.outputTokens}
										</strong>{" "}
										reported tokens
										{run.usage.tokenUsageIncomplete ? " (incomplete)" : ""}
									</span>
								</div>
								<p className="nv-tiny">
									Notes expire {new Date(run.expiresAt).toLocaleString("en-IN")}
									. Official sources are checked only when recorded in the
									activity; each result appears in the plan. Source checks
									compare content, not eligibility or policy meaning.
								</p></details>
							</div>
						</section>
					</div>
				</>
			)}
		</>
	);
}
