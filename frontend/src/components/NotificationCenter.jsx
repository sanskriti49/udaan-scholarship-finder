import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Sparkles, Clock, MapPin, Calendar, Trash2, ArrowUpRight, Inbox, X, RotateCcw } from "lucide-react";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from "../services/notificationService";
import { useAuth } from "../hooks/useAuth";
import useDialogFocus from "../hooks/useDialogFocus";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import { toast } from "sonner";
import "./alerts.css";

function formatRelativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 2880) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const TYPES = {
  INSTANT_MATCH: { icon: Sparkles, label: "A possible match", tone: "match" },
  DEADLINE_7_DAYS: { icon: Clock, label: "Deadline reminder", tone: "deadline" },
  DEADLINE_48_HOURS: { icon: Clock, label: "Final reminder", tone: "urgent" },
  DEADLINE_CHANGED: { icon: Clock, label: "Deadline changed", tone: "deadline" },
  STATE_GRANT_UPDATE: { icon: MapPin, label: "From your state", tone: "match" },
  WEEKLY_DIGEST: { icon: Calendar, label: "Your weekly roundup", tone: "quiet" },
  SYSTEM: { icon: Bell, label: "An update from Udaan", tone: "quiet" },
};
const isPreview = (item) => String(item._id).startsWith("preview_");
const isDeadline = (item) => String(item.type).startsWith("DEADLINE_");

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const [position, setPosition] = useState({ top: 80, right: 24 });
  const bellRef = useRef(null);
  const dialogRef = useDialogFocus(isOpen);
  useBodyScrollLock(isOpen);

  const fetchUnread = useCallback(async () => {
    if (!user || !localStorage.getItem("token")) return;
    try {
      const res = await getUnreadCount();
      if (res.success) setUnreadCount(res.unreadCount || 0);
    } catch { /* The opened inbox provides a visible retry if the service is unavailable. */ }
  }, [user]);

  const fetchList = useCallback(async () => {
    if (!user || !localStorage.getItem("token")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getNotifications({ limit: 30 });
      if (!res.success) throw new Error("Unavailable");
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      setError("We couldn't load your updates. Give it another try.");
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const start = setTimeout(fetchUnread, 0);
    const poll = setInterval(fetchUnread, 45000);
    return () => { clearTimeout(start); clearInterval(poll); };
  }, [user, fetchUnread]);

  useEffect(() => {
    if (!isOpen || !user) return;
    const start = setTimeout(fetchList, 0);
    return () => clearTimeout(start);
  }, [isOpen, user, fetchList]);

  useEffect(() => {
    const preview = (event) => {
      if (!event.detail) return;
      setNotifications((prev) => [event.detail, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };
    const refresh = () => { fetchUnread(); if (isOpen) fetchList(); };
    window.addEventListener("preview-notification", preview);
    window.addEventListener("notifications-updated", refresh);
    return () => {
      window.removeEventListener("preview-notification", preview);
      window.removeEventListener("notifications-updated", refresh);
    };
  }, [fetchUnread, fetchList, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const close = (event) => {
      if (event.key === "Escape") { event.stopPropagation(); setIsOpen(false); }
    };
    const reposition = () => {
      const rect = bellRef.current?.getBoundingClientRect();
      if (rect) setPosition({ top: rect.bottom + 12, right: Math.max(12, innerWidth - rect.right) });
    };
    document.addEventListener("keydown", close);
    window.addEventListener("resize", reposition);
    return () => { document.removeEventListener("keydown", close); window.removeEventListener("resize", reposition); };
  }, [isOpen]);

  const runItemAction = async (item, action) => {
    if (busy.has(item._id) || markingAll) return false;
    setBusy((prev) => new Set(prev).add(item._id));
    try {
      if (!isPreview(item)) {
        const result = await (action === "dismiss" ? deleteNotification(item._id) : markAsRead(item._id));
        if (result.success === false) throw new Error("Update rejected");
      }
      setNotifications((prev) => action === "dismiss" ? prev.filter((n) => n._id !== item._id) : prev.map((n) => n._id === item._id ? { ...n, isRead: true } : n));
      if (!item.isRead) setUnreadCount((prev) => Math.max(0, prev - 1));
      return true;
    } catch {
      toast.error(action === "dismiss" ? "Couldn't dismiss this update. Try again." : "Couldn't mark this update as read. Try again.");
      return false;
    } finally { setBusy((prev) => { const next = new Set(prev); next.delete(item._id); return next; }); }
  };

  const openItem = async (item) => {
    if (!item.isRead) await runItemAction(item, "read");
    if (item.link) { setIsOpen(false); navigate(item.link); }
  };
  const markAll = async () => {
    setMarkingAll(true);
    try {
      if (user) {
        const result = await markAllAsRead();
        if (result.success === false) throw new Error("Update rejected");
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { toast.error("Couldn't mark your updates as read. Try again."); }
    finally { setMarkingAll(false); }
  };
  const list = notifications.filter((n) => activeTab === "unread" ? !n.isRead : activeTab === "deadlines" ? isDeadline(n) : true);
  const groups = activeTab === "all" ? [
    { label: "To catch up on", items: list.filter((n) => !n.isRead) },
    { label: "Already read", items: list.filter((n) => n.isRead) },
  ] : [{ label: activeTab === "unread" ? "To catch up on" : "Deadline reminders", items: list }];

  return (
    <>
      <button ref={bellRef} type="button" aria-label={`View notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={isOpen} aria-haspopup="dialog" aria-controls={isOpen ? "notification-inbox" : undefined} className="nc-bell" onClick={() => {
        const rect = bellRef.current.getBoundingClientRect();
        setPosition({ top: rect.bottom + 12, right: Math.max(12, innerWidth - rect.right) });
        setIsOpen((prev) => !prev);
      }}>
        <Bell size={18} />{unreadCount > 0 && <span className="nc-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {isOpen && createPortal(
        <div className="nc-layer">
          <div className="nc-backdrop" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <section ref={dialogRef} tabIndex={-1} id="notification-inbox" role="dialog" aria-modal="true" aria-labelledby="notification-inbox-title" className="nc-panel" style={{ "--nc-top": `${position.top}px`, "--nc-right": `${position.right}px` }}>
            <header className="nc-header">
              <div><p className="nc-eyebrow">A note for your next step</p><h2 id="notification-inbox-title">Your updates <span>{unreadCount} unread</span></h2></div>
              <button type="button" aria-label="Close notifications" className="nc-icon-button" onClick={() => setIsOpen(false)}><X size={18} /></button>
            </header>
            <div className="nc-toolbar">
              <div className="nc-tabs" role="group" aria-label="Filter updates">{[{ id: "all", label: "All" }, { id: "unread", label: "Unread" }, { id: "deadlines", label: "Deadlines" }].map((tab) => <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</div>
              {unreadCount > 0 && <button type="button" className="nc-text-action" disabled={markingAll || busy.size > 0 || loading || Boolean(error)} onClick={markAll}><CheckCheck size={14} />{markingAll ? "Marking…" : "Read all"}</button>}
            </div>
            <div className="nc-list" aria-busy={loading}>
              {loading ? <div className="nc-empty" role="status"><Inbox size={32} /><h3>Picking up your updates…</h3><p>This should only take a moment.</p></div> : error ? <div className="nc-empty" role="alert"><h3>A little trouble loading.</h3><p>{error}</p><button type="button" className="nc-primary" onClick={fetchList}><RotateCcw size={15} /> Try again</button></div> : list.length === 0 ? <div className="nc-empty"><Inbox size={36} /><h3>{!user ? "Keep your next step in sight." : activeTab === "unread" ? "You're all caught up." : activeTab === "deadlines" ? "No deadline reminders here yet." : "A fresh start for your inbox."}</h3><p>{!user ? "Sign in to keep scholarship updates and reminders in one place." : "Scholarship matches, changes and reminders will land here when there's something to share."}</p>{!user && <button type="button" className="nc-primary" onClick={() => { setIsOpen(false); navigate("/login?redirect=/settings%3Ftab%3Dnotifications"); }}>Sign in <ArrowUpRight size={15} /></button>}</div> : groups.map((group) => group.items.length > 0 && <div key={group.label}><h3 className="nc-group-title">{group.label} <span>{group.items.length}</span></h3>{group.items.map((item) => {
                const meta = TYPES[item.type] || { icon: Bell, label: "An update", tone: "quiet" };
                const Icon = meta.icon;
                return <article key={item._id} className={`nc-note nc-${meta.tone} ${item.isRead ? "nc-note-read" : ""}`}>
                  <div className="nc-note-meta"><span><Icon size={13} />{isPreview(item) ? "Preview · " : ""}{meta.label}</span><time dateTime={item.createdAt}>{formatRelativeTime(item.createdAt)}</time></div>
                  <h4>{item.link ? <button type="button" onClick={() => openItem(item)} disabled={busy.has(item._id)}>{item.title} <ArrowUpRight size={14} /></button> : item.title}</h4>
                  <p>{item.message}</p>
                  {item.evidence?.eligibilityReason && <p className="nc-reason">Why this reached you: {item.evidence.eligibilityReason}</p>}
                  <div className="nc-note-actions">{item.isRead ? <span><CheckCheck size={13} /> Read</span> : <button type="button" disabled={busy.has(item._id) || markingAll} onClick={() => runItemAction(item, "read")} aria-label={`Mark ${item.title} as read`}><Check size={14} /> Mark read</button>}<button type="button" disabled={busy.has(item._id) || markingAll} onClick={() => runItemAction(item, "dismiss")} aria-label={`Dismiss ${item.title}`}><Trash2 size={13} /> Dismiss</button></div>
                </article>;
              })}</div>)}
            </div>
            <footer className="nc-footer"><span>Make room for what matters.</span><button type="button" onClick={() => { setIsOpen(false); navigate("/settings?tab=notifications"); }}>Choose your alerts <ArrowUpRight size={14} /></button></footer>
          </section>
        </div>, document.body
      )}
    </>
  );
}
