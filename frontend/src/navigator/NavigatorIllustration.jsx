import { useState } from "react";

const NOTES = ["Start with a good question.", "Find the line that matters.", "Leave with a next step."];

// Native vector artwork follows Udaan's existing paper/comic illustration system.
export default function NavigatorIllustration() {
	const [note, setNote] = useState(0);
	return <div className="nv-art">
		<div className="nv-art-caption"><span>LESS TAB CHAOS</span><span>MORE DIRECTION ↗</span></div>
		<button type="button" className="nv-map-button" onClick={() => setNote((note + 1) % NOTES.length)} aria-label="Turn the research compass">
			<svg viewBox="0 0 440 345" fill="none" aria-hidden="true" stroke="#193f34" strokeLinecap="round" strokeLinejoin="round">
				<path d="M48 82 159 64 275 84 389 60 401 281 280 303 167 280 57 300Z" fill="#cadbc9" strokeWidth="1.5" transform="rotate(3 220 180)" />
				<path d="M32 65 154 43 271 66 386 42 398 266 280 285 164 264 43 285Z" fill="#fffef7" strokeWidth="2" />
				<path d="m154 43 10 221m107-198 9 219" stroke="#a8bdac" strokeWidth="1.5" />
				<path d="M58 234c30-95 78-16 109-69s50-54 82-33 12 98 60 82 39-70 56-87" stroke="#4b8069" strokeWidth="2.5" strokeDasharray="5 8" />
				<path d="m60 106 37-20m-33 31 45-24m186 151 36-6m-27 15 35-7M191 232l32 8m-40-21 48 11" stroke="#c6d3c5" strokeWidth="3" />
				<g transform="rotate(-10 94 173)"><rect x="52" y="137" width="86" height="65" rx="3" fill="#ffdf63" strokeWidth="1.8" /><path d="M66 155h56m-56 12h40m-40 13h49" strokeWidth="2" /><circle cx="132" cy="139" r="6" fill="#e99e88" /></g>
				<g transform="rotate(8 325 102)"><path d="M293 67h48l17 17v59h-65Z" fill="#e0d7f0" strokeWidth="1.8" /><path d="M341 67v17h17m-51 14h36m-36 11h28m-28 11h35" strokeWidth="1.5" /></g>
				<g className="nv-compass-needle" style={{ transform: `rotate(${note * 45 - 12}deg)` }}>
					<circle cx="228" cy="177" r="62" fill="#ffdc5b" strokeWidth="2.5" /><circle cx="228" cy="177" r="48" fill="#fffdf4" strokeWidth="1.5" />
					<path d="m228 135 13 42-13 42-13-42Z" fill="#193f34" strokeWidth="1.5" /><path d="m228 177 13 0-13 42Z" fill="#b7d4b9" /><circle cx="228" cy="177" r="5" fill="#ffdc5b" strokeWidth="1.5" />
				</g>
				<path d="M228 102v-7m0 164v-7m-75-75h-7m164 0h-7" strokeWidth="2" />
				<text x="228" y="85" textAnchor="middle" fill="#193f34" stroke="none" fontSize="13" fontFamily="Georgia">N</text>
				<g transform="translate(350 204) rotate(13)"><path d="m0-23 8 14 16 1-10 13 3 17-17-7-16 7 2-17-10-13 17-1Z" fill="#e7ab98" strokeWidth="1.7" /><path d="m-8 1 6 6 11-13" strokeWidth="2.5" /></g>
				<path d="m28 29 4-13 5 13 13 4-13 5-5 13-4-13-13-5Zm376 74 3-10 4 10 10 4-10 3-4 11-3-11-11-3Z" fill="#ffdf63" strokeWidth="1.5" />
				<path d="M101 308q13 14 34 8m-25 10 25-10-14-20" strokeWidth="1.5" />
			</svg>
		</button>
		<p className="nv-hand-note" aria-live="polite">{NOTES[note]}</p>
		<span className="nv-art-hint">Give the compass a little turn.</span>
	</div>;
}
