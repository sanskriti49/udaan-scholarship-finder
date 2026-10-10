import React from "react";

/**
 * Udaan illustration family, v2: chibi proportions + die-cut sticker look.
 * Drop-in replacement: all exports and public props are unchanged.
 *
 * What makes it cute / Gen Z:
 *  - big heads, tiny bodies, dot eyes with double sparkle highlights
 *  - rosy cheeks, tiny "w" mouths, ^_^ joy eyes
 *  - every character is a sticker: white die-cut border + soft drop shadow
 *    (one SVG filter, no CSS, no dependencies)
 *  - candy accents (hot pink, lilac, butter, sky) on top of the Udaan greens
 *
 * Decorative SVGs are hidden from screen readers.
 */

const C = {
	ink: "#193D34",
	hair: "#34463B",
	hairLight: "#526858",
	skin: "#FBDDBF",
	skinShade: "#EDB791",
	blush: "#FF9AA8",
	cream: "#FFFBF1",
	mint: "#C9EBD7",
	green: "#7FD0A4",
	deepGreen: "#2F8A63",
	yellow: "#FFD966",
	lightYellow: "#FFF0B8",
	coral: "#FF8F78",
	lavender: "#D9D6FF",
	lilac: "#B9A8FF",
	blue: "#9CD6F2",
	pink: "#FFD0DC",
	hot: "#FF7FA8",
	mouth: "#8B3A4A",
};

const svgBase = {
	fill: "none",
	xmlns: "http://www.w3.org/2000/svg",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": true,
	focusable: "false",
};

const useUid = typeof React.useId === "function" ? React.useId : () => "static";

/**
 * Wraps artwork in a die-cut sticker filter: white border + soft shadow.
 * `decor` renders behind the sticker (sparkles, motion lines).
 */
function Sticker({
	width,
	height,
	viewBox,
	className = "",
	outline = 3.4,
	decor,
	children,
}) {
	const id = `udaan-sticker-${useUid().replace(/[^a-zA-Z0-9_-]/g, "")}`;
	return (
		<svg
			{...svgBase}
			width={width}
			height={height}
			viewBox={viewBox}
			className={`overflow-visible select-none ${className}`}
		>
			<defs>
				<filter
					id={id}
					x="-20%"
					y="-20%"
					width="140%"
					height="140%"
					colorInterpolationFilters="sRGB"
				>
					<feMorphology
						in="SourceAlpha"
						operator="dilate"
						radius={outline}
						result="grow"
					/>
					<feGaussianBlur in="grow" stdDeviation="1.8" />
					<feOffset dy="2.4" result="soft" />
					<feFlood floodColor="#193D34" floodOpacity=".2" />
					<feComposite in2="soft" operator="in" result="shadow" />
					<feFlood floodColor="#FFFFFF" />
					<feComposite in2="grow" operator="in" result="border" />
					<feMerge>
						<feMergeNode in="shadow" />
						<feMergeNode in="border" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>
			{decor}
			<g filter={`url(#${id})`}>{children}</g>
		</svg>
	);
}

/* ---------- tiny face parts shared by every character ---------- */

const Eye = ({ cx, cy, r = 4.5 }) => (
	<g>
		<ellipse cx={cx} cy={cy} rx={r} ry={r * 1.18} fill={C.ink} />
		<circle cx={cx - r * 0.38} cy={cy - r * 0.5} r={r * 0.42} fill="#fff" />
		<circle cx={cx + r * 0.42} cy={cy + r * 0.45} r={r * 0.2} fill="#fff" />
	</g>
);

const Joy = ({ cx, cy, w = 5.5 }) => (
	<path
		d={`M${cx - w} ${cy + 2}Q${cx} ${cy - 6} ${cx + w} ${cy + 2}`}
		stroke={C.ink}
		strokeWidth="2.8"
	/>
);

const Blush = ({ cx, cy, rx = 5.5, ry = 3.2 }) => (
	<ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={C.blush} opacity=".8" />
);

const Sparkle4 = ({ x, y, s = 1, fill = C.yellow }) => (
	<path
		transform={`translate(${x} ${y}) scale(${s})`}
		d="M0 -7C1 -2 2 -1 7 0C2 1 1 2 0 7C-1 2 -2 1 -7 0C-2 -1 -1 -2 0 -7Z"
		fill={fill}
		stroke={C.ink}
		strokeWidth="1.4"
	/>
);

