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

			<div className="w-40 h-1.5 bg-emerald-950/10 rounded-full overflow-hidden relative">
				<div className="absolute inset-y-0 bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-800 rounded-full animate-indeterminate" />
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(content, document.body);
	}

	return content;
}

