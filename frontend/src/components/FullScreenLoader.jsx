import { createPortal } from "react-dom";
import Logo from "./Logo";

/**
 * "Udaan" means flight, so the loader is a flight:
 * a paper plane flies a hand-drawn loop-de-loop route, drawing its trail
 * behind it, and sparkles ("opportunities") pop where it passes.
 * Then it fades and flies again. Nothing pulses.
 *
 * Timing is tied to the route: the plane moves at constant speed and
 * finishes the route at 76% of the cycle, so a stop at X% of the route
 * pops at roughly X * 0.76 of the cycle. If you change --T the stops stay
 * in sync; if you move a stop (STOPS[].at), update its ud-pop-* keyframes.
 */

// 300 x 170 route with a loop in the middle
const D =
	"M8 128C50 128 70 96 100 96C135 96 140 140 112 140C88 140 92 100 130 84C170 66 200 90 226 70C246 55 266 44 292 40";

// `at` = % along the route (kept clear of the loop)
const STOPS = [
	{ name: "a", at: 12, fill: "#FFD966", size: 24 },
	{ name: "b", at: 68, fill: "#FF7FA8", size: 24 },
	{ name: "c", at: 100, fill: "#B9A8FF", size: 34 },
];

const CSS = `
.ud-ld{--T:3.6s}
.ud-ld-scene{position:relative;width:300px;max-width:100%;height:170px}
.ud-ld-route{position:absolute;inset:0;overflow:visible}

/* the solid trail draws itself, then fades */
.ud-ld-trail{stroke-dasharray:100;stroke-dashoffset:100;animation:ud-draw var(--T) linear infinite}

/* plane + stops ride the same route */
.ud-ld-plane,.ud-ld-stop{position:absolute;left:0;top:0;line-height:0;offset-path:var(--ud-path);offset-rotate:auto}
.ud-ld-stop{offset-rotate:0deg}
.ud-ld-plane{opacity:0;filter:drop-shadow(0 3px 0 rgba(25,61,52,.18));animation:ud-fly var(--T) linear infinite}
.ud-ld-pop{translate:0 -20px;transform:scale(0);opacity:0;animation-duration:var(--T);animation-iteration-count:infinite;animation-timing-function:ease-out}
.ud-ld-pop--a{animation-name:ud-pop-a}
.ud-ld-pop--b{animation-name:ud-pop-b}
.ud-ld-pop--c{animation-name:ud-pop-c}

.ud-ld-cloud{position:absolute;animation:ud-drift 9s ease-in-out infinite alternate}
.ud-ld-cloud--a{left:-22px;top:4px}
.ud-ld-cloud--b{right:-4px;top:112px;animation-duration:11s;animation-delay:-4s}

/* rotating status line */
.ud-ld-lines{position:relative;width:280px;max-width:100%;height:1.7em;overflow:hidden;text-align:center;
	font-family:Georgia,serif;font-style:italic;font-size:19px;letter-spacing:-.01em;line-height:1.7;color:#477551}

	

@keyframes ud-draw{
	0%{stroke-dashoffset:100;opacity:1}
	76%{stroke-dashoffset:0;opacity:1}
	90%{opacity:1}
	96%{opacity:0}
	100%{stroke-dashoffset:100;opacity:0}
}
@keyframes ud-fly{
	0%{offset-distance:0%;opacity:0}
	3%{opacity:1}
	76%{offset-distance:100%}
	84%{opacity:1}
	92%,100%{offset-distance:100%;opacity:0}
}
@keyframes ud-pop-a{
	0%,7%{transform:scale(0);opacity:0}
	12%{transform:scale(1.3) rotate(10deg);opacity:1}
	15%{transform:scale(1) rotate(0)}
	88%{transform:scale(1);opacity:1}
	94%,100%{transform:scale(0);opacity:0}
}
@keyframes ud-pop-b{
	0%,50%{transform:scale(0);opacity:0}
	55%{transform:scale(1.3) rotate(10deg);opacity:1}
	58%{transform:scale(1) rotate(0)}
	88%{transform:scale(1);opacity:1}
	94%,100%{transform:scale(0);opacity:0}
}
@keyframes ud-pop-c{
	0%,74%{transform:scale(0);opacity:0}
	79%{transform:scale(1.3) rotate(10deg);opacity:1}
	82%{transform:scale(1) rotate(0)}
	88%{transform:scale(1);opacity:1}
	94%,100%{transform:scale(0);opacity:0}
}
@keyframes ud-drift{to{transform:translateX(14px)}}
/* Rotating status line */
.ud-ld-lines {
    position: relative;
    width: 280px;
    max-width: 100%;
    height: 1.7em;
    overflow: hidden;
    text-align: center;
    font-family: Georgia, serif;
    font-style: italic;
    font-size: 19px;
    letter-spacing: -.01em;
    line-height: 1.7;
    color: #477551;
}

.ud-ld-lines span {
    position: absolute;
    inset: 0;
    opacity: 0;
    animation: ud-say 6s ease-in-out infinite both;
}

.ud-ld-lines span:nth-child(1) {
    animation-delay: 0s;
}

.ud-ld-lines span:nth-child(2) {
    animation-delay: 2s;
}

.ud-ld-lines span:nth-child(3) {
    animation-delay: 4s;
}

@keyframes ud-say {
    0% {
        opacity: 0;
        transform: translateY(65%);
    }

    4% {
        opacity: 1;
        transform: translateY(0);
    }

    28% {
        opacity: 1;
        transform: translateY(0);
    }

    32%, 100% {
        opacity: 0;
        transform: translateY(-65%);
    }
}
/* browsers without motion-path: keep the trail + text, drop plane/stops */
@supports not (offset-path: path("M0 0")){
	.ud-ld-plane,.ud-ld-stop{display:none}
}

/* reduced motion: a still frame, mid-flight */
@media (prefers-reduced-motion:reduce){
	.ud-ld *{animation:none!important}
	.ud-ld-plane{opacity:1;offset-distance:62%}
	.ud-ld-trail{stroke-dashoffset:38}
	.ud-ld-pop{transform:none;opacity:1}
	.ud-ld-lines span:first-child{opacity:1}
}
`;

