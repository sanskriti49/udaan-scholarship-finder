import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
	ShieldCheck,
	CheckCircle2,
	XCircle,
	FileText,
	Clock,
	ExternalLink,
	Sparkles,
	HelpCircle,
	ArrowRight,
	ArrowUpRight,
	Check,
	AlertCircle,
} from "lucide-react";
import { evaluateProfile, getUserProfile } from "../services/scholarshipService";
import EvidenceModal from "../components/EvidenceModal";
import { formatGrant } from "../utils/formatGrant";
import peekingGuy from "../assets/images/peeking-guy.jpg";

const COMMON_DOCUMENTS = [
	{ code: "INCOME_CERT", name: "Family Income Certificate" },
	{ code: "MARKSHEET", name: "10th / 12th / Semester Marksheet" },
	{ code: "DOMICILE_CERT", name: "State Domicile (Residence) Certificate" },
	{ code: "AADHAAR", name: "Aadhaar Card" },
	{ code: "BANK_PASSBOOK", name: "Bank Passbook / Account Proof" },
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
	const [activeTab, setActiveTab] = useState("eligible");
	const [evaluationData, setEvaluationData] = useState({
		matched: [],
		ineligible: [],
		summary: { totalEvaluated: 0, eligibleCount: 0, ineligibleCount: 0 },
	});

	const [evidenceScholarship, setEvidenceScholarship] = useState(null);
	const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

	const resultsRef = useRef(null);

	// Load saved student profile if authenticated
	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) return;
		getUserProfile()
			.then((res) => {
				if (res.success && res.data) {
					const p = res.data;
					setFormData((prev) => ({
						fullName: p.fullName || prev.fullName,
						educationLevel: p.educationLevel || prev.educationLevel,
						courseStream: p.courseStream || p.stream || prev.courseStream,
						familyIncome: p.familyIncome !== undefined ? p.familyIncome : (p.income !== undefined ? p.income : prev.familyIncome),
						gender: p.gender || prev.gender,
						casteCategory: p.casteCategory || p.caste_category || prev.casteCategory,
						state: p.state || prev.state,
						cgpa: p.cgpa !== undefined ? p.cgpa : prev.cgpa,
						hasDisability: p.hasDisability !== undefined ? p.hasDisability : prev.hasDisability,
					}));
					if (Array.isArray(p.documentsHeld) && p.documentsHeld.length > 0) {
						setDocumentsHeld(p.documentsHeld);
					}
				}
			})
			.catch(() => {});
	}, []);

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
		"w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 transition text-slate-900 placeholder-slate-400 shadow-2xs font-medium";
	const selectClass =
		"w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 transition text-slate-900 appearance-none cursor-pointer shadow-2xs font-medium";

	return (
		<div className="min-h-screen bg-[#FAF9F6] text-slate-900 pb-24 font-sans">
			{/* Page Header */}
			<section className="bg-white border-b border-slate-200/80 py-12 md:py-16 px-5 sm:px-8">
				<div className="max-w-4xl mx-auto text-center space-y-3">
					<div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
						<ShieldCheck size={14} className="text-emerald-700" />
						<span>Official Eligibility Matching Engine</span>
					</div>
					<h1 className="text-3xl sm:text-5xl md:text-6xl font-serif text-slate-900 tracking-tight">
						Discover What You{" "}
						<span className="italic text-emerald-800 font-normal">
							Qualify For
						</span>
					</h1>
					<p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto font-sans">
						Answer a few questions about your course, family income, and state.
						We compare your details directly against verified government
						circulars and trust policies.
					</p>
				</div>
			</section>

			{/* Form Container Card */}
			<div className="max-w-3xl relative mx-auto px-5 sm:px-8 -mt-6">
				{/* <img
					src={peekingGuy}
					alt=""
					aria-hidden="true"
					className="hidden lg:block absolute -right-20 top-8 w-44 z-0 pointer-events-none select-none transition-transform duration-500 ease-out hover:translate-x-3"
				/> */}
				<form
					onSubmit={handleCheckEligibility}
					className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8"
				>
					{/* Section 1: Academic & Demographic Details */}
					<div>
						<div className="border-b border-slate-100 pb-4 mb-6">
							<h2 className="text-lg sm:text-xl font-bold text-slate-900 font-sans">
								Academic & Background Details
							</h2>
							<p className="text-xs sm:text-sm text-slate-500 mt-0.5">
								Used to verify state quotas, income thresholds, and degree
								levels.
							</p>
						</div>

						{/* Grid Inputs */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							<div>
								<label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
									Current Level of Study
								</label>
								<select
									value={formData.educationLevel}
									onChange={(e) =>
										handleInputChange("educationLevel", e.target.value)
									}
									className={selectClass}
								>
									<option value="UG">
										College / Undergraduate (B.Tech, B.Sc, BA, etc.)
									</option>
									<option value="PG">
										Master's / Postgraduate (M.Tech, M.Sc, MA, etc.)
									</option>
									<option value="Diploma">Diploma / Polytechnic</option>
									<option value="Class 12">Class 12th</option>
									<option value="Class 10">Class 10th</option>
									<option value="PhD">PhD / Doctoral Research</option>
								</select>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
									Field / Stream of Study
								</label>
								<select
									value={formData.courseStream}
									onChange={(e) =>
										handleInputChange("courseStream", e.target.value)
									}
									className={selectClass}
								>
									<option value="Engineering">Engineering / Technology</option>
									<option value="Medical">Medical / Healthcare</option>
									<option value="Science">Pure & Applied Sciences</option>
									<option value="Commerce">Commerce & Business</option>
									<option value="Arts">Arts & Humanities</option>
									<option value="Other">Other Courses</option>
								</select>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
									Annual Family Income (₹)
								</label>
								<input
									type="number"
									min="0"
									step="10000"
									value={formData.familyIncome}
									onChange={(e) =>
										handleInputChange("familyIncome", e.target.value)
									}
									className={inputClass}
									placeholder="e.g. 250000"
									required
								/>
								<span className="text-[11px] text-slate-500 mt-1 block">
									As stated on your official income certificate
								</span>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
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
									placeholder="e.g. 8.0"
									required
								/>
								<span className="text-[11px] text-slate-500 mt-1 block">
									Your latest semester CGPA or board percentage equivalent
								</span>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
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
								<label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
									Social Category
								</label>
								<select
									value={formData.casteCategory}
									onChange={(e) =>
										handleInputChange("casteCategory", e.target.value)
									}
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
								<label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
									Domicile / Home State
								</label>
								<select
									value={formData.state}
									onChange={(e) => handleInputChange("state", e.target.value)}
									className={selectClass}
								>
									<option value="All India">
										Any Indian State (Central Quota)
									</option>
									<option value="UP">Uttar Pradesh</option>
									<option value="Maharashtra">Maharashtra</option>
									<option value="Karnataka">Karnataka</option>
									<option value="West Bengal">West Bengal</option>
									<option value="Bihar">Bihar</option>
									<option value="Delhi">Delhi NCR</option>
									<option value="Tamil Nadu">Tamil Nadu</option>
								</select>
							</div>

							<div className="flex items-center gap-3 pt-6">
								<input
									type="checkbox"
									id="disabilityCheck"
									checked={formData.hasDisability}
									onChange={(e) =>
										handleInputChange("hasDisability", e.target.checked)
									}
									className="w-4 h-4 text-emerald-800 rounded focus:ring-emerald-700"
								/>
								<label
									htmlFor="disabilityCheck"
									className="text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer"
								>
									I have a documented PwD disability certificate (40%+)
								</label>
							</div>
						</div>
					</div>

					{/* Section 2: Document Readiness Checklist */}
					<div className="pt-6 border-t border-slate-100">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
							<div>
								<h2 className="text-lg sm:text-xl font-bold text-slate-900 font-sans">
									Certificates You Currently Have Ready
								</h2>
								<p className="text-xs sm:text-sm text-slate-500 mt-0.5">
									We calculate your exact document readiness score so you avoid
									surprises.
								</p>
							</div>
							<span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full w-fit">
								{documentsHeld.length} Selected
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
							{COMMON_DOCUMENTS.map((doc) => {
								const isChecked = documentsHeld.includes(doc.code);
								return (
									<label
										key={doc.code}
										className={`flex items-center gap-3 p-3.5 rounded-2xl border text-xs sm:text-sm cursor-pointer transition-all ${
											isChecked
												? "bg-emerald-50/50 border-emerald-300 text-emerald-950 font-semibold"
												: "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
										}`}
									>
										<input
											type="checkbox"
											checked={isChecked}
											onChange={() => toggleDocument(doc.code)}
											className="w-4 h-4 text-emerald-800 rounded focus:ring-emerald-700"
										/>
										<span className="truncate">{doc.name}</span>
									</label>
								);
							})}
						</div>
					</div>

					{/* Submit Button */}
					<div className="pt-4">
						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full py-4 px-6 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white text-base font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
						>
							{isSubmitting ? (
								<>
									<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
									Evaluating your eligibility against verified rules...
								</>
							) : (
								<>
									<Sparkles size={18} />
									Check My Eligibility Now
								</>
							)}
						</button>
					</div>
				</form>
			</div>

			{/* Evaluation Results Container */}
			<div ref={resultsRef} className="max-w-4xl mx-auto px-5 sm:px-8 pt-14">
				{resultsVisible && (
					<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
						{/* Summary Header Banner */}
						<div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
							<div>
								<h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
									Your Eligibility Report
								</h3>
								<p className="text-xs sm:text-sm text-slate-500 mt-1">
									Checked against {evaluationData.summary.totalEvaluated}{" "}
									verified government, state, and foundation schemes.
								</p>
							</div>

							<div className="flex items-center gap-2.5 w-full sm:w-auto">
								<button
									onClick={() => setActiveTab("eligible")}
									className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer ${
										activeTab === "eligible"
											? "bg-emerald-800 text-white shadow-2xs"
											: "bg-slate-100 text-slate-700 hover:bg-slate-200"
									}`}
								>
									Eligible ({evaluationData.matched.length})
								</button>
								<button
									onClick={() => setActiveTab("ineligible")}
									className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer ${
										activeTab === "ineligible"
											? "bg-rose-700 text-white shadow-2xs"
											: "bg-slate-100 text-slate-700 hover:bg-slate-200"
									}`}
								>
									Not Eligible ({evaluationData.ineligible.length})
								</button>
							</div>
						</div>

						{/* Eligible Schemes Tab */}
						{activeTab === "eligible" && (
							<div className="space-y-5">
								{evaluationData.matched.length === 0 ? (
									<div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3 shadow-2xs">
										<HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
										<h4 className="text-lg font-sans font-bold text-slate-900">
											No direct matches for this criteria
										</h4>
										<p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
											Switch to the "Not Eligible" tab above to see which
											specific requirements weren't met and why.
										</p>
									</div>
								) : (
									evaluationData.matched.map((item) => {
										const evalInfo = item.evaluation || {};
										const docAudit = evalInfo.documentAudit || {};

										return (
											<div
												key={item._id}
												className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 hover:border-emerald-300 transition"
											>
												<div className="flex flex-col sm:flex-row items-start justify-between gap-4">
													<div className="space-y-1">
														<span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
															{item.category}
														</span>
														<h4 className="text-xl font-bold font-sans text-slate-900 leading-snug">
															{item.title}
														</h4>
														<p className="text-xs sm:text-sm text-slate-500">
															Authority:{" "}
															<span className="font-semibold text-slate-700">
																{item.organization}
															</span>
														</p>
														{(() => {
															const grant = formatGrant(item.amount);
															return (
																<p className="text-sm sm:text-base font-bold text-slate-900 pt-2 font-serif">
																	Financial Benefit:{" "}
																	<span className={`text-emerald-800 ${grant.isUnpublished ? "italic font-sans text-xs sm:text-sm font-medium text-slate-600" : ""}`}>
																		{grant.main} {grant.period || ""}
																	</span>
																</p>
															);
														})()}
													</div>

													{/* Readiness Score Gauge */}
													<div className="sm:border-l sm:pl-6 border-slate-100 shrink-0 text-left sm:text-right w-full sm:w-auto">
														<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
															Document Readiness
														</span>
														<span className="text-3xl sm:text-4xl font-serif font-bold text-emerald-800">
															{evalInfo.readinessScore}%
														</span>
														<span className="text-xs font-medium text-slate-500 block mt-0.5">
															{docAudit.missingCount === 0
																? "✓ All certificates ready"
																: `⚠️ ${docAudit.missingCount} certificate missing`}
														</span>
													</div>
												</div>

												{/* Verified Passed Rules */}
												<div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 space-y-2">
													<span className="text-xs font-bold uppercase tracking-wider text-emerald-900 block">
														Why you qualify (Criteria Passed):
													</span>
													<ul className="space-y-1.5">
														{evalInfo.passedRules?.map((r, idx) => (
															<li
																key={idx}
																className="text-xs sm:text-sm text-slate-800 flex items-start gap-2.5"
															>
																<CheckCircle2
																	size={15}
																	className="text-emerald-700 shrink-0 mt-0.5"
																/>
																<span>
																	<strong className="font-semibold text-slate-900">
																		{r.description}
																	</strong>{" "}
																	(Your profile:{" "}
																	<span className="text-emerald-800 font-semibold">
																		{String(r.actual)}
																	</span>
																	)
																</span>
															</li>
														))}
													</ul>
												</div>

												{/* Document Status & Actions */}
												<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
													<div className="text-xs sm:text-sm">
														{docAudit.missing && docAudit.missing.length > 0 ? (
															<p className="text-amber-850 font-medium">
																Missing certificate:{" "}
																<span className="font-bold text-amber-950">
																	{docAudit.missing
																		.map((d) => d.name)
																		.join(", ")}
																</span>
															</p>
														) : (
															<p className="text-emerald-800 font-semibold">
																✓ You have all required documents to apply right
																now!
															</p>
														)}
													</div>

													<div className="flex items-center gap-2 w-full sm:w-auto">
														<button
															onClick={() => {
																setEvidenceScholarship(item);
																setIsEvidenceOpen(true);
															}}
															className="flex-1 sm:flex-initial py-2 px-4 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
															title="View official scheme guidelines and criteria"
														>
															<FileText size={13} className="text-emerald-800" />
															<span>Rules & Details</span>
														</button>
														<a
															href={item.applicationLink || item.sourceUrl}
															target="_blank"
															rel="noopener noreferrer"
															className="flex-1 sm:flex-initial py-2 px-4 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs"
														>
															<span>Apply on Official Site</span>
															<ArrowUpRight size={13} />
														</a>
													</div>
												</div>
											</div>
										);
									})
								)}
							</div>
						)}

						{/* Ineligible Tab ("Why Not Eligible") */}
						{activeTab === "ineligible" && (
							<div className="space-y-5">
								{evaluationData.ineligible.map((item) => {
									const evalInfo = item.evaluation || {};

									return (
										<div
											key={item._id}
											className="bg-white border border-rose-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5"
										>
											<div className="flex items-start justify-between gap-3">
												<div className="space-y-1">
													<span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
														Not Eligible Yet
													</span>
													<h4 className="text-lg sm:text-xl font-bold font-sans text-slate-900">
														{item.title}
													</h4>
													<p className="text-xs sm:text-sm text-slate-500">
														{item.organization}
													</p>
												</div>

												<div className="flex items-center gap-2 shrink-0">
													<button
														onClick={() => {
															setEvidenceScholarship(item);
															setIsEvidenceOpen(true);
														}}
														className="py-1.5 px-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
														title="View official statutory clauses"
													>
														<FileText size={12} className="text-rose-700" />
														<span>View Citations</span>
													</button>
													{item.sourceUrl && (
														<a
															href={item.sourceUrl}
															target="_blank"
															rel="noopener noreferrer"
															className="py-1.5 px-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1"
														>
															<span>Guidelines</span>
															<ArrowUpRight size={12} />
														</a>
													)}
												</div>
											</div>

											{/* Reason Breakdown */}
											<div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200/70 space-y-3">
												<span className="text-xs font-bold uppercase tracking-wider text-rose-900 block">
													Reasons Why You Do Not Qualify:
												</span>
												<ul className="space-y-3">
													{evalInfo.failedRules?.map((f, idx) => (
														<li
															key={idx}
															className="text-xs sm:text-sm text-rose-900 flex items-start gap-2.5"
														>
															<XCircle
																size={16}
																className="text-rose-600 shrink-0 mt-0.5"
															/>
															<div className="space-y-1.5 flex-1">
																<p className="font-bold text-slate-900 text-sm">
																	{f.failMessage}
																</p>
																<div className="flex flex-wrap items-center gap-2">
																	<span className="text-xs font-semibold bg-white text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-200">
																		Required: {f.required}
																	</span>
																	<span className="text-xs font-medium bg-white text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
																		Your Profile: {String(f.actual)}
																	</span>
																</div>
																{f.citation && (
																	<div className="mt-2 p-3 rounded-xl bg-white border border-rose-200/70 text-xs text-slate-600 space-y-0.5">
																		<span className="font-bold text-slate-800 block">
																			Official Guideline (
																			{f.citation.clause || "Eligibility Rule"}
																			):
																		</span>
																		<p className="italic text-slate-500 leading-relaxed">
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

			{/* Evidence Modal */}
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
