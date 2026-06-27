import { useState, useEffect } from "react";
import logoImg from "../assets/images/logo.png";
import { NavLink, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { Squash as Hamburger } from "hamburger-react";

const Navbar = () => {
	const location = useLocation();
	const [isOpen, setIsOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => setIsScrolled(window.scrollY > 20);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);
	useEffect(() => {
		setIsOpen(false);
	}, [location.pathname]);

	const navLinks = [
		{ name: "Home", path: "/" },
		{ name: "Scholarships", path: "/scholarships" },

		{ name: "Eligibility", path: "/eligibility" },
		{ name: "Resources", path: "/resources" },
		{ name: "Support ", path: "/support" },
	];

	return (
		<>
			<nav
				className={`font-satoshi fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 md:px-8 ${
					isScrolled
						? "py-2.5 bg-white/95 backdrop-blur-md border-b border-black/5 shadow-xs"
						: "py-4 bg-white/80 backdrop-blur-sm"
				}`}
			>
				<div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
					<NavLink to="/" className="flex items-center gap-2.5 group shrink-0">
						<div className="w-12 h-12 rounded-xl bg-[#C0DD97]/20 border border-emerald-100 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-102">
							<img
								src={logoImg}
								alt="Udaan"
								className="w-10 h-10 object-contain"
							/>
						</div>

						<div className="flex flex-col leading-none">
							<span className="text-2xl font-black tracking-tight">
								<span style={{ color: "#5AAD1F" }}>uda</span>
								<span style={{ color: "#3B7DC8" }}>an</span>
							</span>
							<span className="text-[8px] font-bold tracking-widest text-gray-400 uppercase mt-0.5">
								find your scholarship
							</span>
						</div>
					</NavLink>

					{/* desktop */}

					<div className="hidden md:flex items-center bg-gray-100/80 border border-gray-200/50 rounded-full p-1 gap-1">
						{navLinks.map((link) => (
							<NavLink
								key={link.name}
								to={link.path}
								className={({ isActive }) =>
									`px-4 py-1.5 text-[14px] rounded-full border transition-all duration-200 ease-out whitespace-nowrap ${
										isActive
											? "bg-white text-gray-900 font-semibold shadow-xs border-black/5"
											: "text-gray-500 font-medium border-transparent hover:text-gray-900 hover:bg-white/40"
									}`
								}
							>
								{link.name}
							</NavLink>
						))}
					</div>

					<div className="flex items-center gap-2.5 shrink-0">
						<button
							className="cursor-pointer hidden sm:flex w-9 h-9 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-gray-500 hover:text-gray-900 hover:bg-white transition-all"
							aria-label="Search"
						>
							<Search size={16} />
						</button>
						<NavLink
							to="/signup"
							className="hidden md:inline-flex px-4 py-2 text-[15px] font-semibold rounded-full border border-[#C0DD97] text-[#27500A] bg-[#EAF3DE] hover:bg-[#D4EBB0] active:scale-95 transition-all duration-150"
						>
							Sign up
						</NavLink>
						<NavLink
							to="/login"
							className="hidden md:inline-flex px-4 py-2 text-[15px] font-semibold rounded-full text-white active:scale-95 transition-all duration-150"
							style={{ background: "#3B7DC8" }}
						>
							Login
						</NavLink>
						<div className="md:hidden">
							<Hamburger
								toggled={isOpen}
								toggle={setIsOpen}
								size={26}
								rounded
								color="#374151"
								duration={0.35}
							/>
						</div>
					</div>
				</div>
				{/* mobile drawer */}
				<div
					className={`fixed top-21 left-0 right-0 bg-white border-b border-gray-100 shadow-lg transition-all duration-300 md:hidden ${
						isOpen
							? "opacity-100 translate-y-0"
							: "opacity-0 -translate-y-6 pointer-events-none"
					}`}
				>
					<div className="px-6 py-5 flex flex-col gap-2">
						{navLinks.map((link) => (
							<NavLink
								key={link.name}
								to={link.path}
								className={({ isActive }) =>
									`px-4 py-2.5 text-md rounded-lg transition-all ${
										isActive
											? "text-[#5AAD1F] font-bold bg-emerald-50/50 border-l-4 border-[#5AAD1F] rounded-l-none pl-3"
											: "text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900"
									}`
								}
							>
								{link.name}
							</NavLink>
						))}
						<button
							className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-base font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all text-left w-full"
							aria-label="Search"
						>
							<Search size={18} />
							<span>Search</span>
						</button>
						<div className="mt-4 grid grid-cols-2 gap-2">
							<NavLink
								to="/signup"
								className="flex items-center justify-center py-2.5 text-[13px] font-semibold rounded-xl border border-[#C0DD97] text-[#27500A] bg-[#EAF3DE] active:scale-95 transition-all"
							>
								Sign up
							</NavLink>
							<NavLink
								to="/login"
								className="flex items-center justify-center py-2.5 text-[13px] font-semibold rounded-xl text-white active:scale-95 transition-all"
								style={{ background: "#3B7DC8" }}
							>
								Login
							</NavLink>
						</div>
					</div>
				</div>
			</nav>

			<div className="h-19 md:h-21" />
		</>
	);
};

export default Navbar;