/* ------------------------------------------------------------------ */

/**
 * "No way, me?!" — huge sparkly eyes, tiny "o" mouth, hands squishing
 * the cheeks, cosy hoodie with pink drawstring beads.
 */
export function ShockedStudent({
	size = 72,
	className = "",
	showBubble = true,
	bubbleText = "no way… me?!",
}) {
	return (
		<span
			className={`inline-flex shrink-0 items-center gap-1 align-middle select-none ${className}`}
		>
			<Sticker
				width={size}
				height={size}
				viewBox="0 0 120 120"
				className="shrink-0"
				decor={
					<g stroke={C.coral} strokeWidth="3">
						<path d="M13 40L7 36M11 28L11 20M107 24L113 19" />
						<Sparkle4 x="104" y="50" s=".7" fill={C.lilac} />
					</g>
				}
			>
				{/* hoodie */}
				<path
					d="M30 116C30 96 42 85 60 85C78 85 90 96 90 116Z"
					fill={C.green}
					stroke={C.ink}
					strokeWidth="2.4"
				/>
				<path
					d="M46 87C50 98 70 98 74 87"
					fill={C.cream}
					stroke={C.ink}
					strokeWidth="2.2"
				/>
				<path d="M55 96L54 107M65 96L66 107" stroke={C.ink} strokeWidth="2" />
				<circle
					cx="54"
					cy="108"
					r="2.6"
					fill={C.hot}
					stroke={C.ink}
					strokeWidth="1.4"
				/>
				<circle
					cx="66"
					cy="108"
					r="2.6"
					fill={C.hot}
					stroke={C.ink}
					strokeWidth="1.4"
				/>
				{/* sleeves up to the cheeks */}
				<path d="M40 100C32 95 28 84 28 72" stroke={C.ink} strokeWidth="14" />
				<path d="M40 100C32 95 28 84 28 72" stroke={C.green} strokeWidth="10" />
				<path d="M80 100C88 95 92 84 92 72" stroke={C.ink} strokeWidth="14" />
				<path d="M80 100C88 95 92 84 92 72" stroke={C.green} strokeWidth="10" />
				{/* head: bob + ahoge */}
				<ellipse
					cx="60"
					cy="52"
					rx="37"
					ry="33"
					fill={C.hair}
					stroke={C.ink}
					strokeWidth="2.4"
				/>
				<path
					d="M57 22C53 11 61 5 69 9C64 12 64 17 65 22Z"
					fill={C.hair}
					stroke={C.ink}
					strokeWidth="2.2"
				/>
				<ellipse
					cx="60"
					cy="58"
					rx="33"
					ry="28"
					fill={C.skin}
					stroke={C.ink}
					strokeWidth="2.4"
				/>
				<path
					d="M27 52C26 30 40 20 60 20C80 20 94 30 93 52C88 48 84 42 82 36C74 44 66 44 60 36C54 44 46 44 38 36C36 42 32 48 27 52Z"
					fill={C.hair}
					stroke={C.ink}
					strokeWidth="2.2"
				/>
				<path
					d="M44 27C51 23 58 23 64 25"
					stroke={C.hairLight}
					strokeWidth="2.4"
				/>
				{/* face */}
				<path
					d="M40 51Q46 45 52 50M68 50Q74 45 80 51"
					stroke={C.ink}
					strokeWidth="2.6"
				/>
				<Eye cx="46" cy="60" r="6.5" />
				<Eye cx="74" cy="60" r="6.5" />
				<Blush cx="35" cy="70" />
				<Blush cx="85" cy="70" />
				<ellipse
					cx="60"
					cy="73"
					rx="3.6"
					ry="4.6"
					fill={C.mouth}
					stroke={C.ink}
					strokeWidth="1.8"
				/>
				{/* squishy hands */}
				<ellipse
					cx="29"
					cy="71"
					rx="7.5"
					ry="8.5"
					fill={C.skin}
					stroke={C.ink}
					strokeWidth="2.2"
				/>
				<ellipse
					cx="91"
					cy="71"
					rx="7.5"
					ry="8.5"
					fill={C.skin}
					stroke={C.ink}
					strokeWidth="2.2"
				/>
				{/* sweat drop */}
				<path
					d="M96 30C91 37 91 41 96 42C101 41 101 37 96 30Z"
					fill={C.blue}
					stroke={C.ink}
					strokeWidth="1.6"
				/>
			</Sticker>

			{showBubble && (
				<span className="relative -ml-1 -mt-8 inline-block max-w-[11rem] -rotate-3 rounded-2xl border-2 border-[#193D34] bg-white px-3 py-1.5 font-sans text-[11px] font-extrabold leading-tight tracking-tight text-[#193D34] shadow-[2px_2px_0_#FF7FA8] sm:text-xs">
					<span
						aria-hidden="true"
						className="absolute -left-[6px] bottom-2.5 h-2.5 w-2.5 rotate-45 border-b-2 border-l-2 border-[#193D34] bg-white"
					/>
					{bubbleText}
				</span>
			)}
		</span>
	);
}

