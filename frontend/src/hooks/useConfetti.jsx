import { useState } from "react";

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

