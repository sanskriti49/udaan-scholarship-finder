import React from "react";

/**
 * Hand-drawn expressive characters, tiny students, and playful doodles.
 * Styled with imperfect linework, warm fills, and authentic personality.
 */

const stroke = "#022C22";

/**
 * 1. ShockedStudent
 * A tiny character with hands on cheeks, wide eyes, dropped jaw in complete disbelief.
 * Perfect response to "wait, I qualify for this?!"
 */
export function ShockedStudent({
	size = 72,
	className = "",
	showBubble = true,
	bubbleText = "Wait... ME?!",
}) {
	return (
		<div
			className={`inline-flex items-center gap-1.5 select-none ${className}`}
		>
			<svg
				width={size}
				height={size}
				viewBox="0 0 80 80"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
				className="overflow-visible"
			>
				{/* Hair tuft back */}
				<path
					d="M26 30C24 20 34 14 42 14C50 14 58 19 56 30"
					fill="#1B432A"
					stroke={stroke}
					strokeWidth="2.2"
					strokeLinecap="round"
				/>

				{/* Cute sprout / hair flick on top */}
				<path
					d="M42 14C41 8 46 6 48 9C49 11 46 14 42 14Z"
					fill="#40916C"
					stroke={stroke}
					strokeWidth="1.8"
					strokeLinejoin="round"
				/>

				{/* Head / Face */}
				<circle
					cx="40"
					cy="35"
					r="18"
					fill="#FEF3C7"
					stroke={stroke}
					strokeWidth="2.4"
				/>

				{/* Front messy bangs */}
				<path
					d="M25 30C29 25 33 30 38 24C41 29 47 25 54 29"
					fill="none"
					stroke={stroke}
					strokeWidth="2.2"
					strokeLinecap="round"
				/>

				{/* Shocked Eyebrows - raised high */}
				<path
					d="M29 24C31 21 35 22 36 23"
					stroke={stroke}
					strokeWidth="2"
					strokeLinecap="round"
				/>
				<path
					d="M45 23C46 22 50 21 52 24"
					stroke={stroke}
					strokeWidth="2"
					strokeLinecap="round"
				/>

				{/* Big Round Shocked Eyes */}
				<circle cx="33" cy="30" r="3.8" fill={stroke} />
				<circle cx="32" cy="29" r="1.3" fill="#FFFFFF" />

				<circle cx="48" cy="30" r="3.8" fill={stroke} />
				<circle cx="47" cy="29" r="1.3" fill="#FFFFFF" />

				{/* Cute Blushing Cheeks */}
				<ellipse cx="27" cy="36" rx="3.5" ry="2" fill="#FDA4AF" />
				<ellipse cx="53" cy="36" rx="3.5" ry="2" fill="#FDA4AF" />

				{/* Open 'O' Dropped Mouth */}
				<ellipse
					cx="40.5"
					cy="38"
					rx="3.5"
					ry="5"
					fill="#831843"
					stroke={stroke}
					strokeWidth="2"
				/>
				{/* Cute tongue accent */}
				<path
					d="M39 41C40 40 41 40 42 41"
					stroke="#F472B6"
					strokeWidth="1.5"
					strokeLinecap="round"
				/>

				{/* Oversized cozy knit sweater body */}
				<path
					d="M26 51C24 53 22 66 22 71C22 72 26 73 40 73C54 73 58 72 58 71C58 66 56 53 54 51"
					fill="#D8F3DC"
					stroke={stroke}
					strokeWidth="2.2"
					strokeLinejoin="round"
				/>

				{/* Sweater collar ribbing */}
				<path
					d="M34 51C37 53 43 53 46 51"
					stroke={stroke}
					strokeWidth="2"
					strokeLinecap="round"
				/>

				{/* Hands clapped to cheeks (The Home Alone / Shock Meme pose) */}
				{/* Left hand on left cheek */}
				<path
					d="M20 54C21 44 23 37 27 37C29 37 29 42 27 48"
					fill="#FEF3C7"
					stroke={stroke}
					strokeWidth="2.2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path
					d="M25 40C24 43 24 46 25 48"
					stroke={stroke}
					strokeWidth="1.6"
					strokeLinecap="round"
				/>

				{/* Right hand on right cheek */}
				<path
					d="M60 54C59 44 57 37 53 37C51 37 51 42 53 48"
					fill="#FEF3C7"
					stroke={stroke}
					strokeWidth="2.2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path
					d="M55 40C56 43 56 46 55 48"
					stroke={stroke}
					strokeWidth="1.6"
					strokeLinecap="round"
				/>

				{/* Floating exclamation spark lines */}
				<path
					d="M16 22L11 19"
					stroke="#D97706"
					strokeWidth="2.2"
					strokeLinecap="round"
				/>
				<path
					d="M17 14L13 8"
					stroke="#D97706"
					strokeWidth="2.2"
					strokeLinecap="round"
				/>
				<path
					d="M64 22L69 19"
					stroke="#D97706"
					strokeWidth="2.2"
					strokeLinecap="round"
				/>
				<path
					d="M63 14L67 8"
					stroke="#D97706"
					strokeWidth="2.2"
					strokeLinecap="round"
				/>
			</svg>

			{/* Speech Bubble */}
			{showBubble && (
				<div className="relative -mt-6 rounded-xl border-[1.5px] border-emerald-950 bg-white px-2.5 py-1 shadow-2xs">
					<span className="font-heading text-xs font-bold text-emerald-950 whitespace-nowrap">
						{bubbleText}
					</span>
					{/* Bubble triangle pointer */}
					<div className="absolute -left-1.5 top-3 h-2 w-2 rotate-45 border-b-[1.5px] border-l-[1.5px] border-emerald-950 bg-white" />
				</div>
			)}
		</div>
	);
}

