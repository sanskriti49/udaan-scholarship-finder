import React from "react";
import { CornerPeeker, CoinHugger } from "./AnimatedIllustrations";

/**
 * Udaan Category Visual System
 * Hand-drawn inline SVG motifs + editorial accents for scholarship categories.
 * Crafted with organic linework, editorial charm, and precise color mapping.
 */

export function normalizeCategoryKey(rawCategory = "") {
	const cat = String(rawCategory || "")
		.toLowerCase()
		.trim();
	if (cat.includes("merit") && (cat.includes("need") || cat.includes("mean")))
		return "need";
	if (
		cat.includes("stem") ||
		cat.includes("tech") ||
		cat.includes("engineer") ||
		cat.includes("science")
	)
		return "stem";
	if (cat.includes("women") || cat.includes("girl") || cat.includes("female"))
		return "women";
	if (
		cat.includes("sc") ||
		cat.includes("st") ||
		cat.includes("obc") ||
		cat.includes("caste") ||
		cat.includes("dalit") ||
		cat.includes("tribal")
	)
		return "scst";
	if (
		cat.includes("minority") ||
		cat.includes("inclusion") ||
		cat.includes("bridge") ||
		cat.includes("pwd") ||
		cat.includes("disab")
	)
		return "minority";
	if (
		cat.includes("need") ||
		cat.includes("mean") ||
		cat.includes("income") ||
		cat.includes("finan")
	)
		return "need";
	if (
		cat.includes("merit") ||
		cat.includes("academic") ||
		cat.includes("talent") ||
		cat.includes("rank")
	)
		return "merit";
	if (
		cat.includes("govt") ||
		cat.includes("government") ||
		cat.includes("state") ||
		cat.includes("central") ||
		cat.includes("national")
	)
		return "government";
	return "general";
}

export const CATEGORY_THEMES = {
	government: {
		key: "government",
		label: "Government & National",
		colors: {
			border: "#1B432A",
			text: "#143621",
			bg: "#F2F7F4",
			tint: "#E3ECE6",
			accent: "#2D6A4F",
			ring: "#74C69D",
			headerBg: "linear-gradient(135deg, #E9F2EC 0%, #DDEBE1 100%)",
		},
	},
	merit: {
		key: "merit",
		label: "Merit & Excellence",
		colors: {
			border: "#B45309",
			text: "#78350F",
			bg: "#FEF9EE",
			tint: "#FDF2D6",
			accent: "#D97706",
			ring: "#FBBF24",
			headerBg: "linear-gradient(135deg, #FEF7E6 0%, #FCEFC7 100%)",
		},
	},
	need: {
		key: "need",
		label: "Need-Based / Means",
		colors: {
			border: "#3F6212",
			text: "#365314",
			bg: "#F7FBEF",
			tint: "#ECF5DA",
			accent: "#65A30D",
			ring: "#A3E635",
			headerBg: "linear-gradient(135deg, #F5FBEA 0%, #E8F5D0 100%)",
		},
	},
	women: {
		key: "women",
		label: "Women & Girls",
		colors: {
			border: "#9D174D",
			text: "#831843",
			bg: "#FDF2F8",
			tint: "#FCE7F3",
			accent: "#BE185D",
			ring: "#F472B6",
			headerBg: "linear-gradient(135deg, #FDF2F8 0%, #FCE4EC 100%)",
		},
	},
	scst: {
		key: "scst",
		label: "SC / ST / OBC & Reserved",
		colors: {
			border: "#065F46",
			text: "#022C22",
			bg: "#F0FDF4",
			tint: "#DCFCE7",
			accent: "#059669",
			ring: "#34D399",
			headerBg: "linear-gradient(135deg, #EDFAF1 0%, #DCF5E3 100%)",
		},
	},
	minority: {
		key: "minority",
		label: "Minority & Inclusive Access",
		colors: {
			border: "#0F766E",
			text: "#134E4A",
			bg: "#F0FDFA",
			tint: "#CCFBF1",
			accent: "#0D9488",
			ring: "#2DD4BF",
			headerBg: "linear-gradient(135deg, #EBFBFA 0%, #D5F6F3 100%)",
		},
	},
	stem: {
		key: "stem",
		label: "STEM & Tech Grants",
		colors: {
			border: "#047857",
			text: "#064E3B",
			bg: "#F0FDF9",
			tint: "#D1FAE5",
			accent: "#10B981",
			ring: "#6EE7B7",
			headerBg: "linear-gradient(135deg, #E6FAF3 0%, #D4F6EB 100%)",
		},
	},
	general: {
		key: "general",
		label: "General Scholarship",
		colors: {
			border: "#1E293B",
			text: "#0F172A",
			bg: "#F8FAFC",
			tint: "#E2E8F0",
			accent: "#334155",
			ring: "#94A3B8",
			headerBg: "linear-gradient(135deg, #F3F6F9 0%, #E7ECF2 100%)",
		},
	},
};

