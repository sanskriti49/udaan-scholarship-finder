import { Link } from "react-router-dom";
import Logo from "./Logo";
import { ArrowUpRight, Heart, ShieldCheck } from "lucide-react";

function Footer() {
	return (
		<footer className="bg-white border-t border-slate-200/80">
			<div className="mx-auto max-w-7xl px-5 sm:px-8 py-12 md:py-16">
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 pb-12 border-b border-slate-100">
					{/* Brand Column */}
					<div className="col-span-2 flex flex-col gap-3.5">
						<Logo size="md" tagline="find your scholarship" />

						<p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-sm font-normal">
							Verified government, university, and trust scholarships with
							evidence-backed eligibility criteria.
						</p>

						<div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full w-fit">
							<ShieldCheck size={13} className="text-emerald-700" />
							<span>100% Free Open Platform</span>
						</div>
					</div>

					{/* Navigation Column: Scholarships */}
					<div className="flex flex-col gap-3">
						<h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
							Scholarships
						</h3>
						<ul className="space-y-2 text-xs sm:text-sm text-slate-600">
							<li>
								<Link
									to="/scholarships"
									className="hover:text-emerald-800 transition-colors"
								>
									All Scholarships
								</Link>
							</li>
							<li>
								<Link
									to="/scholarships?category=Government"
									className="hover:text-emerald-800 transition-colors"
								>
									Central Schemes
								</Link>
							</li>
							<li>
								<Link
									to="/scholarships?state=UP"
									className="hover:text-emerald-800 transition-colors"
								>
									State Grants
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
									to="/scholarships?category=SC%20%2F%20ST%20%2F%20OBC"
									className="hover:text-emerald-800 transition-colors"
								>
									SC / ST / OBC
								</Link>
							</li>
							<li>
								<Link
									to="/scholarships?hasChanges=true"
									className="hover:text-amber-800 transition-colors flex items-center gap-1"
								>
									<span>Recent Updates</span>
									<span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
								</Link>
							</li>
						</ul>
					</div>

					{/* Navigation Column: Guides & Tools */}
					<div className="flex flex-col gap-3">
						<h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
							Tools & Guides
						</h3>
						<ul className="space-y-2 text-xs sm:text-sm text-slate-600">
							<li>
								<Link
									to="/eligibility"
									className="hover:text-emerald-800 transition-colors font-medium text-emerald-850"
								>
									Eligibility Check
								</Link>
							</li>
							<li>
								<Link
									to="/resources"
									className="hover:text-emerald-800 transition-colors"
								>
									Documents
								</Link>
							</li>
							<li>
								<Link
									to="/how-to-apply"
									className="hover:text-emerald-800 transition-colors"
								>
									How to Apply
								</Link>
							</li>
							<li>
								<Link
									to="/application-guide"
									className="hover:text-emerald-800 transition-colors"
								>
									Writing Guides
								</Link>
							</li>
							<li>
								<Link
									to="/settings"
									className="hover:text-emerald-800 transition-colors"
								>
									Alerts Setup
								</Link>
							</li>
						</ul>
					</div>

					{/* Navigation Column: Official Portals */}
					<div className="flex flex-col gap-3">
						<h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
							Official Portals
						</h3>
						<ul className="space-y-2 text-xs sm:text-sm text-slate-600">
							<li>
								<a
									href="https://scholarships.gov.in"
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-emerald-800 transition-colors inline-flex items-center gap-1"
								>
									<span>NSP Portal</span>
									<ArrowUpRight size={11} className="text-slate-400" />
								</a>
							</li>
							<li>
								<a
									href="https://www.aicte.gov.in/schemes/students-development-schemes"
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-emerald-800 transition-colors inline-flex items-center gap-1"
								>
									<span>AICTE</span>
									<ArrowUpRight size={11} className="text-slate-400" />
								</a>
							</li>
							<li>
								<a
									href="https://www.ugc.gov.in"
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-emerald-800 transition-colors inline-flex items-center gap-1"
								>
									<span>UGC</span>
									<ArrowUpRight size={11} className="text-slate-400" />
								</a>
							</li>
							<li>
								<a
									href="https://scholarship.up.gov.in"
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-emerald-800 transition-colors inline-flex items-center gap-1"
								>
									<span>UP Portal</span>
									<ArrowUpRight size={11} className="text-slate-400" />
								</a>
							</li>
							<li>
								<a
									href="https://mahadbt.maharashtra.gov.in"
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-emerald-800 transition-colors inline-flex items-center gap-1"
								>
									<span>MahaDBT</span>
									<ArrowUpRight size={11} className="text-slate-400" />
								</a>
							</li>
							<li>
								<a
									href="https://ssp.postmatric.karnataka.gov.in"
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-emerald-800 transition-colors inline-flex items-center gap-1"
								>
									<span>Karnataka SSP</span>
									<ArrowUpRight size={11} className="text-slate-400" />
								</a>
							</li>
						</ul>
					</div>

					{/* Navigation Column: Support & Info */}
					<div className="flex flex-col gap-3">
						<h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
							Help & Info
						</h3>
						<ul className="space-y-2 text-xs sm:text-sm text-slate-600">
							<li>
								<Link
									to="/support"
									className="hover:text-emerald-800 transition-colors"
								>
									Help & Support
								</Link>
							</li>
							<li>
								<Link
									to="/support"
									className="hover:text-emerald-800 transition-colors"
								>
									Report Issue
								</Link>
							</li>
							<li>
								<Link
									to="/support"
									className="hover:text-emerald-800 transition-colors"
								>
									Suggest Scheme
								</Link>
							</li>
							<li>
								<a
									href="https://github.com/sanskriti49/udaan-scholarship-finder"
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-emerald-800 transition-colors inline-flex items-center gap-1"
								>
									<span>GitHub</span>
									<ArrowUpRight size={11} className="text-slate-400" />
								</a>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom Strip */}
				<div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 text-xs text-slate-500">
					<p>
						&copy; {new Date().getFullYear()} Udaan Scholarship Finder.
					</p>

					<p className="flex items-center gap-1 font-medium text-slate-600">
						Built with
						<Heart size={12} className="text-rose-500 fill-rose-500" />
						for students across India
					</p>

					<div className="flex items-center gap-4 font-medium">
						<Link
							to="/scholarships"
							className="hover:text-emerald-800 transition-colors"
						>
							Scholarships
						</Link>
						<span>&bull;</span>
						<Link
							to="/eligibility"
							className="hover:text-emerald-800 transition-colors"
						>
							Eligibility
						</Link>
						<span>&bull;</span>
						<Link
							to="/support"
							className="hover:text-emerald-800 transition-colors"
						>
							Support
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}

export default Footer;

