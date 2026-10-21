// The same ink, paper and accent colours as Udaan's StudentDoodles.
// Decorative artwork: the marks on the paper never represent a verified result.
export default function ScholarshipDoodle({ section = "overview" }) {
	return <svg className="sch-notes-doodle" viewBox="0 0 210 160" fill="none" stroke="#193f34" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
		<path d="M29 116Q8 72 45 40t100-15q52 12 48 58t-66 52Z" fill="#ffdb58" stroke="none" />
		<path d="m176 17 4 10 11 2-9 7 1 11-9-6-10 5 3-11-8-8 11-1Z" fill="#c5b9f2" strokeWidth="1.8" />
		<path d="m22 61 3-8m-10 3 7 3m167 42 7-3m-5 11 7 1" />
		<ellipse cx="112" cy="145" rx="69" ry="5" fill="#193f34" opacity=".1" stroke="none" />
		<g className="sch-doodle-sheets">
			<path d="m72 30 75-7 10 108-75 7Z" fill="#a6d9bb" />
			<path d="m56 36 74 3 17 19-5 76-91-4Z" fill="#fffdf2" />
			<path d="m130 39-1 19 18 0" fill="#c5b9f2" />
			<path d="m64 50 24 1m-25 9 15 1" opacity=".45" />
			<ellipse cx="82" cy="80" rx="8" ry="11" fill="#fffdf2" /><ellipse cx="105" cy="81" rx="8" ry="11" fill="#fffdf2" />
			<ellipse cx="85" cy="81" rx="3" ry="5" fill="#193f34" stroke="none" /><ellipse cx="108" cy="82" rx="3" ry="5" fill="#193f34" stroke="none" />
			<path d="M87 98q8 11 16 0" />
			<path d="m64 115 30 1m-30 7 47 2" opacity=".4" />
		</g>
		<path d="M51 95q-24-4-25 14m114-13q25 1 30-13" strokeWidth="4" />
		<path d="m24 109-7 1-3 8 7 5 8-4 1-7Zm144-28 2-9 6-3 3 5-4 9-5 2Z" fill="#fffdf2" strokeWidth="2" />
		<path d="m76 133-6 9m42-8 8 8" strokeWidth="4" />
		<path d="m68 138-10 2q-6 2-3 7h25v-7Zm52 1 10 1q7 2 5 7h-25v-6Z" fill="#ff9bb7" strokeWidth="2" />
		<g transform="translate(149 118) rotate(9)">
			<rect x="-20" y="-19" width="40" height="38" rx="8" fill={section === "changes" ? "#c5b9f2" : section === "documents" ? "#a6d9bb" : "#ff9bb7"} strokeWidth="2" />
			{section === "overview" ? <g><path d="M-7-9H6m-13 6H6m-9-6q12 6-4 12l13 9" strokeWidth="2.4" /></g>
				: section === "changes" ? <g><circle cx="-7" cy="-7" r="3" fill="#fffdf2" /><circle cx="7" cy="7" r="3" fill="#fffdf2" /><path d="M-7-4v8q0 3 4 3h7M-4-7h8" /></g>
					: section === "documents" ? <g><path d="M-10-9h8l4 4h9v15h-21Z" fill="#fffdf2" /><path d="M-6 0H7M-6 5H3" strokeWidth="1.8" /></g>
						: <g><circle cx="-2" cy="-3" r="8" fill="#fffdf2" /><path d="m4 3 7 8M-5-3h6" /></g>}
		</g>
		<path d="m34 22 3 7 8 1-6 5 1 8-7-4-6 4 1-8-6-5 8-1Z" fill="#ff9bb7" strokeWidth="1.8" />
		<path d="m143 9 5-5m2 10 7-1" strokeWidth="2" />
	</svg>;
}