export function getCategoryTheme(category) {
	const key = normalizeCategoryKey(category);
	return CATEGORY_THEMES[key] || CATEGORY_THEMES.general;
}

/**
 * Hand-Drawn Inline SVG Category Motif Icon
 * Rendered with organic, sketched strokes and editorial flair.
 */
export function CategoryMotifIcon({ category, size = 28, className = "" }) {
	const theme = getCategoryTheme(category);
	const strokeColor = theme.colors.border;
	const accentColor = theme.colors.accent;

	switch (theme.key) {
		case "government":
			// Radiating seal / Ashoka-chakra-inspired geometry
			return (
				<svg
					width={size}
					height={size}
					viewBox="0 0 44 44"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className={className}
					aria-hidden="true"
				>
					<circle
						cx="22"
						cy="22"
						r="18.5"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeDasharray="3 2"
					/>
					<circle
						cx="22"
						cy="22"
						r="13"
						stroke={strokeColor}
						strokeWidth="1.5"
					/>
					<circle cx="22" cy="22" r="3.5" fill={accentColor} />
					{/* Radiating hand-sketched spokes */}
					<line
						x1="22"
						y1="9"
						x2="22"
						y2="18.5"
						stroke={strokeColor}
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
					<line
						x1="22"
						y1="25.5"
						x2="22"
						y2="35"
						stroke={strokeColor}
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
					<line
						x1="9"
						y1="22"
						x2="18.5"
						y2="22"
						stroke={strokeColor}
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
					<line
						x1="25.5"
						y1="22"
						x2="35"
						y2="22"
						stroke={strokeColor}
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
					<line
						x1="12.8"
						y1="12.8"
						x2="19.5"
						y2="19.5"
						stroke={strokeColor}
						strokeWidth="1.2"
						strokeLinecap="round"
					/>
					<line
						x1="24.5"
						y1="24.5"
						x2="31.2"
						y2="31.2"
						stroke={strokeColor}
						strokeWidth="1.2"
						strokeLinecap="round"
					/>
					<line
						x1="31.2"
						y1="12.8"
						x2="24.5"
						y2="19.5"
						stroke={strokeColor}
						strokeWidth="1.2"
						strokeLinecap="round"
					/>
					<line
						x1="19.5"
						y1="24.5"
						x2="12.8"
						y2="31.2"
						stroke={strokeColor}
						strokeWidth="1.2"
						strokeLinecap="round"
					/>
				</svg>
			);

		case "merit":
			// Laurel & ribbon medal sketch
			return (
				<svg
					width={size}
					height={size}
					viewBox="0 0 44 44"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className={className}
					aria-hidden="true"
				>
					{/* Sketched Medal Wreath */}
					<circle
						cx="22"
						cy="18"
						r="12.5"
						stroke={strokeColor}
						strokeWidth="1.75"
						fill="#FFFBEB"
					/>
					{/* Star in center */}
					<path
						d="M22 11.5L23.8 15.6L28 16.1L24.8 19L25.7 23.3L22 21.1L18.3 23.3L19.2 19L16 16.1L20.2 15.6L22 11.5Z"
						fill={accentColor}
						stroke={strokeColor}
						strokeWidth="1"
						strokeLinejoin="round"
					/>
					{/* Laurel leaves on border */}
					<path
						d="M8.5 21C7.8 15 11 9 17 6.5"
						stroke={strokeColor}
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
					<path
						d="M35.5 21C36.2 15 33 9 27 6.5"
						stroke={strokeColor}
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
					{/* Ribbons flowing down */}
					<path
						d="M17.5 28L14 39.5L20 36.5L22.5 39L21 29.5"
						stroke={strokeColor}
						strokeWidth="1.75"
						fill="#FDE68A"
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
					<path
						d="M26.5 28L30 39.5L24 36.5L21.5 39L23 29.5"
						stroke={strokeColor}
						strokeWidth="1.75"
						fill="#FCD34D"
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
				</svg>
			);

		case "need":
			// Open hands & sprouting seedling sketch
			return (
				<svg
					width={size}
					height={size}
					viewBox="0 0 44 44"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className={className}
					aria-hidden="true"
				>
					{/* Seedling stem */}
					<path
						d="M22 30V15.5"
						stroke={strokeColor}
						strokeWidth="2"
						strokeLinecap="round"
					/>
					{/* Left Leaf */}
					<path
						d="M22 20C17 20 13 16 13.5 11C18.5 11 22 15 22 20Z"
						fill="#D9F99D"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinejoin="round"
					/>
					{/* Right Leaf */}
					<path
						d="M22 16.5C26.5 16.5 30 12.5 29.5 8C25 8 22 12 22 16.5Z"
						fill="#BEF264"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinejoin="round"
					/>
					{/* Cupped supporting hands */}
					<path
						d="M7 32C11 36 17 38 22 38C27 38 33 36 37 32"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinecap="round"
					/>
					<path
						d="M10 26C12.5 30 17 33 22 33C27 33 31.5 30 34 26"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeDasharray="2.5 2.5"
						strokeLinecap="round"
					/>
				</svg>
			);

		case "women":
			// Simple bloom & lotus-inspired organic petal linework
			return (
				<svg
					width={size}
					height={size}
					viewBox="0 0 44 44"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className={className}
					aria-hidden="true"
				>
					{/* Central petal */}
					<path
						d="M22 6C18.5 13 18 20 22 27C26 20 25.5 13 22 6Z"
						fill="#FCE7F3"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinejoin="round"
					/>
					{/* Left petal */}
					<path
						d="M20 14C13 15 8 20 11 27C16 27 19.5 23 20 14Z"
						fill="#FBCFE8"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinejoin="round"
					/>
					{/* Right petal */}
					<path
						d="M24 14C31 15 36 20 33 27C28 27 24.5 23 24 14Z"
						fill="#FBCFE8"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinejoin="round"
					/>
					{/* Outer petals base */}
					<path
						d="M8 26C12 34 32 34 36 26"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinecap="round"
					/>
					{/* Rising stem / glow */}
					<circle cx="22" cy="34" r="2" fill={accentColor} />
					<path
						d="M18 37C20 38.5 24 38.5 26 37"
						stroke={strokeColor}
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
				</svg>
			);

		case "scst":
			// Banyan leaf & deep root network motif
			return (
				<svg
					width={size}
					height={size}
					viewBox="0 0 44 44"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className={className}
					aria-hidden="true"
				>
					{/* Large Banyan Leaf Silhouette */}
					<path
						d="M22 5C11 11 9 24 22 28C35 24 33 11 22 5Z"
						fill="#DCFCE7"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinejoin="round"
					/>
					{/* Central leaf vein */}
					<path
						d="M22 5V33"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinecap="round"
					/>
					{/* Secondary lateral veins */}
					<path
						d="M22 12C17 14 14 17 14 20"
						stroke={strokeColor}
						strokeWidth="1.3"
						strokeLinecap="round"
					/>
					<path
						d="M22 12C27 14 30 17 30 20"
						stroke={strokeColor}
						strokeWidth="1.3"
						strokeLinecap="round"
					/>
					<path
						d="M22 18C18 20 16 23 16 25"
						stroke={strokeColor}
						strokeWidth="1.3"
						strokeLinecap="round"
					/>
					<path
						d="M22 18C26 20 28 23 28 25"
						stroke={strokeColor}
						strokeWidth="1.3"
						strokeLinecap="round"
					/>
					{/* Ground Root Base */}
					<path
						d="M12 36C16 33 20 35 22 34C24 35 28 33 32 36"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinecap="round"
					/>
					<path
						d="M16 38C19 36 21 38 22 37C23 38 25 36 28 38"
						stroke={strokeColor}
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
				</svg>
			);

		case "minority":
			// Abstract bridge / handshake / archway access motif (non-religious)
			return (
				<svg
					width={size}
					height={size}
					viewBox="0 0 44 44"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className={className}
					aria-hidden="true"
				>
					{/* Archway Bridge */}
					<path
						d="M6 34C9 20 35 20 38 34"
						stroke={strokeColor}
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<path
						d="M12 34C15 25 29 25 32 34"
						stroke={strokeColor}
						strokeWidth="1.5"
						strokeDasharray="2.5 2.5"
						strokeLinecap="round"
					/>
					{/* Keystone of access in center */}
					<path
						d="M20 14L24 14L23 21L21 21L20 14Z"
						fill="#99F6E4"
						stroke={strokeColor}
						strokeWidth="1.5"
					/>
					{/* Connecting Handshake Lines */}
					<path
						d="M15 16C18 13 26 13 29 16"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinecap="round"
					/>
					<circle cx="22" cy="9.5" r="2.5" fill={accentColor} />
					{/* Foundation Pillars */}
					<line
						x1="8"
						y1="34"
						x2="8"
						y2="38"
						stroke={strokeColor}
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<line
						x1="36"
						y1="34"
						x2="36"
						y2="38"
						stroke={strokeColor}
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<line
						x1="5"
						y1="38"
						x2="39"
						y2="38"
						stroke={strokeColor}
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
				</svg>
			);

		case "stem":
			// Compass / planetary orbit technical sketch
			return (
				<svg
					width={size}
					height={size}
					viewBox="0 0 44 44"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className={className}
					aria-hidden="true"
				>
					{/* Tilted Elliptical Orbit Ring */}
					<ellipse
						cx="22"
						cy="22"
						rx="18"
						ry="8"
						transform="rotate(-28 22 22)"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeDasharray="4 2"
					/>
					{/* Central Nucleus / Compass Center */}
					<circle
						cx="22"
						cy="22"
						r="5"
						fill="#A7F3D0"
						stroke={strokeColor}
						strokeWidth="1.75"
					/>
					<circle cx="22" cy="22" r="2" fill={accentColor} />
					{/* Orbiting Satellite Node */}
					<circle
						cx="34"
						cy="14"
						r="2.8"
						fill={accentColor}
						stroke={strokeColor}
						strokeWidth="1.2"
					/>
					{/* Compass drafting arms */}
					<path
						d="M22 6V11"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinecap="round"
					/>
					<path
						d="M22 33V38"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinecap="round"
					/>
					<path
						d="M6 22H11"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinecap="round"
					/>
					<path
						d="M33 22H38"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinecap="round"
					/>
				</svg>
			);

		default:
			// General / academic book & pen sketch
			return (
				<svg
					width={size}
					height={size}
					viewBox="0 0 44 44"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className={className}
					aria-hidden="true"
				>
					<path
						d="M8 12C14 10 20 12 22 14C24 12 30 10 36 12V32C30 30 24 32 22 34C20 32 14 30 8 32V12Z"
						fill="#F1F5F9"
						stroke={strokeColor}
						strokeWidth="1.75"
						strokeLinejoin="round"
					/>
					<line
						x1="22"
						y1="14"
						x2="22"
						y2="34"
						stroke={strokeColor}
						strokeWidth="1.75"
					/>
					{/* Bookmark ribbon */}
					<path
						d="M27 8V19L30 16L33 19V8"
						fill="#FCD34D"
						stroke={strokeColor}
						strokeWidth="1.3"
						strokeLinejoin="round"
					/>
				</svg>
			);
	}
}

