import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
	ShieldCheck,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	FileText,
	Clock,
	ExternalLink,
	Sparkles,
	HelpCircle,
	ArrowRight,
	BookOpen,
} from "lucide-react";
import Badge from "../components/Badge";
import { evaluateProfile } from "../services/scholarshipService";
import EvidenceModal from "../components/EvidenceModal";

const COMMON_DOCUMENTS = [
	{ code: "INCOME_CERT", name: "Family Income Certificate" },
	{ code: "MARKSHEET", name: "10th / 12th / Degree Marksheet" },
	{ code: "DOMICILE_CERT", name: "State Domicile Certificate" },
	{ code: "AADHAAR", name: "Aadhaar Card" },
	{ code: "BANK_PASSBOOK", name: "Bank Passbook / Details" },
	{ code: "CASTE_CERT", name: "Caste Certificate (OBC/SC/ST)" },
	{ code: "ADMISSION_PROOF", name: "College Allotment / Admission Proof" },
	{ code: "BONAFIDE_CERT", name: "College Bonafide Certificate" },
];

export default function EligibilityPage() {
	const [formData, setFormData] = useState({
		fullName: "",
		educationLevel: "UG",
		courseStream: "Engineering",
		familyIncome: 250000,
		gender: "Female",
		casteCategory: "General",
		state: "All India",
		cgpa: 8.0,
		hasDisability: false,
	});

	const [documentsHeld, setDocumentsHeld] = useState([
		"MARKSHEET",
		"AADHAAR",
		"BANK_PASSBOOK",
	]);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [resultsVisible, setResultsVisible] = useState(false);
	const [activeTab, setActiveTab] = useState("eligible"); // 'eligible' | 'ineligible'
	const [evaluationData, setEvaluationData] = useState({
		matched: [],
		ineligible: [],
		summary: { totalEvaluated: 0, eligibleCount: 0, ineligibleCount: 0 },
	});

	const [evidenceScholarship, setEvidenceScholarship] = useState(null);
	const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

	const resultsRef = useRef(null);

	const toggleDocument = (code) => {
		setDocumentsHeld((prev) =>
			prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
		);
	};

	const handleInputChange = (field, value) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleCheckEligibility = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);
		setResultsVisible(false);

		try {
			const payload = {
				...formData,
				familyIncome: Number(formData.familyIncome),
				cgpa: Number(formData.cgpa),
				documentsHeld,
			};

			const response = await evaluateProfile(payload);
			if (response.success) {
				setEvaluationData({
					matched: response.data.matched || [],
					ineligible: response.data.ineligible || [],
					summary: response.summary || {},
				});
				setResultsVisible(true);
				setTimeout(() => {
					resultsRef.current?.scrollIntoView({
						behavior: "smooth",
						block: "start",
					});
				}, 100);
			}
		} catch (err) {
			console.error("Eligibility evaluation failed:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	const inputClass =
		"w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#5AAD1F] focus:ring-2 focus:ring-[#5AAD1F]/20 transition text-gray-900 placeholder-gray-500 shadow-2xs";
	const selectClass =
		"w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#5AAD1F] focus:ring-2 focus:ring-[#5AAD1F]/20 transition text-gray-900 appearance-none cursor-pointer shadow-2xs font-medium";

	return (
		<div className="min-h-screen bg-[#FAFAF8] text-gray-900 pb-24">
			{/* Hero Section */}
			<section className="bg-[#F6FAF1] border-b border-[#DDECCB] py-14 px-6">
				<div className="max-w-4xl mx-auto text-center">
					<Badge>Deterministic Rule Intelligence</Badge>
					<h1 className="text-3xl md:text-5xl font-extrabold leading-tight mt-3 mb-3 text-gray-900">
						Verifiable Scholarship <span className="text-[#5AAD1F]">Eligibility Engine</span>
					</h1>
					<p className="text-sm text-gray-600 leading-relaxed max-w-xl mx-auto">
						No black-box guesses. We evaluate your profile against official government and foundation rule trees with mathematical certainty, document readiness checks, and source citations.
					</p>
				</div>
			</section>

			{/* Form Container */}
			<div className="max-w-3xl mx-auto px-6 -mt-6">
				<form
					onSubmit={handleCheckEligibility}
					className="bg-white border border-gray-200/90 rounded-3xl p-6 md:p-10 shadow-xl space-y-8"
				>
					<div className="border-b border-gray-100 pb-4">
						<h2 className="text-lg font-bold text-gray-900">
							1. Student Academic & Demographic Profile
						</h2>
						<p className="text-xs text-gray-500 mt-0.5">
							These attributes are mapped against the scheme's statutory eligibility criteria.
						</p>
					</div>

					{/* Grid of Inputs */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
						<div>
							<label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
								Current Degree Level
							</label>
							<select
								value={formData.educationLevel}
								onChange={(e) => handleInputChange("educationLevel", e.target.value)}
								className={selectClass}
							>
								<option value="UG">Undergraduate (UG / B.Tech / B.Sc)</option>
								<option value="PG">Postgraduate (PG / M.Tech / M.Sc)</option>
								<option value="Diploma">Diploma / Polytechnic</option>
								<option value="Class 12">Class 12th</option>
								<option value="Class 10">Class 10th</option>
								<option value="PhD">PhD / Doctoral</option>
							</select>
						</div>

						<div>
							<label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
								Field / Discipline Stream
							</label>
							<select
								value={formData.courseStream}
								onChange={(e) => handleInputChange("courseStream", e.target.value)}
								className={selectClass}
							>
								<option value="Engineering">Engineering / Technology</option>
								<option value="Medical">Medicine / Healthcare</option>
								<option value="Science">Natural / Applied Sciences</option>
								<option value="Commerce">Commerce / Management</option>
								<option value="Arts">Humanities / Arts</option>
								<option value="Other">Other Disciplines</option>
							</select>
						</div>

						<div>
							<label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
								Annual Family Income (₹)
							</label>
							<input
								type="number"
								min="0"
								step="10000"
								value={formData.familyIncome}
								onChange={(e) => handleInputChange("familyIncome", e.target.value)}
								className={inputClass}
								placeholder="e.g. 250000"
								required
							/>
							<span className="text-[11px] text-gray-400 mt-1 block">
								As certified by competent local revenue authority
							</span>
						</div>

						<div>
							<label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
								Academic Score (CGPA / 10)
							</label>
							<input
								type="number"
								min="0"
								max="10"
								step="0.1"
								value={formData.cgpa}
								onChange={(e) => handleInputChange("cgpa", e.target.value)}
								className={inputClass}
								placeholder="e.g. 8.5"
								required
							/>
						</div>

						<div>
							<label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
								Gender
							</label>
							<select
								value={formData.gender}
								onChange={(e) => handleInputChange("gender", e.target.value)}
								className={selectClass}
							>
								<option value="Female">Female</option>
								<option value="Male">Male</option>
								<option value="Other">Other</option>
							</select>
						</div>

						<div>
							<label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
								Social Category
							</label>
							<select
								value={formData.casteCategory}
								onChange={(e) => handleInputChange("casteCategory", e.target.value)}
								className={selectClass}
							>
								<option value="General">General</option>
								<option value="OBC">OBC (Other Backward Classes)</option>
								<option value="SC">SC (Scheduled Caste)</option>
								<option value="ST">ST (Scheduled Tribe)</option>
								<option value="EWS">EWS (Economically Weaker Section)</option>
							</select>
						</div>

						<div>
							<label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
								Domicile State
							</label>
							<select
								value={formData.state}
								onChange={(e) => handleInputChange("state", e.target.value)}
								className={selectClass}
							>
								<option value="All India">All India Resident</option>
								<option value="UP">Uttar Pradesh</option>
								<option value="Bihar">Bihar</option>
								<option value="Maharashtra">Maharashtra</option>
								<option value="Delhi">Delhi NCT</option>
								<option value="Karnataka">Karnataka</option>
								<option value="Tamil Nadu">Tamil Nadu</option>
							</select>
						</div>

						<div className="flex items-center gap-3 pt-6">
							<input
								type="checkbox"
								id="disabilityCheck"
								checked={formData.hasDisability}
								onChange={(e) => handleInputChange("hasDisability", e.target.checked)}
								className="w-4 h-4 text-[#5AAD1F] rounded focus:ring-[#5AAD1F]"
							/>
							<label htmlFor="disabilityCheck" className="text-xs font-semibold text-gray-700 cursor-pointer">
								Documented Disability (PwD) Candidate
							</label>
						</div>
					</div>

					{/* Document Readiness Checklist */}
					<div className="pt-6 border-t border-gray-100">
						<div className="flex items-center justify-between mb-3">
							<div>
								<h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
									<FileText className="w-4 h-4 text-blue-600" />
									2. Your Current Document Inventory
								</h2>
								<p className="text-xs text-gray-500 mt-0.5">
									Check off certificates you already possess to evaluate application readiness.
								</p>
							</div>
							<span className="text-xs font-semibold text-[#27500A] bg-[#EAF3DE] px-2.5 py-1 rounded-full">
								{documentsHeld.length} Documents Selected
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
							{COMMON_DOCUMENTS.map((doc) => {
								const isChecked = documentsHeld.includes(doc.code);
								return (
									<label
										key={doc.code}
										className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
											isChecked
												? "bg-[#F6FAF1] border-[#C0DD97] text-[#27500A] font-medium"
												: "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
										}`}
									>
										<input
											type="checkbox"
											checked={isChecked}
											onChange={() => toggleDocument(doc.code)}
											className="w-4 h-4 text-[#5AAD1F] rounded focus:ring-[#5AAD1F]"
										/>
										<span className="truncate">{doc.name}</span>
									</label>
								);
							})}
						</div>
					</div>

					{/* Action Button */}
					<div className="pt-4">
						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full py-4 px-6 rounded-2xl bg-[#27500A] hover:bg-[#1E3E08] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
						>
							{isSubmitting ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									Running Deterministic Rule Engine...
								</>
							) : (
								<>
									<Sparkles size={16} />
									Evaluate Eligibility & Document Readiness
								</>
							)}
						</button>
					</div>
				</form>
			</div>

			{/* Evaluation Results Section */}
			<div ref={resultsRef} className="max-w-4xl mx-auto px-6 pt-12">
				{resultsVisible && (
					<div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-300">
						{/* Summary Dashboard Banner */}
						<div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
							<div>
								<h3 className="text-base font-bold text-gray-900">
									Eligibility Audit Complete
								</h3>
								<p className="text-xs text-gray-500 mt-0.5">
									Evaluated against {evaluationData.summary.totalEvaluated} active scholarship rule ASTs.
								</p>
							</div>

							<div className="flex items-center gap-3">
								{/* Tab Controls */}
								<button
									onClick={() => setActiveTab("eligible")}
									className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
										activeTab === "eligible"
											? "bg-[#27500A] text-white shadow-sm"
											: "bg-gray-100 text-gray-600 hover:bg-gray-200"
									}`}
								>
									Eligible Opportunities ({evaluationData.matched.length})
								</button>
								<button
									onClick={() => setActiveTab("ineligible")}
									className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
										activeTab === "ineligible"
											? "bg-red-600 text-white shadow-sm"
											: "bg-gray-100 text-gray-600 hover:bg-gray-200"
									}`}
								>
									Why am I NOT eligible? ({evaluationData.ineligible.length})
								</button>
							</div>
						</div>

						{/* Eligible Tab View */}
						{activeTab === "eligible" && (
							<div className="space-y-4">
								{evaluationData.matched.length === 0 ? (
									<div className="p-12 text-center bg-white rounded-3xl border border-gray-200 space-y-3">
										<HelpCircle className="w-10 h-10 text-gray-400 mx-auto" />
										<h4 className="text-base font-bold text-gray-800">
											No direct matches found for this profile
										</h4>
										<p className="text-xs text-gray-500 max-w-sm mx-auto">
											Check the "Why am I NOT eligible?" tab to inspect the specific requirements you missed and discover what changes can unlock eligibility.
										</p>
									</div>
								) : (
									evaluationData.matched.map((item) => {
										const evalInfo = item.evaluation || {};
										const docAudit = evalInfo.documentAudit || {};

										return (
											<div
												key={item._id}
												className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-5"
											>
												<div className="flex flex-col sm:flex-row items-start justify-between gap-3">
													<div>
														<div className="flex items-center gap-2 flex-wrap mb-1">
															<span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EAF3DE] text-[#27500A]">
																{item.category}
															</span>
															<span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
																<CheckCircle2 size={12} />
																{evalInfo.matchConfidence}% Match Confidence
															</span>
														</div>
														<h4 className="text-lg font-bold text-gray-900">
															{item.title}
														</h4>
														<p className="text-xs text-gray-500">
															{item.organization} • Award:{" "}
															<span className="font-bold text-gray-800">
																{item.amount?.displayString}
															</span>
														</p>
													</div>

													{/* Composite Readiness Meter */}
													<div className="text-right sm:border-l sm:pl-5 border-gray-100 shrink-0">
														<span className="text-[11px] font-bold text-gray-500 uppercase block">
															Readiness Score
														</span>
														<span className="text-2xl font-black text-[#27500A]">
															{evalInfo.readinessScore}%
														</span>
														<span className="text-[10px] text-gray-400 block">
															{docAudit.missingCount === 0
																? "Ready to apply now"
																: `${docAudit.missingCount} doc missing`}
														</span>
													</div>
												</div>

												{/* Rule Verification Highlights */}
												<div className="p-4 rounded-2xl bg-[#F6FAF1]/70 border border-[#DDECCB] space-y-2">
													<span className="text-[11px] font-bold uppercase tracking-wider text-[#27500A] block">
														Verified Rule Criteria (All Passed)
													</span>
													<ul className="space-y-1.5">
														{evalInfo.passedRules?.map((r, idx) => (
															<li
																key={idx}
																className="text-xs text-gray-700 flex items-start gap-2"
															>
																<CheckCircle2
																	size={14}
																	className="text-[#5AAD1F] shrink-0 mt-0.5"
																/>
																<span>
																	<strong className="font-semibold text-gray-900">
																		{r.description}
																	</strong>{" "}
																	— your profile: {String(r.actual)}
																</span>
															</li>
														))}
													</ul>
												</div>

												{/* Document Readiness Audit */}
												<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-gray-100">
													<div className="text-xs space-y-1">
														<span className="font-bold text-gray-700">
															Document Readiness: {docAudit.percentage}%
														</span>
														{docAudit.missing && docAudit.missing.length > 0 ? (
															<p className="text-amber-800 text-[11px]">
																⚠️ Missing for application:{" "}
																<span className="font-semibold">
																	{docAudit.missing.map((d) => d.name).join(", ")}
																</span>
															</p>
														) : (
															<p className="text-emerald-700 text-[11px] font-semibold">
																✓ All prerequisite certificates are in your inventory!
															</p>
														)}
													</div>

													<div className="flex items-center gap-2 w-full sm:w-auto">
														<button
															onClick={() => {
																setEvidenceScholarship(item);
																setIsEvidenceOpen(true);
															}}
															className="py-2 px-3.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5"
														>
															<FileText size={13} />
															Inspect Official Proof
														</button>
														{item.applicationLink && (
															<a
																href={item.applicationLink}
																target="_blank"
																rel="noopener noreferrer"
																className="py-2 px-3.5 rounded-xl bg-[#27500A] text-white text-xs font-bold hover:bg-[#1E3E08] transition-colors flex items-center gap-1.5"
															>
																Apply Portal <ExternalLink size={13} />
															</a>
														)}
													</div>
												</div>
											</div>
										);
									})
								)}
							</div>
						)}

						{/* Ineligible Tab View ("Why Am I NOT Eligible?") */}
						{activeTab === "ineligible" && (
							<div className="space-y-4">
								{evaluationData.ineligible.map((item) => {
									const evalInfo = item.evaluation || {};

									return (
										<div
											key={item._id}
											className="bg-white border border-red-100 rounded-3xl p-6 shadow-sm space-y-4"
										>
											<div className="flex items-start justify-between gap-3">
												<div>
													<span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 inline-flex items-center gap-1 mb-1">
														<XCircle size={12} />
														Ineligible Under Current Criteria
													</span>
													<h4 className="text-base font-bold text-gray-900 mt-1">
														{item.title}
													</h4>
													<p className="text-xs text-gray-500">
														{item.organization}
													</p>
												</div>

												<button
													onClick={() => {
														setEvidenceScholarship(item);
														setIsEvidenceOpen(true);
													}}
													className="py-1.5 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
												>
													View Criteria
												</button>
											</div>

											{/* Explicit Failure Diagnostics */}
											<div className="p-4 rounded-2xl bg-red-50/70 border border-red-200/80 space-y-2">
												<span className="text-[11px] font-bold uppercase tracking-wider text-red-900 block">
													Reasons for Ineligibility
												</span>
												<ul className="space-y-1.5">
													{evalInfo.failedRules?.map((f, idx) => (
														<li
															key={idx}
															className="text-xs text-red-800 flex items-start gap-2"
														>
															<XCircle
																size={14}
																className="text-red-600 shrink-0 mt-0.5"
															/>
															<div>
																<p className="font-semibold text-red-900">
																	{f.failMessage}
																</p>
																<p className="text-[11px] text-red-700">
																	Requirement: {f.required} | Your Profile:{" "}
																	{String(f.actual)}
																</p>
																{f.citation && (
																	<p className="text-[10px] text-red-600 italic mt-0.5">
																		Cites: "{f.citation.quote}" ({f.citation.clause})
																	</p>
																)}
															</div>
														</li>
													))}
												</ul>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				)}
			</div>

			{/* Evidence Modal Component */}
			<EvidenceModal
				isOpen={isEvidenceOpen}
				onClose={() => {
					setIsEvidenceOpen(false);
					setEvidenceScholarship(null);
				}}
				scholarship={evidenceScholarship}
			/>
		</div>
	);
}