/** Mid-jump, ^_^ eyes, twin buns, holding up a sealed letter. */
export function CheeringStudent({ size = 70, className = "" }) {
	return (
		<Sticker
			width={size}
			height={size}
			viewBox="0 0 120 120"
			className={className}
			decor={
				<g>
					<Sparkle4 x="106" y="14" s="1" />
					<Sparkle4 x="10" y="78" s=".7" fill={C.hot} />
					<circle cx="108" cy="42" r="2.6" fill={C.hot} />
					<rect
						x="4"
						y="96"
						width="5"
						height="5"
						rx="1.2"
						fill={C.blue}
						transform="rotate(25 6 98)"
					/>
					<path
						d="M112 70L118 74M110 82L116 88"
						stroke={C.coral}
						strokeWidth="2.6"
					/>
				</g>
			}
		>
			{/* legs + sneakers */}
			<path d="M53 98L44 108M68 98L78 106" stroke={C.ink} strokeWidth="8" />
			<path
				d="M53 98L44 108M68 98L78 106"
				stroke={C.lavender}
				strokeWidth="4.5"
			/>
			<ellipse
				cx="42"
				cy="110"
				rx="8.5"
				ry="5"
				fill={C.hot}
				stroke={C.ink}
				strokeWidth="2"
				transform="rotate(-20 42 110)"
			/>
			<ellipse
				cx="80"
				cy="108"
				rx="8.5"
				ry="5"
				fill={C.hot}
				stroke={C.ink}
				strokeWidth="2"
				transform="rotate(20 80 108)"
			/>
			{/* tee */}
			<path
				d="M45 78C45 74 50 73 60 73C70 73 75 74 75 78L78 99C70 103 50 103 42 99Z"
				fill={C.yellow}
				stroke={C.ink}
				strokeWidth="2.4"
			/>
			<path
				d="M60 83L62 88L67 88.5L63 92L64.5 97L60 94L55.5 97L57 92L53 88.5L58 88Z"
				fill="#fff"
				stroke={C.ink}
				strokeWidth="1.3"
			/>
			{/* arms up */}
			<path d="M47 82C38 76 31 66 25 54" stroke={C.ink} strokeWidth="12" />
			<path d="M47 82C38 76 31 66 25 54" stroke={C.yellow} strokeWidth="8" />
			<path d="M73 82C82 76 89 66 95 54" stroke={C.ink} strokeWidth="12" />
			<path d="M73 82C82 76 89 66 95 54" stroke={C.yellow} strokeWidth="8" />
			<circle
				cx="24"
				cy="52"
				r="6"
				fill={C.skin}
				stroke={C.ink}
				strokeWidth="2"
			/>
			<circle
				cx="96"
				cy="52"
				r="6"
				fill={C.skin}
				stroke={C.ink}
				strokeWidth="2"
			/>
			{/* the letter */}
			<g transform="rotate(-14 17 37)">
				<rect
					x="3"
					y="24"
					width="30"
					height="22"
					rx="3.5"
					fill={C.cream}
					stroke={C.ink}
					strokeWidth="2"
				/>
				<path d="M3.5 26.5L18 38L32.5 26.5" stroke={C.ink} strokeWidth="2" />
				<path
					d="M18 46C13 42 12 38 15 37C16.8 36.5 18 37.5 18 38.5C18 37.5 19.2 36.5 21 37C24 38 23 42 18 46Z"
					fill={C.hot}
					stroke={C.ink}
					strokeWidth="1.2"
				/>
			</g>
			{/* twin buns */}
			<circle
				cx="30"
				cy="22"
				r="10.5"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.3"
			/>
			<circle
				cx="90"
				cy="22"
				r="10.5"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.3"
			/>
			<ellipse
				cx="60"
				cy="46"
				rx="36"
				ry="31"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.4"
			/>
			<ellipse
				cx="60"
				cy="50"
				rx="32"
				ry="27"
				fill={C.skin}
				stroke={C.ink}
				strokeWidth="2.4"
			/>
			<path
				d="M28 48C27 28 41 19 60 19C79 19 93 28 92 48C87 45 83 40 81 34C74 41 66 41 60 34C54 41 46 41 39 34C37 40 33 45 28 48Z"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.2"
			/>
			<circle
				cx="30"
				cy="31"
				r="3.2"
				fill={C.hot}
				stroke={C.ink}
				strokeWidth="1.4"
			/>
			<circle
				cx="90"
				cy="31"
				r="3.2"
				fill={C.hot}
				stroke={C.ink}
				strokeWidth="1.4"
			/>
			<Joy cx="46" cy="54" w="6" />
			<Joy cx="74" cy="54" w="6" />
			<Blush cx="36" cy="62" />
			<Blush cx="84" cy="62" />
			<path
				d="M51 61C52 72 68 72 69 61Z"
				fill={C.mouth}
				stroke={C.ink}
				strokeWidth="2"
			/>
			<ellipse cx="60" cy="68.5" rx="5" ry="2.6" fill={C.hot} />
		</Sticker>
	);
}