/**
 * 2. CheeringStudent
 * A happy student jumping with joy, arms flung up, holding a verified scheme letter.
 * Perfect for celebration, discovery confirmation, and featured schemes.
 */
export function CheeringStudent({ size = 70, className = "" }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 80 80"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			className={`overflow-visible select-none ${className}`}
		>
			{/* Confetti & stars flying around */}
			<path
				d="M14 16L17 19M17 16L14 19"
				stroke="#D97706"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<circle cx="68" cy="18" r="2.5" fill="#FBBF24" />
			<path
				d="M65 38L67 40M67 38L65 40"
				stroke="#10B981"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<path
				d="M12 42C14 40 16 43 18 41"
				stroke="#F472B6"
				strokeWidth="2"
				strokeLinecap="round"
			/>

			{/* Left arm raised high holding verified letter */}
			<path
				d="M32 46C26 36 21 28 17 22"
				stroke={stroke}
				strokeWidth="2.4"
				strokeLinecap="round"
			/>
			{/* Tiny hand holding paper */}
			<circle
				cx="16"
				cy="21"
				r="3"
				fill="#FEF3C7"
				stroke={stroke}
				strokeWidth="1.5"
			/>

			{/* Verified acceptance notice paper */}
			<g transform="translate(4, 8) rotate(-12)">
				<rect
					x="0"
					y="0"
					width="18"
					height="22"
					rx="3"
					fill="#FAF9F6"
					stroke={stroke}
					strokeWidth="1.8"
				/>
				<path
					d="M4 6H14M4 10H11"
					stroke={stroke}
					strokeWidth="1.4"
					strokeLinecap="round"
					opacity="0.4"
				/>
				{/* Green verified check badge on paper */}
				<circle
					cx="12"
					cy="15"
					r="3.5"
					fill="#DCFCE7"
					stroke="#15803D"
					strokeWidth="1.2"
				/>
				<path
					d="M10.5 15L11.5 16L13.5 14"
					stroke="#15803D"
					strokeWidth="1.2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</g>

			{/* Right arm raised high with open palm */}
			<path
				d="M48 46C54 36 60 28 64 22"
				stroke={stroke}
				strokeWidth="2.4"
				strokeLinecap="round"
			/>
			<circle
				cx="65"
				cy="21"
				r="3"
				fill="#FEF3C7"
				stroke={stroke}
				strokeWidth="1.5"
			/>

			{/* Legs jumping / running */}
			<path
				d="M35 64C33 68 28 73 24 74"
				stroke={stroke}
				strokeWidth="2.4"
				strokeLinecap="round"
			/>
			<path
				d="M45 64C47 68 53 72 57 73"
				stroke={stroke}
				strokeWidth="2.4"
				strokeLinecap="round"
			/>
			{/* Shoes */}
			<ellipse cx="23" cy="74" rx="3.5" ry="2" fill="#022C22" />
			<ellipse cx="58" cy="73" rx="3.5" ry="2" fill="#022C22" />

			{/* Body / Yellow sweater */}
			<path
				d="M32 46C30 54 31 63 32 65C35 66 45 66 48 65C49 63 50 54 48 46"
				fill="#FEF08A"
				stroke={stroke}
				strokeWidth="2.2"
				strokeLinejoin="round"
			/>

			{/* Head / Face */}
			<circle
				cx="40"
				cy="34"
				r="15"
				fill="#FEF3C7"
				stroke={stroke}
				strokeWidth="2.4"
			/>

			{/* Hair with side bangs */}
			<path
				d="M26 31C25 21 34 18 40 18C48 18 54 21 54 31"
				fill="#1B432A"
				stroke={stroke}
				strokeWidth="2.2"
			/>
			<path
				d="M27 28C32 26 36 28 40 24C44 28 49 26 53 28"
				stroke={stroke}
				strokeWidth="1.8"
				strokeLinecap="round"
			/>

			{/* Happy curved eyes ( ^ ‿ ^ ) */}
			<path
				d="M32 33C33 30 36 30 37 33"
				stroke={stroke}
				strokeWidth="2.2"
				strokeLinecap="round"
			/>
			<path
				d="M43 33C44 30 47 30 48 33"
				stroke={stroke}
				strokeWidth="2.2"
				strokeLinecap="round"
			/>

			{/* Rosy cheeks */}
			<ellipse cx="29" cy="36" rx="2.5" ry="1.5" fill="#FDA4AF" />
			<ellipse cx="51" cy="36" rx="2.5" ry="1.5" fill="#FDA4AF" />

			{/* Wide joyful open smile */}
			<path
				d="M36 38C36 42 44 42 44 38Z"
				fill="#991B1B"
				stroke={stroke}
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/**
 * 3. CoinHugger
 * A tiny cute student affectionately hugging a giant gold Rupee coin.
 * Ideal for high-value grants (₹50,000+) on Flagship scholarship cards!
 */
export function CoinHugger({ size = 56, className = "" }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			className={`overflow-visible select-none ${className}`}
		>
			{/* Giant Gold Rupee Coin */}
			<circle
				cx="36"
				cy="32"
				r="22"
				fill="#FEF08A"
				stroke={stroke}
				strokeWidth="2.4"
			/>
			<circle
				cx="36"
				cy="32"
				r="18"
				fill="#FDE047"
				stroke={stroke}
				strokeWidth="1.4"
				strokeDasharray="2.5 2"
			/>

			{/* Rupee Symbol inside coin */}
			<path
				d="M32 23H41M32 27H40M32 23V34C34 34 38 34 38 30C38 27 34 27 32 27M36 31L41 39"
				stroke={stroke}
				strokeWidth="2.2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>

			{/* Tiny Student Body clinging to left side of coin */}
			<path
				d="M12 40C12 34 16 30 20 30C23 30 25 35 25 46C25 49 19 50 14 47C12 45 12 43 12 40Z"
				fill="#D8F3DC"
				stroke={stroke}
				strokeWidth="2"
			/>

			{/* Arms hugging the coin tight */}
			<path
				d="M18 36C22 36 28 34 32 38"
				stroke={stroke}
				strokeWidth="2.4"
				strokeLinecap="round"
			/>
			<circle
				cx="32"
				cy="38"
				r="2.5"
				fill="#FEF3C7"
				stroke={stroke}
				strokeWidth="1.4"
			/>

			{/* Cute round head leaning on coin */}
			<circle
				cx="16"
				cy="26"
				r="10"
				fill="#FEF3C7"
				stroke={stroke}
				strokeWidth="2.2"
			/>

			{/* Hair */}
			<path
				d="M8 24C8 17 14 15 18 15C23 15 26 18 26 24"
				fill="#1B432A"
				stroke={stroke}
				strokeWidth="1.8"
			/>

			{/* Happy closed contentment eye ( > ‿ < ) */}
			<path
				d="M14 26L17 28L14 30"
				stroke={stroke}
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>

			{/* Big happy cheek blush */}
			<circle cx="19" cy="29" r="2.2" fill="#FDA4AF" />

			{/* Content sweet smile */}
			<path
				d="M15 32C17 33 19 32 20 31"
				stroke={stroke}
				strokeWidth="1.6"
				strokeLinecap="round"
			/>

			{/* Little heart floating above head */}
			<path
				d="M14 10C12 8 9 9 10 12L14 15L18 12C19 9 16 8 14 10Z"
				fill="#F43F5E"
				stroke={stroke}
				strokeWidth="1.2"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/**
 * 4. ConfusedDetective
 * A cute student holding a giant magnifying glass, head tilted in confusion with floating questions.
 * Perfect for the Empty Search / Filter state!
 */
export function ConfusedDetective({ size = 90, className = "" }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 90 90"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			className={`overflow-visible select-none ${className}`}
		>
			{/* Floating cute squiggly question marks */}
			<path
				d="M18 22C18 17 24 16 25 20C25 24 21 24 21 27"
				stroke="#D97706"
				strokeWidth="2.2"
				strokeLinecap="round"
			/>
			<circle cx="21" cy="31" r="1.5" fill="#D97706" />

			<path
				d="M72 14C72 10 77 9 78 12C78 15 75 15 75 18"
				stroke="#10B981"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<circle cx="75" cy="21" r="1.2" fill="#10B981" />

			{/* Body */}
			<path
				d="M34 54C30 56 28 72 28 76C28 77 34 78 46 78C58 78 64 77 64 76C64 72 62 56 58 54"
				fill="#E0E7FF"
				stroke={stroke}
				strokeWidth="2.4"
				strokeLinejoin="round"
			/>

			{/* Head tilted in confusion */}
			<g transform="rotate(-8 46 36)">
				{/* Hair */}
				<path
					d="M32 30C30 18 42 14 50 14C60 14 66 18 64 30"
					fill="#1B432A"
					stroke={stroke}
					strokeWidth="2.4"
				/>

				{/* Face */}
				<circle
					cx="48"
					cy="36"
					r="17"
					fill="#FEF3C7"
					stroke={stroke}
					strokeWidth="2.4"
				/>

				{/* Hand scratching head */}
				<path
					d="M28 44C27 34 32 24 35 22"
					stroke={stroke}
					strokeWidth="2.4"
					strokeLinecap="round"
				/>
				<circle
					cx="36"
					cy="22"
					r="3"
					fill="#FEF3C7"
					stroke={stroke}
					strokeWidth="1.6"
				/>

				{/* Puzzled eyebrows (one up, one down) */}
				<path
					d="M38 27C41 24 44 26 45 28"
					stroke={stroke}
					strokeWidth="2"
					strokeLinecap="round"
				/>
				<path
					d="M54 28C56 28 58 29 60 30"
					stroke={stroke}
					strokeWidth="2"
					strokeLinecap="round"
				/>

				{/* Left regular eye */}
				<circle cx="41" cy="33" r="2.8" fill={stroke} />

				{/* Right eye magnified by giant lens */}
				<ellipse cx="37" cy="40" rx="3" ry="1.5" fill="#FDA4AF" />
				<ellipse cx="58" cy="40" rx="3" ry="1.5" fill="#FDA4AF" />

				{/* Wobbly wavy mouth in confusion */}
				<path
					d="M44 42C46 44 48 40 50 43C52 44 54 42 55 43"
					stroke={stroke}
					strokeWidth="2"
					strokeLinecap="round"
				/>
			</g>

			{/* Giant Magnifying Glass held in hand */}
			<g transform="translate(18, 12)">
				{/* Glass handle */}
				<line
					x1="48"
					y1="48"
					x2="64"
					y2="64"
					stroke={stroke}
					strokeWidth="4"
					strokeLinecap="round"
				/>
				{/* Lens frame */}
				<circle
					cx="38"
					cy="38"
					r="16"
					fill="#FEF9C3"
					fillOpacity="0.8"
					stroke={stroke}
					strokeWidth="3"
				/>
				{/* Gigantic cartoon pupil visible inside lens */}
				<circle cx="39" cy="37" r="6" fill={stroke} />
				<circle cx="37" cy="35" r="2" fill="#FFFFFF" />
				<circle cx="41" cy="39" r="1" fill="#FFFFFF" />
				{/* Lens light reflection curve */}
				<path
					d="M28 32C31 27 38 25 43 27"
					stroke="#FFFFFF"
					strokeWidth="2.5"
					strokeLinecap="round"
				/>
			</g>
		</svg>
	);
}

/**
 * 5. BoardCurator
 * A proud cute student holding a pin and a starred scholarship ribbon for the Saved Scholarships board.
 */
export function BoardCurator({ size = 110, className = "" }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 110 110"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			className={`overflow-visible select-none ${className}`}
		>
			{/* Corkboard pin card backdrop */}
			<rect
				x="14"
				y="18"
				width="82"
				height="74"
				rx="10"
				fill="#FAF9F6"
				stroke={stroke}
				strokeWidth="2.5"
			/>
			{/* Cork texture dashes */}
			<line
				x1="22"
				y1="28"
				x2="34"
				y2="28"
				stroke="#E2E8F0"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<line
				x1="74"
				y1="36"
				x2="86"
				y2="36"
				stroke="#E2E8F0"
				strokeWidth="2"
				strokeLinecap="round"
			/>

			{/* Pinned note on board with thumb pin */}
			<g transform="translate(48, 22) rotate(6)">
				<rect
					x="0"
					y="0"
					width="38"
					height="48"
					rx="4"
					fill="#FEF9C3"
					stroke={stroke}
					strokeWidth="1.8"
				/>
				{/* Gold Star on note */}
				<path
					d="M19 8L20.8 12.5L25.5 12.8L21.8 15.8L23 20.5L19 18L15 20.5L16.2 15.8L12.5 12.8L17.2 12.5L19 8Z"
					fill="#F59E0B"
					stroke={stroke}
					strokeWidth="1.2"
					strokeLinejoin="round"
				/>
				<line
					x1="8"
					y1="26"
					x2="30"
					y2="26"
					stroke={stroke}
					strokeWidth="1.4"
					opacity="0.4"
					strokeLinecap="round"
				/>
				<line
					x1="8"
					y1="32"
					x2="24"
					y2="32"
					stroke={stroke}
					strokeWidth="1.4"
					opacity="0.4"
					strokeLinecap="round"
				/>
				<line
					x1="8"
					y1="38"
					x2="28"
					y2="38"
					stroke={stroke}
					strokeWidth="1.4"
					opacity="0.4"
					strokeLinecap="round"
				/>
				{/* Pushpin at top */}
				<circle
					cx="19"
					cy="2"
					r="3.5"
					fill="#EF4444"
					stroke={stroke}
					strokeWidth="1.4"
				/>
			</g>

			{/* Cute Character in foreground holding a bookmark ribbon */}
			{/* Body */}
			<path
				d="M24 64C22 66 20 86 20 90C20 91 26 92 40 92C50 92 52 91 52 90C52 86 50 66 48 64"
				fill="#DCFCE7"
				stroke={stroke}
				strokeWidth="2.2"
				strokeLinejoin="round"
			/>

			{/* Head */}
			<circle
				cx="36"
				cy="48"
				r="15"
				fill="#FEF3C7"
				stroke={stroke}
				strokeWidth="2.4"
			/>

			{/* Hair with cute side bun */}
			<path
				d="M23 45C22 35 30 32 37 32C46 32 50 35 50 45"
				fill="#1B432A"
				stroke={stroke}
				strokeWidth="2.2"
			/>
			{/* Side bun */}
			<circle
				cx="21"
				cy="38"
				r="5"
				fill="#1B432A"
				stroke={stroke}
				strokeWidth="2"
			/>

			{/* Proud happy eyes ( ^ ‿ ^ ) */}
			<path
				d="M29 48C30 45 33 45 34 48"
				stroke={stroke}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<path
				d="M40 48C41 45 44 45 45 48"
				stroke={stroke}
				strokeWidth="2"
				strokeLinecap="round"
			/>

			{/* Rosy cheeks */}
			<circle cx="27" cy="51" r="2.5" fill="#FDA4AF" />
			<circle cx="47" cy="51" r="2.5" fill="#FDA4AF" />

			{/* Cheerful beam smile */}
			<path
				d="M33 54C35 57 39 57 41 54"
				stroke={stroke}
				strokeWidth="2"
				strokeLinecap="round"
			/>

			{/* Arm pointing proudly to the board */}
			<path
				d="M44 64C48 58 56 50 62 46"
				stroke={stroke}
				strokeWidth="2.4"
				strokeLinecap="round"
			/>
			<circle
				cx="63"
				cy="45"
				r="2.8"
				fill="#FEF3C7"
				stroke={stroke}
				strokeWidth="1.4"
			/>

			{/* Floating Sparkle Doodles */}
			<path
				d="M12 36L15 39M15 36L12 39"
				stroke="#D97706"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<circle cx="94" cy="24" r="2" fill="#FBBF24" />
			<circle cx="88" cy="80" r="2.5" fill="#10B981" />
		</svg>
	);
}

