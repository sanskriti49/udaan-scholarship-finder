import { useState } from "react";
import {
	CheckCircle2,
	Clock,
	ExternalLink,
	Printer,
	ShieldCheck,
	Lock,
	HelpCircle,
	Calendar,
	Sparkles,
	X,
	Check,
	ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageStyles, Stamp } from "../components/PageKit";
import documentImg from "../assets/images/document.png";

function getFY(date) {
	const y = date.getFullYear();
	const m = date.getMonth() + 1;
	const start = m >= 4 ? y : y - 1;
	return {
		start,
		label: `${start}-${String((start + 1) % 100).padStart(2, "0")}`,
	};
}

const NOW_FY = getFY(new Date());
const ACADEMIC_YEAR = `${NOW_FY.start}-${NOW_FY.start + 1}`;


const CATEGORIES = [
	{ id: "all", label: "All essentials" },
	{ id: "central", label: "Central Govt (NSP)" },
	{ id: "state", label: "State DBT & fee waiver" },
	{ id: "reserved", label: "SC / ST / OBC / EWS" },
	{ id: "merit", label: "Merit & Women in STEM" },
];

const DOCUMENT_REGISTRY = [
	{
		id: "income_cert",
		name: "Income Certificate (current FY)",
		category: ["all", "central", "state", "reserved", "merit"],
		authority: "Tehsildar / SDM / Revenue Officer",
		validity: `Current financial year only (issued on or after April 1, ${NOW_FY.start})`,
		pitfall:
			"Over 40% of rejections come from an Income Certificate issued in a past financial year. It must carry a digital barcode and official digital seal.",
	},
	{
		id: "domicile_cert",
		name: "Domicile / Permanent Residence Certificate",
		category: ["all", "state", "central"],
		authority: "District Magistrate / SDM / Tehsildar",
		validity: "Permanent, or as prescribed by the state",
		pitfall:
			"The address must match your Aadhaar permanent address exactly. Every state grant quota asks for this.",
	},
	{
		id: "caste_cert",
		name: "Caste / Category Certificate (SC / ST / OBC-NCL / EWS)",
		category: ["all", "reserved", "central", "state"],
		authority: "Tehsildar / Deputy Commissioner",
		validity:
			"SC/ST: lifetime. OBC-NCL and EWS: issued in the active financial year",
		pitfall:
			"For central NSP schemes, OBC certificates must be in the Central (NCL) format, not just the state format.",
	},
	{
		id: "bonafide_cert",
		name: "Bonafide Student Certificate",
		category: ["all", "central", "state", "merit"],
		authority: "Principal / Dean / Registrar",
		validity: `Current academic year (${ACADEMIC_YEAR})`,
		pitfall:
			"It must be on official letterhead with the institute's AISHE code, stamp and registrar's signature.",
		hasGenerator: true,
	},
	{
		id: "marksheet_prev",
		name: "Previous Year Marksheet",
		category: ["all", "central", "state", "merit"],
		authority: "State Board / University Controller of Examinations",
		validity: "Most recent qualifying exam",
		pitfall:
			"Internet copies need attestation by the nodal officer or principal. Check the minimum percentage the scheme asks for (50%, 60%, 75%).",
	},
	{
		id: "bank_npci_dbt",
		name: "Aadhaar-NPCI Bank Seeding",
		category: ["all", "central", "state", "reserved", "merit"],
		authority: "NPCI and your bank branch",
		validity: "Must stay active and unblocked through the academic year",
		pitfall:
			"The number one reason scholarship money fails to arrive: the bank account isn't mapped in the NPCI mapper for Direct Benefit Transfer.",
		hasDbtGuide: true,
	},
	{
		id: "fee_receipt",
		name: "College Fee Receipt & Admission Letter",
		category: ["all", "state", "central"],
		authority: "Institute Accounts / Bursar Office",
		validity: `Current academic year (${ACADEMIC_YEAR})`,
		pitfall:
			"Fee reimbursement schemes need the breakup of tuition, library and hostel charges, not just a total.",
	},
];

