import { useState } from "react";
import { BookOpen, Check } from "lucide-react";
import {
	BoardCurator,
	CablesDoctor,
	CheeringStudent,
	CoinHugger,
	ConfusedDetective,
	CornerPeeker,
	DoodleSparkle,
	PaperReader,
} from "../components/AnimatedIllustrations";
import {
	STAGES,
	formatClock,
	investigationActivity,
} from "./investigationActivity";
import "./investigation-motion.css";
const CAST = {
	planning: ConfusedDetective,
	search: ConfusedDetective,
	read: PaperReader,
	rules: BoardCurator,
	done: CheeringStudent,
	quota: CoinHugger,
	paused: CablesDoctor,
	cancelled: CornerPeeker,
	idle: PaperReader,
	empty: ConfusedDetective,
};
const BURSTS = [
	["-120px", "-70px"],
	["-70px", "-110px"],
	["0px", "-125px"],
	["75px", "-105px"],
	["125px", "-60px"],
];
const COLORS = ["#FFD966", "#FF7FA8", "#B9A8FF", "#9CD6F2"];
export function SceneStage({ mood = "idle", chips = [], children }) {
	const Actor = CAST[mood] ?? CAST.idle;
	const tone = ["planning", "search", "read", "rules"].includes(mood)
		? "working"
		: mood === "done"
			? "done"
			: ["quota", "paused"].includes(mood)
				? "paused"
				: "idle";
	return (
		<div
			className={`nv-stage nv-stage-${tone}`}
			data-mood={mood}
			aria-hidden="true"
		>
			<span className="nv-stage-sun" />
			{tone === "working" && <span className="nv-scanline" />}
			{["search", "read"].includes(mood) && (
				<svg
					className="nv-magnifier"
					width="46"
					height="46"
					viewBox="0 0 46 46"
					fill="none"
					strokeLinecap="round"
				>
					<circle
						cx="19"
						cy="19"
						r="13"
						fill="#9CD6F2"
						fillOpacity=".45"
						stroke="#193D34"
						strokeWidth="3"
					/>
					<path d="M12 14c2-3 5-4 8-4" stroke="white" strokeWidth="3" />
					<path d="M29 29 41 41" stroke="#193D34" strokeWidth="6" />
					<path d="M29 29 41 41" stroke="#FF7FA8" strokeWidth="2.5" />
				</svg>
			)}
			{tone === "working" && (
				<>
					<span className="nv-twinkle nv-tw-0">
						<DoodleSparkle size={20} color="#FF7FA8" />
					</span>
					<span className="nv-twinkle nv-tw-1">
						<DoodleSparkle size={16} color="#B9A8FF" />
					</span>
				</>
			)}
			{chips.slice(0, 3).map((chip, i) => (
				<span key={chip.key} className={`nv-chip nv-chip-${i}`}>
					<BookOpen size={13} />
					{chip.label}
				</span>
			))}
			<div key={mood} className="nv-stage-actor">
				<div className="nv-bob">
					<Actor size={160} />
				</div>
			</div>
			<span className="nv-stage-floor" />
			{mood === "done" && (
				<>
					<span className="nv-stage-stamp">NOTES SAVED</span>
					{BURSTS.map(([dx, dy], i) => (
						<span
							key={i}
							className="nv-burst"
							style={{ "--dx": dx, "--dy": dy, "--d": `${i * 0.05}s` }}
						>
							<DoodleSparkle size={18 + (i % 3) * 4} color={COLORS[i % 4]} />
						</span>
					))}
				</>
			)}
			{children}
		</div>
	);
}
export function StageRail({ events = [], busy = false, status = "ready" }) {
	const { activeIndex, reached } = investigationActivity(
		{ events, status },
		busy,
	);
	return (
		<div className="nv-rail-wrap">
			<ol className="nv-rail" aria-label="Research stages reached so far">
				{STAGES.map((stage, i) => {
					const state =
						i === activeIndex
							? "active"
							: reached.includes(i)
								? "done"
								: "idle";
					return (
						<li
							key={stage.key}
							className={`nv-rail-step is-${state}`}
							aria-current={state === "active" ? "step" : undefined}
						>
							<span className="nv-rail-dot">
								{state === "done" ? <Check size={15} strokeWidth={3} /> : i + 1}
							</span>
							<span>{stage.label}</span>
							<span className="nv-sr">
								{state === "done"
									? "reached"
									: state === "active"
										? "in progress"
										: "not reached yet"}
							</span>
						</li>
					);
				})}
			</ol>
			<small className="nv-rail-note">
				Steps appear as they happen.
			</small>
		</div>
	);
}
export function NowLine({ label }) {
	return (
		<div className="nv-now">
			<span className="nv-now-label">Now</span>
			<span>{label}</span>
			<span className="nv-dots" aria-hidden="true">
				<i />
				<i />
				<i />
			</span>
		</div>
	);
}
export function CountdownRing({ remaining }) {
	const [total] = useState(() => Math.max(1, remaining));
	const circumference = 2 * Math.PI * 24;
	const fraction = Math.min(1, Math.max(0, remaining / total));
	return (
		<span className="nv-ring">
			<svg width="64" height="64" viewBox="0 0 64 64">
				<circle className="nv-ring-bg" cx="32" cy="32" r="24" />
				<circle
					className="nv-ring-fg"
					cx="32"
					cy="32"
					r="24"
					strokeDasharray={circumference}
					strokeDashoffset={circumference * (1 - fraction)}
					transform="rotate(-90 32 32)"
				/>
			</svg>
			<b>{formatClock(remaining)}</b>
		</span>
	);
}
export function Meter({ value, max, label }) {
	const limit = Math.max(0, max),
		current = Math.min(limit, Math.max(0, value));
	return (
		<span
			className="nv-mini-meter"
			role="meter"
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={limit}
			aria-valuenow={current}
		>
			<b style={{ width: `${limit ? (current / limit) * 100 : 0}%` }} />
		</span>
	);
}
