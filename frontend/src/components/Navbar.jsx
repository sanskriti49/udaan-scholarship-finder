import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import {
	ArrowUpRight,
	ChevronDown,
	LogOut,
	Menu,
	Search,
	X,
	LockKeyhole,
	Bookmark,
	Settings,
	Bell,
	ScanLine,
	ClipboardCheck,
	ShieldCheck,
	SlidersHorizontal,
} from "lucide-react";
import Logo from "./Logo";
import NotificationCenter from "./NotificationCenter";
import { useAuth } from "../hooks/useAuth";
import { PUBLIC_TOOLS, ACCOUNT_FEATURES } from "../config/navigation";
import { authDestination } from "../utils/authNavigation";
import "./navigation.css";

const MAIN_LINKS = [
	{ label: "Home", path: "/" },
	{ label: "Scholarships", path: "/scholarships" },
	{ label: "Resources", path: "/resources" },
];
const TOOL_ICONS = [SlidersHorizontal, ScanLine, ClipboardCheck, ShieldCheck];
const ACCOUNT_ICONS = [Bookmark, Bell, Settings];

export default function Navbar() {
	const { user, logout } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();
	const [disclosure, setDisclosure] = useState(null);
	const [search, setSearch] = useState("");
	const [scrolled, setScrolled] = useState(false);
	const headerRef = useRef(null);
	const triggerRef = useRef(null);

	// A route change closes every disclosure, including browser back/forward.
	const open = disclosure?.key === location.key ? disclosure.type : null;
	const close = () => setDisclosure(null);
	const toggle = (type, event) => {
		triggerRef.current = event.currentTarget;
		setDisclosure(open === type ? null : { type, key: location.key });
	};

	// The bar gains a hairline and soft shadow once the page scrolls under it.
	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 8);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		if (!open) return;
		const dismiss = (event) => {
			if (event.type === "keydown" && event.key === "Escape") {
				setDisclosure(null);
				triggerRef.current?.focus();
			} else if (
				(event.type === "pointerdown" || event.type === "focusin") &&
				!headerRef.current?.contains(event.target)
			) {
				setDisclosure(null);
			}
		};
		const resize = () => setDisclosure(null);
		document.addEventListener("pointerdown", dismiss);
		document.addEventListener("keydown", dismiss);
		document.addEventListener("focusin", dismiss);
		window.addEventListener("resize", resize);
		return () => {
			document.removeEventListener("pointerdown", dismiss);
			document.removeEventListener("keydown", dismiss);
			document.removeEventListener("focusin", dismiss);
			window.removeEventListener("resize", resize);
		};
	}, [open]);

	function submitSearch(event) {
		event.preventDefault();
		navigate(
			`/scholarships${search.trim() ? `?${new URLSearchParams({ search: search.trim() })}` : ""}`,
		);
		close();
		setSearch("");
	}
	async function signOut() {
		await logout();
		close();
		navigate("/");
	}

	const returnPath = location.pathname + location.search + location.hash;
	const initials =
		user?.name
			?.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((p) => p[0])
			.join("")
			.toUpperCase() || "U";

	const searchForm = (
		<form onSubmit={submitSearch} className="site-nav-search-form">
			<label htmlFor="site-nav-search">Search scholarships</label>
			<div>
				<input
					id="site-nav-search"
					type="search"
					placeholder="Name or keyword"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					autoFocus={open === "search"}
				/>
				<button type="submit" aria-label="Submit scholarship search">
					<Search size={17} />
				</button>
			</div>
		</form>
	);

	const createAccount = (extraProps = {}) => (
		<Link
			className="site-nav-create"
			to={authDestination("/signup", returnPath)}
			{...extraProps}
		>
			Create account
			<span className="site-nav-create-arrow">
				<ArrowUpRight size={14} />
			</span>
		</Link>
	);

	return (
		<>
			<header ref={headerRef} className="site-header" data-scrolled={scrolled}>
				<div className="site-nav-inner">
					<Logo size="md" tagline="Find your way forward" />

					<nav aria-label="Main navigation" className="site-nav-main">
						{MAIN_LINKS.map((link) => (
							<NavLink
								key={link.path}
								to={link.path}
								end={link.path === "/"}
								onClick={close}
							>
								{link.label}
							</NavLink>
						))}

						<div className="site-nav-anchor">
							<button
								type="button"
								className={
									PUBLIC_TOOLS.some((item) => item.path === location.pathname)
										? "site-nav-tool-active"
										: ""
								}
								aria-expanded={open === "tools"}
								aria-controls="site-nav-tools"
								onClick={(event) => toggle("tools", event)}
							>
								Tools <ChevronDown size={14} />
							</button>
							{open === "tools" && (
								<nav
									id="site-nav-tools"
									aria-label="Public tools"
									className="site-nav-panel site-nav-tools"
								>
									<p className="site-nav-panel-label">
										Tools for everyone <span>No sign-in needed</span>
									</p>
									{PUBLIC_TOOLS.map((tool, index) => {
										const Icon = TOOL_ICONS[index];
										return (
											<Link key={tool.path} to={tool.path} onClick={close}>
												<span className="site-nav-item-icon">
													<Icon size={18} />
												</span>
												<span className="site-nav-item-copy">
													<strong>{tool.label}</strong>
													<small>{tool.description}</small>
												</span>
												<ArrowUpRight size={15} />
											</Link>
										);
									})}
								</nav>
							)}
						</div>

						{user && (
							<NavLink to="/saved" onClick={close}>
								Saved
							</NavLink>
						)}
					</nav>

					<div className="site-nav-actions">
						<div className="site-nav-anchor site-nav-search">
							<button
								type="button"
								className="site-nav-icon"
								aria-label="Search scholarships"
								aria-expanded={open === "search"}
								aria-controls="site-nav-search-panel"
								onClick={(event) => toggle("search", event)}
							>
								<Search size={18} />
							</button>
							{open === "search" && (
								<div
									id="site-nav-search-panel"
									className="site-nav-panel site-nav-search-panel"
								>
									{searchForm}
								</div>
							)}
						</div>

						{user ? (
							<>
								<NotificationCenter />
								<div className="site-nav-anchor">
									<button
										type="button"
										className="site-nav-account"
										aria-label="Your account"
										aria-expanded={open === "account"}
										aria-controls="site-nav-account-panel"
										onClick={(event) => toggle("account", event)}
									>
										<span className="site-nav-avatar">{initials}</span>
										<span className="site-nav-name">
											{user.name?.split(" ")[0] || "Account"}
										</span>
										<ChevronDown size={13} />
									</button>
									{open === "account" && (
										<nav
											id="site-nav-account-panel"
											aria-label="Your account"
											className="site-nav-panel site-nav-account-panel"
										>
											<div className="site-nav-user">
												<span className="site-nav-avatar" aria-hidden="true">
													{initials}
												</span>
												<div>
													<strong>{user.name || "Your account"}</strong>
													<span>{user.email}</span>
												</div>
											</div>
											{ACCOUNT_FEATURES.map((item, index) => {
												const Icon = ACCOUNT_ICONS[index];
												return (
													<Link to={item.path} key={item.path} onClick={close}>
														<span className="site-nav-item-icon">
															<Icon size={16} />
														</span>
														<span className="site-nav-item-copy">
															{item.label}
														</span>
														<ArrowUpRight size={14} />
													</Link>
												);
											})}
											<button
												type="button"
												className="site-nav-logout"
												onClick={signOut}
											>
												<LogOut size={15} /> Sign out
											</button>
										</nav>
									)}
								</div>
							</>
						) : (
							<>
								<Link
									className="site-nav-signin"
									to={authDestination("/login", returnPath)}
								>
									Sign in
								</Link>
								{createAccount()}
							</>
						)}

						<button
							type="button"
							className="site-nav-mobile-toggle site-nav-icon"
							aria-label={
								open === "mobile" ? "Close navigation" : "Open navigation"
							}
							aria-expanded={open === "mobile"}
							aria-controls="site-nav-mobile"
							onClick={(event) => toggle("mobile", event)}
						>
							{open === "mobile" ? <X size={21} /> : <Menu size={21} />}
						</button>
					</div>
				</div>

				{open === "mobile" && (
					<nav
						id="site-nav-mobile"
						className="site-nav-mobile"
						aria-label="Mobile navigation"
					>
						{searchForm}
						{MAIN_LINKS.map((link) => (
							<NavLink
								key={link.path}
								to={link.path}
								end={link.path === "/"}
								className="site-nav-mobile-primary"
								onClick={close}
							>
								{link.label}
								<ArrowUpRight size={16} />
							</NavLink>
						))}

						<p className="site-nav-panel-label">
							Tools <span>No sign-in needed</span>
						</p>
						{PUBLIC_TOOLS.map((item) => (
							<NavLink key={item.path} to={item.path} onClick={close}>
								{item.label}
								<ArrowUpRight size={15} />
							</NavLink>
						))}

						<p className="site-nav-panel-label">
							{user ? "Your account" : "With an account"}
							{!user && <span>Sign in to use these</span>}
						</p>
						{ACCOUNT_FEATURES.map((item) => (
							<Link
								key={item.path}
								to={user ? item.path : authDestination("/login", item.path)}
								onClick={close}
							>
								{item.label}
								{user ? <ArrowUpRight size={15} /> : <LockKeyhole size={13} />}
							</Link>
						))}
						<Link to="/support" onClick={close}>
							Help & support
							<ArrowUpRight size={15} />
						</Link>

						{user ? (
							<button
								className="site-nav-logout"
								type="button"
								onClick={signOut}
							>
								<LogOut size={15} /> Sign out
							</button>
						) : (
							createAccount({ onClick: close })
						)}
					</nav>
				)}
			</header>
			<div className="site-header-space" />
		</>
	);
}
