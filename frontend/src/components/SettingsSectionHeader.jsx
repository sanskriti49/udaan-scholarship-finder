export default function SettingsSectionHeader({ eyebrow, title, description, note, icon: Icon }) {
	return <header className="st-section-header">
		<div><p className="st-eyebrow">{eyebrow}</p><h2>{title}</h2><p className="st-section-description">{description}</p></div>
		<aside className="st-sticky-note"><Icon size={21} /><p>{note}</p></aside>
	</header>;
}