/**
 * Editorial Category Pill / Stamp Badge
 */
export function CategoryBadge({
	category,
	className = "",
	showIcon = true,
	size = "md",
	tilt = 0,
}) {
	const theme = getCategoryTheme(category);
	const sizeStyles =
		{
			sm: "text-[11px] px-2.5 py-0.5 gap-1.5",
			md: "text-xs px-3 py-1 gap-2",
			lg: "text-sm px-4 py-1.5 gap-2.5",
		}[size] || "text-xs px-3 py-1 gap-2";

	const iconSizes = { sm: 16, md: 19, lg: 24 }[size] || 19;

	return (
		<span
			className={`inline-flex items-center font-bold rounded-full border-[1.5px] transition-transform duration-150 select-none ${sizeStyles} ${className}`}
			style={{
				backgroundColor: theme.colors.bg,
				borderColor: theme.colors.border,
				color: theme.colors.text,
				transform: tilt ? `rotate(${tilt}deg)` : undefined,
			}}
		>
			{showIcon && (
				<CategoryMotifIcon
					category={category}
					size={iconSizes}
					className="shrink-0 -my-1"
				/>
			)}
			<span className="truncate tracking-wide font-sans">
				{category || theme.label}
			</span>
		</span>
	);
}

/**
 * Illustrated Category Card Header Banner
 * Used at the top of scholarship cards to give instant visual personality.
 */
