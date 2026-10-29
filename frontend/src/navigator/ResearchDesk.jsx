import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
	ArrowRight,
	ArrowUpRight,
	Check,
	ChevronDown,
	Compass,
	BookOpen,
	CornerDownRight,
	LockKeyhole,
	ShieldCheck,
} from "lucide-react";
import QuestionScene from './QuestionScene';
import QuestionLaunchpad from './QuestionLaunchpad';
import { CornerPeeker } from '../components/AnimatedIllustrations';
import HomeStateSelect from "./HomeStateSelect";
import { PROMPTS, selectedProfile, providerLabel } from "./contracts";
import { authDestination } from "../utils/authNavigation";

export default function ResearchDesk({ draft, setDraft, research, signedIn }) {
	const navigate = useNavigate();
	const location = useLocation();
	const [detailsOpen, setDetailsOpen] = useState(Boolean(location.state?.focusDetails));
	useEffect(() => {
		let cancelled = false;
		if (typeof location.state?.brief === 'string') Promise.resolve().then(() => { if (!cancelled) setDraft(current => ({ ...current, goal: location.state.brief })); });
		return () => { cancelled = true; };
	}, [location.key, location.state, setDraft]);
	const [goalError, setGoalError] = useState("");
	const goalRef = useRef(null);
	const starterMode = PROMPTS.findIndex(prompt => prompt.goal === draft.goal);
	const focusQuestion = () => {
		goalRef.current?.focus({ preventScroll: true });
		goalRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
	};
	const updateGoal = (goal) => {
		setGoalError("");
		setDraft((current) => ({ ...current, goal }));
	};
	const updateProfile = (key, value) =>
		setDraft((current) => ({
			...current,
			profile: { ...current.profile, [key]: value },
		}));
	const detailCount = Object.values(draft.profile).filter(
		(value) => value !== "",
	).length;
	async function begin(event) {
		event.preventDefault();
		if (!draft.goal.trim()) {
			setGoalError("Write a question, or choose a starting point below.");
			goalRef.current?.focus();
			return;
		}
		try {
			const run = await research.start({
				goal: draft.goal.trim(),
				profile: draft.includeProfile ? selectedProfile(draft.profile) : {},
			});
			if (run) {
				setDraft((current) => ({
					...current,
					profile: {
						educationLevel: "",
						state: "",
						familyIncome: "",
						percentage: "",
					},
					includeProfile: false,
				}));
				navigate(`/navigator/investigation?run=${run.runId}`);
				research.drive(run);
			}
		} catch (error) {
			setGoalError(error.message);
		}
	}
	return (
		<>
			<section className="nv-desk-hero">
				<div>
					{/* <p className="nv-eyebrow">YOUR SCHOLARSHIP RESEARCH DESK</p> */}
					<h1>
						Your next chapter.
						<br />
						<span className="nv-highlight">Let’s find a way.</span>
					</h1>
					<p className="nv-intro">
						Big plans. Tricky conditions. Let’s work out your next move.
					</p>
					<div className="nv-hero-tags">
						<span>
							<Check size={14} /> Sources beside the answers
						</span>
						<span>
							<Check size={14} /> Clear next steps
						</span>
					</div>
					<div className="nv-hero-actions"><button type="button" className="nv-button" onClick={focusQuestion}>Ask your own question <ArrowRight size={18} /></button><Link className="nv-text-link" to="/scholarships" target="_blank" rel="noopener noreferrer">Browse without AI <ArrowUpRight size={16} /></Link></div>
				</div>
				<QuestionScene goal={draft.goal} mode={starterMode < 0 ? null : starterMode} onCompose={focusQuestion} />
			</section>
			<QuestionLaunchpad goal={draft.goal} onChoose={prompt => { updateGoal(prompt.goal); focusQuestion(); }} />
			<section className="nv-brief-grid" aria-labelledby="brief-title">
				<form className="nv-brief" onSubmit={begin} autoComplete="off">
					<div className="nv-brief-head">
						<span className="nv-brief-icon" aria-hidden="true">
							<Compass size={24} strokeWidth={1.7} />
						</span>
						<div>
							<span className="nv-eyebrow">LET’S START WITH YOU</span>
						</div>
					</div>
					<h2 id="brief-title">What are you trying to figure out?</h2>
					<div
						className={`nv-question-box${goalError ? " nv-question-invalid" : ""}`}
					>
						<label htmlFor="nv-goal">Your research question</label>
						<textarea
							id="nv-goal"
							ref={goalRef}
							value={draft.goal}
							onChange={(event) => updateGoal(event.target.value)}
							maxLength={1000}
							required
							rows={3}
							placeholder="e.g. Which scholarships could help with my hostel costs?"
							aria-invalid={Boolean(goalError)}
							aria-describedby={
								goalError ? "nv-goal-error nv-goal-help" : "nv-goal-help"
							}
						/>
						<div className="nv-input-foot">
							<p id="nv-goal-help">
								<ShieldCheck size={17} aria-hidden="true" />
								<span>Leave out names, ID numbers and document details.</span>
							</p>
							<span>{draft.goal.length}/1000</span>
						</div>
					</div>
					{goalError && (
						<p className="nv-field-error" role="alert" id="nv-goal-error">
							{goalError}
						</p>
					)}
					<div className="nv-profile-box">
						<button
							className="nv-disclosure"
							type="button"
							onClick={() => setDetailsOpen(!detailsOpen)}
							aria-expanded={detailsOpen}
							aria-controls="nv-profile-fields"
						>
							<span>
								<LockKeyhole size={17} />
								<span>
									Add a little context
									<small>
										Optional ·{" "}
										{draft.includeProfile
											? `${detailCount} details selected`
											: "nothing shared"}
									</small>
								</span>
							</span>
							<ChevronDown
								size={18}
								className={detailsOpen ? "nv-turned" : ""}
							/>
						</button>
						{detailsOpen && (
							<div id="nv-profile-fields" className="nv-profile-fields">
								<p>
									Selected details go to Udaan’s eligibility checks, not to AI
									prompts. Leave anything you don’t know blank.
								</p>
								<div className="nv-field-grid">
									<label>
										Education level
										<select
											value={draft.profile.educationLevel}
											onChange={(event) =>
												updateProfile("educationLevel", event.target.value)
											}
										>
											<option value="">Not provided</option>
											{[
												"Class 10",
												"Class 12",
												"Diploma",
												"UG",
												"PG",
												"PhD",
											].map((value) => (
												<option key={value} value={value}>
													{value === "UG"
														? "Undergraduate"
														: value === "PG"
															? "Postgraduate"
															: value}
												</option>
											))}
										</select>
									</label>
									<label>
										Domicile state
										<HomeStateSelect
											value={draft.profile.state}
											onChange={(event) =>
												updateProfile("state", event.target.value)
											}
										/>
									</label>
									<label>
										Annual family income (₹)
										<input
											type="number"
											min="0"
											max="999999999"
											step="1"
											value={draft.profile.familyIncome}
											onChange={(event) =>
												updateProfile("familyIncome", event.target.value)
											}
											placeholder="Leave blank if unknown"
										/>
									</label>
									<label>
										Previous result (%)
										<input
											type="number"
											min="0"
											max="100"
											step="0.01"
											value={draft.profile.percentage}
											onChange={(event) =>
												updateProfile("percentage", event.target.value)
											}
											placeholder="Leave blank if unknown"
										/>
									</label>
								</div>
								<label className="nv-check">
									<input
										type="checkbox"
										checked={draft.includeProfile}
										onChange={(event) =>
											setDraft((current) => ({
												...current,
												includeProfile: event.target.checked,
											}))
										}
									/>
									<span>
										Use these details for this investigation.
										<small>
											Stored for up to 7 days; cleared when research finishes or
											is cancelled. Your account profile stays unchanged.
										</small>
									</span>
								</label>
							</div>
						)}
					</div>
					<div className="nv-form-action">
						{signedIn ? (
							<button
								className="nv-button"
								type="submit"
								disabled={research.busy || research.available !== true}
							>
								{research.busy
									? "Opening your investigation…"
									: "Start research"}
								<ArrowRight size={18} />
							</button>
						) : (
							<Link
								className="nv-button"
								to={authDestination("/login", "/navigator")}
							>
								Sign in to research <ArrowRight size={18} />
							</Link>
						)}
						<p>
							{signedIn
								? research.available === null
									? "Checking research availability…"
									: research.available
										? `AI helps read your question and explain sources. Your question goes to ${providerLabel(research.provider)}; Udaan notes stay private for up to 7 days.`
										: "Research is currently unavailable. Try again later."
								: "Sign in to keep investigations private to your account."}
						</p>
					</div>
					{signedIn && research.available === false && (
						<button
							className="nv-text-link"
							type="button"
							onClick={research.checkAvailability}
						>
							Check availability again
						</button>
					)}
				</form>
                <aside className="nv-desk-aside nv-independent-paths" aria-label="Tools that do not need AI">
                    <div className="nv-path-peeker" aria-hidden="true"><CornerPeeker size={90} /></div>
                    <span className="nv-eyebrow">KEEP MOVING</span><h3>AI isn’t the only way in.</h3>
                    <Link to="/scholarships" target="_blank" rel="noopener noreferrer"><BookOpen size={21} /><span><strong>Explore the catalogue</strong><small>Browse the saved scholarships.</small></span><ArrowUpRight size={18} /></Link>
                    <Link to="/eligibility" target="_blank" rel="noopener noreferrer"><Check size={21} /><span><strong>Check eligibility</strong><small>See which conditions fit your details.</small></span><ArrowUpRight size={18} /></Link>
                    <p>Opens in a new tab · no AI request. Your draft stays here.</p>
                </aside>
			</section>
			{research.history.length > 0 && (
				<section className="nv-recent" aria-label="Your recent investigations">
					<h2>Still on your desk</h2>
					<p>
						Private to your account · retained for up to 7 days. Opening a note
						makes no AI calls.
					</p>
					{research.history.map((run) => (
						<div className="nv-resume-note" key={run.runId}>
							<CornerDownRight size={19} />
							<p>
								{run.goal}
								<small>
									{run.status.replaceAll("_", " ")} · expires{" "}
									{new Date(run.expiresAt).toLocaleDateString("en-IN")}
								</small>
							</p>
							<Link
								to={`/navigator/${run.plan ? "plan" : "investigation"}?run=${run.runId}`}
							>
								Open notes <ArrowUpRight size={16} />
							</Link>
							<button
								type="button"
								disabled={research.busy}
								onClick={() => research.forget(run.runId)}
								aria-label={`Delete investigation: ${run.goal}`}
							>
								Delete
							</button>
						</div>
					))}
				</section>
			)}
			<section className="nv-beginner-guide" aria-label="First-time applicant guidance">
				<div className="nv-beginner-guide-art" aria-hidden="true">
					<Compass size={28} strokeWidth={1.8} />
				</div>
				<div className="nv-beginner-guide-body">
					<span className="nv-beginner-guide-eyebrow">FIRST TIME HERE?</span>
					<h3>New to scholarships?</h3>
					<p>Don&apos;t let confusing terms slow you down. Our step-by-step application guide walks you through documents, certificates, and dates in plain student language.</p>
				</div>
				<Link className="nv-button nv-button-paper nv-beginner-guide-btn" to="/how-to-apply">
					<span>Read the application guide</span>
					<ArrowUpRight size={16} />
				</Link>
			</section>
		</>
	);
}
