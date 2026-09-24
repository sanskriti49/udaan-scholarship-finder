import { createPortal } from "react-dom";
import Logo from "./Logo";

export default function FullScreenLoader() {
	const content = (
		<div
			className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FAF9F6] select-none"
			role="status"
			aria-label="Loading page"
		>
			<div className="relative mb-6">
				<div className="absolute -inset-3 bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-sky-500/20 rounded-3xl blur-md" />
				
				<div className="relative">
					<Logo size="lg" to={false} tagline="Finding Opportunities..." animated={false} />
				</div>
			</div>

			<div className="w-36 h-1 bg-slate-200/80 rounded-full overflow-hidden">
				<div className="h-full w-2/3 bg-emerald-750 rounded-full animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(content, document.body);
	}

	return content;
}