export function CategoryCardHeader({
	category,
	sourceType,
	hasChanges = false,
	rightSlot = null,
}) {
	const theme = getCategoryTheme(category);

	return (
		<div
			className="relative overflow-hidden rounded-t-xl px-4 py-3 border-b-[1.5px] border-emerald-950/15 flex items-center justify-between"
			style={{ background: theme.colors.headerBg }}
		>
			{/* Watermark Motif in background */}
			<div className="absolute -right-2 -bottom-2 opacity-15 pointer-events-none transform rotate-12 scale-125">
				<CategoryMotifIcon category={category} size={64} />
			</div>

			<div className="relative z-10 flex items-center gap-2 min-w-0 pr-2">
				<div
					className="w-7 h-7 rounded-lg border-[1.5px] bg-white flex items-center justify-center shrink-0 shadow-2xs"
					style={{ borderColor: theme.colors.border }}
				>
					<CategoryMotifIcon category={category} size={18} />
				</div>
				<div className="flex flex-col min-w-0">
					<span
						className="text-xs font-extrabold uppercase tracking-wider truncate"
						style={{ color: theme.colors.text }}
					>
						{category || "Scholarship"}
					</span>
					<span className="text-[11px] font-semibold text-emerald-950/60 leading-none truncate">
						{sourceType || "Verified Scheme"}
					</span>
				</div>
			</div>

			<div className="relative z-10 flex items-center gap-2 shrink-0">
				{hasChanges && (
					<span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-emerald-950/20 bg-yellow-200 px-2 py-0.5 text-[11px] font-bold text-emerald-950 shadow-2xs">
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-800 animate-pulse"></span>
						Updated
					</span>
				)}
				{rightSlot}
			</div>
		</div>
	);
}

