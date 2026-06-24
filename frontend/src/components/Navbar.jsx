const Navbar = () => {
	return (
		<>
			<nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 transition-all duration-300">
				<div className="max-w-7xl mx-auto flex items-center justify-between">
					{/* Logo Container */}
					<a href="#" className="flex items-center space-x-2 group">
						{/* Graduation Cap Icon matching the AlterYouth vibe */}
						<svg
							className="w-8 h-8 text-[#10A353] transform transition-transform group-hover:scale-110 duration-200"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
							<path d="M19 13.83V18c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2v-4.17l7 3.82 7-3.82z" />
						</svg>
						<span className="text-xl font-bold tracking-tight text-gray-900">
							alter<span className="text-[#10A353]">youth</span>
						</span>
					</a>

					{/* Central Navigation Links (Pill Style) */}
					<div className="hidden md:flex items-center bg-gray-50/80 border border-gray-200/60 rounded-full p-1.5 shadow-sm">
						<a
							href="#"
							className="px-5 py-2 text-sm font-medium rounded-full bg-white text-gray-900 shadow-sm transition-all duration-200"
						>
							Home
						</a>
						<a
							href="#"
							className="px-5 py-2 text-sm font-medium text-gray-600 rounded-full hover:text-gray-900 hover:bg-gray-100/70 transition-all duration-200"
						>
							How It Works
						</a>
						<a
							href="#"
							className="px-5 py-2 text-sm font-medium text-gray-600 rounded-full hover:text-gray-900 hover:bg-gray-100/70 transition-all duration-200"
						>
							Scholarships
						</a>
						<a
							href="#"
							className="px-5 py-2 text-sm font-medium text-gray-600 rounded-full hover:text-gray-900 hover:bg-gray-100/70 transition-all duration-200"
						>
							Graduates
						</a>
						<a
							href="#"
							className="px-5 py-2 text-sm font-medium text-gray-600 rounded-full hover:text-gray-900 hover:bg-gray-100/70 transition-all duration-200"
						>
							Collaborate
						</a>
					</div>

					{/* Right Side Actions */}
					<div className="flex items-center space-x-3">
						{/* Hamburger Menu Button */}
						<button
							className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#10A353]/20"
							aria-label="Menu"
						>
							<svg
								className="w-5 h-5"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M4 6h16M4 12h16M4 18h16"
								/>
							</svg>
						</button>

						{/* Login CTA Button */}
						<a
							href="#"
							className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white bg-[#10A353] rounded-full hover:bg-[#0d8c47] shadow-md shadow-green-600/10 hover:shadow-lg hover:shadow-green-600/20 active:scale-95 transition-all duration-200"
						>
							Login
						</a>
					</div>
				</div>
			</nav>

			{/* Spacer to prevent hero content from being hidden behind the fixed navbar */}
			<div className="h-[76px]"></div>
		</>
	);
};

export default Navbar;
