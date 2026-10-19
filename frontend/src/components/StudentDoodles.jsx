import { useState } from "react";
import "./student-doodles.css";

const INK = "#193f34", CREAM = "#fffdf2", YELLOW = "#ffdb58", PINK = "#ff9bb7", MINT = "#a6d9bb", LILAC = "#c5b9f2";

function Spark({ x, y, size = 20, fill = YELLOW }) {
	return <path d="M0-15 4-4 15 0 4 4 0 15-4 4-15 0-4-4Z" transform={`translate(${x} ${y}) scale(${size / 30})`} fill={fill} strokeWidth="2" />;
}
function Eyes({ x, y, wink = false }) {
	return <g transform={`translate(${x} ${y})`}>
		<ellipse cx="0" cy="0" rx="12" ry="17" fill={CREAM} strokeWidth="2.5" />
		<ellipse cx="3" cy="2" rx="5" ry="9" fill={INK} stroke="none" />
		{wink ? <path d="M24 1q11-12 22 0" fill="none" /> : <g><ellipse cx="34" cy="0" rx="12" ry="17" fill={CREAM} strokeWidth="2.5" /><ellipse cx="37" cy="2" rx="5" ry="9" fill={INK} stroke="none" /></g>}
	</g>;
}
function Shoe({ x, y, flip = false, fill = PINK }) {
	return <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
		<path d="M0 0h23l9 12 21 5q8 3 5 14H-4V15Z" fill={fill} />
		<path d="M-4 24h62M28 11l-9 5m17-1-8 6" fill="none" />
	</g>;
}
function Bubble({ children, x = 14, y = 25, width = 230, tilt = -4 }) {
	return <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
		<path d={`M17 0h${width - 34}q17 0 17 17v28q0 17-17 17h-30l-17 20 1-20H17Q0 62 0 45V17Q0 0 17 0Z`} fill={CREAM} />
		<text x={width / 2} y="38" textAnchor="middle" className="doodle-lettering">{children}</text>
	</g>;
}

function Journey({ hyped }) {
	return <>
		<circle cx="280" cy="182" r="115" fill={YELLOW} stroke="none" />
		<ellipse cx="262" cy="324" rx="150" ry="10" fill={INK} opacity=".09" stroke="none" />
		<Bubble width={235}>{hyped ? "LET’S GOOO." : "big plans. tiny first step."}</Bubble>
		<g className="doodle-orbit">
			<path d="m388 70 72-30-24 63-16-20-32-13Z" fill={LILAC} />
			<path d="m420 83 40-43m-40 43-1 15 17 5" fill="none" />
			<path d="M391 94q-20 28 1 34t-5 27" strokeDasharray="4 7" strokeWidth="2" fill="none" />
		</g>
		<g className="doodle-character">
			<path d="M207 263q-27 14-24 35m71-35q26 0 41 22" fill="none" strokeWidth="7" />
			<Shoe x={171} y={291} /><Shoe x={299} y={279} flip />
			<path d="M160 153q-34 2-43-30m191 47q25 5 43-15" fill="none" strokeWidth="7" />
			<path d="m117 123-13-1-9-13q-2-8 5-7l10 8-5-21q3-7 8-1l5 19 5-17q5-6 9 0l-4 24 9-6q8-1 7 5l-19 19Z" fill={CREAM} />
			<path d="m351 155 10-15 17-4q7 2 2 7l-12 6 18 2q7 5 0 9l-17-1 9 10q1 7-6 6l-17-11Z" fill={CREAM} />
			<g transform="rotate(-9 235 190)">
				<path d="M170 104h109l32 33v128q-67 15-145-3Z" fill={CREAM} />
				<path d="M279 104v34h32" fill={MINT} />
				<path d="m184 128 18-4m38 0 18 4" fill="none" strokeWidth="2.5" />
				<Eyes x={205} y={164} wink={hyped} />
				<path d="M214 195q19 30 39-1Z" fill={INK} /><path d="m220 196 27-1-4 8h-18Z" fill={CREAM} stroke="none" />
				<path d="M187 229h36m-36 12h63" strokeWidth="3" opacity=".35" />
				<g transform="translate(269 224) rotate(11)"><circle r="20" fill={PINK} /><path d="m-9 0 6 7L10-8" fill="none" strokeWidth="4" /></g>
			</g>
		</g>
		<g transform="translate(371 223) rotate(9)">
			<path d="m0 0 18 3 12-13 12 13 18-3-2 18 13 12-13 12 2 18-18-2-12 13-12-13-18 2 3-18-13-12L3 18Z" fill={LILAC} strokeWidth="2" />
			<text x="30" y="26" textAnchor="middle" className="doodle-small">YOU</text><text x="30" y="43" textAnchor="middle" className="doodle-small">GOT THIS</text>
		</g>
		<Spark x={92} y={228} size={35} fill={PINK} /><Spark x={359} y={115} size={25} fill={MINT} />
		<path d="m98 269 20-9m-10 26 17-6m333-112 12-10m-6 29 15-3" fill="none" strokeWidth="2.5" />
	</>;
}

