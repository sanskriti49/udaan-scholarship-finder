import { useEffect, useMemo, useState } from "react";


const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&display=swap");

.ud-display {
  font-family: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;
  letter-spacing: -0.025em;
}

.ud-root :is(a, button, summary):focus-visible {
  outline: 3px solid #4338ca;
  outline-offset: 2px;
  border-radius: 8px;
}

.ud-stamp {
  display: inline-block;
  color: #4338ca;
  border: 3px double #4338ca;
  border-radius: 8px;
  padding: 0.2rem 0.65rem;
  font-family: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  line-height: 1.1;
  transform: rotate(var(--tilt, -8deg));
  mix-blend-mode: multiply;
  opacity: 0.92;
  user-select: none;
  pointer-events: none;
  white-space: nowrap;
}
.ud-slam {
  animation: ud-slam 0.4s cubic-bezier(0.2, 0.9, 0.25, 1.1) var(--delay, 0s) both;
}
@keyframes ud-slam {
  0%   { transform: rotate(calc(var(--tilt, -8deg) - 14deg)) scale(2.4); opacity: 0; }
  60%  { transform: rotate(var(--tilt, -8deg)) scale(0.94); opacity: 0.95; }
  100% { transform: rotate(var(--tilt, -8deg)) scale(1); opacity: 0.92; }
}

.ud-fade-in { animation: ud-fade 0.3s ease both; }
@keyframes ud-fade {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
}
.ud-pop-in { animation: ud-pop 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.25) both; }
@keyframes ud-pop {
  0%   { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.ud-live { animation: ud-live 1.8s ease-out infinite; }
@keyframes ud-live {
  0%   { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.55); }
  100% { box-shadow: 0 0 0 9px rgba(16, 185, 129, 0); }
}
.ud-spin {
  display: inline-block; width: 16px; height: 16px; border-radius: 50%;
  border: 2.5px solid currentColor; border-right-color: transparent;
  animation: ud-rot 0.7s linear infinite;
}
@keyframes ud-rot { to { transform: rotate(360deg); } }

.ud-fold {
  position: absolute; top: -1.5px; right: -1.5px; width: 26px; height: 26px;
  background: linear-gradient(225deg, #E9F0EA calc(50% - .75px), #022c22 calc(50% - .75px), #022c22 calc(50% + .75px), #d3e3d8 calc(50% + .75px));
  border-left: 1.5px solid #022c22; border-bottom: 1.5px solid #022c22;
}

.ud-scrap {
  position: absolute; left: 50%; top: 35%; width: 9px; height: 13px; border-radius: 2px;
  animation: ud-scrap 1.7s cubic-bezier(0.15, 0.7, 0.3, 1) var(--d, 0s) forwards;
}
@keyframes ud-scrap {
  0%   { transform: translate3d(0, 0, 0) rotate(0); opacity: 1; }
  100% { transform: translate3d(var(--dx), var(--dy), 0) rotate(var(--rot)); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .ud-slam, .ud-fade-in, .ud-pop-in, .ud-live, .ud-scrap { animation: none !important; }
  .ud-scrap { display: none; }
}
`;

export function PageStyles() {
	return <style>{CSS}</style>;
}

export function Stamp({
	children,
	className = "",
	slam = false,
	tilt = -8,
	delay = 0,
}) {
	return (
		<span
			className={`ud-stamp ${slam ? "ud-slam" : ""} ${className}`}
			style={{ "--tilt": `${tilt}deg`, "--delay": `${delay}s` }}
		>
			{children}
		</span>
	);
}

const SCRAP_COLORS = [
	"#065f46",
	"#fde047",
	"#4338ca",
	"#34d399",
	"#ffffff",
	"#f97316",
];

export function Confetti({ burst }) {
	const [show, setShow] = useState(false);

	useEffect(() => {
		if (!burst) return;
		setShow(true);
		const t = setTimeout(() => setShow(false), 2400);
		return () => clearTimeout(t);
	}, [burst]);

	const scraps = useMemo(
		() =>
			Array.from({ length: 70 }, (_, i) => ({
				id: i,
				dx: (Math.random() - 0.5) * 1000,
				dy: 120 + Math.random() * 620,
				rot: (Math.random() - 0.5) * 900,
				d: Math.random() * 0.15,
				color: SCRAP_COLORS[i % SCRAP_COLORS.length],
			})),
		[burst],
	);

	if (!show) return null;
	return (
		<div
			aria-hidden
			className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
		>
			{scraps.map((s) => (
				<span
					key={s.id}
					className="ud-scrap"
					style={{
						background: s.color,
						"--dx": `${s.dx}px`,
						"--dy": `${s.dy}px`,
						"--rot": `${s.rot}deg`,
						"--d": `${s.d}s`,
					}}
				/>
			))}
		</div>
	);
}

export function useCopy() {
	const [copied, setCopied] = useState(null);
	const copy = async (key, value) => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(key);
			setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
			return true;
		} catch {
			return false;
		}
	};
	return [copied, copy];
}
