import { useEffect, useRef, useState } from "react";
import {
	ArrowRight,
	ArrowUpRight,
	BadgeCheck,
	Check,
	CheckCircle2,
	ChevronDown,
	CircleAlert,
	FileCheck2,
	FileText,
	GraduationCap,
	Info,
	LockKeyhole,
	PencilLine,
	RotateCcw,
	ScanLine,
	ShieldCheck,
	Upload,
	Wallet,
} from "lucide-react";
import { schemas } from "./extract";
import { evaluate } from "./rules";
import { loadScholarships } from "./scholarships";
import { useScanner } from "./useScanner";
import "./scanner.css";

const origins = {
	ocr: "OCR-extracted",
	pdf: "PDF text",
	manual: "Manually supplied",
	missing: "Not detected",
};

// Presentation metadata only. Document types still come from schemas.
const documentMeta = {
	income: { icon: Wallet, description: "Annual family income" },
	bonafide: {
		icon: GraduationCap,
		description: "Student & institution details",
	},
	caste: { icon: BadgeCheck, description: "Category & certificate details" },
};

const steps = [
	{ number: 1, label: "Choose" },
	{ number: 2, label: "Upload" },
	{ number: 3, label: "Review" },
	{ number: 4, label: "Results" },
];

export default function Scanner() {
	const [type, setType] = useState("income");
	const [schemes, setSchemes] = useState([]);
	const [schemeStatus, setSchemeStatus] = useState(
		"Loading public scholarship list…",
	);
	const [selected, setSelected] = useState(
		() => new URLSearchParams(location.search).get("scholarship") || "",
	);

	// Existing scholarship-loading logic: unchanged.
	useEffect(() => {
		const controller = new AbortController();
		loadScholarships(
			controller.signal,
			new URLSearchParams(location.search).get("scholarship"),
		).then(
			(data) => {
				setSchemes(data);
				setSchemeStatus(
					data.length
						? ""
						: "No scholarship metadata available. General checks still work.",
				);
			},
			() => {
				if (!controller.signal.aborted)
					setSchemeStatus(
						"Scholarship list unavailable. General checks still work.",
					);
			},
		);
		return () => controller.abort();
	}, []);

	const scheme = schemes.find((s) => s.id === selected);

	return (
		<div className="scanner-shell">
			<main id="main-content">
				<div className="scanner-topline">
					<div className="scanner-brand-label">
						<span className="scanner-brand-symbol" aria-hidden="true">
							<ScanLine size={17} strokeWidth={2.2} />
						</span>
						DOCUMENT TOOLS
					</div>
					<span className="scanner-topline-tag">
						<span className="scanner-live-dot" aria-hidden="true" />
						Private by design
					</span>
				</div>

				<header className="scanner-hero">
					<div className="scanner-hero-copy">
						<span className="scanner-eyebrow">
							<span className="scanner-eyebrow-line" />
							THE DOCUMENT PRE-CHECK
						</span>
						<h1 className="font-georgia">
							Every detail matters.
							<br />
							<em>Check yours first.</em>
						</h1>
						<p className="scanner-hero-description">
							Give your Income, Bonafide, or Caste Certificate a careful review
							before applying. Spot missing details, review extracted text, and
							check applicable scholarship requirements — all on your device.
						</p>
						<div
							className="scanner-hero-benefits"
							aria-label="Scanner benefits"
						>
							<span>
								<LockKeyhole size={15} /> No uploads
							</span>
							<span>
								<FileCheck2 size={15} /> PDF & images
							</span>
							<span>
								<CheckCircle2 size={15} /> No sign-in
							</span>
						</div>
					</div>

					<div className="scanner-hero-visual" aria-hidden="true">
						<div className="scanner-visual-orbit scanner-visual-orbit-one" />
						<div className="scanner-visual-orbit scanner-visual-orbit-two" />
						<div className="scanner-mock-document">
							<div className="scanner-mock-document-header">
								<span className="scanner-mock-icon">
									<FileText size={20} />
								</span>
								<span className="scanner-mock-small-text">DOCUMENT REVIEW</span>
							</div>
							<div className="scanner-mock-heading" />
							<div className="scanner-mock-line scanner-mock-line-long" />
							<div className="scanner-mock-line scanner-mock-line-short" />
							<div className="scanner-mock-divider" />
							<div className="scanner-mock-check">
								<Check size={14} />
								<span />
							</div>
							<div className="scanner-mock-check">
								<Check size={14} />
								<span />
							</div>
							<div className="scanner-mock-check">
								<Check size={14} />
								<span />
							</div>
							<div className="scanner-mock-stamp">
								<ShieldCheck size={25} />
							</div>
						</div>
						<div className="scanner-mock-floating">
							<span className="scanner-mock-floating-icon">
								<LockKeyhole size={18} />
							</span>
							<span>
								<strong>On your device</strong>
								<small>Files stay private</small>
							</span>
						</div>
					</div>
				</header>

				<aside className="scanner-privacy">
					<div className="scanner-privacy-icon">
						<ShieldCheck size={22} aria-hidden="true" />
					</div>
					<div>
						<strong>Your documents stay on your device.</strong>
						<p>
							Udaan does not upload or store them. English documents only; no
							sign-in needed. Details remain in this page until you reset or
							leave. Clearing browser memory is best-effort.
						</p>
					</div>
					<span className="scanner-privacy-label">LOCAL PROCESSING</span>
				</aside>

				<section
					className="scanner-panel scanner-context-panel"
					aria-labelledby="context-title"
				>
					<div className="scanner-section-heading">
						<div className="scanner-section-number">01</div>
						<div className="scanner-section-heading-copy">
							<span className="scanner-section-kicker">LET'S GET STARTED</span>
							<h2 id="context-title">What would you like to check?</h2>
							<p>
								Start with your document type, then optionally choose a
								scholarship.
							</p>
						</div>
					</div>

					<fieldset className="scanner-type-fieldset">
						<legend className="scanner-field-label">Document type</legend>
						<div className="scanner-type-grid">
							{Object.entries(schemas).map(([key, schema]) => {
								const meta = documentMeta[key] || {
									icon: FileText,
									description: "Review certificate details",
								};
								const TypeIcon = meta.icon;
								return (
									<button
										key={key}
										type="button"
										className={`scanner-type-option ${type === key ? "is-selected" : ""}`}
										aria-pressed={type === key}
										onClick={() => setType(key)}
									>
										<span className="scanner-type-icon">
											<TypeIcon size={21} strokeWidth={1.8} />
										</span>
										<span className="scanner-type-copy">
											<strong>{schema.label}</strong>
											<small>{meta.description}</small>
										</span>
										<span className="scanner-type-radio" aria-hidden="true">
											{type === key && <Check size={12} strokeWidth={3} />}
										</span>
									</button>
								);
							})}
						</div>
					</fieldset>

					<div className="scanner-context-bottom">
						<div className="scanner-select-block">
							<label
								className="scanner-field-label"
								htmlFor="scholarship-context"
							>
								Scholarship <span className="scanner-optional">OPTIONAL</span>
							</label>
							<div className="scanner-select-wrapper">
								<select
									id="scholarship-context"
									value={selected}
									onChange={(e) => setSelected(e.target.value)}
								>
									<option value="">General document readiness</option>
									{schemes.map((s) => (
										<option key={s.id} value={s.id}>
											{s.title}
										</option>
									))}
								</select>
								<ChevronDown size={18} aria-hidden="true" />
							</div>
							<p className="scanner-help">
								Choose a scheme to apply available verified criteria.
							</p>
						</div>
						<div className="scanner-context-tip">
							<Info size={18} aria-hidden="true" />
							<p>
								Changing document type starts a new check. Choosing a
								scholarship never sends your document details.
							</p>
						</div>
					</div>

					{scheme && (
						<div className="scanner-scheme-preview">
							<div className="scanner-scheme-preview-heading">
								<span className="scanner-scheme-icon">
									<GraduationCap size={18} />
								</span>
								<div>
									<small>SELECTED SCHOLARSHIP</small>
									<strong>{scheme.title}</strong>
								</div>
							</div>
							<div className="scanner-scheme-tags">
								{scheme.eligibility?.familyIncome?.max && (
									<span className="scanner-scheme-pill">
										Income limit: ₹
										{scheme.eligibility.familyIncome.max.toLocaleString(
											"en-IN",
										)}
									</span>
								)}
								{scheme.currentCycle?.academicYear && (
									<span className="scanner-scheme-pill">
										Cycle: {scheme.currentCycle.academicYear}
									</span>
								)}
								{scheme.state && (
									<span className="scanner-scheme-pill">
										Scope: {scheme.state}
									</span>
								)}
								{scheme.eligibility?.casteCategories?.length > 0 && (
									<span className="scanner-scheme-pill">
										Eligible: {scheme.eligibility.casteCategories.join(", ")}
									</span>
								)}
							</div>
						</div>
					)}
					{schemeStatus && (
						<p className="scanner-scheme-status" role="status">
							{schemeStatus}
						</p>
					)}
				</section>

				{/* Remount on type changes, exactly as in the original implementation. */}
				<Workflow key={type} type={type} scheme={scheme} />

				<footer className="scanner-disclaimer">
					<Info size={17} aria-hidden="true" />
					<p>
						This check cannot establish document authenticity or guarantee
						scholarship approval. Always read the current official guidelines
						before applying.
					</p>
				</footer>
			</main>
		</div>
	);
}