/**
 * Hand-drawn Empty Board Pinboard Illustration
 * Used in SavedScholarships empty state
 */
export function EmptyBoardIllustration({ size = 120, className = "" }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 120 120"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
		>
			{/* Background cork/board shadow */}
			<rect x="18" y="24" width="84" height="74" rx="10" fill="#E2E8F0" />
			{/* Main pinned board card */}
			<rect
				x="16"
				y="20"
				width="88"
				height="76"
				rx="10"
				fill="#FAF9F6"
				stroke="#022C22"
				strokeWidth="2.5"
			/>
			{/* Hanging pin ribbon */}
			<path
				d="M60 12 L60 26"
				stroke="#022C22"
				strokeWidth="2.5"
				strokeLinecap="round"
			/>
			{/* Pin head */}
			<circle
				cx="60"
				cy="12"
				r="6"
				fill="#FBBF24"
				stroke="#022C22"
				strokeWidth="2.5"
			/>
			<circle cx="58.5" cy="10.5" r="1.5" fill="#FFFFFF" />

			{/* Board interior lines / memo cards */}
			<rect
				x="26"
				y="32"
				width="30"
				height="36"
				rx="4"
				fill="#DCFCE7"
				stroke="#022C22"
				strokeWidth="1.75"
				strokeDasharray="2 2"
			/>
			{/* Mini bookmark ribbon on left memo */}
			<path d="M42 32 V44 L45 42 L48 44 V32" fill="#15803D" />

			{/* Second memo card on right */}
			<rect
				x="64"
				y="36"
				width="32"
				height="46"
				rx="4"
				fill="#FEF3C7"
				stroke="#022C22"
				strokeWidth="1.75"
			/>
			<line
				x1="70"
				y1="44"
				x2="88"
				y2="44"
				stroke="#78350F"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<line
				x1="70"
				y1="52"
				x2="84"
				y2="52"
				stroke="#78350F"
				strokeWidth="1.75"
				strokeLinecap="round"
			/>
			<line
				x1="70"
				y1="60"
				x2="86"
				y2="60"
				stroke="#78350F"
				strokeWidth="1.75"
				strokeLinecap="round"
			/>
			<line
				x1="70"
				y1="68"
				x2="80"
				y2="68"
				stroke="#78350F"
				strokeWidth="1.75"
				strokeLinecap="round"
			/>

			{/* Floating bookmark ribbon badge */}
			<g transform="translate(24, 72)">
				<rect
					x="0"
					y="0"
					width="34"
					height="16"
					rx="8"
					fill="#FFFFFF"
					stroke="#022C22"
					strokeWidth="1.75"
				/>
				<path
					d="M7 4H15C16.1 4 17 4.9 17 6V13L11 10.5L5 13V6C5 4.9 5.9 4 7 4Z"
					fill="#15803D"
					stroke="#022C22"
					strokeWidth="1.2"
					strokeLinejoin="round"
				/>
				<circle cx="25" cy="8" r="2" fill="#022C22" />
			</g>
		</svg>
	);
}

