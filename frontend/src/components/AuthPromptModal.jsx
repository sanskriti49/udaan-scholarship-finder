import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { Bookmark, BookmarkCheck, X, ArrowRight, ShieldCheck, Clock, Sparkles } from "lucide-react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";

export default function AuthPromptModal({
	isOpen,
	onClose,
	scholarshipTitle = "",
	scholarshipId = "",
}) {
	const navigate = useNavigate();
	const location = useLocation();

	useBodyScrollLock(isOpen);

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === "Escape") onClose();
		};
		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
		}
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const currentPath = encodeURIComponent(location.pathname + location.search);
	const targetRedirect = scholarshipId
		? `/scholarships?saveIntent=${scholarshipId}&highlight=${scholarshipId}`
		: location.pathname + location.search;

	const handleNavigate = (path) => {
		if (scholarshipId) {
			try {
				sessionStorage.setItem("udaan_pending_bookmark", scholarshipId);
			} catch (_) {}
		}
		onClose();
		navigate(`${path}?redirect=${encodeURIComponent(targetRedirect)}`);
	};

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="auth-modal-title"
		>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-emerald-950/45 backdrop-blur-[2px] transition-opacity"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Modal Card */}
			<div className="relative w-full max-w-md rounded-3xl border-[1.5px] border-emerald-950 bg-[#FAF9F6] p-6 sm:p-7 shadow-[0_24px_48px_-12px_rgba(8,28,16,0.24)] text-emerald-950 animate-scale-in">
				{/* Close Button */}
				<button
					type="button"
					onClick={onClose}
					aria-label="Close"
					className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-emerald-950/20 bg-white text-emerald-950 hover:bg-yellow-200 transition-colors"
				>
					<X size={15} />
				</button>

				{/* Header Badge */}
				<div className="flex items-center gap-2 mb-3">
					<span className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-emerald-950 bg-yellow-200 text-emerald-950">
						<Bookmark size={16} strokeWidth={2.5} />
					</span>
					<span className="inline-flex items-center gap-1 rounded-full border border-emerald-950/15 bg-white px-2.5 py-0.5 text-xs font-bold text-emerald-900">
						<ShieldCheck size={12} className="text-emerald-800" />
						Free Student Feature
					</span>
				</div>

				<h3 id="auth-modal-title" className="ud-display text-2xl font-bold leading-snug">
					Sign in to save scholarships
				</h3>

				<p className="mt-2 text-sm text-emerald-950/70 leading-relaxed font-medium">
					{scholarshipTitle ? (
						<>
							Log in or create an account to save{" "}
							<strong className="text-emerald-950 font-bold">
								&ldquo;{scholarshipTitle}&rdquo;
							</strong>{" "}
							and access it anytime.
						</>
					) : (
						"Save verified opportunities, track application deadlines, and receive automated countdown alerts before portals close."
					)}
				</p>

				{/* Feature highlights */}
				<div className="mt-4 space-y-2 rounded-2xl border-[1.5px] border-emerald-950/15 bg-white p-3.5 text-xs font-medium text-emerald-950/80">
					<div className="flex items-center gap-2">
						<Clock size={14} className="text-emerald-800 shrink-0" />
						<span>Automatic 7-day & 48-hour deadline countdown reminders</span>
					</div>
					<div className="flex items-center gap-2">
						<Sparkles size={14} className="text-amber-700 shrink-0" />
						<span>Curated Saved Scholarships dashboard with live portal links</span>
					</div>
					<div className="flex items-center gap-2">
						<BookmarkCheck size={14} className="text-teal-700 shrink-0" />
						<span>Seamless synchronization across all your devices</span>
					</div>
				</div>

				{/* Actions */}
				<div className="mt-6 flex flex-col gap-2.5">
					<button
						type="button"
						onClick={() => handleNavigate("/login")}
						className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-800 py-3 text-sm font-bold text-white shadow-2xs transition-colors hover:bg-emerald-900"
					>
						<span>Sign In</span>
						<ArrowRight size={15} />
					</button>

					<button
						type="button"
						onClick={() => handleNavigate("/signup")}
						className="flex w-full cursor-pointer items-center justify-center rounded-full border-[1.5px] border-emerald-950 bg-white py-2.5 text-sm font-bold text-emerald-950 transition-colors hover:bg-yellow-200"
					>
						Create Free Account
					</button>

					<button
						type="button"
						onClick={onClose}
						className="mt-1 text-center text-xs font-semibold text-emerald-950/60 hover:text-emerald-950 transition-colors cursor-pointer"
					>
						Continue browsing as guest
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
