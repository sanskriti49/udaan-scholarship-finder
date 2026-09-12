import Logo from "./Logo";

export default function FullScreenLoader() {
	return (
		<div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#FAF9F6]">
			<div className="relative mb-6">
				{/* Ambient Glow */}
				<div className="absolute -inset-2 bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-sky-500/20 rounded-3xl blur-md"></div>
				
				{/* Centralized Logo with micro-scale animation */}
				<div className="relative animate-pulse">
					<Logo size="lg" to={false} tagline="Finding Opportunities..." animated={false} />
				</div>
			</div>

			{/* Loading track bar */}
			<div className="w-36 h-1 bg-slate-200/80 rounded-full overflow-hidden">
				<div className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 rounded-full animate-pulse"></div>
			</div>
		</div>
	);
}

