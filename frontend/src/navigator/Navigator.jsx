import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { ArrowUpRight, Compass, BookOpen, AlertTriangle } from "lucide-react";
import { PageStyles } from "../components/PageKit";
import { useAuth } from "../hooks/useAuth";
import ResearchDesk from "./ResearchDesk";
import Investigation from "./Investigation";
import ResearchPlan from "./ResearchPlan";
import useNavigator from "./useNavigator";
import { providerLabel } from "./contracts";
import "./navigator.css";
import "./navigator-refresh.css";
import "./navigator-experience.css";

export default function Navigator() {
	const { user } = useAuth();
	return (
		<NavigatorWorkspace
			key={user?._id || user?.id || user?.email || "guest"}
			signedIn={Boolean(user)}
		/>
	);
}

function NavigatorWorkspace({ signedIn }) {
	const rootRef = useRef(null),
		{ pathname, search } = useLocation();
	const runId = new URLSearchParams(search).get("run");
	const research = useNavigator({ signedIn, runId });
	const [draft, setDraft] = useState({
		goal: "",
		includeProfile: false,
		profile: {
			educationLevel: "",
			state: "",
			familyIncome: "",
			percentage: "",
		},
	});

	useEffect(() => {
		const previousTitle = document.title;
		const title = pathname.endsWith("/investigation")
			? "Investigation"
			: pathname.endsWith("/plan")
				? "Research plan"
				: "Your brief";
		document.title = `${title} · Navigator · Udaan`;
		const heading = rootRef.current?.querySelector("h1");
		if (heading) {
			heading.tabIndex = -1;
			heading.focus({ preventScroll: true });
		}
		return () => {
			document.title = previousTitle;
		};
	}, [pathname]);

	const query = research.run ? `?run=${research.run.runId}` : "";
	const common = { research, signedIn, query };

	return (
		<main className="nv-root ud-root" id="navigator-main" ref={rootRef}>
			<PageStyles />
			<div className="nv-shell">
				<nav className="nv-page-nav" aria-label="Navigator pages">
					{[
						["/navigator", "01", "Ask a question"],
						["/navigator/investigation", "02", "Research"],
						["/navigator/plan", "03", "Your findings"],
					].map(([path, number, label]) => (
						<NavLink
							key={path}
							to={`${path}${path === "/navigator" ? "" : query}`}
							end
						>
							<span>{number}</span>
							{label}
							<ArrowUpRight size={14} />
						</NavLink>
					))}
				</nav>

				{research.available === false && (
					<div className="nv-connection-card" role="alert">
						<span className="nv-connection-orbit" aria-hidden="true" />
						<div>
							<strong>
								{research.connectionState === "initializing"
									? "Getting Udaan ready…"
									: "Research is taking a break."}
							</strong>
							<p>
								{research.error ||
									(research.connectionState === "initializing"
										? "Reconnecting to saved scholarships. You can write your question while we connect."
										: "The service is unavailable right now. Your saved questions have not been deleted.")}
							</p>
						</div>
						<button
							type="button"
							className="nv-button nv-button-paper"
							onClick={research.checkAvailability}
						>
							Reconnect
						</button>
					</div>
				)}

				{research.error && research.available !== false && (
					<div className="nv-live-error" role="alert">
						<AlertTriangle size={18} className="nv-live-error-icon" aria-hidden="true" />
						<div className="nv-live-error-content">
							<p>{research.error}</p>
							{research.run && (
								<button type="button" onClick={research.refresh}>
									Refresh saved progress
								</button>
							)}
						</div>
					</div>
				)}

				<Routes>
					<Route
						index
						element={
							<ResearchDesk {...common} draft={draft} setDraft={setDraft} />
						}
					/>
					<Route path="investigation" element={<Investigation {...common} />} />
					<Route
						path="plan"
						element={
							<ResearchPlan key={research.run?.runId || "empty"} {...common} />
						}
					/>
					<Route
						path="*"
						element={
							<div className="nv-empty nv-not-found">
								<Compass size={40} className="nv-empty-icon" aria-hidden="true" />
								<h1>Let’s get you back on the map.</h1>
								<p>We couldn’t find this research step. Head back to your desk to ask a question or explore the catalogue.</p>
								<Link className="nv-button nv-button-paper" to="/navigator">
									Open the research desk <ArrowUpRight size={17} />
								</Link>
							</div>
						}
					/>
				</Routes>

				<details className="nv-privacy-note">
					<summary>
						<BookOpen size={15} /> How answers & privacy work
					</summary>
					<p>
						AI helps interpret your question and explain saved official sources. It can make mistakes; the scholarship provider confirms eligibility and current dates. Your question and selected source excerpts go to {providerLabel(research.run?.provider ?? research.provider)}. Udaan notes stay private to your account and expire after seven days; the AI provider’s data-use terms also apply. Opening saved findings does not start another AI request.
					</p>
					{(research.run?.provider ?? research.provider) === "gemini" && (
						<p>
							Google’s free API tier can use submitted content to improve its products.{" "}
							<a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">
								Google API data-use terms
							</a>
						</p>
					)}
				</details>

				<div className="nv-colophon">
					<span>
						<Compass size={14} /> A question. A paper trail. A next step.
					</span>
					<Link to="/scholarships">
						Explore the catalogue <ArrowUpRight size={14} />
					</Link>
				</div>
			</div>
		</main>
	);
}