/**
 * Hand-drawn Empty Filter Search Illustration
 * Used in Scholarships catalog when no filters match
 */
export function EmptyFilterIllustration({ size = 110, className = "" }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 110 110"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
		>
			{/* Document sheet */}
			<rect
				x="20"
				y="16"
				width="68"
				height="80"
				rx="8"
				fill="#FAF9F6"
				stroke="#022C22"
				strokeWidth="2.5"
			/>
			{/* Sheet header bar */}
			<path
				d="M20 28H88"
				stroke="#022C22"
				strokeWidth="2"
				strokeDasharray="3 3"
			/>
			{/* Mock text lines */}
			<line
				x1="30"
				y1="38"
				x2="60"
				y2="38"
				stroke="#022C22"
				strokeWidth="2"
				strokeLinecap="round"
				opacity="0.3"
			/>
			<line
				x1="30"
				y1="46"
				x2="72"
				y2="46"
				stroke="#022C22"
				strokeWidth="2"
				strokeLinecap="round"
				opacity="0.3"
			/>
			<line
				x1="30"
				y1="54"
				x2="66"
				y2="54"
				stroke="#022C22"
				strokeWidth="2"
				strokeLinecap="round"
				opacity="0.3"
			/>

			{/* Large Magnifying Glass */}
			<circle
				cx="62"
				cy="64"
				r="22"
				fill="#FEF9C3"
				stroke="#022C22"
				strokeWidth="3"
			/>
			<line
				x1="78"
				y1="80"
				x2="96"
				y2="98"
				stroke="#022C22"
				strokeWidth="4"
				strokeLinecap="round"
			/>
			{/* Lens glare */}
			<path
				d="M50 56C53 50 60 48 66 50"
				stroke="#022C22"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			{/* Center spark / question dot inside lens */}
			<circle cx="62" cy="64" r="3.5" fill="#022C22" />
		</svg>
	);
}

/**
 * Layered Pinboard Visual Cluster for Scholarships Catalog Hero
 * Replaces generic stock photo with an editorial discovery composition
 */