/** Pigtail kid with big sparkly eyes hugging a glossy rupee coin. */
export function CoinHugger({ size = 56, className = "" }) {
	return (
		<Sticker
			width={size}
			height={size}
			viewBox="0 0 100 100"
			className={className}
			outline={3}
			decor={
				<g>
					<Sparkle4 x="94" y="12" s=".9" fill={C.lilac} />
					<path
						d="M96 60L100 64M94 74L99 78"
						stroke={C.coral}
						strokeWidth="2.4"
					/>
				</g>
			}
		>
			{/* coin */}
			<circle
				cx="63"
				cy="46"
				r="34"
				fill={C.yellow}
				stroke={C.ink}
				strokeWidth="2.6"
			/>
			<circle
				cx="63"
				cy="46"
				r="27"
				fill={C.lightYellow}
				stroke="#D9A93B"
				strokeWidth="1.8"
				strokeDasharray="1 4.5"
			/>
			<path
				d="M47 28C51 24 56 22.5 62 22.5"
				stroke="#fff"
				strokeWidth="3.2"
				opacity=".85"
			/>
			<text
				x="65"
				y="56"
				textAnchor="middle"
				fontSize="20"
				fontWeight="800"
				fontFamily="Arial, sans-serif"
				fill={C.ink}
			>
				₹
			</text>
			{/* floating heart */}
			<path
				d="M24 14C20 9 13 12 16 18C18 21 24 25 24 25C24 25 30 21 32 18C35 12 28 9 24 14Z"
				fill={C.hot}
				stroke={C.ink}
				strokeWidth="1.8"
			/>
			{/* hoodie body */}
			<path
				d="M9 97C9 79 17 70 30 70C43 70 50 79 50 97Z"
				fill={C.mint}
				stroke={C.ink}
				strokeWidth="2.4"
			/>
			<path d="M23 71C26 78 34 78 37 71" stroke={C.ink} strokeWidth="2" />
			{/* pigtail puffs + hair */}
			<circle
				cx="8"
				cy="50"
				r="7.5"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.1"
			/>
			<circle
				cx="53"
				cy="39"
				r="7.5"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.1"
			/>
			<ellipse
				cx="30"
				cy="46"
				rx="24"
				ry="22"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.3"
			/>
			<ellipse
				cx="30"
				cy="50"
				rx="20"
				ry="18"
				fill={C.skin}
				stroke={C.ink}
				strokeWidth="2.3"
			/>
			<path
				d="M10 46C9 30 18 24 30 24C42 24 51 30 50 46C46 43 43 39 42 35C37 41 31 41 29 35C26 41 17 42 10 46Z"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.1"
			/>
			<Eye cx="22" cy="49" r="4.2" />
			<Eye cx="38" cy="49" r="4.2" />
			<Blush cx="15" cy="58" rx="4" ry="2.4" />
			<Blush cx="45" cy="58" rx="4" ry="2.4" />
			<path d="M27 58Q30.5 62.5 34 58" stroke={C.ink} strokeWidth="2.2" />
			{/* hugging arm */}
			<path d="M38 84C47 83 54 78 59 70" stroke={C.ink} strokeWidth="10" />
			<path d="M38 84C47 83 54 78 59 70" stroke={C.mint} strokeWidth="6" />
			<circle
				cx="60"
				cy="68"
				r="4.8"
				fill={C.skin}
				stroke={C.ink}
				strokeWidth="1.8"
			/>
		</Sticker>
	);
}

