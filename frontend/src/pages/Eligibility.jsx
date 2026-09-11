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
	ArrowUpRight,
	BookOpen,
} from "lucide-react";
import Badge from "../components/Badge";
import { evaluateProfile } from "../services/scholarshipService";
import EvidenceModal from "../components/EvidenceModal";

const COMMON_DOCUMENTS = [
	{ code: "INCOME_CERT", name: "Family Income Certificate" },
	{ code: "MARKSHEET", name: "10th / 12th / Semester Marksheet" },
	{ code: "DOMICILE_CERT", name: "State Domicile (Residence) Certificate" },
	{ code: "AADHAAR", name: "Aadhaar Card" },
	{ code: "BANK_PASSBOOK", name: "Bank Passbook / Account Details" },
	{ code: "CASTE_CERT", name: "Caste Certificate (OBC / SC / ST)" },
	{ code: "ADMISSION_PROOF", name: "College Admission Letter / ID Card" },
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
		"w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-3.5 text-base outline-none focus:border-[#5AAD1F] focus:ring-2 focus:ring-[#5AAD1F]/20 transition text-gray-900 placeholder-gray-500 shadow-2xs";
	const selectClass =
		"w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-3.5 text-base outline-none focus:border-[#5AAD1F] focus:ring-2 focus:ring-[#5AAD1F]/20 transition text-gray-900 appearance-none cursor-pointer shadow-2xs font-medium";

	return (
		<div className="min-h-screen bg-[#FAFAF8] text-gray-900 pb-24 font-sans">
			{/* Hero Section */}
			<section className="bg-[#F6FAF1] border-b border-[#DDECCB] py-14 px-6">
				<div className="max-w-4xl mx-auto text-center space-y-4">
					<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#C0DD97] text-[#27500A] text-sm font-bold shadow-2xs">
						<ShieldCheck className="w-4 h-4 text-[#5AAD1F]" />
						Official Eligibility Matcher
					</div>
					<h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight text-gray-900 tracking-tight">
						Find Scholarships You <span className="text-[#5AAD1F]">Actually Qualify For</span>
					</h1>
					<p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
						Answer a few simple questions about your course, marks, and certificates. We check your details directly against verified government and foundation rules so you know exactly where you can apply.
					</p>
				</div>
			</section>

			{/* Form Container */}
			<div className="max-w-3xl mx-auto px-6 -mt-8">
				<form
					onSubmit={handleCheckEligibility}
					className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-10 shadow-xl space-y-8"
				>
					<div className="border-b border-gray-100 pb-4">
						<h2 className="text-xl font-bold text-gray-900">
							1. Your Academic & Background Details
						</h2>
						<p className="text-sm text-gray-500 mt-1">
							These details are compared against official eligibility rules.
						</p>
					</div>

					{/* Grid of Inputs */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-bold text-gray-700 mb-2">
								Current Level of Study
							</label>
							<select
								value={formData.educationLevel}
								onChange={(e) => handleInputChange("educationLevel", e.target.value)}
								className={selectClass}
							>
								<option value="UG">College / Undergraduate (B.Tech, B.Sc, BA, etc.)</option>
								<option value="PG">Master's / Postgraduate (M.Tech, M.Sc, MA, etc.)</option>
								<option value="Diploma">Diploma / Polytechnic</option>
								<option value="Class 12">Class 12th</option>
								<option value="Class 10">Class 10th</option>
								<option value="PhD">PhD / Research Fellowship</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-bold text-gray-700 mb-2">
								Course / Field of Study
							</label>
							<select
								value={formData.courseStream}
								onChange={(e) => handleInputChange("courseStream", e.target.value)}
								className={selectClass}
							>
								<option value="Engineering">Engineering / Technology</option>
								<option value="Medical">Medical / Healthcare</option>
								<option value="Science">Pure / Applied Sciences</option>
								<option value="Commerce">Commerce / Business Studies</option>
								<option value="Arts">Arts / Humanities</option>
								<option value="Other">Other Courses</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-bold text-gray-700 mb-2">
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
							<span className="text-xs text-gray-500 mt-1.5 block">
								As stated on your family income certificate
							</span>
						</div>

						<div>
							<label className="block text-sm font-bold text-gray-700 mb-2">
								Academic Score (CGPA out of 10)
							</label>
							<input
								type="number"
								min="0"
								max="10"
								step="0.1"
								value={formData.cgpa}
								onChange={(e) => handleInputChange("cgpa", e.target.value)}
								className={inputClass}
								placeholder="e.g. 8.0"
								required
							/>
							<span className="text-xs text-gray-500 mt-1.5 block">
								Your current college CGPA or board equivalent
							</span>
						</div>

						<div>
							<label className="block text-sm font-bold text-gray-700 mb-2">
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
							<label className="block text-sm font-bold text-gray-700 mb-2">
								Social Category
							</label>
							<select
								value={formData.casteCategory}
								onChange={(e) => handleInputChange("casteCategory", e.target.value)}
								className={selectClass}
							>
								<option value="General">General Category</option>
								<option value="OBC">OBC (Other Backward Classes)</option>
								<option value="SC">SC (Scheduled Caste)</option>
								<option value="ST">ST (Scheduled Tribe)</option>
								<option value="EWS">EWS (Economically Weaker Section)</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-bold text-gray-700 mb-2">
								Home State (Domicile)
							</label>
							<select
								value={formData.state}
								onChange={(e) => handleInputChange("state", e.target.value)}
								className={selectClass}
							>
								<option value="All India">Any Indian State</option>
								<option value="UP">Uttar Pradesh</option>
								<option value="Bihar">Bihar</option>
								<option value="Maharashtra">Maharashtra</option>
								<option value="Delhi">Delhi</option>
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
								className="w-5 h-5 text-[#5AAD1F] rounded focus:ring-[#5AAD1F]"
							/>
							<label htmlFor="disabilityCheck" className="text-sm font-semibold text-gray-700 cursor-pointer">
								I have a documented disability certificate (PwD)
							</label>
						</div>
					</div>

					{/* Document Readiness Checklist */}
					<div className="pt-6 border-t border-gray-100">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
							<div>
								<h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
									<FileText className="w-5 h-5 text-blue-600" />
									2. Documents You Currently Have Ready
								</h2>
								<p className="text-sm text-gray-500 mt-0.5">
									Check the certificates you already possess so we can calculate your application readiness.
								</p>
							</div>
							<span className="text-xs font-bold text-[#27500A] bg-[#EAF3DE] px-3 py-1 rounded-full w-fit">
								{documentsHeld.length} Documents Checked
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
							{COMMON_DOCUMENTS.map((doc) => {
								const isChecked = documentsHeld.includes(doc.code);
								return (
									<label
										key={doc.code}
										className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm cursor-pointer transition-all ${
											isChecked
												? "bg-[#F6FAF1] border-[#C0DD97] text-[#27500A] font-semibold"
												: "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
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
							className="w-full py-4 px-6 rounded-2xl bg-[#27500A] hover:bg-[#1E3E08] text-white text-base font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
						>
							{isSubmitting ? (
								<>
									<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
									Checking your eligibility...
								</>
							) : (
								<>
									<Sparkles size={18} />
									Check My Eligibility & Application Readiness
								</>
							)}
						</button>
					</div>
				</form>
			</div>

			{/* Evaluation Results Section */}
			<div ref={resultsRef} className="max-w-4xl mx-auto px-6 pt-14">
				{resultsVisible && (
					<div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-300">
						{/* Summary Dashboard Banner */}
						<div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
							<div>
								<h3 className="text-xl font-bold text-gray-900">
									Your Scholarship Eligibility Report
								</h3>
								<p className="text-sm text-gray-600 mt-1">
									Checked against {evaluationData.summary.totalEvaluated} official scholarship programs.
								</p>
							</div>

							<div className="flex items-center gap-3 w-full sm:w-auto">
								{/* Tab Controls */}
								<button
									onClick={() => setActiveTab("eligible")}
									className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
										activeTab === "eligible"
											? "bg-[#27500A] text-white shadow-sm"
											: "bg-gray-100 text-gray-700 hover:bg-gray-200"
									}`}
								>
									Eligible ({evaluationData.matched.length})
								</button>
								<button
									onClick={() => setActiveTab("ineligible")}
									className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
										activeTab === "ineligible"
											? "bg-red-600 text-white shadow-sm"
											: "bg-gray-100 text-gray-700 hover:bg-gray-200"
									}`}
								>
									Not Eligible Yet ({evaluationData.ineligible.length})
								</button>
							</div>
						</div>

						{/* Eligible Tab View */}
						{activeTab === "eligible" && (
							<div className="space-y-5">
								{evaluationData.matched.length === 0 ? (
									<div className="p-12 text-center bg-white rounded-3xl border border-gray-200 space-y-3">
										<HelpCircle className="w-12 h-12 text-gray-400 mx-auto" />
										<h4 className="text-lg font-bold text-gray-800">
											No direct matches found for this profile
										</h4>
										<p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
											Switch to the "Not Eligible Yet" tab above to see which specific requirements weren't met, and what you can do to qualify.
										</p>
									</div>
								) : (
									evaluationData.matched.map((item) => {
										const evalInfo = item.evaluation || {};
										const docAudit = evalInfo.documentAudit || {};

										return (
											<div
												key={item._id}
												className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all space-y-6"
											>
												<div className="flex flex-col sm:flex-row items-start justify-between gap-4">
													<div className="space-y-1">
														<div className="flex items-center gap-2 flex-wrap mb-2">
															<span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EAF3DE] text-[#27500A]">
																{item.category}
															</span>
															<span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
																<CheckCircle2 size={13} />
																100% Criteria Match
															</span>
														</div>
														<h4 className="text-xl font-bold text-gray-900 leading-snug">
															{item.title}
														</h4>
														<p className="text-sm text-gray-600">
															Provided by <span className="font-semibold text-gray-800">{item.organization}</span>
														</p>
														<p className="text-base font-black text-gray-900 pt-1">
															Financial Benefit: <span className="text-[#27500A]">{item.amount?.displayString}</span>
														</p>
													</div>

													{/* Composite Readiness Meter */}
													<div className="sm:border-l sm:pl-6 border-gray-100 shrink-0 text-left sm:text-right w-full sm:w-auto">
														<span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
															Application Readiness
														</span>
														<span className="text-3xl sm:text-4xl font-black text-[#27500A]">
															{evalInfo.readinessScore}%
														</span>
														<span className="text-xs font-medium text-gray-500 block mt-0.5">
															{docAudit.missingCount === 0
																? "✓ All documents ready!"
																: `⚠️ ${docAudit.missingCount} certificate missing`}
														</span>
													</div>
												</div>

												{/* Rule Verification Highlights */}
												<div className="p-5 rounded-2xl bg-[#F6FAF1] border border-[#DDECCB] space-y-2.5">
													<span className="text-xs font-bold uppercase tracking-wider text-[#27500A] block">
														Why you qualify (All criteria met):
													</span>
													<ul className="space-y-2">
														{evalInfo.passedRules?.map((r, idx) => (
															<li
																key={idx}
																className="text-sm text-gray-800 flex items-start gap-2.5"
															>
																<CheckCircle2
																	size={16}
																	className="text-[#5AAD1F] shrink-0 mt-0.5"
																/>
																<span>
																	<strong className="font-semibold text-gray-900">
																		{r.description}
																	</strong>{" "}
																	(Your profile: <span className="text-[#27500A] font-semibold">{String(r.actual)}</span>)
																</span>
															</li>
														))}
													</ul>
												</div>

												{/* Document Readiness Audit */}
												<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-100">
													<div className="text-sm space-y-1">
														<span className="font-bold text-gray-800">
															Document Status: {docAudit.percentage}% prepared
														</span>
														{docAudit.missing && docAudit.missing.length > 0 ? (
															<p className="text-amber-800 text-xs sm:text-sm font-medium">
																Missing before applying:{" "}
																<span className="font-bold text-amber-900">
																	{docAudit.missing.map((d) => d.name).join(", ")}
																</span>
															</p>
														) : (
															<p className="text-emerald-700 text-xs sm:text-sm font-semibold">
																✓ You have all required documents to apply right now!
															</p>
														)}
													</div>

													<div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
														<button
															onClick={() => {
																setEvidenceScholarship(item);
																setIsEvidenceOpen(true);
															}}
															className="flex-1 sm:flex-initial py-2.5 px-3.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-xs sm:text-sm font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
														>
															<FileText size={15} />
															View Verification Rules
														</button>
														<a
															href={item.applicationLink || item.sourceUrl}
															target="_blank"
															rel="noopener noreferrer"
															className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-[#27500A] text-white text-xs sm:text-sm font-bold hover:bg-[#1E3E08] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
															title="Apply directly on official portal"
														>
															Apply on Portal <ExternalLink size={14} />
														</a>
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
							<div className="space-y-5">
								{evaluationData.ineligible.map((item) => {
									const evalInfo = item.evaluation || {};

									return (
										<div
											key={item._id}
											className="bg-white border border-red-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5"
										>
											<div className="flex items-start justify-between gap-3">
												<div className="space-y-1">
													<span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-800 inline-flex items-center gap-1.5">
														<XCircle size={13} />
														Currently Not Eligible
													</span>
													<h4 className="text-lg font-bold text-gray-900 mt-1.5">
														{item.title}
													</h4>
													<p className="text-sm text-gray-500">
														{item.organization}
													</p>
												</div>

												{item.sourceUrl && (
													<a
														href={item.sourceUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="py-2 px-3.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5 shrink-0"
														title="Open official scheme notice / guidelines"
													>
														<FileText size={13} />
														Official Guidelines <ExternalLink size={12} />
													</a>
												)}
											</div>

											{/* Explicit Failure Diagnostics with Clean Human-Readable Text */}
											<div className="p-5 rounded-2xl bg-red-50/70 border border-red-200/80 space-y-4">
												<span className="text-xs font-bold uppercase tracking-wider text-red-900 block">
													Specific Reason(s) Why You Do Not Qualify:
												</span>
												<ul className="space-y-3.5">
													{evalInfo.failedRules?.map((f, idx) => (
														<li
															key={idx}
															className="text-sm text-red-800 flex items-start gap-3"
														>
															<XCircle
																size={18}
																className="text-red-600 shrink-0 mt-0.5"
															/>
															<div className="space-y-2 flex-1">
																<p className="font-bold text-red-950 text-sm sm:text-base">
																	{f.failMessage}
																</p>
																<div className="flex flex-wrap items-center gap-2">
																	<span className="inline-flex items-center text-xs font-semibold bg-red-100 text-red-900 px-2.5 py-1 rounded-lg border border-red-200">
																		Required: {f.required}
																	</span>
																	<span className="inline-flex items-center text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
																		Your Profile: {String(f.actual)}
																	</span>
																</div>
																{f.citation && (
																	<div className="mt-2 p-3 rounded-xl bg-white/95 border border-red-200 text-xs text-slate-700 space-y-1">
																		<span className="font-bold text-slate-900 block text-xs">
																			Official Rule Citation ({f.citation.clause || "Official Guideline"}):
																		</span>
																		<p className="italic text-slate-600 leading-relaxed text-xs sm:text-sm">
																			"{f.citation.quote}"
																		</p>
																	</div>
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