const STATE_PORTALS = [
	{
		state: "Uttar Pradesh",
		portal: "e-District UP",
		url: "https://edistrict.up.gov.in",
	},
	{
		state: "Maharashtra",
		portal: "Aaple Sarkar MahaOnline",
		url: "https://aaplesarkar.mahaonline.gov.in",
	},
	{
		state: "Karnataka",
		portal: "Seva Sindhu",
		url: "https://sevasindhuservices.karnataka.gov.in",
	},
	{
		state: "Tamil Nadu",
		portal: "e-Sevai",
		url: "https://www.tnesevai.tn.gov.in",
	},
	{
		state: "Andhra Pradesh",
		portal: "MeeSeva AP",
		url: "https://meeseva.ap.gov.in",
	},
	{
		state: "Telangana",
		portal: "MeeSeva Telangana",
		url: "https://tg.meeseva.telangana.gov.in",
	},
	{
		state: "West Bengal",
		portal: "e-District West Bengal",
		url: "https://edistrict.wb.gov.in",
	},
	{
		state: "Delhi",
		portal: "e-District Delhi",
		url: "https://edistrict.delhigovt.nic.in",
	},
	{
		state: "Bihar",
		portal: "RTPS Bihar (Service Plus)",
		url: "https://serviceonline.bihar.gov.in",
	},
	{
		state: "Rajasthan",
		portal: "e-Mitra Rajasthan",
		url: "https://emitra.rajasthan.gov.in",
	},
];


const inputCls =
	"w-full rounded-lg border-[1.5px] border-emerald-950/40 bg-white px-3.5 py-2.5 text-[15px] text-emerald-950 placeholder:text-emerald-950/40 transition-colors hover:border-emerald-950 focus:border-emerald-950 focus:outline-none focus:ring-4 focus:ring-yellow-200";

function Chip({ active, onClick, children }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={`cursor-pointer rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-semibold transition-colors ${
				active
					? "border-emerald-950 bg-emerald-950 text-white"
					: "border-emerald-950/30 bg-white text-emerald-950 hover:border-emerald-950"
			}`}
		>
			{children}
		</button>
	);
}

function Field({ label, children }) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="text-sm font-bold text-emerald-950">{label}</span>
			{children}
		</label>
	);
}

