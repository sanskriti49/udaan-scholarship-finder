import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Download,
  Printer,
  ShieldCheck,
  Lock,
  Building,
  HelpCircle,
  Calendar,
  Sparkles,
  RefreshCw,
  X,
  FileCheck,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export default function DocumentVault() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [docStatuses, setDocStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem("udaan_doc_vault");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Expiry Auditor state
  const [incomeIssueDate, setIncomeIssueDate] = useState("");
  const [expiryAuditResult, setExpiryAuditResult] = useState(null);

  // Bonafide Modal state
  const [bonafideModalOpen, setBonafideModalOpen] = useState(false);
  const [bonafideForm, setBonafideForm] = useState({
    studentName: "",
    collegeName: "",
    courseBranch: "",
    rollNumber: "",
    academicYear: "2024-2025",
  });

  // DBT Modal state
  const [dbtModalOpen, setDbtModalOpen] = useState(false);

  // Save checklist state locally
  const toggleDocStatus = (docId) => {
    const current = docStatuses[docId] || "pending";
    const nextStatus =
      current === "pending"
        ? "in_progress"
        : current === "in_progress"
        ? "ready"
        : "pending";

    const updated = { ...docStatuses, [docId]: nextStatus };
    setDocStatuses(updated);
    try {
      localStorage.setItem("udaan_doc_vault", JSON.stringify(updated));
    } catch {}

    if (nextStatus === "ready") {
      toast.success("Document marked as verified and ready.");
    }
  };

  // Financial Year Expiry Auditor logic
  const handleAuditIncomeDate = (e) => {
    e.preventDefault();
    if (!incomeIssueDate) {
      toast.error("Please enter the issue date from your Income Certificate.");
      return;
    }

    const issueDate = new Date(incomeIssueDate);
    if (isNaN(issueDate.getTime())) {
      toast.error("Invalid date format.");
      return;
    }

    // Determine Financial Year of issue
    const issueYear = issueDate.getFullYear();
    const issueMonth = issueDate.getMonth() + 1; // 1-12
    const startFY = issueMonth >= 4 ? issueYear : issueYear - 1;
    const endFY = startFY + 1;
    const certFY = startFY + "-" + (endFY % 100);

    // Current active financial year in India (FY 2024-25)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const activeStartFY = currentMonth >= 4 ? currentYear : currentYear - 1;
    const activeEndFY = activeStartFY + 1;
    const currentFY = activeStartFY + "-" + (activeEndFY % 100);

    const isCurrentFY = startFY === activeStartFY;
    const isPastFY = startFY < activeStartFY;

    setExpiryAuditResult({
      issueDate: incomeIssueDate,
      certFY,
      currentFY,
      isCurrentFY,
      isPastFY,
      valid: isCurrentFY,
      remedy: isPastFY
        ? "Your certificate was issued in FY " + certFY + ". Under statutory regulations for NSP and state post-matric scholarships, income certificates must be issued on or after April 1, " + activeStartFY + ". Renew it immediately on your state e-District portal before applying."
        : "Valid. Your Income Certificate is issued within the active financial year (FY " + currentFY + ") and meets statutory verification criteria.",
    });
  };

  const categories = [
    { id: "all", label: "All Essential Documents" },
    { id: "central", label: "Central Govt (NSP)" },
    { id: "state", label: "State DBT & Fee Waiver" },
    { id: "reserved", label: "SC / ST / OBC / EWS" },
    { id: "merit", label: "Merit & Women in STEM" },
  ];

  const documentRegistry = [
    {
      id: "income_cert",
      name: "Income Certificate (Current FY)",
      category: ["all", "central", "state", "reserved", "merit"],
      authority: "Tehsildar / Sub-Divisional Magistrate (SDM) / Revenue Officer",
      validity: "Strictly Current Financial Year (Issued on or after April 1, 2024)",
      pitfall:
        "Over 40% of rejections occur because the Income Certificate is from the past financial year. Must have digital barcode and official digital seal.",
      officialFormats: "Issued online via state e-District / Edistrict portal with verification QR code.",
      hasAuditor: true,
    },
    {
      id: "domicile_cert",
      name: "Domicile / Permanent Residence Certificate",
      category: ["all", "state", "central"],
      authority: "District Magistrate (DM) / SDM / Tehsildar",
      validity: "Permanent or as prescribed by state government",
      pitfall:
        "Address on domicile must match Aadhaar card permanent address exactly. Required for all state government grant quotas.",
      officialFormats: "Issued on state e-District portal with unique Application ID.",
    },
    {
      id: "caste_cert",
      name: "Caste / Category Certificate (SC / ST / OBC-NCL / EWS)",
      category: ["all", "reserved", "central", "state"],
      authority: "Competent Revenue Authority (Tehsildar / Deputy Commissioner)",
      validity: "SC/ST: Lifetime; OBC-NCL & EWS: Issued within active Financial Year",
      pitfall:
        "For Central NSP schemes, OBC certificates must be in the Central Format (NCL) and not just state-specific format.",
      officialFormats: "Must specify non-creamy layer clause for OBC and annual asset ceiling for EWS.",
    },
    {
      id: "bonafide_cert",
      name: "Bonafide Student Certificate",
      category: ["all", "central", "state", "merit"],
      authority: "College Principal / Dean / Institute Registrar",
      validity: "Current Academic Year (2024-2025)",
      pitfall:
        "Must be on official institutional letterhead with institute AISHE code, official stamp, and registrar signature.",
      officialFormats: "Standard university bonafide template with enrollment number.",
      hasGenerator: true,
    },
    {
      id: "marksheet_prev",
      name: "Previous Year Examination Marksheet",
      category: ["all", "central", "state", "merit"],
      authority: "State Examination Board / University Controller of Examinations",
      validity: "Immediate preceding qualifying academic exam",
      pitfall:
        "Internet marksheets must be attested by college nodal officer or principal. Must verify minimum percentage requirement (e.g. 50%, 60%, 75%).",
      officialFormats: "Original marksheet or DigiLocker verified digital marksheet.",
    },
    {
      id: "bank_npci_dbt",
      name: "Aadhaar-NPCI Bank Seeding Mandate",
      category: ["all", "central", "state", "reserved", "merit"],
      authority: "National Payments Corporation of India (NPCI) & Student Bank Branch",
      validity: "Must remain active and unblocked throughout the academic year",
      pitfall:
        "The #1 reason scholarship funds fail to disburse is bank account not being mapped to NPCI mapper for Direct Benefit Transfer (DBT).",
      officialFormats: "DBT enabled savings account with Aadhaar seeding confirmation.",
      hasDbtGuide: true,
    },
    {
      id: "fee_receipt",
      name: "Current Year College Fee Receipt & Admission Letter",
      category: ["all", "state", "central"],
      authority: "Institute Accounts Section / Bursar Office",
      validity: "Current Academic Year (2024-2025)",
      pitfall:
        "Must specify breakup of tuition fees, library fees, and hostel charges for fee reimbursement schemes.",
      officialFormats: "Computer-generated fee receipt with transaction reference number.",
    },
  ];

  const statePortals = [
    { state: "Uttar Pradesh", portal: "e-District UP", url: "https://edistrict.up.gov.in" },
    { state: "Maharashtra", portal: "Aaple Sarkar MahaOnline", url: "https://aaplesarkar.mahaonline.gov.in" },
    { state: "Karnataka", portal: "Seva Sindhu", url: "https://sevasindhuservices.karnataka.gov.in" },
    { state: "Tamil Nadu", portal: "e-Sevai", url: "https://www.tnesevai.tn.gov.in" },
    { state: "Andhra Pradesh", portal: "MeeSeva AP", url: "https://meeseva.ap.gov.in" },
    { state: "Telangana", portal: "MeeSeva Telangana", url: "https://tg.meeseva.telangana.gov.in" },
    { state: "West Bengal", portal: "e-District West Bengal", url: "https://edistrict.wb.gov.in" },
    { state: "Delhi", portal: "e-District Delhi", url: "https://edistrict.delhigovt.nic.in" },
    { state: "Bihar", portal: "RTPS Bihar (Service Plus)", url: "https://serviceonline.bihar.gov.in" },
    { state: "Rajasthan", portal: "e-Mitra Rajasthan", url: "https://emitra.rajasthan.gov.in" },
  ];

  const filteredDocs =
    activeCategory === "all"
      ? documentRegistry
      : documentRegistry.filter((d) => d.category.includes(activeCategory));

  const readyCount = filteredDocs.filter((d) => docStatuses[d.id] === "ready").length;
  const progressPercent = Math.round((readyCount / filteredDocs.length) * 100) || 0;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-850 uppercase mb-3 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full">
            <ShieldCheck size={14} className="text-emerald-700" />
            <span>Pre-Application Rejection Prevention</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-900 leading-tight">
            Document Readiness & <span className="italic text-emerald-800 font-normal">Validity Vault</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-3 font-normal leading-relaxed">
            Audit your certificates before submitting applications. Avoid the common pitfalls that cause over 40% of Indian scholarship rejections with zero document uploads.
          </p>
        </div>

        {/* Zero-Storage Privacy Guarantee */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center shrink-0 text-emerald-800">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Zero Document Upload Guarantee</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal mt-0.5">
                Udaan never asks for, uploads, or stores your Aadhaar number, certificate files, or bank details. All readiness checks are performed locally in your browser.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-850 bg-emerald-100/60 border border-emerald-300/60 px-3 py-1 rounded-full whitespace-nowrap self-start sm:self-center">
            100% Local & Private
          </span>
        </div>

        {/* Readiness Meter & Category Filters */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Application Portfolio Checklist</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Track required documents and verify competent authorities before portal cutoffs.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/70">
              <div className="text-right">
                <span className="text-[11px] text-slate-500 font-semibold block">Readiness Score</span>
                <span className="text-sm font-bold text-slate-900">{readyCount} of {filteredDocs.length} Ready</span>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-slate-200 flex items-center justify-center text-xs font-bold text-emerald-800 relative">
                <span>{progressPercent}%</span>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`cursor-pointer text-xs font-semibold px-4 py-2 rounded-xl border transition ${
                  activeCategory === cat.id
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-[#FAF9F6] border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Documents List */}
          <div className="space-y-4">
            {filteredDocs.map((doc) => {
              const status = docStatuses[doc.id] || "pending";
              return (
                <div
                  key={doc.id}
                  className="rounded-2xl border border-slate-200/90 bg-[#FAF9F6] p-5 hover:border-emerald-300/80 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
                        <FileText size={16} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{doc.name}</h4>
                        <span className="text-xs text-slate-500">
                          Authority: <strong className="text-slate-700">{doc.authority}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Status Toggle Button */}
                    <button
                      type="button"
                      onClick={() => toggleDocStatus(doc.id)}
                      className={`cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                        status === "ready"
                          ? "bg-emerald-800 text-white"
                          : status === "in_progress"
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {status === "ready" ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Verified & Ready</span>
                        </>
                      ) : status === "in_progress" ? (
                        <>
                          <Clock size={13} />
                          <span>In Progress / Applied</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          <span>Pending Action</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Pitfall Alert */}
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-sm text-amber-950 flex items-start gap-2.5 leading-relaxed">
                    <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-amber-900">Avoid Rejection: </strong>
                      <span className="font-normal">{doc.pitfall}</span>
                    </div>
                  </div>

                  {/* Actions Strip */}
                  <div className="pt-2.5 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                    <span className="text-xs text-slate-500">
                      Validity: <span className="font-semibold text-slate-700">{doc.validity}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {doc.hasGenerator && (
                        <button
                          type="button"
                          onClick={() => setBonafideModalOpen(true)}
                          className="cursor-pointer text-xs sm:text-sm font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl transition"
                        >
                          <Printer size={13} />
                          <span>Generate Bonafide Template</span>
                        </button>
                      )}

                      {doc.hasDbtGuide && (
                        <button
                          type="button"
                          onClick={() => setDbtModalOpen(true)}
                          className="cursor-pointer text-xs sm:text-sm font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl transition"
                        >
                          <HelpCircle size={13} />
                          <span>NPCI DBT Seeding Guide</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Year Expiry Auditor */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Income Certificate Validity Auditor</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Check whether your certificate meets the current financial year requirement for statutory portals.
              </p>
            </div>
          </div>

          <form onSubmit={handleAuditIncomeDate} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="w-full sm:w-72">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Certificate Issue Date
                </label>
                <input
                  type="date"
                  value={incomeIssueDate}
                  onChange={(e) => setIncomeIssueDate(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition"
                />
              </div>

              <button
                type="submit"
                className="cursor-pointer inline-flex items-center gap-2 bg-slate-900 hover:bg-emerald-900 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-2xs sm:mt-5"
              >
                <Sparkles size={14} />
                <span>Audit Financial Year Validity</span>
              </button>
            </div>
          </form>

          {expiryAuditResult && (
            <div
              className={`rounded-2xl border p-4 sm:p-5 text-sm space-y-2 ${
                expiryAuditResult.valid
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : "bg-rose-50 border-rose-200 text-rose-950"
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-base flex items-center gap-2">
                  {expiryAuditResult.valid ? (
                    <CheckCircle2 size={18} className="text-emerald-700" />
                  ) : (
                    <AlertTriangle size={18} className="text-rose-600" />
                  )}
                  {expiryAuditResult.valid ? "Certificate Valid for Current FY" : "Certificate Outdated (Requires Renewal)"}
                </span>
                <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                  Issued in FY: {expiryAuditResult.certFY} (Current: FY {expiryAuditResult.currentFY})
                </span>
              </div>
              <p className="leading-relaxed font-normal text-sm">{expiryAuditResult.remedy}</p>
            </div>
          )}
        </div>

        {/* State Official e-District Portals Directory */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Official State e-District Issuing Portals</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Direct sovereign portals to issue or renew Income, Domicile, and Caste certificates without private intermediaries.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statePortals.map((sp, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between hover:border-emerald-300 transition shadow-2xs"
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-850">
                    {sp.state}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">{sp.portal}</h3>
                </div>
                <a
                  href={sp.url}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer text-xs font-bold text-slate-800 hover:text-emerald-800 flex items-center gap-1 transition"
                >
                  <span>Open</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bonafide Certificate Generator Modal */}
      {bonafideModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Bonafide Certificate Template</h3>
                <p className="text-xs text-slate-500">Generate a standardized format for college signature.</p>
              </div>
              <button
                type="button"
                onClick={() => setBonafideModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Student Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={bonafideForm.studentName}
                  onChange={(e) => setBonafideForm({ ...bonafideForm, studentName: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">College / Institute Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jadavpur University, Kolkata"
                  value={bonafideForm.collegeName}
                  onChange={(e) => setBonafideForm({ ...bonafideForm, collegeName: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Course & Branch</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech Computer Science"
                    value={bonafideForm.courseBranch}
                    onChange={(e) => setBonafideForm({ ...bonafideForm, courseBranch: e.target.value })}
                    className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Roll / Enrollment No.</label>
                  <input
                    type="text"
                    placeholder="e.g. 2023-CS-042"
                    value={bonafideForm.rollNumber}
                    onChange={(e) => setBonafideForm({ ...bonafideForm, rollNumber: e.target.value })}
                    className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Preview Box */}
            <div className="border border-dashed border-slate-300 rounded-2xl p-5 bg-[#FAF9F6] text-xs font-serif leading-relaxed text-slate-800 space-y-3">
              <div className="text-center font-bold font-sans uppercase tracking-widest text-[11px] text-slate-900 border-b border-slate-200 pb-2">
                TO WHOMSOEVER IT MAY CONCERN
              </div>
              <p>
                This is to certify that <strong>{bonafideForm.studentName || "[Student Name]"}</strong>, Roll Number <strong>{bonafideForm.rollNumber || "[Roll Number]"}</strong>, is a bonafide student of <strong>{bonafideForm.collegeName || "[College Name]"}</strong>, studying in <strong>{bonafideForm.courseBranch || "[Course & Branch]"}</strong> during the academic year <strong>{bonafideForm.academicYear}</strong>.
              </p>
              <p>
                As per our institute records, the student possesses satisfactory conduct. This certificate is issued upon the student's request for official scholarship application verification.
              </p>
              <div className="pt-6 flex items-center justify-between font-sans text-[11px] text-slate-600">
                <div>Date: {new Date().toLocaleDateString("en-IN")}</div>
                <div className="text-right">
                  <div>Signature & Stamp of Principal / Registrar</div>
                  <div className="text-[10px] text-slate-400 font-mono">Institute Seal</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="cursor-pointer inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                <Printer size={13} />
                <span>Print Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DBT Bank Seeding Guide Modal */}
      {dbtModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Aadhaar-NPCI DBT Bank Seeding</h3>
                <p className="text-xs text-slate-500">Crucial step to receive scholarship payments through PFMS.</p>
              </div>
              <button
                type="button"
                onClick={() => setDbtModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-700">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-950 font-normal">
                <strong>Important Distinction: </strong> Linking Aadhaar to your bank account for KYC is NOT the same as NPCI Seeding. Your bank must map your account in the NPCI mapper for Direct Benefit Transfer (DBT).
              </div>

              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Three Ways to Verify Your Status:
              </h4>
              <ol className="list-decimal pl-4 space-y-2">
                <li>
                  <strong>Online via UIDAI Portal: </strong>
                  Visit <a href="https://myaadhaar.uidai.gov.in" target="_blank" rel="noreferrer" className="text-emerald-800 font-semibold underline">myaadhaar.uidai.gov.in</a> and select "Bank Seeding Status" using your Aadhaar OTP.
                </li>
                <li>
                  <strong>Through Bank Netbanking: </strong>
                  Log in to your mobile banking app and search for "Aadhaar Seeding Status" or "DBT Services".
                </li>
                <li>
                  <strong>Bank Branch Submission: </strong>
                  If unseeded, visit your home branch and submit the standardized "NPCI Aadhaar Seeding Mandate Form" along with an Aadhaar copy.
                </li>
              </ol>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Government DBT queries: 1947 (UIDAI Toll-Free)</span>
                <button
                  type="button"
                  onClick={() => setDbtModalOpen(false)}
                  className="cursor-pointer px-4 py-1.5 rounded-xl bg-slate-900 text-white font-semibold text-xs"
                >
                  Close Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