/** Detective-cap kid with one enormous magnified eye. Very "huh??". */
export function ConfusedDetective({ size = 90, className = "" }) {
	return (
		<Sticker
			width={size}
			height={size}
			viewBox="0 0 120 120"
			className={className}
			decor={
				<g>
					<Sparkle4 x="108" y="22" s=".8" fill={C.lilac} />
					<path d="M12 70L6 74M10 84L5 90" stroke={C.coral} strokeWidth="2.6" />
				</g>
			}
		>
			{/* coat */}
			<path
				d="M30 116C30 96 41 86 58 86C75 86 86 96 86 116Z"
				fill={C.yellow}
				stroke={C.ink}
				strokeWidth="2.4"
			/>
			<path
				d="M49 88L58 103L67 88"
				fill={C.cream}
				stroke={C.ink}
				strokeWidth="2.2"
			/>
			<circle cx="58" cy="108" r="2.2" fill={C.ink} />
			{/* head, slightly tilted */}
			<g transform="rotate(-6 58 56)">
				<ellipse
					cx="58"
					cy="54"
					rx="36"
					ry="32"
					fill={C.hair}
					stroke={C.ink}
					strokeWidth="2.4"
				/>
				<ellipse
					cx="58"
					cy="60"
					rx="32"
					ry="27"
					fill={C.skin}
					stroke={C.ink}
					strokeWidth="2.4"
				/>
				{/* flat cap */}
				<path
					d="M25 47C24 25 40 14 58 14C76 14 92 25 91 47Z"
					fill={C.lilac}
					stroke={C.ink}
					strokeWidth="2.3"
				/>
				<path
					d="M20 48C38 40 78 40 96 48C92 56 24 56 20 48Z"
					fill="#9D8CF0"
					stroke={C.ink}
					strokeWidth="2.3"
				/>
				<circle
					cx="58"
					cy="13"
					r="3.4"
					fill={C.hot}
					stroke={C.ink}
					strokeWidth="1.6"
				/>
				{/* face */}
				<Eye cx="43" cy="64" r="4.6" />
				<Blush cx="33" cy="72" />
				<path d="M46 76Q50 72 54 76T62 76" stroke={C.ink} strokeWidth="2.3" />
				{/* magnifier over the other eye */}
				<circle
					cx="75"
					cy="63"
					r="17.5"
					fill={C.blue}
					fillOpacity=".5"
					stroke={C.ink}
					strokeWidth="3.2"
				/>
				<ellipse
					cx="75"
					cy="63"
					rx="9.5"
					ry="10.5"
					fill="#fff"
					stroke={C.ink}
					strokeWidth="1.6"
				/>
				<Eye cx="76" cy="64" r="5.8" />
				<path d="M63 54C66 49 71 47.5 76 48.5" stroke="#fff" strokeWidth="3" />
			</g>
			{/* handle + arm + hand */}
			<path d="M87 75L105 94" stroke={C.ink} strokeWidth="9" />
			<path d="M87 75L105 94" stroke={C.hot} strokeWidth="5" />
			<path d="M76 104C86 102 92 96 95 87" stroke={C.ink} strokeWidth="12" />
			<path d="M76 104C86 102 92 96 95 87" stroke={C.yellow} strokeWidth="8" />
			<circle
				cx="96"
				cy="84"
				r="5.8"
				fill={C.skin}
				stroke={C.ink}
				strokeWidth="2"
			/>
			{/* thought mark */}
			<circle
				cx="20"
				cy="30"
				r="11"
				fill={C.pink}
				stroke={C.ink}
				strokeWidth="2.2"
			/>
			<text
				x="20"
				y="36"
				textAnchor="middle"
				fontSize="16"
				fontWeight="800"
				fontFamily="Arial, sans-serif"
				fill={C.ink}
			>
				?
			</text>
		</Sticker>
	);
}

