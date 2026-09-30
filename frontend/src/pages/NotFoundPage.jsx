import { Link } from "react-router-dom";
import errorImg from "../assets/images/error.png"; 

function NotFoundPage() {
	return (
		<main className="min-h-screen w-full bg-[#fcfcf9] flex flex-col items-center justify-center px-6 py-16 selection:bg-emerald-100 selection:text-emerald-900">
			<div className="flex flex-col items-center max-w-xl w-full text-center">
				<div className="relative mb-6 transform transition-transform duration-300 hover:scale-[1.02]">
					<img
						src={errorImg}
						alt="404 - Page Not Found"
						className="w-full max-w-sm sm:max-w-md h-auto drop-shadow-sm select-none"
						priority="true"
					/>
				</div>

				<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#164229] mb-3">
					A dead link, not a rejection letter.
				</h1>

				<p className="text-sm sm:text-base text-[#164229]/75 leading-relaxed max-w-md mb-8">
					Unlike tuition bills, this page completely disappeared. Don&apos;t
					waste study hours on a dead end. Head back to match with real grants.
				</p>

				<div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
					<Link
						to="/"
						className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-[#1b5e37] hover:bg-[#144729] text-white text-sm font-semibold tracking-wide shadow-md shadow-emerald-900/10 hover:shadow-lg transition-all duration-200 active:scale-95"
					>
						Explore Scholarships
					</Link>

					<Link
						to="/"
						className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-medium text-[#164229] hover:bg-[#164229]/5 transition-colors duration-200"
					>
						Return to Dashboard &rarr;
					</Link>
				</div>
			</div>
		</main>
	);
}

export default NotFoundPage;
