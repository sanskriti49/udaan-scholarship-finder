import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
	Bell,
	Check,
	CheckCheck,
	Sparkles,
	Clock,
	AlertTriangle,
	MapPin,
	Calendar,
	Trash2,
	ChevronRight,
	Inbox,
} from "lucide-react";
import {
	getNotifications,
	getUnreadCount,
	markAsRead,
	markAllAsRead,
	deleteNotification,
} from "../services/notificationService";
import { toast } from "sonner";

function formatRelativeTime(dateString) {
	if (!dateString) return "";
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now - date;
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHour = Math.floor(diffMin / 60);
	const diffDay = Math.floor(diffHour / 24);

	if (diffMin < 1) return "Just now";
	if (diffMin < 60) return `${diffMin}m ago`;
	if (diffHour < 24) return `${diffHour}h ago`;
	if (diffDay === 1) return "Yesterday";
	if (diffDay < 7) return `${diffDay}d ago`;
	return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getNotificationMeta(type, priority) {
	switch (type) {
		case "INSTANT_MATCH":
			return {
				icon: Sparkles,
				iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
				badgeText: "Instant Match",
				badgeClass: "bg-emerald-100/70 text-emerald-900 border-emerald-300/50",
			};
		case "DEADLINE_7_DAYS":
			return {
				icon: Clock,
				iconBg: "bg-amber-50 text-amber-700 border-amber-200/80",
				badgeText: "7 Days Left",
				badgeClass: "bg-amber-100/70 text-amber-900 border-amber-300/50",
			};
		case "DEADLINE_48_HOURS":
			return {
				icon: AlertTriangle,
				iconBg: "bg-rose-50 text-rose-700 border-rose-200/80",
				badgeText: "Urgent: 48h Left",
				badgeClass: "bg-rose-100/70 text-rose-900 border-rose-300/50",
			};
		case "STATE_GRANT_UPDATE":
			return {
				icon: MapPin,
				iconBg: "bg-teal-50 text-teal-700 border-teal-200/80",
				badgeText: "State Scheme",
				badgeClass: "bg-teal-100/70 text-teal-900 border-teal-300/50",
			};
		case "WEEKLY_DIGEST":
			return {
				icon: Calendar,
				iconBg: "bg-sky-50 text-sky-700 border-sky-200/80",
				badgeText: "Weekly Digest",
				badgeClass: "bg-sky-100/70 text-sky-900 border-sky-300/50",
			};
		default:
			return {
				icon: Bell,
				iconBg: "bg-slate-50 text-slate-700 border-slate-200",
				badgeText: priority === "high" ? "High Priority" : "Notification",
				badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
			};
	}
}

export default function NotificationCenter() {
	const [isOpen, setIsOpen] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [activeTab, setActiveTab] = useState("all"); // "all" | "unread"
	const [loading, setLoading] = useState(false);
	const dropdownRef = useRef(null);
	const navigate = useNavigate();

	// Fetch unread count periodically
	const fetchUnread = async () => {
		try {
			const res = await getUnreadCount();
			if (res.success) {
				setUnreadCount(res.unreadCount);
			}
		} catch (_) {}
	};

	// Fetch full notifications list when opened
	const fetchList = async () => {
		setLoading(true);
		try {
			const res = await getNotifications({
				unread: activeTab === "unread" ? "true" : undefined,
				limit: 30,
			});
			if (res.success) {
				setNotifications(res.notifications);
				setUnreadCount(res.unreadCount);
			}
		} catch (err) {
			console.error("Failed fetching notifications list:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchUnread();
		const interval = setInterval(fetchUnread, 45000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		if (isOpen) {
			fetchList();
		}
	}, [isOpen, activeTab]);

	// Close on click outside or escape key
	useEffect(() => {
		const handleClickOutside = (e) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
				setIsOpen(false);
			}
		};
		const handleKeyDown = (e) => {
			if (e.key === "Escape") setIsOpen(false);
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleKeyDown);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	const handleItemClick = async (notif) => {
		if (!notif.isRead) {
			try {
				await markAsRead(notif._id);
				setNotifications((prev) =>
					prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n)),
				);
				setUnreadCount((c) => Math.max(0, c - 1));
			} catch (_) {}
		}
		setIsOpen(false);
		if (notif.link) {
			navigate(notif.link);
		}
	};

	const handleMarkOne = async (e, id) => {
		e.stopPropagation();
		try {
			await markAsRead(id);
			setNotifications((prev) =>
				prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
			);
			setUnreadCount((c) => Math.max(0, c - 1));
			toast.success("Notification marked as read");
		} catch (err) {
			toast.error("Failed to update notification");
		}
	};

	const handleDelete = async (e, id) => {
		e.stopPropagation();
		try {
			await deleteNotification(id);
			setNotifications((prev) => prev.filter((n) => n._id !== id));
			fetchUnread();
			toast.success("Notification dismissed");
		} catch (err) {
			toast.error("Failed to dismiss notification");
		}
	};

	const handleMarkAll = async () => {
		try {
			await markAllAsRead();
			setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
			setUnreadCount(0);
			toast.success("All notifications marked as read");
		} catch (err) {
			toast.error("Failed marking all as read");
		}
	};

	const displayedList =
		activeTab === "unread"
			? notifications.filter((n) => !n.isRead)
			: notifications;

	return (
		<div className="relative" ref={dropdownRef}>
			{/* Notification Bell Button */}
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				aria-label="View notifications"
				aria-expanded={isOpen}
				className="relative p-2 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all duration-150 shadow-2xs cursor-pointer flex items-center justify-center"
			>
				<Bell size={17} />
				{unreadCount > 0 && (
					<span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
						{unreadCount > 99 ? "99+" : unreadCount}
					</span>
				)}
			</button>

			{/* Dropdown Popover */}
			{isOpen && (
				<div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[32rem] bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden flex flex-col z-50 origin-top-right transition-all duration-200">
					{/* Header */}
					<div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-bold text-slate-900">Notifications</h3>
							{unreadCount > 0 && (
								<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
									{unreadCount} new
								</span>
							)}
						</div>
						{unreadCount > 0 && (
							<button
								type="button"
								onClick={handleMarkAll}
								className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition-colors cursor-pointer"
							>
								<CheckCheck size={14} />
								<span>Mark all read</span>
							</button>
						)}
					</div>

					{/* Filter Tabs */}
					<div className="px-3 pt-2 pb-1 border-b border-slate-100 flex items-center gap-1.5 bg-white">
						<button
							type="button"
							onClick={() => setActiveTab("all")}
							className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
								activeTab === "all"
									? "bg-slate-900 text-white shadow-2xs"
									: "text-slate-600 hover:bg-slate-100"
							}`}
						>
							All
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("unread")}
							className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
								activeTab === "unread"
									? "bg-slate-900 text-white shadow-2xs"
									: "text-slate-600 hover:bg-slate-100"
							}`}
						>
							<span>Unread</span>
							{unreadCount > 0 && (
								<span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
							)}
						</button>
					</div>

					{/* Notification Items List */}
					<div className="overflow-y-auto flex-1 divide-y divide-slate-100">
						{loading ? (
							<div className="py-10 text-center text-xs text-slate-400">
								Loading notifications...
							</div>
						) : displayedList.length === 0 ? (
							<div className="py-12 px-4 flex flex-col items-center justify-center text-center">
								<div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
									<Inbox size={18} />
								</div>
								<p className="text-xs font-semibold text-slate-700">
									{activeTab === "unread"
										? "No unread notifications"
										: "No notifications yet"}
								</p>
								<p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
									{activeTab === "unread"
										? "You are all caught up with your scholarship opportunities."
										: "Verified matches, deadline alerts, and regional grants will appear here."}
								</p>
							</div>
						) : (
							displayedList.map((notif) => {
								const meta = getNotificationMeta(notif.type, notif.priority);
								const IconComponent = meta.icon;

								return (
									<div
										key={notif._id}
										onClick={() => handleItemClick(notif)}
										className={`group p-3.5 flex items-start gap-3 cursor-pointer transition-colors duration-150 ${
											notif.isRead
												? "bg-white hover:bg-slate-50/80"
												: "bg-emerald-50/35 hover:bg-emerald-50/60"
										}`}
									>
										{/* Icon */}
										<div
											className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border ${meta.iconBg}`}
										>
											<IconComponent size={15} />
										</div>

										{/* Content */}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1.5 mb-1 flex-wrap">
												<span
													className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${meta.badgeClass}`}
												>
													{meta.badgeText}
												</span>
												<span className="text-[10px] text-slate-400 ml-auto">
													{formatRelativeTime(notif.createdAt)}
												</span>
											</div>

											<h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
												{notif.title}
											</h4>
											<p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2 mt-0.5">
												{notif.message}
											</p>

											{/* Evidence reason pill */}
											{notif.evidence?.eligibilityReason && (
												<div className="mt-1.5 inline-block text-[10px] font-medium text-emerald-850 bg-emerald-100/50 border border-emerald-200/60 rounded px-1.5 py-0.5">
													Reason: {notif.evidence.eligibilityReason}
												</div>
											)}
										</div>

										{/* Actions */}
										<div className="shrink-0 flex items-center gap-1 opacity-80 group-hover:opacity-100">
											{!notif.isRead && (
												<button
													type="button"
													onClick={(e) => handleMarkOne(e, notif._id)}
													title="Mark as read"
													className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
												>
													<Check size={13} />
												</button>
											)}
											<button
												type="button"
												onClick={(e) => handleDelete(e, notif._id)}
												title="Dismiss"
												className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
											>
												<Trash2 size={13} />
											</button>
										</div>
									</div>
								);
							})
						)}
					</div>

					{/* Footer */}
					<div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
						<span>Proactive alerts enabled</span>
						<button
							type="button"
							onClick={() => {
								setIsOpen(false);
								navigate("/settings");
							}}
							className="text-emerald-800 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
						>
							<span>Delivery settings</span>
							<ChevronRight size={12} />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
