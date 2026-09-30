import { useState } from "react";
import {
	ArrowUpRight,
	Bookmark,
	BookmarkCheck,
	Check,
	Loader2,
} from "lucide-react";
import { CategoryCardHeader } from "./CategoryMotif";
import { formatGrant } from "../utils/formatGrant";
import { cleanOfficialUrl, formatChangeNotice } from "../utils/formatEvidence";
import { deadlineInfo, whyItFits } from "../utils/scholarshipMeta";

export const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

const METER_TONES = {
	urgent: { bar: "#e11d48", text: "text-rose-800" },
	soon: { bar: "#f59e0b", text: "text-amber-900" },
	calm: { bar: "#2d6a4f", text: "text-emerald-900" },
	quiet: { bar: "transparent", text: "text-emerald-950/60" },
	closed: { bar: "#9ca3af", text: "text-emerald-950/45" },
};

export function DeadlineMeter({ deadline, status, className = "" }) {
	const d = deadlineInfo(deadline, status);
	const t = METER_TONES[d.tone];
	return (
		<div className={className}>
			<div
				className={`flex items-baseline justify-between gap-2 text-xs font-bold ${t.text}`}
			>
				<span>{d.text}</span>
				{d.date && (
					<span className="font-semibold text-emerald-950/50">
						Closes {d.date}
					</span>
				)}
			</div>
			{d.tone !== "quiet" && (
				<div className="sk-meter mt-1.5" aria-hidden>
					<span style={{ width: `${d.pct}%`, background: t.bar }} />
				</div>
			)}
		</div>
	);
}

export function GrantAmount({ amount, size = "md" }) {
	const g = formatGrant(amount);
	if (g.isUnpublished)
		return (
			<p className="text-sm font-medium italic leading-snug text-emerald-950/60">
				{g.main}
			</p>
		);
	return (
		<p className="flex min-w-0 items-baseline gap-x-1.5 whitespace-nowrap">
			<span
				className={`ud-display font-extrabold leading-none text-emerald-950 ${size === "lg" ? "text-3xl sm:text-4xl" : "text-2xl"}`}
			>
				{g.main}
			</span>
			{g.period && (
				<span className="text-xs font-semibold text-emerald-950/55">
					{g.period}
				</span>
			)}
		</p>
	);
}

const SPARKS = [
	"#facc15",
	"#2d6a4f",
	"#fb923c",
	"#52b788",
	"#facc15",
	"#022c22",
];

/* Bookmark toggle with a small burst when something gets saved. */
export function SaveButton({
	saved,
	saving,
	onToggle,
	variant = "icon",
	name = "",
}) {
	const [burst, setBurst] = useState(0);
	const click = (e) => {
		e.stopPropagation();
		if (saving) return;
		if (!saved) {
			const k = Date.now();
			setBurst(k);
			setTimeout(() => setBurst((b) => (b === k ? 0 : b)), 650);
		}
		onToggle?.();
	};
	const Icon = saving ? Loader2 : saved ? BookmarkCheck : Bookmark;
	const label = saved
		? `Remove ${name || "scholarship"} from saved`
		: `Save ${name || "this scholarship"}`;
	const pill = variant === "pill";
	return (
		<button
			type="button"
			onClick={click}
			aria-pressed={saved}
			aria-label={pill ? undefined : label}
			title={pill ? undefined : label}
			disabled={saving}
			data-burst={burst ? "1" : undefined}
			className={`sk-save relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border-[1.5px] font-bold transition-colors disabled:cursor-wait ${focusRing} ${
				pill ? "min-h-[44px] px-5 text-sm" : "h-10 w-10 sm:h-9 sm:w-9"
			} ${
				saved
					? "border-emerald-950 bg-yellow-200 text-emerald-950"
					: "border-emerald-950/25 bg-white text-emerald-950/70 hover:border-emerald-950 hover:text-emerald-950"
			}`}
		>
			<Icon
				size={pill ? 16 : 17}
				className={`sk-save-icon ${saving ? "animate-spin" : ""}`}
			/>
			{pill && <span>{saved ? "Saved to shelf" : "Save"}</span>}
			{burst > 0 &&
				SPARKS.map((c, i) => (
					<span
						key={`${burst}-${i}`}
						aria-hidden
						className="sk-spark"
						style={{ "--c": c, "--a": `${i * 60 + 15}deg` }}
					/>
				))}
		</button>
	);
}