function Plane() {
	return (
		<svg
			width="34"
			height="30"
			viewBox="0 0 34 30"
			fill="none"
			strokeLinejoin="round"
			strokeLinecap="round"
		>
			<path
				d="M32 15L3 3L11 15Z"
				fill="#fff"
				stroke="#193D34"
				strokeWidth="2"
			/>
			<path
				d="M32 15L11 15L7 27Z"
				fill="#C9EBD7"
				stroke="#193D34"
				strokeWidth="2"
			/>
		</svg>
	);
}

function Star({ fill, size, className = "" }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="-9 -9 18 18"
			className={className}
			fill="none"
			strokeLinejoin="round"
		>
			<path
				d="M0 -7C1 -2 2 -1 7 0C2 1 1 2 0 7C-1 2 -2 1 -7 0C-2 -1 -1 -2 0 -7Z"
				fill={fill}
				stroke="#193D34"
				strokeWidth="1.4"
			/>
		</svg>
	);
}

function Cloud({ className }) {
	return (
		<svg
			width="54"
			height="30"
			viewBox="0 0 54 30"
			className={className}
			fill="#fff"
			stroke="#193D34"
			strokeOpacity=".35"
			strokeWidth="1.6"
			strokeLinejoin="round"
		>
			<path d="M10 27C2 27 2 15 12 15C14 5 30 5 33 15C43 13 48 27 36 27Z" />
		</svg>
	);
}

export default function FullScreenLoader() {
	const content = (
		<div
			className="ud-ld fixed inset-0 z-[9999] flex select-none flex-col items-center justify-center gap-8 bg-[#FAF9F6] px-4"
			style={{
				backgroundImage:
					"radial-gradient(rgba(25,61,52,.09) 1px, transparent 1px)",
				backgroundSize: "22px 22px",
			}}
			role="status"
			aria-label="Loading page"
		>
			<style>{CSS}</style>

			<Logo
				size="lg"
				to={false}
				tagline="Find your way forward"
				animated={false}
			/>

			<div
				className="ud-ld-scene"
				aria-hidden="true"
				style={{ "--ud-path": `path("${D}")` }}
			>
				<Cloud className="ud-ld-cloud ud-ld-cloud--a" />
				<Cloud className="ud-ld-cloud ud-ld-cloud--b" />

				<svg
					className="ud-ld-route"
					width="300"
					height="170"
					viewBox="0 0 300 170"
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path
						d={D}
						stroke="#193D34"
						strokeOpacity=".28"
						strokeWidth="2"
						strokeDasharray="1 8"
					/>
					<path
						className="ud-ld-trail"
						d={D}
						pathLength="100"
						stroke="#2F8A63"
						strokeWidth="3.5"
					/>
				</svg>

				{STOPS.map((s) => (
					<span
						key={s.name}
						className="ud-ld-stop"
						style={{ offsetDistance: `${s.at}%` }}
					>
						<Star
							fill={s.fill}
							size={s.size}
							className={`ud-ld-pop ud-ld-pop--${s.name}`}
						/>
					</span>
				))}

				<span className="ud-ld-plane">
					<Plane />
				</span>
			</div>

			<div className="ud-ld-lines" aria-hidden="true">
				<span>Finding opportunities</span>
				<span>Checking deadlines</span>
				<span>Packing your papers</span>
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(content, document.body);
	}

	return content;
}