function Writing({ hyped }) {
	return <>
		<path d="M135 81h265v227H135Z" fill={LILAC} stroke="none" transform="rotate(7 260 195)" />
		<ellipse cx="272" cy="329" rx="162" ry="9" fill={INK} opacity=".09" stroke="none" />
		<Bubble x={12} y={19} width={242}>{hyped ? "okay, that sounds like me." : "me vs. the blank page."}</Bubble>
		<g transform="rotate(7 310 197)">
			<path d="M248 89h116l34 34v175H248Z" fill={CREAM} /><path d="M364 89v35h34" fill={PINK} />
			<text x="264" y="155" className="doodle-small">{hyped ? "DRAFT_02" : "DRAFT_01"}</text>
			<path d="M266 177h103m-103 17h68m-68 17h91m-91 17h58" fill="none" opacity=".35" />
			<path d="m269 254 14-10-2 13 20-17-8 19 19-13-3 10 25-8" fill="none" strokeWidth="4" />
		</g>
		<g className="doodle-character">
			<path d="M173 258q-24 27-19 41m44-50q20 19 49 23" fill="none" strokeWidth="7" />
			<Shoe x={143} y={291} fill={MINT} /><Shoe x={252} y={272} flip fill={MINT} />
			<g transform="rotate(22 195 184)">
				<path d="M157 84h69v155l-34 49-35-49Z" fill={YELLOW} /><path d="M157 84V69q35-15 69 0v15Z" fill={PINK} />
				<path d="M157 91h69m-52 9v34m36-34v34m-53 105 17-9 17 10 18-10 17 9" fill="none" />
				<path d="m192 288-14-20q14-9 28 0Z" fill={INK} />
				<Eyes x={175} y={169} wink={hyped} />
				<path d={hyped ? "M179 201q17 20 32-1" : "M182 204q14-10 26-2"} fill="none" />
			</g>
			<path d="M147 175q-30 8-26 34m113-18q17 28 49 34" fill="none" strokeWidth="7" />
			<path d="m281 219 13-7q8-1 7 6l-8 7 13-1q8 3 2 8l-18 4-10-5Z" fill={CREAM} /><path d="m121 209-11 8 2 16 13 7 9-11-3-16Z" fill={CREAM} />
		</g>
		<g className="doodle-orbit" transform="translate(408 48) rotate(11)">
			<path d="m0 7 18-7 13 16-6 22-21-1-10-15Z" fill={PINK} /><path d="m0 7 11 12 20-3m-20 3 14 19m-14-19-7 18" fill="none" strokeWidth="2" />
		</g>
		<Spark x={435} y={200} size={30} /><Spark x={82} y={275} size={24} fill={PINK} />
		<path d="m93 141-12-8m13-3-5-14m325 159 12-7m-8 19 13-1" fill="none" strokeWidth="2.5" />
	</>;
}

