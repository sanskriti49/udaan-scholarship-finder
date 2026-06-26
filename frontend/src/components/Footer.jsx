import { Link } from "react-router-dom";
import logoImg from "../assets/images/logo.png";

function Footer() {
	return (
		<footer className="font-pangea bg-white border-t border-gray-100">
			<div className="mx-auto max-w-7xl px-6 py-12 md:py-16 lg:px-8">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-gray-100">
					{/* Brand */}
					<div className="lg:col-span-1 flex flex-col gap-4">
						<Link to="/" className="flex items-center gap-3 w-max">
							<img
								src={logoImg}
								alt="Udaan Logo"
								className="w-10 h-10 object-contain"
							/>

							<div className="flex flex-col leading-none">
								<span className="text-2xl font-bold tracking-tight">
									<span style={{ color: "#6BBF2E" }}>uda</span>
									<span style={{ color: "#3B7DC8" }}>an</span>
								</span>

								<span className="text-[8px] font-bold tracking-widest uppercase text-gray-400 mt-1">
									find your scholarship
								</span>
							</div>
						</Link>

						<p className="text-gray-500 text-sm leading-relaxed max-w-sm">
							Helping students discover scholarships and government schemes
							through intelligent eligibility matching and verified
							opportunities.
						</p>
					</div>

					{/* Platform */}
					<div className="flex flex-col gap-4">
						<h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
							Platform
						</h3>

						<ul className="space-y-2.5 text-sm text-gray-500">
							<li>
								<Link
									to="/scholarships"
									className="hover:text-emerald-600 transition-colors"
								>
									Scholarships
								</Link>
							</li>

							<li>
								<Link
									to="/eligibility"
									className="hover:text-emerald-600 transition-colors"
								>
									Eligibility Checker
								</Link>
							</li>

							<li>
								<Link
									to="/resources"
									className="hover:text-emerald-600 transition-colors"
								>
									Resources
								</Link>
							</li>

							<li>
								<Link
									to="/assistant"
									className="hover:text-emerald-600 transition-colors"
								>
									AI Assistant
								</Link>
							</li>
						</ul>
					</div>

					{/* Support */}
					<div className="flex flex-col gap-4">
						<h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
							Support
						</h3>

						<ul className="space-y-2.5 text-sm text-gray-500">
							<li>
								<Link
									to="/support"
									className="hover:text-emerald-600 transition-colors"
								>
									Help Center
								</Link>
							</li>

							<li>
								<Link
									to="/support"
									className="hover:text-emerald-600 transition-colors"
								>
									FAQs
								</Link>
							</li>

							<li>
								<Link
									to="/contact"
									className="hover:text-emerald-600 transition-colors"
								>
									Contact Us
								</Link>
							</li>

							<li>
								<Link
									to="/report"
									className="hover:text-emerald-600 transition-colors"
								>
									Report Scholarship
								</Link>
							</li>
						</ul>
					</div>

					{/* Company */}
					<div className="flex flex-col gap-4">
						<h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
							Company
						</h3>

						<ul className="space-y-2.5 text-sm text-gray-500">
							<li>
								<Link
									to="/about"
									className="hover:text-emerald-600 transition-colors"
								>
									About
								</Link>
							</li>

							<li>
								<Link
									to="/privacy"
									className="hover:text-emerald-600 transition-colors"
								>
									Privacy Policy
								</Link>
							</li>

							<li>
								<Link
									to="/terms"
									className="hover:text-emerald-600 transition-colors"
								>
									Terms of Service
								</Link>
							</li>

							<li>
								<Link
									to="/cookies"
									className="hover:text-emerald-600 transition-colors"
								>
									Cookie Policy
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 text-sm text-gray-500">
					<p>© {new Date().getFullYear()} Udaan. All rights reserved.</p>

					<p className="text-center">
						Built with ❤️ to make education more accessible.
					</p>

					<div className="flex items-center gap-5">
						<a href="#" className="hover:text-emerald-600 transition-colors">
							GitHub
						</a>

						<a href="#" className="hover:text-emerald-600 transition-colors">
							LinkedIn
						</a>

						<a href="#" className="hover:text-emerald-600 transition-colors">
							X
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}

export default Footer;