/** Proud kid presenting a pinboard of saved scholarships. */
export function BoardCurator({ size = 110, className = "" }) {
	return (
		<Sticker
			width={size}
			height={size}
			viewBox="0 0 120 120"
			className={className}
			decor={
				<g>
					<Sparkle4 x="112" y="8" s=".8" />
					<Sparkle4 x="8" y="24" s=".6" fill={C.hot} />
				</g>
			}
		>
			{/* board */}
			<rect
				x="42"
				y="8"
				width="70"
				height="84"
				rx="12"
				fill={C.mint}
				stroke={C.ink}
				strokeWidth="2.5"
			/>
			<g transform="rotate(-6 63 32)">
				<rect
					x="50"
					y="18"
					width="26"
					height="30"
					rx="3.5"
					fill={C.yellow}
					stroke={C.ink}
					strokeWidth="2"
				/>
				<text
					x="63"
					y="39"
					textAnchor="middle"
					fontSize="17"
					fontWeight="800"
					fontFamily="Arial, sans-serif"
					fill={C.ink}
				>
					₹
				</text>
				<circle
					cx="63"
					cy="19"
					r="3.2"
					fill={C.hot}
					stroke={C.ink}
					strokeWidth="1.4"
				/>
			</g>
			<g transform="rotate(5 94 36)">
				<rect
					x="82"
					y="22"
					width="24"
					height="28"
					rx="3.5"
					fill={C.pink}
					stroke={C.ink}
					strokeWidth="2"
				/>
				<path
					d="M94 29L96.5 34L102 35L98 39L99 44.5L94 41.5L89 44.5L90 39L86 35L91.5 34Z"
					fill={C.yellow}
					stroke={C.ink}
					strokeWidth="1.4"
				/>
				<circle
					cx="94"
					cy="23"
					r="3.2"
					fill={C.lilac}
					stroke={C.ink}
					strokeWidth="1.4"
				/>
			</g>
			<g transform="rotate(3 76 66)">
				<rect
					x="56"
					y="55"
					width="40"
					height="26"
					rx="3.5"
					fill={C.cream}
					stroke={C.ink}
					strokeWidth="2"
				/>
				<circle
					cx="67"
					cy="68"
					r="6"
					fill={C.green}
					stroke={C.ink}
					strokeWidth="1.6"
				/>
				<path d="M64 68L66.5 70.5L70.5 65.5" stroke={C.ink} strokeWidth="2" />
				<path
					d="M77 64H90M77 70H86M77 75H82"
					stroke={C.deepGreen}
					strokeWidth="2"
					opacity=".55"
				/>
				<circle
					cx="76"
					cy="56"
					r="3.2"
					fill={C.blue}
					stroke={C.ink}
					strokeWidth="1.4"
				/>
			</g>
			{/* sweater */}
			<path
				d="M9 116C9 98 17 88 34 88C51 88 59 98 59 116Z"
				fill={C.lilac}
				stroke={C.ink}
				strokeWidth="2.4"
			/>
			<path d="M26 89C29 96 39 96 42 89" stroke={C.ink} strokeWidth="2" />
			{/* pointing arm */}
			<path d="M52 99C62 95 67 85 71 75" stroke={C.ink} strokeWidth="11" />
			<path d="M52 99C62 95 67 85 71 75" stroke={C.lilac} strokeWidth="7" />
			<circle
				cx="72"
				cy="72"
				r="5.8"
				fill={C.skin}
				stroke={C.ink}
				strokeWidth="2"
			/>
			{/* head: twin buns */}
			<circle
				cx="12"
				cy="48"
				r="9"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.2"
			/>
			<circle
				cx="56"
				cy="48"
				r="9"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.2"
			/>
			<ellipse
				cx="34"
				cy="66"
				rx="26"
				ry="24"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.4"
			/>
			<ellipse
				cx="34"
				cy="70"
				rx="22"
				ry="20"
				fill={C.skin}
				stroke={C.ink}
				strokeWidth="2.4"
			/>
			<path
				d="M12 66C11 50 20 44 34 44C48 44 57 50 56 66C52 63 49 59 47 55C42 60 36 60 34 55C31 60 23 62 12 66Z"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.1"
			/>
			<circle
				cx="12"
				cy="48"
				r="3"
				fill={C.hot}
				stroke={C.ink}
				strokeWidth="1.3"
			/>
			<circle
				cx="56"
				cy="48"
				r="3"
				fill={C.hot}
				stroke={C.ink}
				strokeWidth="1.3"
			/>
			<Joy cx="26" cy="70" w="4.6" />
			<Joy cx="43" cy="70" w="4.6" />
			<Blush cx="19" cy="77" rx="4.2" ry="2.5" />
			<Blush cx="50" cy="77" rx="4.2" ry="2.5" />
			<path
				d="M29 77Q34 85 39 77Z"
				fill={C.mouth}
				stroke={C.ink}
				strokeWidth="1.8"
			/>
		</Sticker>
	);
}

