import { Link } from "react-router-dom";
import logoImg from "../assets/images/logo.png";

/**
 * Centralized Udaan Logo Component
 *
 * @param {Object} props
 * @param {"sm" | "md" | "lg" | "xl"} [props.size="md"] - Size preset
 * @param {string | boolean} [props.tagline="Scholarship Intelligence"] - Subtitle or false to hide
 * @param {string | false} [props.to="/"] - Navigation target (default: "/") or false for non-link div
 * @param {boolean} [props.iconOnly=false] - If true, only renders the logo mark container
 * @param {boolean} [props.showDot=true] - Render the signature gradient brand accent dot
 * @param {string} [props.className=""] - Extra container classes
 * @param {string} [props.emblemClassName=""] - Extra classes for emblem container
 * @param {string} [props.taglineClassName=""] - Extra classes for tagline (e.g. responsive hide)
 * @param {boolean} [props.animated=true] - Enable micro-hover animation
 */
export default function Logo({
	size = "md",
	tagline = "Scholarship Intelligence",
	to = "/",
	iconOnly = false,
	showDot = true,
	className = "",
	emblemClassName = "",
	taglineClassName = "",
	animated = true,
}) {
	// Size presets configuration with uncropped, generous containers
	const sizeMap = {
		sm: {
			container: "w-8 h-8 sm:w-9 sm:h-9",
			title: "text-lg sm:text-xl",
			dot: "w-1.5 h-1.5",
			tagline: "text-[10px] sm:text-[11px]",
			spacing: "gap-2 sm:gap-2.5",
		},
		md: {
			container: "w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12",
			title: "text-xl sm:text-2xl md:text-[1.65rem]",
			dot: "w-1.5 h-1.5 sm:w-2 sm:h-2",
			tagline: "text-[11px] sm:text-xs",
			spacing: "gap-2.5 sm:gap-3",
		},
		lg: {
			container: "w-13 h-13 sm:w-15 sm:h-15",
			title: "text-2xl sm:text-3xl",
			dot: "w-2 h-2 sm:w-2.5 sm:h-2.5",
			tagline: "text-xs sm:text-sm",
			spacing: "gap-3 sm:gap-3.5",
		},
		xl: {
			container: "w-16 h-16 sm:w-20 sm:h-20",
			title: "text-3xl sm:text-4xl",
			dot: "w-2.5 h-2.5 sm:w-3 sm:h-3",
			tagline: "text-sm sm:text-base",
			spacing: "gap-3.5 sm:gap-4",
		},
	};

	const currentSize = sizeMap[size] || sizeMap.md;

	const EmblemContent = (
		<div
			className={`relative shrink-0 flex items-center justify-center transition-transform duration-200 ease-out ${
				animated ? "group-hover:scale-105" : ""
			} ${currentSize.container} ${emblemClassName}`}
		>
			<img
				src={logoImg}
				alt="Udaan Emblem"
				className="w-full h-full object-contain object-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
			/>
		</div>
	);

	if (iconOnly) {
		if (to) {
			return (
				<Link
					to={to}
					className={`inline-flex items-center group shrink-0 ${className}`}
					aria-label="Udaan Homepage"
				>
					{EmblemContent}
				</Link>
			);
		}
		return (
			<div className={`inline-flex items-center shrink-0 ${className}`}>
				{EmblemContent}
			</div>
		);
	}

	const TextContent = (
		<div className="flex flex-col justify-center leading-none select-none">
			{/* Brand Wordmark */}
			<div className="flex items-center gap-1">
				<span
					className={`font-logo font-medium tracking-tight text-forest-950 transition-colors ${
						animated ? "group-hover:text-emerald-900" : ""
					} ${currentSize.title}`}
				>
					udaan
				</span>
				{/* Stylized Brand Accent Dot echoing the vibrant green/blue/amber emblem */}
				{showDot && (
					<span
						className={`inline-block rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-500 shrink-0 shadow-2xs ${currentSize.dot}`}
						aria-hidden="true"
					/>
				)}
			</div>

			{/* Subtitle / Tagline */}
			{tagline && (
				<span
					className={`font-sans font-semibold text-emerald-800 tracking-tight -mt-0.5 transition-colors ${
						animated ? "group-hover:text-emerald-950" : ""
					} ${currentSize.tagline} ${taglineClassName}`}
				>
					{tagline}
				</span>
			)}
		</div>
	);

	if (to) {
		return (
			<Link
				to={to}
				className={`inline-flex items-center group shrink-0 ${currentSize.spacing} ${className}`}
				aria-label="Udaan - Go to Homepage"
			>
				{EmblemContent}
				{TextContent}
			</Link>
		);
	}

	return (
		<div
			className={`inline-flex items-center shrink-0 ${currentSize.spacing} ${className}`}
		>
			{EmblemContent}
			{TextContent}
		</div>
	);
}
