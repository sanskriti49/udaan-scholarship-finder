import { Bell, Clock, Mail, MapPin, Sparkles, Send, Save, Loader2, ArrowUpRight, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import "./alerts.css";

function Switch({ label, checked, onChange }) {
	return <button type="button" role="switch" aria-label={label} aria-checked={Boolean(checked)} onClick={() => onChange(!checked)} className="ap-switch"><span /></button>;
}

function AlertSheet({ number, icon: Icon, title, description, checked, onChange, children }) {
	return <section className={`ap-sheet ${checked ? "ap-sheet-on" : ""}`}>
		<div className="ap-sheet-top"><span className="ap-number">{number}</span><Icon size={19} /><span className="ap-status">{checked ? "On" : "Off"}</span></div>
		<div className="ap-sheet-heading"><h3>{title}</h3><Switch label={title} checked={checked} onChange={onChange} /></div>
		<p className="ap-description">{description}</p>
		{children}
	</section>;
}

export default function AlertPreferences({ value, onChange, savedValue, loading, saving, testing, onSave, onTest, error, onRetry, email, state }) {
	const dirty = savedValue && JSON.stringify(value) !== JSON.stringify(savedValue);
	const enabled = [value.instantMatch, value.deadlineAlerts, value.newGrantsInState, value.weeklyDigest].filter(Boolean).length;
	const update = (key, next) => onChange({ ...value, [key]: next });
	const channel = (key, next) => onChange({ ...value, channels: { ...value.channels, [key]: next } });
	return <div className="alert-preferences">
		<header className="ap-header">
			<div><p className="ap-eyebrow">Your reminder desk</p><h2>A heads-up, when you need it.</h2><p>Choose the updates you want. Save your settings when they feel right.</p></div>
			<div className="ap-sticky-note"><Bell size={20} /><strong>{enabled} of 4 alert types on</strong><span>{dirty ? "You have unsaved changes." : loading ? "Loading your saved choices…" : error ? "Saved choices unavailable." : "Your saved choices are shown below."}</span></div>
		</header>
		{loading ? <div className="ap-loading" role="status"><Loader2 size={22} className="animate-spin" /> Loading your alert settings…</div> : error ? <div className="ap-error" role="alert"><h3>We couldn't load your settings.</h3><p>Try again before changing your preferences.</p><button type="button" onClick={onRetry}><RotateCcw size={15} /> Try again</button></div> : <>
			<fieldset disabled={saving || testing} className="ap-fieldset">
				<legend className="ap-section-label">01 / What would you like to hear about?</legend>
				<div className="ap-sheets">
					<AlertSheet number="01" icon={Sparkles} title="Scholarships that could fit" description="Hear about new or updated schemes that match your profile." checked={value.instantMatch} onChange={(next) => update("instantMatch", next)}>
						{value.instantMatch && <div className="ap-extra"><label htmlFor="alert-match-threshold">Minimum match score <strong>{value.minMatchScore}%</strong></label><input id="alert-match-threshold" type="range" min="50" max="95" step="5" value={value.minMatchScore} onChange={(event) => update("minMatchScore", Number(event.target.value))} /><div className="ap-range-labels"><span>More possibilities</span><span>Closer matches</span></div><p>This score helps filter updates; check the official eligibility rules before applying.</p></div>}
					</AlertSheet>
					<AlertSheet number="02" icon={Clock} title="A nudge before deadlines" description="Give yourself time to prepare, then get a final reminder before applications close." checked={value.deadlineAlerts} onChange={(next) => update("deadlineAlerts", next)}>
						{value.deadlineAlerts && <div className="ap-extra ap-countdowns"><label><input type="checkbox" checked={value.deadline7Days} onChange={(event) => update("deadline7Days", event.target.checked)} /><span><strong>7 days before</strong><small>Time to gather your documents.</small></span></label><label><input type="checkbox" checked={value.deadline48Hours} onChange={(event) => update("deadline48Hours", event.target.checked)} /><span><strong>48 hours before</strong><small>A final check before you submit.</small></span></label></div>}
					</AlertSheet>
					<AlertSheet number="03" icon={MapPin} title="New schemes in your state" description={`Get updates on newly discovered state schemes for ${state || "your home state"}.`} checked={value.newGrantsInState} onChange={(next) => update("newGrantsInState", next)} />
					<AlertSheet number="04" icon={Mail} title="A weekly catch-up" description="A Monday roundup of scholarship opportunities that match your profile." checked={value.weeklyDigest} onChange={(next) => update("weeklyDigest", next)} />
				</div>
				<section className="ap-delivery">
					<h3 className="ap-section-label">02 / Where should your updates go?</h3>
					<div className="ap-channel-grid"><div className="ap-channel"><Bell size={20} /><div><strong>Here in Udaan</strong><p>In the bell's notification center.</p></div><Switch label="In-app alerts" checked={value.channels?.inApp} onChange={(next) => channel("inApp", next)} /></div><div className="ap-channel"><Mail size={20} /><div><strong>Your email inbox</strong><p>{email || "Your account email"}</p></div><Switch label="Email alerts" checked={value.channels?.email} onChange={(next) => channel("email", next)} /></div></div>
					{!value.channels?.inApp && !value.channels?.email && <p className="ap-channel-note">Both delivery channels are off. Turn one on if you'd like to receive alerts.</p>}
					<div className="ap-timezone"><div><label htmlFor="alert-timezone">Your roundup's time zone</label><p>Used to schedule your weekly catch-up.</p></div><select id="alert-timezone" value={value.timezone} onChange={(event) => update("timezone", event.target.value)}><option value="Asia/Kolkata">India · Asia/Kolkata</option><option value="UTC">UTC</option><option value="Asia/Dubai">Dubai · Asia/Dubai</option><option value="Europe/London">London · Europe/London</option><option value="America/New_York">New York · America/New_York</option></select></div>
				</section>
			</fieldset>
			<footer className="ap-save-bar"><div role="status"><strong>{saving ? "Saving your choices…" : dirty ? "A few changes waiting to be saved." : "You're up to date."}</strong><span>{dirty ? "Save before trying a test alert." : "Try a test alert to check your delivery."}</span></div><div className="ap-save-actions"><button type="button" className="ap-secondary" onClick={onTest} disabled={testing || saving || Boolean(dirty)}>{testing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}{testing ? "Sending…" : "Try a test alert"}</button><button type="button" className="ap-primary" onClick={onSave} disabled={saving || testing || !dirty}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{saving ? "Saving…" : "Save alert settings"}</button></div></footer>
			<Link className="ap-help" to="/resources#roadmap">Get ready for your next application <ArrowUpRight size={14} /></Link>
		</>}
	</div>;
}