function Together({ hyped }) {
	return <>
		<path d="M128 268 101 105l136-21 20 91 82-102 95 81-78 139Z" fill={YELLOW} stroke="none" />
		<ellipse cx="267" cy="327" rx="167" ry="10" fill={INK} opacity=".09" stroke="none" />
		<Bubble x={38} y={18} width={258}>{hyped ? "ohhh. got it." : "the fine print has lore??"}</Bubble>
		<g className="doodle-character">
			<path d="m165 269-8 29m44-32 11 27m115-38-3 39m43-36 16 35" fill="none" strokeWidth="7" />
			<Shoe x={137} y={291} fill={LILAC} /><Shoe x={225} y={288} flip fill={LILAC} /><Shoe x={310} y={291} /><Shoe x={393} y={287} flip />
			<g transform="rotate(-8 177 205)">
				<path d="M116 124h99l28 28v116H116Z" fill={MINT} /><path d="M215 124v28h28" fill={CREAM} />
				<Eyes x={153} y={181} wink={hyped} /><path d={hyped ? "M159 211q15 18 31-1" : "M164 215q12-9 22-1"} fill="none" />
				<path d="M133 243h43m-43 12h62" fill="none" opacity=".4" />
			</g>
			<g transform="rotate(10 348 206)">
				<path d="M296 125q46-16 92-4v141q-46-10-92 5Z" fill={PINK} /><path d="M296 125q-8 3-11 9v143q45-14 95-5l8-10m-92-137v142" fill={CREAM} />
				<Eyes x={317} y={179} wink={hyped} /><path d="M327 209q14 18 29-2" fill="none" /><path d="M313 237q26-5 53 0" fill="none" opacity=".4" />
			</g>
			<path d="M119 209q-34 6-37 38m308-33q31-18 27-48" fill="none" strokeWidth="7" />
			<path d="m82 247-11 1-6 11 9 9 13-4 4-13Zm335-81-9-8-1-17q4-8 9-2l3 11 4-20q5-5 8 1l-1 21 8-6q8 0 5 6l-17 20Z" fill={CREAM} />
			<path d="m230 219 22-18m48 13-24-18" fill="none" strokeWidth="7" />
		</g>
		<g className="doodle-magnifier" transform="rotate(-20 265 195)">
			<path d="M261 229h17v62q-9 10-17 0Z" fill={LILAC} /><circle cx="269" cy="193" r="42" fill={CREAM} strokeWidth="7" />
			<path d="m250 190 10 11 23-26" fill="none" strokeWidth="6" /><path d="M241 185q3-12 13-15" fill="none" stroke={MINT} strokeWidth="5" />
		</g>
		<Spark x={443} y={98} size={29} fill={LILAC} /><Spark x={68} y={172} size={24} fill={PINK} />
	</>;
}

const SCENES = { journey: Journey, writing: Writing, together: Together };
const NUDGES = { journey: "A little pre-application hype", writing: "Break the blank-page curse", together: "Bring in the moral support" };

export default function StudentDoodles({ scene, className = "max-w-xl" }) {
	const [hyped, setHyped] = useState(false);
	const Scene = SCENES[scene];
	return <figure className={`ud-illustration student-doodle ${hyped ? "is-hyped" : ""} mx-auto w-full min-w-0 ${className}`}>
		<button type="button" className="student-doodle-button" aria-label={NUDGES[scene]} aria-pressed={hyped} onClick={() => setHyped(!hyped)}>
			<svg viewBox="0 0 520 360" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><Scene hyped={hyped} /></svg>
			<span className="doodle-tap-hint" aria-hidden="true">{hyped ? "you’ve got this. ↩" : "psst… tap for a little hype ↗"}</span>
		</button>
	</figure>;
}
