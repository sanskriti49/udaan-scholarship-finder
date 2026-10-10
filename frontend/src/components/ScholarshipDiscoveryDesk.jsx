import { useState } from "react";
import { ArrowUpRight, FolderOpen } from "lucide-react";
import { Stamp } from "./PageKit";
import { CornerPeeker } from "./AnimatedIllustrations";
import { formatGrant } from "../utils/formatGrant";
import { deadlineInfo } from "../utils/scholarshipMeta";

// A live preview of the current results, ordered by the nearest known deadline.
export default function ScholarshipDiscoveryDesk({ items, loading, error, onOpen }) {
	const [selectedId, setSelectedId] = useState(null);
	const previews = [...items].sort((a, b) => {
		const rank = (s) => {
			const d = deadlineInfo(s.deadline, s.status);
			return d.tone === "closed" || d.days == null ? Infinity : d.days;
		};
		return rank(a) - rank(b);
	}).slice(0, 3);
	const selected = previews.find((s) => (s._id || s.id) === selectedId) || previews[0];
	const grant = selected && formatGrant(selected.amount);
	const deadline = selected && deadlineInfo(selected.deadline, selected.status);

	return (
		<aside className="sd-desk" aria-label="Scholarship preview">
			<div className="sd-desk-label"><FolderOpen size={16} /> Your discovery desk</div>
			<div className="sd-preview-sheet">
				<div className="pointer-events-none absolute -top-8 right-6 z-20" aria-hidden="true">
					<CornerPeeker size={64} />
				</div>
				<div className="flex items-center justify-between gap-3 border-b border-emerald-950/20 pb-4">
					<p className="text-xs font-bold uppercase tracking-widest text-emerald-950/60">From these results</p>
					<Stamp tilt={-5} className="text-[10px]">Take a closer look</Stamp>
				</div>
				{loading ? (
					<div className="space-y-4 py-8" role="status" aria-label="Loading scholarship preview">
						<div className="h-7 w-4/5 animate-pulse bg-emerald-950/10" />
						<div className="h-4 w-3/5 animate-pulse bg-emerald-950/10" />
						<div className="h-12 w-2/3 animate-pulse bg-emerald-950/10" />
					</div>
				) : selected && !error ? (
					<div className="py-6" aria-live="polite" aria-atomic="true">
						<p className="text-xs font-semibold text-emerald-950/60">{selected.category || "Scholarship"} · {selected.level || "See eligibility"}</p>
						<h2 className="mt-3 font-georgia text-2xl leading-tight">{selected.title}</h2>
						<p className="mt-2 text-sm text-emerald-950/60">{selected.organization}</p>
						<p className="mt-5 font-georgia text-3xl leading-tight">{grant.main} <span className="font-sans text-xs">{grant.period}</span></p>
						<div className="mt-5 flex flex-wrap items-center justify-between gap-3">
							<span className={`text-sm font-bold ${deadline.tone === "urgent" ? "text-rose-700" : "text-emerald-800"}`}>{deadline.text}</span>
							<button type="button" onClick={() => onOpen(selected)} className="sd-text-link">Open this file <ArrowUpRight size={15} /></button>
						</div>
					</div>
				) : (
					<div className="py-8">
						<h2 className="font-georgia text-3xl">Your next opportunity starts here.</h2>
						<p className="mt-4 text-sm leading-relaxed text-emerald-950/65">{error ? "The catalog is taking a moment. Try loading the results again below." : "Search a scheme or choose a filter. Your results will appear here, ready for a closer look."}</p>
					</div>
				)}
				{!loading && !error && previews.length > 1 && (
					<div className="flex gap-2 border-t border-dashed border-emerald-950/25 pt-4" role="group" aria-label="Preview a scholarship">
						{previews.map((s, i) => (
							<button key={s._id || s.id} type="button" onClick={() => setSelectedId(s._id || s.id)} aria-label={`Preview ${s.title}`} aria-pressed={selected === s} className={`sd-file-tab ${selected === s ? "sd-file-tab-active" : ""}`}>0{i + 1}</button>
						))}
						<span className="self-center pl-2 text-xs text-emerald-950/55">Pick a file to preview</span>
					</div>
				)}
			</div>
			<p className="sd-folder-caption">Find it. Check it. Make it yours.</p>
		</aside>
	);
}
