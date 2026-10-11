import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ *
 * PaperFolder: replaces the static document.png in the hero.
 * Seven papers poke out of a manila folder. "Not started" = sticking
 * out, "In progress" = half in, "Ready" = slid all the way in.
 * Papers rise out of the folder one by one on first load.
 * No pulsing; only springy slides. Respects reduced motion.
 * ------------------------------------------------------------------ */

const INK = "#022C22";
const SPINE = {
	income_cert: "Income",
	domicile_cert: "Domicile",
	caste_cert: "Caste",
	bonafide_cert: "Bonafide",
	marksheet_prev: "Marks",
	bank_npci_dbt: "NPCI",
	fee_receipt: "Fees",
};
const BANDS = [
	"#FFD966",
	"#9CD6F2",
	"#FF9AA8",
	"#B9A8FF",
	"#7FD0A4",
	"#FFB38A",
	"#FFE58F",
];
const TILT = [-2, 1.5, -1, 2, -1.5, 1, -2];
const HIDE = 122; // paper fully inside the folder
const HALF = 58; // paper half inside
const PAPER_W = 62;
const STEP = 44;
const X0 = 38;
const TOP = 30;

export function PaperFolder({ docs, statuses, activeIds, className = "" }) {
	const [up, setUp] = useState(false);
	const [settled, setSettled] = useState(false);

	useEffect(() => {
		const a = setTimeout(() => setUp(true), 120);
		const b = setTimeout(() => setSettled(true), 1400);
		return () => {
			clearTimeout(a);
			clearTimeout(b);
		};
	}, []);

	const active = new Set(activeIds ?? docs.map((d) => d.id));
	const scoped = docs.filter((d) => active.has(d.id));
	const ready = scoped.filter((d) => statuses[d.id] === "ready").length;

	return (
		<svg
			viewBox="0 0 400 320"
			className={`w-full select-none ${className}`}
			role="img"
			aria-label={`${ready} of ${scoped.length} papers in the folder`}
			fill="none"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<ellipse cx="200" cy="308" rx="170" ry="8" fill={INK} opacity=".12" />

			{/* back of the folder */}
			<rect
				x="24"
				y="62"
				width="124"
				height="44"
				rx="12"
				fill="#8FC3A0"
				stroke={INK}
				strokeWidth="2.5"
			/>
			<rect
				x="24"
				y="86"
				width="352"
				height="214"
				rx="16"
				fill="#8FC3A0"
				stroke={INK}
				strokeWidth="2.5"
			/>

			{/* the papers */}
			{docs.map((d, i) => {
				const s = statuses[d.id] || "pending";
				const dy = !up || s === "ready" ? HIDE : s === "in_progress" ? HALF : 0;
				const x = X0 + i * STEP;
				return (
					<g
						key={d.id}
						className="motion-reduce:transition-none"
						style={{
							transform: `translateY(${dy}px)`,
							opacity: active.has(d.id) ? 1 : 0.3,
							transition:
								"transform .65s cubic-bezier(.3,1.45,.5,1), opacity .3s",
							transitionDelay: settled ? "0ms" : `${i * 70}ms`,
						}}
					>
						<g
							transform={`rotate(${TILT[i % TILT.length]} ${x + PAPER_W / 2} ${TOP + 100})`}
						>
							<rect
								x={x}
								y={TOP}
								width={PAPER_W}
								height="200"
								rx="6"
								fill="#FFFBF1"
								stroke={INK}
								strokeWidth="2.2"
							/>
							<rect
								x={x + 1.1}
								y={TOP + 1.1}
								width={PAPER_W - 2.2}
								height="14"
								rx="5"
								fill={BANDS[i % BANDS.length]}
							/>
							<text
								transform={`translate(${x + 17} ${TOP + 24}) rotate(90)`}
								fontSize="10.5"
								fontWeight="800"
								fill={INK}
								fontFamily="ui-sans-serif, system-ui, sans-serif"
							>
								{SPINE[d.id] ?? d.name.slice(0, 8)}
							</text>
						</g>
					</g>
				);
			})}

			{/* front flap */}
			<rect
				x="24"
				y="150"
				width="352"
				height="150"
				rx="16"
				fill="#F7DB73"
				stroke={INK}
				strokeWidth="2.5"
			/>
			<path d="M42 162H358" stroke="#fff" strokeWidth="3" opacity=".55" />

			{/* one slot per paper */}
			{docs.map((d, i) => {
				const s = statuses[d.id] || "pending";
				const cx = X0 + i * STEP + PAPER_W / 2;
				return (
					<g key={d.id} opacity={active.has(d.id) ? 1 : 0.3}>
						<circle
							cx={cx}
							cy="192"
							r="12"
							fill={
								s === "ready"
									? "#065F46"
									: s === "in_progress"
										? "#FFF0B8"
										: "#FFFBF1"
							}
							stroke={INK}
							strokeWidth="2"
							strokeDasharray={s === "pending" ? "3 4" : undefined}
							style={{ transition: "fill .3s" }}
						/>
						{s === "ready" && (
							<path
								d={`M${cx - 5} 192 l4 4.5 l7 -8.5`}
								stroke="#fff"
								strokeWidth="3"
							/>
						)}
						{s === "in_progress" && (
							<circle cx={cx} cy="192" r="3" fill={INK} />
						)}
					</g>
				);
			})}

			<text x="48" y="268" fontFamily="Georgia, serif" fontSize="44" fill={INK}>
				{ready}
				<tspan fontSize="22" opacity=".6">
					{" "}
					/ {scoped.length}
				</tspan>
			</text>
			<text
				x="352"
				y="268"
				textAnchor="end"
				fontSize="11"
				fontWeight="800"
				letterSpacing="1.6"
				fill={INK}
				fontFamily="ui-sans-serif, system-ui, sans-serif"
			>
				IN THE FOLDER
			</text>
		</svg>
	);
}

