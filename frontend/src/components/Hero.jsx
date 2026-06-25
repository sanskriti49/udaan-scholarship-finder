import heroImage from "../assets/images/hero-image.jpg";

function Hero() {
	return (
		<div className="font-pangea relative overflow-hidden bg-linear-to-b from-white via-gray-50/50 to-white">
			<div className="mx-auto max-w-7xl px-6 pt-12 pb-12 md:py-10 lg:px-8">
				<div className="grid grid-cols-1 gap-12 items-start lg:grid-cols-2 lg:gap-12">
					<div className="flex flex-col gap-8 justify-between">
						<div className="flex flex-col gap-6">
							<div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full w-max px-4 py-1.5 text-xs font-semibold tracking-wide uppercase shadow-sm">
								<span>🎓</span> One search can change a student's future
							</div>

							<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1]">
								Discover scholarships that help your dreams{" "}
								<span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-600 to-teal-500">
									take flight.
								</span>
							</h1>

							<p className="text-gray-600 text-lg sm:text-xl max-w-xl font-normal leading-relaxed">
								Empowering students to turn aspirations into achievements with
								verified pathways and simple applications.
							</p>
						</div>

						<div className="flex flex-col sm:flex-row gap-3 max-w-md pt-2">
							<div className="relative grow">
								<input
									type="text"
									placeholder="Search scholarships..."
									className="w-full px-5 py-3 rounded-full border border-gray-200 bg-white text-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
								/>
							</div>
							<button className="cursor-pointer px-7 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-md rounded-full transition-all duration-200 shadow-md shadow-emerald-600/10 active:scale-98">
								Explore Now
							</button>
						</div>
					</div>

					<div className="flex flex-col">
						<div className="hidden lg:flex justify-center lg:justify-end w-full">
							<div className="relative w-full max-w-2xl group">
								<div className="absolute inset-0 bg-gradient-to-tr from-emerald-600/10 to-blue-600/10 rounded-2xl rotate-2 scale-[1.02] -z-10 transition-transform group-hover:rotate-1 duration-300" />

								<img
									src={heroImage}
									alt="Hero banner"
									className="w-full h-auto object-cover rounded-2xl shadow-xl border border-gray-100 transition-transform duration-500 group-hover:scale-[1.01]"
								/>
							</div>
						</div>
						<div className="grid grid-cols-3 gap-2 sm:gap-4 pt-8 border-t border-gray-100 mt-4">
							<div className="pr-2">
								<h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-emerald-600">
									1,000+
								</h2>
								<p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
									Scholarships Active
								</p>
							</div>
							<div className="pl-4 pr-2">
								<h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-emerald-600">
									500+
								</h2>
								<p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
									Partner Colleges
								</p>
							</div>
							<div className="pl-4">
								<h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-emerald-600">
									95%
								</h2>
								<p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
									Verified Rate
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Hero;
