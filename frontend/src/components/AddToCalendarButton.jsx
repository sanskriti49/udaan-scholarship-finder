import { useState, useRef, useEffect } from "react";
import { Calendar, Download, ExternalLink, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { buildGoogleCalendarUrl, downloadIcsFile } from "../utils/calendarExport";

const focusRing =
	"focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 focus-visible:ring-offset-0";

export default function AddToCalendarButton({
	scholarship,
	variant = "default", // 'default' | 'pill' | 'mini' | 'icon'
	className = "",
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [downloaded, setDownloaded] = useState(false);
	const menuRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (menuRef.current && !menuRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};
		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	if (!scholarship) return null;

	const handleGoogleCalendar = (e) => {
		e.stopPropagation();
		setIsOpen(false);
		const url = buildGoogleCalendarUrl(scholarship);
		window.open(url, "_blank", "noopener,noreferrer");
		toast.success("Opening Google Calendar template with pre-set deadline reminders!");
	};

	const handleIcsDownload = (e) => {
		e.stopPropagation();
		setIsOpen(false);
		downloadIcsFile(scholarship);
		setDownloaded(true);
		setTimeout(() => setDownloaded(false), 3000);
		toast.success("Calendar file (.ics) downloaded with automatic 7-day & 48-hr alarms!");
	};

	const toggleMenu = (e) => {
		e.stopPropagation();
		setIsOpen((prev) => !prev);
	};

	return (
		<div className={`relative inline-block text-left ${className}`} ref={menuRef}>
			{variant === "mini" || variant === "icon" ? (
				<button
					type="button"
					onClick={toggleMenu}
					title="Add deadline to calendar (Google Calendar / iCal)"
					aria-label={`Add ${scholarship.title} to calendar`}
					aria-expanded={isOpen}
					className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-emerald-950 bg-white text-emerald-950 hover:bg-yellow-200 transition active:translate-y-px ${focusRing}`}
				>
					<Calendar size={16} />
				</button>
			) : variant === "pill" ? (
				<button
					type="button"
					onClick={toggleMenu}
					aria-expanded={isOpen}
					className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-emerald-950 bg-white px-4 py-2 text-xs font-bold text-emerald-950 hover:bg-yellow-200 transition active:translate-y-px ${focusRing}`}
				>
					<Calendar size={14} />
					<span>Add to Calendar</span>
					<ChevronDown size={13} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
				</button>
			) : (
				<button
					type="button"
					onClick={toggleMenu}
					aria-expanded={isOpen}
					className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border-[1.5px] border-emerald-950 bg-white px-3.5 py-2 text-sm font-bold text-emerald-950 shadow-[2px_2px_0_0_#022c22] hover:bg-yellow-200 transition active:translate-y-px active:shadow-none ${focusRing}`}
				>
					<Calendar size={16} className="text-emerald-900" />
					<span>Add to Calendar</span>
					<ChevronDown size={14} className={`transition-transform text-emerald-950/60 ${isOpen ? "rotate-180" : ""}`} />
				</button>
			)}

			{isOpen && (
				<div
					className="absolute right-0 bottom-full mb-2 z-50 w-64 origin-bottom-right rounded-xl border-[1.5px] border-emerald-950 bg-white p-1.5 shadow-[4px_4px_0_0_#022c22] animate-in fade-in zoom-in-95 duration-100 sm:bottom-auto sm:top-full sm:mt-2 sm:mb-0 sm:origin-top-right"
					role="menu"
					aria-orientation="vertical"
				>
					<div className="px-3 py-2 border-b border-dashed border-emerald-950/15 mb-1">
						<p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-950/60">
							Lock-Screen Alarms
						</p>
						<p className="text-xs text-emerald-950/80 font-medium">
							Includes 7-day and 48-hour alerts
						</p>
					</div>

					<button
						type="button"
						onClick={handleGoogleCalendar}
						className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-bold text-emerald-950 hover:bg-emerald-50 transition ${focusRing}`}
						role="menuitem"
					>
						<ExternalLink size={14} className="text-emerald-700 shrink-0" />
						<div className="min-w-0">
							<span className="block">Google Calendar</span>
							<span className="block text-[10px] font-normal text-emerald-950/60">
								Opens pre-filled web event
							</span>
						</div>
					</button>

					<button
						type="button"
						onClick={handleIcsDownload}
						className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-bold text-emerald-950 hover:bg-emerald-50 transition ${focusRing}`}
						role="menuitem"
					>
						{downloaded ? (
							<Check size={14} className="text-emerald-700 shrink-0" />
						) : (
							<Download size={14} className="text-emerald-700 shrink-0" />
						)}
						<div className="min-w-0">
							<span className="block">Apple / Outlook / iCal</span>
							<span className="block text-[10px] font-normal text-emerald-950/60">
								Standard .ics with phone alarms
							</span>
						</div>
					</button>
				</div>
			)}
		</div>
	);
}
