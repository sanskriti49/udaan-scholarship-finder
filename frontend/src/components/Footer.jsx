import { Link } from "react-router-dom";
import Logo from "./Logo";
import { ArrowUpRight, Heart, ShieldCheck } from "lucide-react";

function Footer() {
	return (
		<footer className="bg-white border-t border-slate-200/80">
			<div className="mx-auto max-w-7xl px-5 sm:px-8 py-12 md:py-16">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-100">
					{/* Brand Column */}
					<div className="lg:col-span-2 flex flex-col gap-4">
						<Logo size="md" tagline="find your scholarship" />

						<p className="text-slate-600 text-sm leading-relaxed max-w-sm font-normal">
							Aggregating genuine Indian central, state, university, and corporate CSR scholarship circulars into verified, machine-executable eligibility logic.
						</p>

						<div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50/70 border border-emerald-200/60 px-3 py-1.5 rounded-full w-fit mt-1">
							<ShieldCheck size={14} className="text-emerald-700" />
							<span>Zero application fees • 100% Free Platform</span>
						</div>
					</div>

					{/* Navigation Column: Explore */}
					<div className="flex flex-col gap-3.5">
						<h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
							Explore
						</h3>
						<ul className="space-y-2.5 text-sm text-slate-600">
							<li>
								<Link
									to="/scholarships"
									className="hover:text-emerald-800 transition-colors"
								>
									Scholarship Catalog
								</Link>
							</li>
							<li>
								<Link
									to="/eligibility"
									className="hover:text-emerald-800 transition-colors"
								>
									Eligibility Engine
								</Link>
							</li>
							<li>
								<Link
									to="/scholarships?category=STEM"
									className="hover:text-emerald-800 transition-colors"
								>
									Women in STEM
								</Link>
							</li>
							<li>
								<Link
									to="/scholarships?category=Government"
									className="hover:text-emerald-800 transition-colors"
								>
									Central Govt Schemes
								</Link>
							</li>
						</ul>
					</div>

					{/* Navigation Column: Guides */}
					<div className="flex flex-col gap-3.5">
						<h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
							Guides & Help
						</h3>
						<ul className="space-y-2.5 text-sm text-slate-600">
							<li>
								<Link
									to="/resources"
									className="hover:text-emerald-800 transition-colors"
								>
									Document Checklist
								</Link>
							</li>
							<li>
								<Link
									to="/how-to-apply"
									className="hover:text-emerald-800 transition-colors"
								>
									Application Guide
								</Link>
							</li>
							<li>
								<Link
									to="/application-guide"
									className="hover:text-emerald-800 transition-colors"
								>
									Essay Writing Guide
								</Link>
							</li>
							<li>
								<Link
									to="/support"
									className="hover:text-emerald-800 transition-colors"
								>
									Support Center
								</Link>
							</li>
						</ul>
					</div>

					{/* Navigation Column: Open Source */}
					<div className="flex flex-col gap-3.5">
						<h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
							Open Source
						</h3>
						<ul className="space-y-2.5 text-sm text-slate-600">
							<li>
								<a
									href="https://github.com/sanskriti49/udaan-scholarship-finder"
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-emerald-800 transition-colors inline-flex items-center gap-1"
								>
									<span>GitHub Repository</span>
									<ArrowUpRight size={13} className="text-slate-400" />
								</a>
							</li>
							<li>
								<Link
									to="/support"
									className="hover:text-emerald-800 transition-colors"
								>
									Report Inaccurate Scheme
								</Link>
							</li>
							<li>
								<Link
									to="/support"
									className="hover:text-emerald-800 transition-colors"
								>
									Suggest New Scholarship
								</Link>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom Strip */}
				<div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 text-xs text-slate-500">
					<p>© {new Date().getFullYear()} Udaan Scholarship Finder. All rights reserved.</p>

					<p className="flex items-center gap-1 font-medium">
						Built for Indian students with <Heart size={13} className="text-rose-500 fill-rose-500" />
					</p>

					<div className="flex items-center gap-4 font-medium">
						<a
							href="https://github.com/sanskriti49/udaan-scholarship-finder"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-slate-900 transition-colors"
						>
							GitHub
						</a>
						<span>•</span>
						<Link to="/support" className="hover:text-slate-900 transition-colors">
							Support
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}

export default Footer;

