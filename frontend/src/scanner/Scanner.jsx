import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
	ArrowRight,
	ArrowUpRight,
	Download,
	FileText,
	Info,
	LockKeyhole,
	RotateCcw,
	Upload,
} from "lucide-react";
import { schemas } from "./extract";
import { evaluate } from "./rules";
import { eligiblePrefill } from "./prefill";
import { loadScholarships } from "./scholarships";
import { useScanner } from "./useScanner";
import { stageEligibilityDraft } from "../utils/eligibilityDraft";
import "./scanner.css";

const origins = {
	ocr: "Read by OCR",
	pdf: "Read from PDF",
	manual: "Edited by you",
	missing: "Not detected",
};
export default function Scanner() {
	const [params, setParams] = useSearchParams();
	const type = Object.hasOwn(schemas, params.get("type"))
		? params.get("type")
		: "income";
	function setType(value) {
		const next = new URLSearchParams(params);
		next.set("type", value);
		setParams(next);
	}
	const selected = params.get("scholarship") || "";
	const [schemes, setSchemes] = useState([]);
	const [metadataError, setMetadataError] = useState(false);
	useEffect(() => {
		const controller = new AbortController();
		loadScholarships(controller.signal, selected).then(
			(data) => {
				if (!controller.signal.aborted) {
					setSchemes(data);
					setMetadataError(false);
				}
			},
			() => {
				if (!controller.signal.aborted) setMetadataError(true);
			},
		);
		return () => controller.abort();
	}, [selected]);
	const scheme = schemes.find((item) => item.id === selected);
	return (
		<div className="scanner-shell">
			<main className="scanner-main">
				<header className="scanner-hero">
					<div>
						<p className="scanner-eyebrow">
							YOUR APPLICATION PAPERS, A LITTLE CLEARER
						</p>
						<h1 className="font-bricolage-grotesque">
							Read your document.
							<br />
							<em>Know your next step.</em>
						</h1>
						<p>
							Check the details in your certificate, spot reading or date
							issues, and leave with a review summary for your next application.
						</p>
					</div>
					<aside className="scanner-purpose">
						<FileText size={27} />
						<strong>What you’ll leave with</strong>
						<ul>
							<li>Editable details with source text</li>
							<li>Date and format issues to review</li>
							<li>A summary you can download</li>
						</ul>
						<small>A review aid, not certificate verification.</small>
					</aside>
				</header>
				<p className="scanner-privacy">
					<LockKeyhole size={19} />
					<span>
						Files are read on your device. No upload or account needed. English
						PDF, PNG and JPG; up to 10 MB and 5 PDF pages.
					</span>
				</p>
				<section className="scanner-context" aria-labelledby="context-title">
					<div>
						<h2 id="context-title">Choose your document.</h2>
						<label htmlFor="document-type">Document type</label>
						<select
							id="document-type"
							value={type}
							onChange={(event) => setType(event.target.value)}
						>
							{Object.entries(schemas).map(([key, schema]) => (
								<option value={key} key={key}>
									{schema.label}
								</option>
							))}
						</select>
						<small>Changing type clears the current review.</small>
					</div>
					<details className="scanner-scheme-choice" open={Boolean(scheme)}>
						<summary>Have a scholarship in mind? (optional)</summary>
						<label htmlFor="scholarship-context">Scholarship context</label>
						<select
							id="scholarship-context"
							value={scheme ? selected : ""}
							onChange={(event) =>
								setParams((previous) => {
									const next = new URLSearchParams(previous);
									if (event.target.value)
										next.set("scholarship", event.target.value);
									else next.delete("scholarship");
									return next;
								})
							}
						>
							<option value="">Just review my document</option>
							{schemes.map((item) => (
								<option value={item.id} key={item.id}>
									{item.title}
								</option>
							))}
						</select>
						<small>
							{metadataError
								? "Scholarship list unavailable. Document review still works."
								: "This opens the right guidelines; it does not certify compliance."}
						</small>
						{scheme?.url && (
							<a href={scheme.url} target="_blank" rel="noopener noreferrer">
								Read scheme guidelines <ArrowUpRight size={14} />
							</a>
						)}
					</details>
				</section>
				<Workflow key={type} type={type} scheme={scheme} />
				<p className="scanner-disclaimer">
					<Info size={17} />
					OCR can miss text. A missing field does not mean a document is
					invalid. This tool cannot verify authenticity, signatures, seals or
					scholarship approval.
				</p>
			</main>
		</div>
	);
}
function Workflow({ type, scheme }) {
	const scanner = useScanner(type);
	const navigate = useNavigate();
	const [dragging, setDragging] = useState(false);
	const [approved, setApproved] = useState({});
	const [consent, setConsent] = useState(false);
	const reviewHeading = useRef(null),
		resultHeading = useRef(null);
	const busy = scanner.stage === "processing";
	const reviewing = scanner.stage === "review";
	const report =
		scanner.stage === "results" ? evaluate(type, scanner.fields, scheme) : null;
	const prefill = eligiblePrefill(type, scanner.fields);
	const transferable = Object.entries(prefill);
	const labels = {
		familyIncome: "Annual family income",
		casteCategory: "Category",
		educationLevel: "Level of study",
	};
	const currentStep = report ? 3 : reviewing ? 2 : 1;
	const recorded = Object.values(scanner.fields).filter(
		(field) => field.value.trim() && !field.ambiguous,
	).length;
	useEffect(() => {
		if (scanner.stage === "review") reviewHeading.current?.focus();
		if (scanner.stage === "results") resultHeading.current?.focus();
	}, [scanner.stage]);
	const reset = () => {
		scanner.reset();
		setApproved({});
		setConsent(false);
	};
	function transfer() {
		const selected = Object.fromEntries(
			transferable.filter(([key]) => approved[key]),
		);
		if (!consent || !Object.keys(selected).length) return;
		stageEligibilityDraft(selected, schemas[type].label);
		navigate("/eligibility");
	}
	function download() {
		const lines = [
			`Udaan document review: ${schemas[type].label}`,
			"Self-reviewed details; not certificate verification or an eligibility decision.",
			scheme
				? `Scholarship context: ${scheme.title}`
				: "No scholarship selected",
			"",
		];
		for (const [key, label] of Object.entries(schemas[type].fields))
			lines.push(
				`${label}: ${scanner.fields[key].value || "Not recorded"} (${origins[scanner.fields[key].source]})`,
			);
		for (const item of report.results)
			lines.push(`\n${item.label}: ${item.interpretation}\nNext: ${item.next}`);
		const url = URL.createObjectURL(
			new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }),
		);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "udaan-document-review.txt";
		anchor.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
	const important =
		report?.results
			.filter(
				(item) =>
					item.state === "Needs attention" ||
					(item.state === "Manual review required" && !item.optional),
			)
			.sort(
				(a, b) =>
					Number(b.state === "Needs attention") -
					Number(a.state === "Needs attention"),
			) || [];
	const other =
		report?.results.filter((item) => !important.includes(item)) || [];
	function observation(item) {
		const value = scanner.fields[item.field];
		return (
			<article className="scanner-result" key={item.id}>
				<div>
					<h3>{item.label}</h3>
					<span>
						{!item.rule && item.optional && !value?.value
							? "Optional / not recorded"
							: item.state === "Not verified" && !item.rule
								? "Recorded"
								: item.state}
					</span>
				</div>
				{value?.value && <p className="scanner-value">{value.value}</p>}
				<p>{item.interpretation}</p>
				<p className="scanner-next">
					<strong>Next:</strong> {item.next}
				</p>
				{item.rule && (
					<a
						href={item.rule.sourceUrl}
						target="_blank"
						rel="noopener noreferrer"
					>
						Official source: {item.rule.excerpt}
					</a>
				)}
				{value && <Evidence field={value} />}
			</article>
		);
	}
	return (
		<>
			<nav className="scanner-steps" aria-label="Document check progress">
				{["Add a document", "Review details", "Next steps"].map(
					(label, index) => (
						<span
							key={label}
							aria-current={currentStep === index + 1 ? "step" : undefined}
						>
							<b>{index + 1}</b>
							{label}
						</span>
					),
				)}
			</nav>
			<section
				className="scanner-workspace"
				aria-labelledby={
					report ? "results-title" : reviewing ? "review-title" : "input-title"
				}
			>
				<div className="scanner-workspace-top">
					<span>{schemas[type].label}</span>
					<button type="button" onClick={reset} className="scanner-text-button">
						<RotateCcw size={14} /> Reset check
					</button>
				</div>
				{scanner.error && (
					<p role="alert" className="scanner-error">
						{scanner.error}
					</p>
				)}
				{!reviewing && !report && !busy && (
					<>
						<h2 id="input-title">Add a file, or enter what you can read.</h2>
						<div
							className={`scanner-drop ${dragging ? "is-dragging" : ""}`}
							onDragOver={(event) => {
								event.preventDefault();
								setDragging(true);
							}}
							onDragLeave={() => setDragging(false)}
							onDrop={(event) => {
								event.preventDefault();
								setDragging(false);
								if (event.dataTransfer.files.length === 1)
									void scanner.scan(event.dataTransfer.files[0]);
							}}
						>
							<Upload size={27} />
							<strong>Choose a clear copy of your certificate</strong>
							<p>
								Keep all edges visible. Avoid glare, shadows and cropped dates.
							</p>
							<input
								id="certificate"
								type="file"
								accept=".pdf,.png,.jpg,.jpeg"
								onChange={(event) => {
									const file = event.target.files?.[0];
									event.target.value = "";
									if (file) void scanner.scan(file);
								}}
								aria-label="Choose certificate file"
							/>
							<small>PDF, PNG or JPG · up to 10 MB · 5 PDF pages</small>
						</div>
						<div className="scanner-manual">
							<span>
								Don’t have a readable file? You can still review its details.
							</span>
							<button
								type="button"
								onClick={scanner.manual}
								className="scanner-secondary"
							>
								Enter details manually <ArrowRight size={16} />
							</button>
						</div>
					</>
				)}
				{busy && (
					<div className="scanner-processing">
						<h2>Reading your document…</h2>
						<p role="status">{scanner.status}</p>
						<progress aria-label="Processing document locally" />
						<p>
							The first image scan loads English OCR assets. This can take
							longer on a phone.
						</p>
						<button type="button" onClick={reset} className="scanner-secondary">
							Cancel processing
						</button>
					</div>
				)}
				{reviewing && (
					<>
						<h2 id="review-title" ref={reviewHeading} tabIndex={-1}>
							Check the details we found.
						</h2>
						<p className="scanner-help">
							Compare each value with your original. Correct mistakes and leave
							unknown details blank. Dates use YYYY-MM-DD; income means annual
							family income.
						</p>
						<form
							autoComplete="off"
							onSubmit={(event) => {
								event.preventDefault();
								scanner.validate();
							}}
						>
							<div className="scanner-fields-grid">
								{Object.entries(schemas[type].fields).map(([key, label]) => {
									const field = scanner.fields[key];
									return (
										<div className="scanner-field" key={key}>
											<div className="scanner-field-topline">
												<label htmlFor={`field-${key}`}>{label}</label>
												<span className="scanner-origin">
													{origins[field.source]}
												</span>
											</div>
											<input
												id={`field-${key}`}
												value={field.value}
												maxLength={400}
												autoComplete="off"
												spellCheck={false}
												aria-describedby={`help-${key}`}
												onChange={(event) =>
													scanner.edit(key, event.target.value)
												}
												placeholder={
													/Date$/.test(key)
														? "YYYY-MM-DD"
														: "Enter only if known"
												}
											/>
											<p id={`help-${key}`} className="scanner-field-help">
												{field.ambiguous
													? "Different values found. Please resolve this against the original."
													: field.source === "missing"
														? "Not detected; this does not make your paper invalid."
														: "Compare with the original document."}
											</p>
											<Evidence field={field} />
										</div>
									);
								})}
							</div>
							<div className="scanner-review-actions">
								<span>
									{recorded} details recorded. You can edit them later.
								</span>
								<button
									type="submit"
									disabled={!recorded}
									className="scanner-primary"
								>
									Review next steps <ArrowRight size={17} />
								</button>
							</div>
						</form>
					</>
				)}
				{report && (
					<>
						<h2 id="results-title" ref={resultHeading} tabIndex={-1}>
							Here’s what to do next.
						</h2>
						<p className="scanner-help">
							{recorded} details recorded · {important.length} observations to
							review. These are reading and format checks, not a certificate
							pass or fail.
						</p>
						<div className="scanner-report-actions">
							<button
								type="button"
								className="scanner-secondary"
								onClick={scanner.review}
							>
								Edit details
							</button>
							<button
								type="button"
								className="scanner-secondary"
								onClick={download}
							>
								<Download size={16} /> Download review
							</button>
						</div>
						<div className="scanner-results">
							{important.length ? (
								important.map(observation)
							) : (
								<p className="scanner-clear-note">
									No date or format issues were found in the recorded values.
									Check the original and the scheme’s requirements before
									applying.
								</p>
							)}
						</div>
						<details className="scanner-recorded">
							<summary>Recorded and optional details ({other.length})</summary>
							{other.map(observation)}
						</details>
						<div className="scanner-notice">
							<strong>
								Scholarship-specific compliance:{" "}
								{report.schemeVerified
									? "See individual sourced checks"
									: "Not verified"}
							</strong>
							<p>
								Catalogue amounts, academic years and category labels alone do
								not establish certificate requirements.{" "}
								{scheme
									? `Use ${scheme.title}’s current guidelines to confirm what applies.`
									: "Choose a scholarship above to find its guidelines."}
							</p>
							{scheme?.url && (
								<a href={scheme.url} target="_blank" rel="noopener noreferrer">
									Read official guidelines <ArrowUpRight size={14} />
								</a>
							)}
						</div>
						<section className="scanner-handoff">
							<h3>Use a reviewed detail to save retyping.</h3>
							{transferable.length ? (
								<>
									<p>
										Choose what to carry into the eligibility form. We’ll open
										the form for your review; no match runs automatically.
									</p>
									{transferable.map(([key, value]) => (
										<label className="scanner-check" key={key}>
											<input
												type="checkbox"
												checked={Boolean(approved[key])}
												onChange={(event) =>
													setApproved({
														...approved,
														[key]: event.target.checked,
													})
												}
											/>
											<span>
												{labels[key]}:{" "}
												<strong>
													{key === "familyIncome"
														? `₹${value.toLocaleString("en-IN")}`
														: value}
												</strong>
											</span>
										</label>
									))}
									<label className="scanner-check scanner-consent">
										<input
											type="checkbox"
											checked={consent}
											onChange={(event) => setConsent(event.target.checked)}
										/>
										<span>
											I understand that these values are sent to Udaan when I
											submit the eligibility form. Signed-in submissions also
											update my eligibility profile.
										</span>
									</label>
									<button
										type="button"
										className="scanner-primary"
										disabled={
											!consent || !transferable.some(([key]) => approved[key])
										}
										onClick={transfer}
									>
										Continue to eligibility <ArrowRight size={16} />
									</button>
								</>
							) : (
								<p>
									No usable income, category or explicit study level is
									recorded. A semester number alone doesn’t identify your course
									level. You can enter these yourself in the{" "}
									<Link to="/eligibility">eligibility checker</Link>.
								</p>
							)}
							<Link className="scanner-checklist-link" to="/documents">
								Keep track of your remaining papers <ArrowUpRight size={14} />
							</Link>
						</section>
					</>
				)}
			</section>
		</>
	);
}
function Evidence({ field }) {
	if (!field.evidence.length)
		return (
			<p className="scanner-evidence-empty">
				{field.source === "manual"
					? "Entered by you; no source text was found."
					: "No source text found for this field."}
			</p>
		);
	return (
		<details className="scanner-evidence">
			<summary>
				View source evidence ({field.evidence.length})
				{field.source === "manual" ? " · before your edit" : ""}
			</summary>
			{field.evidence.map((item, index) => (
				<blockquote key={index}>
					<small>
						{item.method === "ocr" ? "OCR" : "PDF text"} · page {item.page}
					</small>
					<p>{item.text}</p>
				</blockquote>
			))}
		</details>
	);
}