/**
 * 6. CablesDoctor
 * A cute student holding unplugged wires with funny curly cords and a sweat drop.
 * Perfect for Network / Connection Error states.
 */
export function CablesDoctor({ size = 80, className = "" }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 80 80"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			className={`overflow-visible select-none ${className}`}
		>
			{/* Left Cable with Male Plug */}
			<path
				d="M8 58C14 58 18 52 24 52"
				stroke={stroke}
				strokeWidth="2.4"
				strokeLinecap="round"
			/>
			<rect
				x="24"
				y="48"
				width="9"
				height="8"
				rx="2"
				fill="#F87171"
				stroke={stroke}
				strokeWidth="1.8"
			/>
			<line
				x1="33"
				y1="50"
				x2="37"
				y2="50"
				stroke={stroke}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<line
				x1="33"
				y1="54"
				x2="37"
				y2="54"
				stroke={stroke}
				strokeWidth="2"
				strokeLinecap="round"
			/>

			{/* Right Cable with Female Socket */}
			<path
				d="M72 58C66 58 62 52 56 52"
				stroke={stroke}
				strokeWidth="2.4"
				strokeLinecap="round"
			/>
			<rect
				x="47"
				y="47"
				width="9"
				height="10"
				rx="2"
				fill="#60A5FA"
				stroke={stroke}
				strokeWidth="1.8"
			/>

			{/* Tiny spark gap between plugs */}
			<path
				d="M40 46L43 49L39 52L42 55"
				stroke="#FBBF24"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>

			{/* Cute Character looking down nervously */}
			<circle
				cx="40"
				cy="28"
				r="14"
				fill="#FEF3C7"
				stroke={stroke}
				strokeWidth="2.4"
			/>

			{/* Hair */}
			<path
				d="M28 26C27 17 35 15 40 15C47 15 53 17 52 26"
				fill="#1B432A"
				stroke={stroke}
				strokeWidth="2.2"
			/>

			{/* Nervous wide eyes looking down at the wire gap */}
			<circle cx="36" cy="30" r="2.8" fill={stroke} />
			<circle cx="35" cy="31" r="1" fill="#FFFFFF" />

			<circle cx="45" cy="30" r="2.8" fill={stroke} />
			<circle cx="44" cy="31" r="1" fill="#FFFFFF" />

			{/* Anxious little sweat drop on forehead (;・_・) */}
			<path
				d="M52 20C53 18 55 19 55 21C55 22 53 23 52 22C51 21 51 21 52 20Z"
				fill="#60A5FA"
				stroke={stroke}
				strokeWidth="1.2"
			/>

			{/* Awkward small wavy mouth */}
			<path
				d="M37 36C39 35 41 37 43 35"
				stroke={stroke}
				strokeWidth="1.8"
				strokeLinecap="round"
			/>

			{/* Cheeks */}
			<circle cx="32" cy="33" r="2" fill="#FDA4AF" />
			<circle cx="49" cy="33" r="2" fill="#FDA4AF" />
		</svg>
	);
}