/* ------------------------------------------------------------------ *
 * FYRibbon: April-to-March ribbon for the income certificate check.
 * Green = issue dates portals accept this year (Apr 1 -> today).
 * "Today" pin always shows; the certificate pin drops in after a check.
 * Uses your existing `sk-pop` class for the pin drop.
 * ------------------------------------------------------------------ */

const MONTHS = [
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
	"Jan",
	"Feb",
	"Mar",
];

function Pin({ at, label, tone, tall, pop }) {
	return (
		<div
			className="absolute bottom-[40px] -translate-x-1/2"
			style={{ left: `${at * 100}%` }}
		>
			<div className={`flex flex-col items-center ${pop ? "sk-pop" : ""}`}>
				<span
					className={`whitespace-nowrap rounded-full border-[1.5px] border-emerald-950 px-2.5 py-0.5 text-[11px] font-bold ${tone}`}
				>
					{label}
				</span>
				<span className={`w-[1.5px] bg-emerald-950 ${tall ? "h-9" : "h-3"}`} />
				<span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-emerald-950 bg-white" />
			</div>
		</div>
	);
}

export function FYRibbon({ fy, result }) {
	const start = new Date(fy.start, 3, 1);
	const end = new Date(fy.start + 1, 3, 1);
	const span = (d) => (d - start) / (end - start);
	const clamp = (n) => Math.min(1, Math.max(0, n));

	const todayAt = clamp(span(new Date()));
	let certAt = null;
	let side = "inside";
	if (result) {
		const raw = span(new Date(`${result.issueDate}T00:00:00`));
		certAt = clamp(raw);
		side = raw < 0 ? "before" : raw > 1 ? "after" : "inside";
	}

	return (
		<div
			className="select-none px-7"
			role="img"
			aria-label={`Financial year ${fy.label}, April to March`}
		>
			<div className="relative h-28">
				<Pin at={todayAt} label="Today" tone="bg-emerald-950 text-white" />
				{result && (
					<Pin
						key={result.issueDate}
						at={certAt}
						tall
						pop
						label={
							side === "before"
								? "← Earlier FY"
								: side === "after"
									? "Later FY →"
									: "Issued"
						}
						tone={result.valid ? "bg-yellow-200" : "bg-rose-600 text-white"}
					/>
				)}
				<div className="absolute inset-x-0 bottom-7 h-4 overflow-hidden rounded-full border-[1.5px] border-emerald-950 bg-[repeating-linear-gradient(135deg,#fff_0_6px,#FFF0B8_6px_12px)]">
					<div
						className="h-full border-r-[1.5px] border-emerald-950 bg-emerald-300"
						style={{ width: `${todayAt * 100}%` }}
					/>
				</div>
			</div>
			<div className="grid grid-cols-12 text-center text-[10px] font-bold text-emerald-950/60">
				{MONTHS.map((m) => (
					<span key={m}>{m}</span>
				))}
			</div>
			<p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-950/70">
				<span className="h-2.5 w-5 rounded-full border-[1.5px] border-emerald-950 bg-emerald-300" />
				Issue dates portals accept in FY {fy.label}
			</p>
		</div>
	);
}