/* The scholarship card used across Home, Browse and the Saved shelf. */
export function ScholarshipCard({
	s,
	saved,
	saving,
	onSave,
	onOpen,
	index = 0,
	className = "",
}) {
	const summary = s.summary || s.description;
	const why = whyItFits(s);
	const change = s.latestChangeSummary
		? formatChangeNotice(s.latestChangeSummary)
		: null;
	const link = cleanOfficialUrl(s.applicationLink || s.sourceUrl);
	const docs = Array.isArray(s.requiredDocuments)
		? s.requiredDocuments.length
		: 0;
	const both = summary && why.length > 0;

	const whyList = (
		<div className={both ? "sk-why" : ""}>
			<p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
				Could fit you if
			</p>
			<ul className="mt-1.5 space-y-1">
				{why.map((w) => (
					<li
						key={w}
						className="flex items-start gap-2 text-sm font-medium leading-snug"
					>
						<Check
							size={14}
							strokeWidth={3}
							className="mt-0.5 shrink-0 text-emerald-700"
						/>
						<span>{w}</span>
					</li>
				))}
			</ul>
		</div>
	);

	return (
		<article
			className={`sk-card sk-in group relative flex h-full flex-col overflow-hidden rounded-2xl border-[1.5px] border-emerald-950/20 bg-white shadow-[2px_2px_0_0_rgba(2,44,34,0.08)] ${className}`}
			style={{ "--d": `${Math.min(index, 8) * 45}ms` }}
		>
			<CategoryCardHeader
				category={s.category}
				sourceType={s.sourceType || "Official scheme"}
				hasChanges={s.hasChanges}
				rightSlot={
					onSave && (
						<SaveButton
							saved={saved}
							saving={saving}
							name={s.title}
							onToggle={() => onSave(s._id || s.id, s)}
						/>
					)
				}
			/>
			<div className="flex flex-1 flex-col p-5">
				<h3>
					<button
						type="button"
						onClick={onOpen}
						className={`ud-display cursor-pointer rounded-sm text-left text-lg font-bold leading-tight text-emerald-950 decoration-yellow-300 decoration-2 underline-offset-4 group-hover:underline sm:text-xl ${focusRing}`}
					>
						{s.title}
					</button>
				</h3>
				{s.organization && (
					<p className="mt-1 line-clamp-1 text-sm font-medium text-emerald-950/55">
						{s.organization}
					</p>
				)}

				<DeadlineMeter
					deadline={s.deadline}
					status={s.status}
					className="mt-4"
				/>

				{(summary || why.length > 0) && (
					<div className="sk-reveal mt-4">
						{summary && (
							<p
								className={`${both ? "sk-sum" : ""} line-clamp-3 text-[15px] leading-relaxed text-emerald-950/75`}
							>
								{summary}
							</p>
						)}
						{why.length > 0 && whyList}
					</div>
				)}

				{change && (
					<p className="mt-3 line-clamp-2 border-l-2 border-yellow-400 pl-3 text-sm leading-snug text-emerald-950/70">
						{change}
					</p>
				)}

				<div className="mt-auto pt-5">
					<div className="border-t-[1.5px] border-dashed border-emerald-950/20 pt-4">
						<div className="flex items-baseline justify-between gap-3">
							<GrantAmount amount={s.amount} />
						</div>
						<div className="mt-3 flex items-center justify-between gap-2">
							<button
								type="button"
								onClick={onOpen}
								className={`-ml-1 min-h-[40px] cursor-pointer rounded-full px-1 text-sm font-bold underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950 ${focusRing}`}
							>
								Details
							</button>
							{link && (
								<a
									href={link}
									target="_blank"
									rel="noopener noreferrer"
									className={`group/apply inline-flex min-h-[40px] items-center gap-1 rounded-full border-[1.5px] border-emerald-950 bg-emerald-800 px-4 text-sm font-bold text-white shadow-[0_2px_0_#022c22] transition hover:bg-emerald-900 active:translate-y-[2px] active:shadow-none ${focusRing}`}
								>
									Apply
									<ArrowUpRight
										size={14}
										className="transition-transform group-hover/apply:-translate-y-0.5 group-hover/apply:translate-x-0.5"
									/>
									<span className="sr-only">(opens official site)</span>
								</a>
							)}
						</div>
					</div>
				</div>
			</div>
		</article>
	);
}

export function CardSkeleton() {
	return (
		<div className="flex h-80 flex-col overflow-hidden rounded-2xl border-[1.5px] border-emerald-950/15 bg-white">
			<div className="h-12 animate-shimmer" />
			<div className="flex-1 space-y-3 p-5">
				<div className="h-6 w-3/4 rounded-lg bg-emerald-950/10 animate-shimmer" />
				<div className="h-3.5 w-1/2 rounded-md bg-emerald-950/10 animate-shimmer" />
				<div className="h-1.5 w-full rounded-full bg-emerald-950/10 animate-shimmer" />
				<div className="h-3.5 w-full rounded-md bg-emerald-950/10 animate-shimmer" />
				<div className="h-3.5 w-2/3 rounded-md bg-emerald-950/10 animate-shimmer" />
			</div>
		</div>
	);
}