function Workflow({ type, scheme }) {
	const scanner = useScanner(type);
	const [dragging, setDragging] = useState(false);
	const reviewHeading = useRef(null);
	const resultHeading = useRef(null);
	const busy = scanner.stage === "processing";
	const reviewing = scanner.stage === "review" || scanner.stage === "results";
	const report =
		scanner.stage === "results" ? evaluate(type, scanner.fields, scheme) : null;
	const currentStep = scanner.stage === "results" ? 4 : reviewing ? 3 : 2;

	useEffect(() => {
		if (scanner.stage === "review") reviewHeading.current?.focus();
		if (scanner.stage === "results") resultHeading.current?.focus();
	}, [scanner.stage]);

	const attentionCount = report
		? report.results.filter((result) => result.state === "Needs attention")
				.length
		: 0;
	const goodCount = report
		? report.results.filter((result) => result.state === "Looks good").length
		: 0;

	return (
		<>
			<nav
				className="scanner-progress-container"
				aria-label="Document check progress"
			>
				<div className="scanner-progress-caption">
					<span>YOUR CHECK</span>
					<strong>Step {currentStep} of 4</strong>
				</div>
				<ol className="scanner-steps">
					{steps.map((step) => {
						const completed = step.number < currentStep;
						const active = step.number === currentStep;
						return (
							<li
								key={step.number}
								className={`scanner-step ${completed ? "is-complete" : ""} ${active ? "is-current" : ""}`}
								aria-current={active ? "step" : undefined}
							>
								<span className="scanner-step-circle" aria-hidden="true">
									{completed ? (
										<Check size={15} strokeWidth={2.8} />
									) : (
										step.number.toString().padStart(2, "0")
									)}
								</span>
								<span>{step.label}</span>
							</li>
						);
					})}
				</ol>
			</nav>

			<section
				className="scanner-panel scanner-input-panel"
				aria-labelledby="input-title"
			>
				<div className="scanner-section-heading scanner-section-heading-with-action">
					<div className="scanner-section-number">02</div>
					<div className="scanner-section-heading-copy">
						<span className="scanner-section-kicker">
							PRIVATE, ON-DEVICE SCANNING
						</span>
						<h2 id="input-title">Add your certificate</h2>
						<p>We'll read what's available so you can verify it yourself.</p>
					</div>
					<button
						type="button"
						className="scanner-reset-button"
						onClick={scanner.reset}
					>
						<RotateCcw size={15} /> Reset check
					</button>
				</div>

				{scanner.error && (
					<p role="alert" className="scanner-error">
						<CircleAlert size={19} aria-hidden="true" />
						{scanner.error}
					</p>
				)}

				{!reviewing && !busy && (
					<>
						<div
							className={`scanner-drop ${dragging ? "is-dragging" : ""}`}
							onDragOver={(e) => {
								e.preventDefault();
								setDragging(true);
							}}
							onDragLeave={() => setDragging(false)}
							onDrop={(e) => {
								e.preventDefault();
								setDragging(false);
								if (e.dataTransfer.files.length === 1)
									void scanner.scan(e.dataTransfer.files[0]);
							}}
						>
							<div className="scanner-upload-icon">
								<Upload size={26} strokeWidth={1.8} aria-hidden="true" />
							</div>
							<h3>Drop your document here</h3>
							<p className="scanner-drop-description">
								or choose a file from your device
							</p>
							<input
								className="scanner-file-input"
								id="certificate"
								type="file"
								accept=".pdf,.png,.jpg,.jpeg"
								aria-describedby="scanner-upload-restrictions"
								onChange={(e) => {
									const file = e.target.files?.[0];
									e.target.value = "";
									if (file) void scanner.scan(file);
								}}
							/>
							<label className="scanner-upload-button" htmlFor="certificate">
								Browse files <ArrowRight size={16} aria-hidden="true" />
							</label>
							<p
								id="scanner-upload-restrictions"
								className="scanner-drop-restrictions"
							>
								PDF, PNG or JPG <span aria-hidden="true">·</span> Max 10 MB{" "}
								<span aria-hidden="true">·</span> PDFs up to 5 pages
							</p>
						</div>

						<div className="scanner-manual">
							<span className="scanner-manual-icon">
								<PencilLine size={19} aria-hidden="true" />
							</span>
							<div className="scanner-manual-copy">
								<strong>Prefer not to open a file?</strong>
								<p>Skip extraction and fill in the details yourself.</p>
							</div>
							<button
								type="button"
								onClick={scanner.manual}
								className="scanner-secondary"
							>
								Enter manually <ArrowRight size={16} aria-hidden="true" />
							</button>
						</div>
					</>
				)}

				{busy && (
					<div className="scanner-processing">
						<div className="scanner-processing-icon">
							<ScanLine size={28} aria-hidden="true" />
						</div>
						<h3>Reading your document…</h3>
						<p role="status" aria-live="polite">
							{scanner.status}
						</p>
						<progress aria-label="Processing document locally" />
						<p className="scanner-help">
							The first scan downloads local OCR assets. Keep this page open
							while processing.
						</p>
						<button
							type="button"
							className="scanner-secondary"
							onClick={scanner.reset}
						>
							Cancel processing
						</button>
					</div>
				)}

				{reviewing && (
					<div className="scanner-ready-note">
						<CheckCircle2 size={19} aria-hidden="true" />
						<div>
							<strong>Ready for your review</strong>
							<p>
								You can adjust the fields below, or use Reset check to start
								over.
							</p>
						</div>
					</div>
				)}
			</section>

			{reviewing && (
				<section
					className="scanner-panel scanner-review-panel"
					aria-labelledby="review-title"
				>
					<div className="scanner-section-heading">
						<div className="scanner-section-number">03</div>
						<div className="scanner-section-heading-copy">
							<span className="scanner-section-kicker">YOU'RE IN CONTROL</span>
							<h2 ref={reviewHeading} tabIndex={-1} id="review-title">
								Review extracted details
							</h2>
							<p>Double-check everything against the original certificate.</p>
						</div>
					</div>
					<div className="scanner-review-tip">
						<Info size={18} aria-hidden="true" />
						<p>
							Correct any mistakes. Leave unknown details blank. Dates use{" "}
							<strong>YYYY-MM-DD</strong>; income is{" "}
							<strong>annual family income</strong>, not monthly earnings.
						</p>
					</div>
					<form
						autoComplete="off"
						onSubmit={(e) => {
							e.preventDefault();
							scanner.validate();
						}}
					>
						<div className="scanner-fields-grid">
							{Object.entries(schemas[type].fields).map(([key, label]) => {
								const field = scanner.fields[key];
								return (
									<div
										className={`scanner-field ${field.ambiguous ? "has-ambiguity" : ""}`}
										key={key}
									>
										<div className="scanner-field-topline">
											<label htmlFor={`field-${key}`}>{label}</label>
											<span
												className={`scanner-origin scanner-origin-${field.source}`}
											>
												{origins[field.source]}
											</span>
										</div>
										<input
											id={`field-${key}`}
											aria-describedby={`help-${key}`}
											value={field.value}
											maxLength={400}
											spellCheck={false}
											autoComplete="off"
											onChange={(e) => scanner.edit(key, e.target.value)}
											placeholder={
												/Date$/.test(key)
													? "YYYY-MM-DD"
													: "Not identified — enter if known"
											}
										/>
										<p
											id={`help-${key}`}
											className={`scanner-field-help ${field.ambiguous ? "is-warning" : ""}`}
										>
											{field.ambiguous
												? "Conflicting values found — please review manually."
												: field.source === "missing"
													? "Not detected. Fill in only if known."
													: "Review against the original document."}
										</p>
										<Evidence field={field} />
									</div>
								);
							})}
						</div>
						<div className="scanner-review-actions">
							<div>
								<strong>All details checked?</strong>
								<p>You can still return and edit after seeing results.</p>
							</div>
							<button className="scanner-primary" type="submit">
								Validate reviewed details{" "}
								<ArrowRight size={18} aria-hidden="true" />
							</button>
						</div>
					</form>
				</section>
			)}

			{report && (
				<section
					className="scanner-panel scanner-report-panel"
					aria-labelledby="results-title"
				>
					<div className="scanner-section-heading">
						<div className="scanner-section-number">04</div>
						<div className="scanner-section-heading-copy">
							<span className="scanner-section-kicker">
								YOUR DOCUMENT REVIEW
							</span>
							<h2 id="results-title" tabIndex={-1} ref={resultHeading}>
								{schemas[type].label} — review complete
							</h2>
							<p>Review each observation and recommended next step.</p>
						</div>
					</div>

					<div className="scanner-summary-stats" aria-label="Check summary">
						<div className="scanner-stat">
							<strong>{report.results.length}</strong>
							<span>Total observations</span>
						</div>
						<div className="scanner-stat scanner-stat-good">
							<strong>{goodCount}</strong>
							<span>Look good</span>
						</div>
						<div className="scanner-stat scanner-stat-attention">
							<strong>{attentionCount}</strong>
							<span>Need attention</span>
						</div>
					</div>

					<div className="scanner-notice">
						<div className="scanner-notice-icon">
							<Info size={21} aria-hidden="true" />
						</div>
						<div>
							<strong>
								Scholarship-specific compliance:{" "}
								{report.schemeVerified
									? scheme
										? `Evaluated against official criteria for ${scheme.title}`
										: "See individual verified checks"
									: scheme
										? "No verified criteria configured for this selection"
										: "Not selected (General document readiness)"}
							</strong>
							<p>
								{scheme ? scheme.title : "General document readiness"} —{" "}
								{report.schemeVerified
									? "Evaluated against verified database eligibility guidelines and statutory cutoff rules."
									: "General observations below check document formatting and common rejection traps."}{" "}
								General observations below are not eligibility decisions.
							</p>
							{scheme?.url && (
								<a href={scheme.url} target="_blank" rel="noopener noreferrer">
									Read official scheme guidelines{" "}
									<ArrowUpRight size={15} aria-hidden="true" />
								</a>
							)}
						</div>
					</div>

					<div className="scanner-results">
						{report.results.map((result, index) => {
							const needsAttention = result.state === "Needs attention";
							const looksGood = result.state === "Looks good";
							return (
								<article key={result.id} className="scanner-result">
									<div className="scanner-result-header">
										<span className="scanner-result-index">
											{String(index + 1).padStart(2, "0")}
										</span>
										<h3>{result.label}</h3>
										<span
											className={`scanner-badge ${needsAttention ? "attention" : looksGood ? "good" : ""}`}
										>
											{needsAttention ? (
												<CircleAlert size={14} />
											) : looksGood ? (
												<CheckCircle2 size={14} />
											) : (
												<Info size={14} />
											)}
											{result.state}
										</span>
									</div>
									<div className="scanner-result-body">
										{result.field && scanner.fields[result.field] && (
											<div className="scanner-reviewed-value">
												<span className="scanner-result-caption">
													REVIEWED VALUE
												</span>
												<p>
													{scanner.fields[result.field].value ||
														"Not identified"}{" "}
													<span className="scanner-value-origin">
														({origins[scanner.fields[result.field].source]})
													</span>
												</p>
												<Evidence field={scanner.fields[result.field]} />
											</div>
										)}
										{result.rule && (
											<div className="scanner-rule">
												<strong>Verified official requirement</strong>
												<blockquote>{result.rule.excerpt}</blockquote>
												<div className="scanner-rule-foot">
													<a
														href={result.rule.sourceUrl}
														target="_blank"
														rel="noopener noreferrer"
													>
														Official guideline{" "}
														<ArrowUpRight size={13} aria-hidden="true" />
													</a>
													<span>Verified {result.rule.verifiedAt}</span>
												</div>
											</div>
										)}
										<div className="scanner-result-explanation">
											<span className="scanner-result-caption">
												WHAT THIS MEANS
											</span>
											<p>{result.interpretation}</p>
										</div>
										<div className="scanner-next-step">
											<span className="scanner-next-step-icon">
												<ArrowRight size={17} aria-hidden="true" />
											</span>
											<div>
												<strong>Next step</strong>
												<p>{result.next}</p>
											</div>
										</div>
									</div>
								</article>
							);
						})}
					</div>
				</section>
			)}
		</>
	);
}

function Evidence({ field }) {
	if (!field.evidence.length)
		return (
			<p className="scanner-evidence-empty">
				Document evidence: none.{" "}
				{field.source === "manual"
					? "This value was supplied manually."
					: "Missing text does not mean the document is invalid."}
			</p>
		);

	return (
		<details className="scanner-evidence">
			<summary>
				<span>View source evidence ({field.evidence.length})</span>
				{field.source === "manual" && (
					<small>Original text before correction</small>
				)}
				<ChevronDown size={16} aria-hidden="true" />
			</summary>
			<div className="scanner-evidence-content">
				{field.evidence.map((e, i) => (
					<blockquote key={i}>
						<span>
							{e.method === "ocr" ? "OCR" : "PDF text"} · page {e.page}
						</span>
						<p>“{e.text}”</p>
					</blockquote>
				))}
			</div>
		</details>
	);
}
