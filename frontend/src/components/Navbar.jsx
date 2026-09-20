import { useState, useEffect, useRef } from "react";
import Logo from "./Logo";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
	LogOut,
	ChevronDown,
	Settings as SettingsIcon,
	Sparkles,
	Compass,
	CheckCircle2,
	Bookmark,
	ArrowRight,
	Search,
	X,
	ShieldCheck,
	FileText,
} from "lucide-react";
import { Squash as Hamburger } from "hamburger-react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import NotificationCenter from "./NotificationCenter";

const Navbar = () => {
	const location = useLocation();
	const [isOpen, setIsOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [navSearch, setNavSearch] = useState("");
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const profileRef = useRef(null);

	const handleNavSearch = (e) => {
		e.preventDefault();
		if (navSearch.trim()) {
			navigate(`/scholarships?search=${encodeURIComponent(navSearch.trim())}`);
			setIsSearchOpen(false);
			setIsOpen(false);
			setNavSearch("");
		}
	};

	useEffect(() => {
		const handleScroll = () => setIsScrolled(window.scrollY > 15);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	useEffect(() => {
		setIsOpen(false);
		setIsProfileOpen(false);
	}, [location.pathname]);

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (profileRef.current && !profileRef.current.contains(e.target)) {
				setIsProfileOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const guestLinks = [
		{ name: "Home", path: "/" },
		{ name: "Scholarships", path: "/scholarships" },
		{ name: "Trust Shield", path: "/trust-shield" },
		{ name: "Resources", path: "/resources" },
	];

	const loggedInLinks = [
		{ name: "Home", path: "/" },
		{ name: "Scholarships", path: "/scholarships" },
		{ name: "Eligibility", path: "/eligibility" },
		{ name: "Documents", path: "/documents" },
		{ name: "Resources", path: "/resources" },
	];

	const activeNavLinks = user ? loggedInLinks : guestLinks;

	const handleLogout = async () => {
		await logout();
		toast.success("Logged out successfully");
		setIsProfileOpen(false);
		setIsOpen(false);
		navigate("/");
	};

	const initials = user?.name
		? user.name
				.split(" ")
				.map((n) => n[0])
				.slice(0, 2)
				.join("")
				.toUpperCase()
		: "U";

	return (
		<>
			<header
				className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
					isScrolled
						? "py-2.5 px-4 sm:px-6 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs"
						: "py-3.5 px-4 sm:px-8 bg-transparent"
				}`}
			>
				<div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
					<Logo
						size="md"
						tagline="Scholarship Intelligence"
						taglineClassName="hidden sm:inline-block"
					/>

					<nav className="hidden lg:flex items-center bg-white/95 backdrop-blur-xs border border-slate-200/80 rounded-full p-1 shadow-2xs">
						{activeNavLinks.map((link) => (
							<NavLink
								key={link.name}
								to={link.path}
								className={({ isActive }) =>
									`px-4 py-1.5 text-sm rounded-full transition-all duration-150 font-medium ${
										isActive
											? "bg-slate-900 text-white font-semibold shadow-2xs"
											: "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
									}`
								}
							>
								{link.name}
							</NavLink>
						))}
					</nav>

					<div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
						<form onSubmit={handleNavSearch} className="relative hidden md:flex items-center">
							<div
								className={`flex items-center transition-all duration-200 ${
									isSearchOpen
										? "w-56 sm:w-64 bg-white border border-slate-300 shadow-2xs"
										: "w-9 sm:w-36 bg-white/80 border border-slate-200/90 hover:border-slate-300 hover:bg-white"
								} rounded-full px-2.5 py-1`}
							>
								<Search
									size={14}
									className="text-slate-400 shrink-0 cursor-pointer hover:text-emerald-700"
									onClick={() => setIsSearchOpen(true)}
								/>
								<input
									type="text"
									value={navSearch}
									onChange={(e) => setNavSearch(e.target.value)}
									onFocus={() => setIsSearchOpen(true)}
									onBlur={() => {
										if (!navSearch) setIsSearchOpen(false);
									}}
									placeholder="Quick search..."
									className="w-full bg-transparent border-none text-xs outline-none ml-2 text-slate-800 placeholder:text-slate-400 font-sans"
								/>
								{navSearch && (
									<button
										type="button"
										onClick={() => {
											setNavSearch("");
											setIsSearchOpen(false);
										}}
										className="text-slate-400 hover:text-slate-600 cursor-pointer ml-1"
										title="Clear input"
									>
										<X size={12} />
									</button>
								)}
							</div>
						</form>

						{user ? (
							<>
								<NotificationCenter />
								<div className="relative" ref={profileRef}>
								<button
									onClick={() => setIsProfileOpen((prev) => !prev)}
									className="cursor-pointer flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs"
								>
									<div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-800 to-emerald-950 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
										{initials}
									</div>
									<span className="text-xs font-semibold text-slate-800 max-w-24 truncate hidden sm:inline-block">
										{user.name?.split(" ")[0] || "Account"}
									</span>
									<ChevronDown
										size={13}
										className={`text-slate-400 transition-transform ${
											isProfileOpen ? "rotate-180" : ""
										}`}
									/>
								</button>

								<div
									className={`absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden transition-all duration-150 origin-top-right z-50 ${
										isProfileOpen
											? "opacity-100 scale-100 pointer-events-auto"
											: "opacity-0 scale-95 pointer-events-none"
									}`}
								>
									<div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
										<p className="text-xs font-bold text-slate-900 truncate">
											{user.name}
										</p>
										<p className="text-[11px] text-slate-500 truncate mt-0.5">
											{user.email}
										</p>
									</div>

									<div className="py-1">
										<NavLink
											to="/eligibility"
											onClick={() => setIsProfileOpen(false)}
											className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition-colors"
										>
											<CheckCircle2 size={14} className="text-emerald-600" />
											Check Eligibility
										</NavLink>
										<NavLink
											to="/scholarships"
											onClick={() => setIsProfileOpen(false)}
											className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition-colors"
										>
											<Compass size={14} className="text-slate-400" />
											Explore Catalog
										</NavLink>
										<NavLink
											to="/documents"
											onClick={() => setIsProfileOpen(false)}
											className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition-colors"
										>
											<FileText size={14} className="text-slate-400" />
											Document Vault
										</NavLink>
										<NavLink
											to="/trust-shield"
											onClick={() => setIsProfileOpen(false)}
											className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition-colors"
										>
											<ShieldCheck size={14} className="text-slate-400" />
											Trust Shield
										</NavLink>
										<NavLink
											to="/settings"
											onClick={() => setIsProfileOpen(false)}
											className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition-colors"
										>
											<SettingsIcon size={14} className="text-slate-400" />
											Account Settings
										</NavLink>
									</div>

									<div className="border-t border-slate-100 py-1 bg-slate-50/30">
										<button
											onClick={handleLogout}
											className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50/60 transition-colors text-left"
										>
											<LogOut size={14} />
											Log Out
										</button>
									</div>
								</div>
							</div>
						</>
						) : (
							<div className="hidden sm:flex items-center gap-2 font-heading">
								<NavLink
									to="/login"
									className="px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
								>
									Log in
								</NavLink>
								<NavLink
									to="/signup"
									className="px-4 py-2 text-sm font-semibold rounded-full bg-emerald-800 hover:bg-emerald-900 text-white transition-all duration-150 shadow-2xs hover:shadow-xs flex items-center gap-1.5"
								>
									<span>Get Started</span>
									<ArrowRight size={13} />
								</NavLink>
							</div>
						)}

						<div className="lg:hidden">
							<Hamburger
								toggled={isOpen}
								toggle={setIsOpen}
								size={20}
								rounded
								color="#0f172a"
								duration={0.25}
							/>
						</div>
					</div>
				</div>

				<div
					className={`fixed top-[58px] left-0 right-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xl transition-all duration-200 lg:hidden ${
						isOpen
							? "opacity-100 translate-y-0 pointer-events-auto"
							: "opacity-0 -translate-y-3 pointer-events-none"
					}`}
				>
					<div className="p-4 sm:p-5 flex flex-col gap-1 max-w-lg mx-auto">
						{user && (
							<div className="flex items-center gap-3 p-3 mb-2 bg-slate-50 rounded-2xl border border-slate-200/80">
								<div className="w-9 h-9 rounded-full bg-emerald-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
									{initials}
								</div>
								<div className="flex flex-col min-w-0">
									<span className="text-sm font-bold text-slate-900 truncate">
										{user.name}
									</span>
									<span className="text-xs text-slate-500 truncate">
										{user.email}
									</span>
								</div>
							</div>
						)}

						<form onSubmit={handleNavSearch} className="relative mb-2.5">
							<Search
								size={15}
								className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
							/>
							<input
								type="text"
								value={navSearch}
								onChange={(e) => setNavSearch(e.target.value)}
								placeholder="Search scholarships..."
								className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs outline-none focus:bg-white focus:border-emerald-700 text-slate-800 font-sans"
							/>
							{navSearch && (
								<button
									type="button"
									onClick={() => setNavSearch("")}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
								>
									<X size={13} />
								</button>
							)}
						</form>

						{activeNavLinks.map((link) => (
							<NavLink
								key={link.name}
								to={link.path}
								className={({ isActive }) =>
									`px-4 py-2.5 text-sm rounded-xl font-medium transition-colors ${
										isActive
											? "bg-slate-900 text-white font-semibold"
											: "text-slate-700 hover:bg-slate-50"
									}`
								}
							>
								{link.name}
							</NavLink>
						))}

						<div className="pt-3 border-t border-slate-100 mt-2 flex flex-col gap-2">
							{user ? (
								<>
									<NavLink
										to="/settings"
										className="px-4 py-2.5 text-sm text-slate-700 font-medium flex items-center gap-2 rounded-xl hover:bg-slate-50"
									>
										<SettingsIcon size={16} className="text-slate-500" />{" "}
										Account Settings
									</NavLink>
									<button
										onClick={handleLogout}
										className="px-4 py-2.5 text-sm text-rose-600 font-semibold flex items-center gap-2 text-left rounded-xl hover:bg-rose-50/50"
									>
										<LogOut size={16} /> Log Out
									</button>
								</>
							) : (
								<div className="grid grid-cols-2 gap-2 pt-1">
									<NavLink
										to="/login"
										className="text-center py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-800 bg-white"
									>
										Log In
									</NavLink>
									<NavLink
										to="/signup"
										className="text-center py-2.5 text-sm font-semibold rounded-xl bg-emerald-800 text-white"
									>
										Sign Up
									</NavLink>
								</div>
							)}
						</div>
					</div>
				</div>
			</header>

			<div className="h-16 sm:h-18" />
		</>
	);
};

export default Navbar;