/**
 * 7. CornerPeeker
 * A tiny cute head peeking over cards or containers with huge curious eyes.
 */
export function CornerPeeker({ size = 48, className = "" }) {
	return (
		<svg
			width={size}
			height={size * 0.65}
			viewBox="0 0 50 32"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			className={`overflow-visible select-none ${className}`}
		>
			{/* Cute sprout on head */}
			<path
				d="M25 10C24 4 30 3 31 6C32 8 28 10 25 10Z"
				fill="#40916C"
				stroke={stroke}
				strokeWidth="1.6"
				strokeLinejoin="round"
			/>

			{/* Head peeking over edge */}
			<path
				d="M10 32C10 18 16 11 25 11C34 11 40 18 40 32"
				fill="#FEF3C7"
				stroke={stroke}
				strokeWidth="2.2"
			/>

			{/* Hair cap */}
			<path
				d="M12 24C14 17 19 14 25 14C31 14 36 17 38 24"
				fill="#1B432A"
				stroke={stroke}
				strokeWidth="1.8"
			/>

			{/* Two big curious anime/meme eyes */}
			<circle cx="20" cy="22" r="3.2" fill={stroke} />
			<circle cx="19" cy="21" r="1.1" fill="#FFFFFF" />

			<circle cx="30" cy="22" r="3.2" fill={stroke} />
			<circle cx="29" cy="21" r="1.1" fill="#FFFFFF" />

			{/* Blushing cheeks */}
			<ellipse cx="14" cy="26" rx="2" ry="1.2" fill="#FDA4AF" />
			<ellipse cx="36" cy="26" rx="2" ry="1.2" fill="#FDA4AF" />

			{/* Tiny hands gripping the border edge */}
			<rect
				x="13"
				y="28"
				width="5"
				height="4"
				rx="2"
				fill="#FEF3C7"
				stroke={stroke}
				strokeWidth="1.6"
			/>
			<rect
				x="32"
				y="28"
				width="5"
				height="4"
				rx="2"
				fill="#FEF3C7"
				stroke={stroke}
				strokeWidth="1.6"
			/>
		</svg>
	);
}

/**
 * 8. DoodleSparkle
 * Playful hand-drawn 4-ray asterisk / star doodle.
 */
export function DoodleSparkle({
	size = 18,
	color = "#F59E0B",
	className = "",
}) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			className={`inline-block select-none ${className}`}
		>
			<path
				d="M12 2C12 7.5 16.5 12 22 12C16.5 12 12 16.5 12 22C12 16.5 7.5 12 2 12C7.5 12 12 7.5 12 2Z"
				fill={color}
				stroke={stroke}
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/**
 * 9. DoodleSquiggleArrow
 * Handcrafted sketched pointer arrow.
 */
export function DoodleSquiggleArrow({ size = 32, className = "" }) {
	return (
		<svg
			width={size}
			height={size * 0.75}
			viewBox="0 0 40 30"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			className={`inline-block select-none ${className}`}
		>
			<path
				d="M4 14C12 8 20 22 32 12"
				stroke={stroke}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<path
				d="M26 10L33 12L30 19"
				stroke={stroke}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export default ShockedStudent;
