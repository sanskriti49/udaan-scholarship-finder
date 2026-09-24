import { Link } from "react-router-dom";
import logoImg from "../assets/images/logo.png";

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
	const sizeMap = {
		sm: {
			container: "w-8 h-8 sm:w-10 sm:h-10",
			title: "text-lg sm:text-xl",
			tagline: "text-[10px] sm:text-[11px]",
			spacing: "gap-2 sm:gap-2.5",
		},
		md: {
			container: "w-10 h-10 sm:w-[44px] sm:h-[44px] md:w-12 md:h-12",
			title: "text-xl sm:text-2xl md:text-[1.65rem]",
			tagline: "text-[11px] sm:text-xs",
			spacing: "gap-2.5 sm:gap-3",
		},
		lg: {
			container: "w-14 h-14 sm:w-16 sm:h-16",
			title: "text-2xl sm:text-3xl",
			tagline: "text-xs sm:text-sm",
			spacing: "gap-3 sm:gap-3.5",
		},
		xl: {
			container: "w-16 h-16 sm:w-20 sm:h-20",
			title: "text-3xl sm:text-4xl",
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
			<div className="flex items-center gap-1">
				<span
					className={`font-logo font-medium tracking-tight text-forest-950 transition-colors ${
						animated ? "group-hover:text-emerald-900" : ""
					} ${currentSize.title}`}
				>
					udaan
				</span>
			</div>

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