/** Bad connection: a worried helper and two unplugged, very sad cables. */
export function CablesDoctor({ size = 80, className = "" }) {
	return (
		<Sticker
			width={size}
			height={size}
			viewBox="0 0 120 120"
			className={className}
			decor={
				<g>
					<Sparkle4 x="12" y="22" s=".7" fill={C.lilac} />
					<path
						d="M104 14L109 10M110 24L116 24"
						stroke={C.coral}
						strokeWidth="2.6"
					/>
				</g>
			}
		>
			{/* body */}
			<path
				d="M38 100C38 84 46 76 60 76C74 76 82 84 82 100Z"
				fill={C.blue}
				stroke={C.ink}
				strokeWidth="2.4"
			/>
			<path d="M52 77C55 84 65 84 68 77" stroke={C.ink} strokeWidth="2" />
			{/* head */}
			<ellipse
				cx="60"
				cy="44"
				rx="34"
				ry="31"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.4"
			/>
			<ellipse
				cx="60"
				cy="48"
				rx="31"
				ry="26"
				fill={C.skin}
				stroke={C.ink}
				strokeWidth="2.4"
			/>
			<path
				d="M29 44C28 26 41 17 60 17C79 17 92 26 91 44C86 41 82 36 80 30C73 37 66 37 60 30C54 37 47 37 40 30C38 36 34 41 29 44Z"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.2"
			/>
			{/* plus-shaped hair clip */}
			<circle
				cx="79"
				cy="25"
				r="7.5"
				fill={C.hot}
				stroke={C.ink}
				strokeWidth="1.8"
			/>
			<path d="M79 21V29M75 25H83" stroke="#fff" strokeWidth="2.6" />
			{/* worried face */}
			<path d="M40 47L52 42M80 47L68 42" stroke={C.ink} strokeWidth="2.6" />
			<Eye cx="47" cy="53" r="4.6" />
			<Eye cx="73" cy="53" r="4.6" />
			<Blush cx="38" cy="60" rx="4.6" ry="2.7" />
			<Blush cx="82" cy="60" rx="4.6" ry="2.7" />
			<path d="M52 65Q56 61 60 65T68 65" stroke={C.ink} strokeWidth="2.4" />
			<path
				d="M92 36C88 42 88 46 92 47C96 46 96 42 92 36Z"
				fill={C.blue}
				stroke={C.ink}
				strokeWidth="1.6"
			/>
			{/* cables, plug and socket each get a tiny worried face */}
			<path d="M3 108C14 108 20 104 28 104" stroke={C.ink} strokeWidth="4" />
			<path
				d="M117 108C106 108 100 104 94 104"
				stroke={C.ink}
				strokeWidth="4"
			/>
			<rect
				x="28"
				y="97"
				width="22"
				height="15"
				rx="4.5"
				fill={C.coral}
				stroke={C.ink}
				strokeWidth="2.2"
			/>
			<path d="M50 101H57M50 108H57" stroke={C.ink} strokeWidth="3" />
			<circle cx="35" cy="103" r="1.8" fill={C.ink} />
			<circle cx="43" cy="103" r="1.8" fill={C.ink} />
			<path d="M36 109Q39 106.5 42 109" stroke={C.ink} strokeWidth="1.6" />
			<rect
				x="70"
				y="97"
				width="24"
				height="15"
				rx="4.5"
				fill={C.mint}
				stroke={C.ink}
				strokeWidth="2.2"
			/>
			<path d="M70 101H64M70 108H64" stroke={C.deepGreen} strokeWidth="3" />
			<circle cx="80" cy="103" r="1.8" fill={C.ink} />
			<circle cx="88" cy="103" r="1.8" fill={C.ink} />
			<path d="M81 109Q84 106.5 87 109" stroke={C.ink} strokeWidth="1.6" />
			<path
				d="M64 95L58 105H63L60 115L68 103H63Z"
				fill={C.yellow}
				stroke={C.ink}
				strokeWidth="1.5"
			/>
		</Sticker>
	);
}

