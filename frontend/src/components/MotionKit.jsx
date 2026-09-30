import { useEffect, useRef, useState } from "react";

/* Put <MotionStyles /> once next to <PageStyles /> on each page. */
export function MotionStyles() {
	return (
		<style>{`
@keyframes mk-pop{0%{transform:scale(.6)}60%{transform:scale(1.25)}100%{transform:scale(1)}}
@keyframes mk-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes mk-scan{0%{top:0}100%{top:calc(100% - 3px)}}
@keyframes mk-confetti{0%{transform:translate(0,0) rotate(0);opacity:1}
 100%{transform:translate(var(--dx),var(--dy)) rotate(var(--rot));opacity:0}}
@keyframes mk-ripple{to{transform:scale(3);opacity:0}}
@keyframes mk-shake{0%,100%{transform:none}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.mk-pop{animation:mk-pop .3s cubic-bezier(.34,1.56,.64,1)}
.mk-rise{animation:mk-rise .5s cubic-bezier(.16,1,.3,1) both}
.mk-hidden{opacity:0;transform:translateY(14px)}
.mk-shown{opacity:1;transform:none;transition:opacity .55s ease,transform .55s cubic-bezier(.16,1,.3,1)}
.mk-lift{transition:transform .2s cubic-bezier(.16,1,.3,1),box-shadow .2s}
.mk-lift:hover{transform:translate(-2px,-2px);box-shadow:4px 4px 0 0 #022c22}
.mk-lift:active{transform:translate(1px,1px);box-shadow:0 0 0 0 #022c22}
.mk-scanline{position:absolute;left:0;right:0;height:3px;background:#facc15;
 box-shadow:0 0 14px 3px rgba(250,204,21,.7);animation:mk-scan 1.4s ease-in-out infinite alternate}
.mk-shake{animation:mk-shake .3s}
@media (prefers-reduced-motion:reduce){
 .mk-pop,.mk-rise,.mk-scanline,.mk-shake{animation:none!important}
 .mk-hidden{opacity:1;transform:none}.mk-lift:hover{transform:none}}
`}</style>
	);
}

/* Fades a block in when it scrolls into view. Use `delay` (ms) to stagger a list. */
export function Reveal({ children, delay = 0, className = "" }) {
	const ref = useRef(null);
	const [seen, setSeen] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver(
			([e]) => e.isIntersecting && (setSeen(true), io.disconnect()),
			{ threshold: 0.15 },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);
	return (
		<div
			ref={ref}
			style={{ transitionDelay: `${delay}ms` }}
			className={`${seen ? "mk-shown" : "mk-hidden"} ${className}`}
		>
			{children}
		</div>
	);
}

/* Number that counts up to `value` whenever it changes. */
export function CountUp({ value, duration = 900, suffix = "" }) {
	const [n, setN] = useState(0);
	const from = useRef(0);
	useEffect(() => {
		const start = performance.now();
		const a = from.current;
		let raf;
		const tick = (t) => {
			const p = Math.min(1, (t - start) / duration);
			const eased = 1 - Math.pow(1 - p, 3);
			setN(Math.round(a + (value - a) * eased));
			if (p < 1) raf = requestAnimationFrame(tick);
			else from.current = value;
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [value, duration]);
	return (
		<>
			{n}
			{suffix}
		</>
	);
}

/* Confetti: const [burst, Confetti] = useConfetti(); onClick={(e)=>burst(e)} ... <Confetti /> */
export function useConfetti() {
	const [bits, setBits] = useState([]);
	const burst = (e) => {
		const x = e?.clientX ?? window.innerWidth / 2;
		const y = e?.clientY ?? window.innerHeight / 3;
		const colors = ["#facc15", "#065f46", "#34d399", "#fef08a", "#022c22"];
		const id = Date.now();
		const next = Array.from({ length: 26 }, (_, i) => ({
			k: `${id}-${i}`,
			x,
			y,
			dx: (Math.random() - 0.5) * 320,
			dy: -80 - Math.random() * 220,
			rot: (Math.random() - 0.5) * 720,
			c: colors[i % colors.length],
			w: 6 + Math.random() * 6,
		}));
		setBits((b) => [...b, ...next]);
		setTimeout(
			() => setBits((b) => b.filter((i) => !i.k.startsWith(id))),
			1300,
		);
	};
	const Confetti = () => (
		<div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
			{bits.map((b) => (
				<span
					key={b.k}
					style={{
						position: "absolute",
						left: b.x,
						top: b.y,
						width: b.w,
						height: b.w * 1.6,
						background: b.c,
						"--dx": `${b.dx}px`,
						"--dy": `${b.dy}px`,
						"--rot": `${b.rot}deg`,
						animation: "mk-confetti 1.1s cubic-bezier(.2,.8,.3,1) forwards",
					}}
				/>
			))}
		</div>
	);
	return [burst, Confetti];
}

/* Circular readiness ring, e.g. <ProgressRing percent={62} /> */
export function ProgressRing({ percent, size = 84 }) {
	const r = size / 2 - 7;
	const c = 2 * Math.PI * r;
	return (
		<div className="relative shrink-0" style={{ width: size, height: size }}>
			<svg width={size} height={size} className="-rotate-90">
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke="#022c2226"
					strokeWidth="7"
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke={percent === 100 ? "#065f46" : "#facc15"}
					strokeWidth="7"
					strokeLinecap="round"
					strokeDasharray={c}
					strokeDashoffset={c - (c * percent) / 100}
					style={{
						transition:
							"stroke-dashoffset .7s cubic-bezier(.16,1,.3,1), stroke .3s",
					}}
				/>
			</svg>
			<span className="ud-display absolute inset-0 flex items-center justify-center text-lg font-extrabold">
				<CountUp value={percent} suffix="%" duration={600} />
			</span>
		</div>
	);
}

/* Shown while the eligibility check runs, so waiting feels like real work happening. */
const STEPS = [
	"Reading your profile",
	"Matching income and CGPA limits",
	"Checking state and category quotas",
	"Tying each result to its circular",
];
export function VerifyingCard({ active, steps = STEPS }) {
	const [i, setI] = useState(0);
	useEffect(() => {
		if (!active) return setI(0);
		const t = setInterval(
			() => setI((v) => Math.min(v + 1, steps.length - 1)),
			700,
		);
		return () => clearInterval(t);
	}, [active, steps.length]);
	if (!active) return null;
	return (
		<div
			className="mk-rise relative mt-6 overflow-hidden rounded-xl border-[1.5px] border-emerald-950 bg-emerald-50 p-5"
			role="status"
		>
			<span className="mk-scanline" />
			<ul className="space-y-2 text-sm font-semibold">
				{steps.map((s, n) => (
					<li
						key={s}
						className={`flex items-center gap-2 transition-opacity ${n > i ? "opacity-30" : ""}`}
					>
						<span
							className={`h-2.5 w-2.5 rounded-full border-[1.5px] border-emerald-950 ${n < i ? "bg-emerald-900" : n === i ? "bg-yellow-300" : ""}`}
						/>
						{s}
					</li>
				))}
			</ul>
		</div>
	);
}