export function ScholarshipsHeroCluster() {
	return (
		<div className="relative w-full max-w-md mx-auto select-none">
			{/* Background angled card: Official Gazette Scanner */}
			<div className="absolute inset-0 transform -rotate-3 translate-x-2 translate-y-3 rounded-2xl border-[1.5px] border-emerald-950/30 bg-[#FEF9EE] p-5 shadow-xs transition-transform duration-300 hover:-rotate-1">
				<div className="flex items-center justify-between border-b border-dashed border-emerald-950/20 pb-2">
					<span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78350F]">
						NSP & State Gazette Registry
					</span>
					<span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
				</div>
			</div>

			{/* Main Foreground Card: Flagship Scheme Preview */}
			<div className="relative rounded-2xl border-[2px] border-emerald-950 bg-white p-5 sm:p-6 shadow-[5px_5px_0px_0px_rgba(2,44,34,1)] transition-transform duration-200 hover:-translate-y-1">
				{/* Cute peeker on the card edge */}
				<div className="absolute -top-5 right-14 hidden sm:block pointer-events-none z-30">
					<CornerPeeker size={44} />
				</div>

				{/* Category Band */}
				<div className="flex items-center justify-between pb-3 border-b-[1.5px] border-emerald-950/15">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg border-[1.5px] border-[#047857] bg-[#F0FDF9] flex items-center justify-center shadow-2xs">
							<CategoryMotifIcon category="STEM" size={19} />
						</div>
						<div>
							<p className="text-xs font-extrabold uppercase tracking-wider text-[#064E3B]">
								Merit & STEM
							</p>
							<p className="text-[11px] font-semibold text-emerald-950/60 leading-none">
								Central Sector (CSSS)
							</p>
						</div>
					</div>
					<span className="rounded-full bg-yellow-200 border-[1.5px] border-emerald-950/20 px-2.5 py-0.5 text-xs font-bold text-emerald-950">
						Closes Oct 31
					</span>
				</div>

				{/* Title and details */}
				<div className="mt-4">
					<h3 className="ud-display text-lg sm:text-xl font-bold text-emerald-950 leading-snug">
						National Higher Education Merit Fellowship
					</h3>
					<p className="text-xs font-medium text-emerald-950/60 mt-0.5">
						Ministry of Education · Govt of India
					</p>
				</div>

				{/* Financial Highlight */}
				<div className="mt-4 rounded-xl border-[1.5px] border-emerald-950/15 bg-emerald-50/80 p-3.5 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<CoinHugger size={38} className="shrink-0 hidden xs:block" />
						<div>
							<p className="text-[11px] font-bold uppercase tracking-wider text-emerald-950/55">
								Direct Benefit Transfer
							</p>
							<p className="ud-display text-2xl font-extrabold text-emerald-950">
								₹50,000{" "}
								<span className="text-xs font-bold text-emerald-950/60 font-sans">
									/ year
								</span>
							</p>
						</div>
					</div>
					<div className="text-right">
						<span className="inline-flex items-center gap-1 rounded-full bg-emerald-800 text-white text-[11px] font-bold px-2.5 py-1">
							100% Genuine
						</span>
					</div>
				</div>

				{/* Real checklist proof points */}
				<div className="mt-4 space-y-1.5 pt-1">
					<div className="flex items-center gap-2 text-xs font-semibold text-emerald-950/75">
						<span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
							✓
						</span>
						<span>80th+ Percentile in Class 12 Boards</span>
					</div>
					<div className="flex items-center gap-2 text-xs font-semibold text-emerald-950/75">
						<span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
							✓
						</span>
						<span>Family Gross Income under ₹4.50 LPA</span>
					</div>
					<div className="flex items-center gap-2 text-xs font-semibold text-emerald-950/75">
						<span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
							✓
						</span>
						<span>No agent fees · Zero commercial links</span>
					</div>
				</div>
			</div>

			{/* Top-Right Floating Stamp */}
			<div className="absolute -top-4 -right-4 z-20 hidden sm:block">
				<div className="rounded-full border-[1.5px] border-emerald-950 bg-[#FEF9EE] px-3.5 py-1 shadow-sm transform rotate-6">
					<span className="text-xs font-extrabold text-[#78350F] tracking-wide">
						★ 55+ VERIFIED
					</span>
				</div>
			</div>

			{/* Bottom-Left Floating Pill */}
			<div className="absolute -bottom-3 -left-3 z-20 hidden sm:block">
				<div className="rounded-full border-[1.5px] border-emerald-950 bg-white px-3.5 py-1 shadow-sm transform -rotate-3">
					<span className="text-xs font-extrabold text-emerald-950 tracking-wide">
						LIVE DAILY SCANS
					</span>
				</div>
			</div>
		</div>
	);
}

export default CategoryBadge;