/** Cat-ear beanie peeking over a ledge, tiny paws on top. */
export function CornerPeeker({ size = 48, className = "" }) {
	return (
		<Sticker
			width={size}
			height={size * 0.64}
			viewBox="0 0 100 64"
			className={className}
			outline={3}
		>
			{/* ears */}
			<path
				d="M29 26L27 5L45 14Z"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.4"
			/>
			<path d="M32 21L31 11L40 15Z" fill={C.hot} />
			<path
				d="M73 26L75 5L57 14Z"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.4"
			/>
			<path d="M70 21L71 11L62 15Z" fill={C.hot} />
			{/* head */}
			<path
				d="M26 58V36C26 20 37 12 51 12C65 12 76 20 76 36V58Z"
				fill={C.skin}
				stroke={C.ink}
				strokeWidth="2.6"
			/>
			<path
				d="M26 38C25 20 36 10 51 10C66 10 77 20 76 38C69 35 65 30 63 24C57 31 45 31 39 24C37 30 33 35 26 38Z"
				fill={C.hair}
				stroke={C.ink}
				strokeWidth="2.2"
			/>
			<Eye cx="41" cy="45" r="5" />
			<Eye cx="61" cy="45" r="5" />
			<Blush cx="32" cy="52" rx="4" ry="2.2" />
			<Blush cx="70" cy="52" rx="4" ry="2.2" />
			<path
				d="M47 52Q49.5 55.5 51 52Q52.5 55.5 55 52"
				stroke={C.ink}
				strokeWidth="1.8"
			/>
			{/* ledge + paws */}
			<rect
				x="12"
				y="56"
				width="76"
				height="8"
				rx="4"
				fill={C.mint}
				stroke={C.ink}
				strokeWidth="2.2"
			/>
			<ellipse
				cx="35"
				cy="56"
				rx="7.5"
				ry="5.5"
				fill={C.skin}
				stroke={C.ink}
				strokeWidth="2"
			/>
			<ellipse
				cx="67"
				cy="56"
				rx="7.5"
				ry="5.5"
				fill={C.skin}
				stroke={C.ink}
				strokeWidth="2"
			/>
		</Sticker>
	);
}

/** Chunky four-point star with a glossy highlight. */
export function DoodleSparkle({
	size = 18,
	color = "#FFD966",
	className = "",
}) {
	return (
		<svg
			{...svgBase}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			className={`inline-block select-none ${className}`}
		>
			<path
				d="M12 1.8C12.9 8.3 15.4 10.9 22.2 12C15.4 13.1 12.9 15.7 12 22.2C11.1 15.7 8.6 13.1 1.8 12C8.6 10.9 11.1 8.3 12 1.8Z"
				fill={color}
				stroke={C.ink}
				strokeWidth="1.5"
			/>
			<circle cx="10" cy="9.6" r="1.3" fill="#fff" opacity=".85" />
		</svg>
	);
}

/** Bouncy loop-de-loop arrow with a rounded head. */
export function DoodleSquiggleArrow({ size = 32, className = "" }) {
	return (
		<svg
			{...svgBase}
			width={size}
			height={size * 0.75}
			viewBox="0 0 64 48"
			className={`inline-block select-none ${className}`}
		>
			<path
				d="M5 32C11 10 22 10 26 26C30 40 40 36 44 24C46 18 50 16 56 17"
				stroke={C.ink}
				strokeWidth="3.2"
			/>
			<path d="M48 8L58 17L48 26" stroke={C.ink} strokeWidth="3.2" />
			<circle
				cx="5"
				cy="32"
				r="2.4"
				fill={C.hot}
				stroke={C.ink}
				strokeWidth="1.4"
			/>
		</svg>
	);
}

export default ShockedStudent;