function StatusButton({ status, onClick }) {
	const map = {
		pending: {
			label: "Not started",
			cls: "border-emerald-950/40 bg-white text-emerald-950/60 hover:border-emerald-950",
			icon: null,
		},
		in_progress: {
			label: "In progress",
			cls: "border-emerald-950 bg-yellow-200 text-emerald-950",
			icon: <Clock size={13} />,
		},
		ready: {
			label: "Ready",
			cls: "border-emerald-950 bg-emerald-900 text-white",
			icon: <Check size={13} strokeWidth={3.5} />,
		},
	};
	const s = map[status];
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={`Status: ${s.label}. Click to change.`}
			className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-bold transition-colors ${s.cls}`}
		>
			{s.icon}
			{s.label}
		</button>
	);
}

function ModalShell({ title, subtitle, onClose, children }) {
	return (
		<div
			className="ud-fade-in fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/45 p-4 backdrop-blur-[2px]"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
		>
			<div
				onClick={(e) => e.stopPropagation()}
				className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-[1.5px] border-emerald-950 bg-white text-emerald-950"
			>
				<div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b-[1.5px] border-emerald-950 bg-emerald-50 px-6 py-4">
					<div>
						<h3 className="ud-display text-xl font-bold leading-tight">
							{title}
						</h3>
						<p className="mt-0.5 text-sm text-emerald-950/65">{subtitle}</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-emerald-950 bg-white hover:bg-yellow-200"
					>
						<X size={17} />
					</button>
				</div>
				<div className="p-6">{children}</div>
			</div>
		</div>
	);
}


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

	const [incomeIssueDate, setIncomeIssueDate] = useState("");
	const [expiryAuditResult, setExpiryAuditResult] = useState(null);

	const [bonafideModalOpen, setBonafideModalOpen] = useState(false);
	const [bonafideForm, setBonafideForm] = useState({
		studentName: "",
		collegeName: "",
		courseBranch: "",
		rollNumber: "",
		academicYear: ACADEMIC_YEAR,
	});

	const [dbtModalOpen, setDbtModalOpen] = useState(false);

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

		const cert = getFY(issueDate);
		const current = getFY(new Date());
		const isCurrentFY = cert.start === current.start;
		const isPastFY = cert.start < current.start;

		setExpiryAuditResult({
			issueDate: incomeIssueDate,
			certFY: cert.label,
			currentFY: current.label,
			isCurrentFY,
			isPastFY,
			valid: isCurrentFY,
			remedy: isPastFY
				? `Your certificate was issued in FY ${cert.label}. NSP and state post-matric scholarships require an income certificate issued on or after April 1, ${current.start}. Renew it on your state e-District portal before you apply.`
				: isCurrentFY
					? `Your Income Certificate was issued in the active financial year (FY ${current.label}) and meets the verification criteria.`
					: `This date falls in FY ${cert.label}, which hasn't started yet. Check that you entered the right date.`,
		});
	};

	const filteredDocs =
		activeCategory === "all"
			? DOCUMENT_REGISTRY
			: DOCUMENT_REGISTRY.filter((d) => d.category.includes(activeCategory));

	const readyCount = filteredDocs.filter(
		(d) => docStatuses[d.id] === "ready",
	).length;
	const progressPercent =
		Math.round((readyCount / filteredDocs.length) * 100) || 0;

	return (
		<main className="ud-root min-h-screen bg-[#E9F0EA] pb-24 font-sans text-emerald-950">
			<PageStyles />

			<section className="mx-auto max-w-7xl px-5 pb-12 pt-12 sm:px-8 md:pb-16 md:pt-20">
				<div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
					<div>
						<div className="relative mt-6">
							<h1 className="font-display text-5xl font-medium leading-[0.98] sm:text-6xl md:text-7xl">
								Check your papers before the portal does.
							</h1>
							<Stamp
								slam
								delay={0.6}
								tilt={-8}
								className="absolute -bottom-6 right-0 hidden bg-white/60 text-2xl sm:block md:right-8"
							>
								Checked
							</Stamp>
						</div>

						<p className="mt-6 max-w-xl text-base leading-relaxed text-emerald-950/75 sm:text-lg">
							Most scholarship rejections are paperwork, not merit. Tick off
							each certificate, see who issues it, and catch the mistakes that
							get applications bounced.
						</p>

						<div className="mt-8 flex max-w-xl items-start gap-3.5 border-t-[1.5px] border-dashed border-emerald-950/30 pt-6">
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-emerald-950 bg-white">
								<Lock size={17} />
							</span>
							<p className="text-sm leading-relaxed text-emerald-950/75">
								<strong className="font-bold text-emerald-950">
									Nothing is uploaded.
								</strong>{" "}
								We never ask for or store your Aadhaar, certificate files or
								bank details. Your ticks live only in this browser.
							</p>
						</div>
					</div>

					<div className="relative flex justify-center">
						<div className="w-full max-w-sm overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(2,44,34,1)]">
							<img
								src={documentImg}
								alt="Document preview"
								className="mx-auto max-h-80 w-full object-contain"
							/>
						</div>
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 md:pb-28">
				<div className="flex flex-wrap items-end justify-between gap-6">
					<div>
						<h2 className="ud-display text-4xl font-extrabold leading-[1.02] sm:text-5xl">
							Your checklist
						</h2>
						<p className="mt-3 max-w-xl text-base leading-relaxed text-emerald-950/75">
							Click a status to move it from not started, to in progress, to
							ready.
						</p>
					</div>

					<div className="w-full max-w-xs">
						<div className="flex items-baseline justify-between">
							<span className="text-sm font-bold">
								{readyCount} of {filteredDocs.length} ready
							</span>
							<span className="ud-display text-2xl font-extrabold">
								{progressPercent}%
							</span>
						</div>
						<div className="mt-2 flex gap-1.5" aria-hidden>
							{filteredDocs.map((d) => (
								<span
									key={d.id}
									className={`h-2.5 flex-1 rounded-full border-[1.5px] border-emerald-950 transition-colors duration-300 ${
										docStatuses[d.id] === "ready"
											? "bg-emerald-900"
											: docStatuses[d.id] === "in_progress"
												? "bg-yellow-200"
												: "bg-white"
									}`}
								/>
							))}
						</div>
					</div>
				</div>

				<div className="mt-8 flex flex-wrap gap-2">
					{CATEGORIES.map((cat) => (
						<Chip
							key={cat.id}
							active={activeCategory === cat.id}
							onClick={() => setActiveCategory(cat.id)}
						>
							{cat.label}
						</Chip>
					))}
				</div>

				<div className="mt-6 overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white">
					<div className="divide-y-[1.5px] divide-dashed divide-emerald-950/25">
						{filteredDocs.map((doc) => {
							const status = docStatuses[doc.id] || "pending";
							return (
								<div
									key={doc.id}
									className={`px-5 py-5 transition-colors sm:px-6 ${
										status === "ready" ? "bg-emerald-50/70" : ""
									}`}
								>
									<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
										<div className="min-w-0">
											<h3 className="font-sans text-xl font-bold leading-tight">
												{doc.name}
											</h3>
											<p className="mt-1 font-heading text-sm text-emerald-950/65">
												Issued by{" "}
												<span className="font-medium text-emerald-950">
													{doc.authority}
												</span>
											</p>
										</div>
										<StatusButton
											status={status}
											onClick={() => toggleDocStatus(doc.id)}
										/>
									</div>

									<p className="mt-3 max-w-prose text-[15px] leading-relaxed text-emerald-950/80">
										<span className="rounded-sm bg-yellow-200 px-1.5 py-0.5 text-sm font-bold text-emerald-950">
											Why it gets rejected
										</span>{" "}
										{doc.pitfall}
									</p>

									<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
										<p className="text-sm text-emerald-950/65">
											Valid:{" "}
											<span className="font-bold text-emerald-950">
												{doc.validity}
											</span>
										</p>

										<div className="flex flex-wrap items-center gap-2">
											{doc.hasGenerator && (
												<button
													type="button"
													onClick={() => setBonafideModalOpen(true)}
													className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950 bg-white px-4 py-2 text-sm font-bold hover:bg-emerald-50"
												>
													<Printer size={14} />
													Bonafide template
												</button>
											)}
											{doc.hasDbtGuide && (
												<button
													type="button"
													onClick={() => setDbtModalOpen(true)}
													className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950 bg-white px-4 py-2 text-sm font-bold hover:bg-emerald-50"
												>
													<HelpCircle size={14} />
													DBT seeding guide
												</button>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 md:pb-28">
				<h2 className="ud-display max-w-2xl text-4xl font-extrabold leading-[1.02] sm:text-5xl">
					Is your income certificate still valid?
				</h2>
				<p className="mt-4 max-w-xl text-base leading-relaxed text-emerald-950/75">
					Government portals only accept one issued in the current financial
					year. Enter the date printed on yours.
				</p>

				<div className="relative mt-10 grid overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white lg:grid-cols-[minmax(0,1fr)_380px]">
					<form onSubmit={handleAuditIncomeDate} className="p-6 sm:p-8">
						<div className="mb-6 flex items-start gap-3.5">
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-emerald-950 bg-yellow-200">
								<Calendar size={18} />
							</span>
							<div>
								<h3 className="ud-display text-2xl font-bold leading-tight">
									Financial year check
								</h3>
								<p className="mt-1 text-sm leading-relaxed text-emerald-950/70">
									India's financial year runs April 1 to March 31. We're in FY{" "}
									{NOW_FY.label}.
								</p>
							</div>
						</div>

						<div className="max-w-xs">
							<Field label="Certificate issue date">
								<input
									type="date"
									value={incomeIssueDate}
									onChange={(e) => setIncomeIssueDate(e.target.value)}
									className={inputCls}
								/>
							</Field>
						</div>

						<button
							type="submit"
							className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-emerald-800 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 active:translate-y-px"
						>
							<Sparkles size={15} />
							Check validity
						</button>
					</form>

					<aside className="relative flex flex-col justify-center border-t-[1.5px] border-dashed border-emerald-950 bg-emerald-50 p-6 sm:p-8 lg:border-l-[1.5px] lg:border-t-0">
						<span
							aria-hidden
							className="absolute -left-3 -top-3 h-6 w-6 rounded-full border-[1.5px] border-emerald-950 bg-[#E9F0EA]"
						/>
						<span
							aria-hidden
							className="absolute -top-3 right-[-12px] h-6 w-6 rounded-full border-[1.5px] border-emerald-950 bg-[#E9F0EA] lg:bottom-[-12px] lg:left-[-12px] lg:right-auto lg:top-auto"
						/>

						{expiryAuditResult ? (
							<div key={expiryAuditResult.issueDate} className="ud-fade-in">
								<Stamp
									slam
									tilt={expiryAuditResult.valid ? -5 : 4}
									className={`text-xl ${
										expiryAuditResult.valid
											? "bg-white/60"
											: "border-rose-700 bg-white/60 text-rose-700"
									}`}
								>
									{expiryAuditResult.valid ? "Valid" : "Expired"}
								</Stamp>

								<p className="ud-display mt-5 text-2xl font-bold leading-tight">
									{expiryAuditResult.valid
										? "Good for this financial year."
										: expiryAuditResult.isPastFY
											? "Needs renewing before you apply."
											: "Check the date you entered."}
								</p>
								<p className="mt-3 text-[15px] leading-relaxed text-emerald-950/80">
									{expiryAuditResult.remedy}
								</p>
								<p className="mt-4 text-sm font-semibold text-emerald-950/60">
									Issued in FY {expiryAuditResult.certFY} · Current FY{" "}
									{expiryAuditResult.currentFY}
								</p>
							</div>
						) : (
							<div>
								<p className="ud-display text-xl font-bold">
									Result appears here
								</p>
								<p className="mt-2 text-[15px] leading-relaxed text-emerald-950/70">
									Enter the issue date and we'll tell you whether portals will
									accept it, and what to do if they won't.
								</p>
							</div>
						)}
					</aside>
				</div>
			</section>

			<section className="mx-auto max-w-7xl px-5 sm:px-8">
				<div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-14">
					<div className="lg:sticky lg:top-24 lg:self-start">
						<h2 className="ud-display text-4xl font-extrabold leading-[1.02] sm:text-5xl">
							Where to get them
						</h2>
						<p className="mt-4 text-base leading-relaxed text-emerald-950/75">
							Official state portals for Income, Domicile and Caste
							certificates. Apply here directly. No agent needed.
						</p>
					</div>

					<div className="overflow-hidden rounded-2xl border-[1.5px] border-emerald-950 bg-white">
						<div className="divide-y-[1.5px] divide-dashed divide-emerald-950/25">
							{STATE_PORTALS.map((sp) => (
								<a
									key={sp.state}
									href={sp.url}
									target="_blank"
									rel="noreferrer"
									className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-emerald-50/70 sm:px-6"
								>
									<div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-6">
										<span className="w-36 shrink-0 text-sm font-bold text-emerald-950/60">
											{sp.state}
										</span>
										<span className="truncate text-[15px] font-bold">
											{sp.portal}
										</span>
									</div>
									<span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold underline decoration-yellow-300 decoration-2 underline-offset-4 group-hover:decoration-emerald-950">
										Open
										<ArrowUpRight
											size={15}
											className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
										/>
									</span>
								</a>
							))}
						</div>
					</div>
				</div>
			</section>

			{bonafideModalOpen && (
				<ModalShell
					title="Bonafide certificate template"
					subtitle="A standard format to take to your college for signature."
					onClose={() => setBonafideModalOpen(false)}
				>
					<div className="space-y-4">
						<Field label="Student full name">
							<input
								type="text"
								placeholder="Priya Sharma"
								value={bonafideForm.studentName}
								onChange={(e) =>
									setBonafideForm({
										...bonafideForm,
										studentName: e.target.value,
									})
								}
								className={inputCls}
							/>
						</Field>
						<Field label="College / institute name">
							<input
								type="text"
								placeholder="Jadavpur University, Kolkata"
								value={bonafideForm.collegeName}
								onChange={(e) =>
									setBonafideForm({
										...bonafideForm,
										collegeName: e.target.value,
									})
								}
								className={inputCls}
							/>
						</Field>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field label="Course & branch">
								<input
									type="text"
									placeholder="B.Tech Computer Science"
									value={bonafideForm.courseBranch}
									onChange={(e) =>
										setBonafideForm({
											...bonafideForm,
											courseBranch: e.target.value,
										})
									}
									className={inputCls}
								/>
							</Field>
							<Field label="Roll / enrollment no.">
								<input
									type="text"
									placeholder="2023-CS-042"
									value={bonafideForm.rollNumber}
									onChange={(e) =>
										setBonafideForm({
											...bonafideForm,
											rollNumber: e.target.value,
										})
									}
									className={inputCls}
								/>
							</Field>
						</div>
					</div>

					<div className="mt-6 rounded-md border-[1.5px] border-emerald-950/30 bg-[#FBFAF5] p-6 font-serif text-[13px] leading-relaxed text-emerald-950 shadow-[0_6px_0_-3px_rgba(2,44,34,0.12)]">
						<p className="border-b border-emerald-950/20 pb-2 text-center font-sans text-[11px] font-bold uppercase tracking-[0.2em]">
							To whomsoever it may concern
						</p>
						<p className="mt-4">
							This is to certify that{" "}
							<strong>{bonafideForm.studentName || "[Student Name]"}</strong>,
							Roll Number{" "}
							<strong>{bonafideForm.rollNumber || "[Roll Number]"}</strong>, is
							a bonafide student of{" "}
							<strong>{bonafideForm.collegeName || "[College Name]"}</strong>,
							studying in{" "}
							<strong>
								{bonafideForm.courseBranch || "[Course & Branch]"}
							</strong>{" "}
							during the academic year{" "}
							<strong>{bonafideForm.academicYear}</strong>.
						</p>
						<p className="mt-3">
							As per our institute records, the student's conduct is
							satisfactory. This certificate is issued on the student's request
							for official scholarship application verification.
						</p>
						<div className="mt-8 flex items-end justify-between font-sans text-[11px] text-emerald-950/70">
							<span>Date: {new Date().toLocaleDateString("en-IN")}</span>
							<span className="text-right">
								Signature & stamp of Principal / Registrar
							</span>
						</div>
					</div>

					<div className="mt-6 flex justify-end">
						<button
							type="button"
							onClick={() => window.print()}
							className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-emerald-800 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 active:translate-y-px"
						>
							<Printer size={15} />
							Print certificate
						</button>
					</div>
				</ModalShell>
			)}

			{dbtModalOpen && (
				<ModalShell
					title="Aadhaar-NPCI DBT seeding"
					subtitle="The step that decides whether scholarship money reaches you."
					onClose={() => setDbtModalOpen(false)}
				>
					<div className="-rotate-[0.5deg] rounded-md bg-yellow-200 p-4 shadow-[0_6px_0_-3px_rgba(2,44,34,0.15)]">
						<p className="text-sm leading-snug">
							<strong className="font-bold">Not the same as KYC.</strong>{" "}
							Linking Aadhaar to your bank for KYC is different from NPCI
							seeding. Your bank must map your account in the NPCI mapper for
							Direct Benefit Transfer.
						</p>
					</div>

					<p className="ud-display mt-6 text-lg font-bold">
						Three ways to check your status
					</p>
					<ol className="mt-3 space-y-4">
						{[
							<>
								<strong>UIDAI portal.</strong> Visit{" "}
								<a
									href="https://myaadhaar.uidai.gov.in"
									target="_blank"
									rel="noreferrer"
									className="font-bold underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950"
								>
									myaadhaar.uidai.gov.in
								</a>{" "}
								and choose "Bank Seeding Status" with your Aadhaar OTP.
							</>,
							<>
								<strong>Your bank's app.</strong> Log in to mobile banking and
								search for "Aadhaar Seeding Status" or "DBT Services".
							</>,
							<>
								<strong>Visit the branch.</strong> If it isn't seeded, submit
								the NPCI Aadhaar Seeding Mandate Form at your home branch with
								an Aadhaar copy.
							</>,
						].map((step, i) => (
							<li key={i} className="flex items-start gap-3.5">
								<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-emerald-950 bg-emerald-50 text-sm font-bold">
									{i + 1}
								</span>
								<p className="pt-1 text-[15px] leading-relaxed text-emerald-950/85">
									{step}
								</p>
							</li>
						))}
					</ol>

					<div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-[1.5px] border-dashed border-emerald-950/25 pt-5">
						<span className="text-sm text-emerald-950/65">
							UIDAI toll-free:{" "}
							<strong className="text-emerald-950">1947</strong>
						</span>
						<button
							type="button"
							onClick={() => setDbtModalOpen(false)}
							className="cursor-pointer rounded-full border-[1.5px] border-emerald-950 px-5 py-2.5 text-sm font-bold hover:bg-emerald-50"
						>
							Close
						</button>
					</div>
				</ModalShell>
			)}
		</main>
	);
}
