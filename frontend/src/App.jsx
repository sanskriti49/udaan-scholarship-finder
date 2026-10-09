import { lazy, Suspense } from "react";
import {
	createBrowserRouter,
	Navigate,
	RouterProvider,
	useLocation,
} from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import Mainlayout from "./layouts/Mainlayout";
import HomePage from "./pages/HomePage";
import FullScreenLoader from "./components/FullScreenLoader";
import { useAuth } from "./hooks/useAuth";

// Route-level code splitting: secondary routes and heavy libraries (gsap, oauth, turnstile)
// are loaded on-demand, keeping the initial home page bundle ultra-compact.
const Support = lazy(() => import("./pages/Support"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Login = lazy(() => import("./pages/Login"));
const Resources = lazy(() => import("./pages/Resources"));
const EligibilityPage = lazy(() => import("./pages/Eligibility"));
const Scholarships = lazy(() => import("./pages/Scholarships"));
const Scanner = lazy(() => import("./scanner/Scanner"));
const ApplicationGuide = lazy(() => import("./pages/ApplicationGuide"));
const HowToApply = lazy(() => import("./pages/HowToApply"));
const Settings = lazy(() => import("./pages/Settings"));
const TrustShield = lazy(() => import("./pages/TrustShield"));
const DocumentVault = lazy(() => import("./pages/DocumentVault"));
const SavedScholarships = lazy(() => import("./pages/SavedScholarships"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const withSuspense = (Component) => (
	<Suspense fallback={<FullScreenLoader />}>
		<Component />
	</Suspense>
);

// Signed-in only pages. Guests are sent to login and brought back afterwards.
function RequireAuth({ children }) {
	const { user } = useAuth();
	const location = useLocation();
	if (user) return children;
	const back = encodeURIComponent(location.pathname + location.search);
	return <Navigate to={`/login?redirect=${back}`} replace />;
}

// Login/Signup are for guests only.
function GuestOnly({ children }) {
	const { user } = useAuth();
	const location = useLocation();
	if (!user) return children;
	const to = new URLSearchParams(location.search).get("redirect");
	return <Navigate to={to && to.startsWith("/") ? to : "/"} replace />;
}

const withAuth = (Component) => <RequireAuth>{withSuspense(Component)}</RequireAuth>;

const router = createBrowserRouter([
	{
		element: <Mainlayout />,
		children: [
			{ path: "/", element: <HomePage /> },
			{ path: "support", element: withSuspense(Support) },
			{ path: "eligibility", element: withAuth(EligibilityPage) },
			{ path: "scholarships", element: withSuspense(Scholarships) },
			{ path: "scanner", element: withSuspense(Scanner) },
			{ path: "scanner.html", element: <Navigate to="/scanner" replace /> },
			{ path: "trust-shield", element: withSuspense(TrustShield) },
			{ path: "verify", element: withSuspense(TrustShield) },
			{ path: "documents", element: withAuth(DocumentVault) },
			{ path: "document-vault", element: withAuth(DocumentVault) },
			{ path: "saved", element: withAuth(SavedScholarships) },
			{ path: "bookmarks", element: withAuth(SavedScholarships) },
			{ path: "resources", element: withSuspense(Resources) },
			{ path: "application-guide", element: withSuspense(ApplicationGuide) },
			{ path: "how-to-apply", element: withSuspense(HowToApply) },
			{ path: "settings", element: withAuth(Settings) },
			{ path: "*", element: withSuspense(NotFoundPage) },
		],
	},
	{ path: "signup", element: <GuestOnly>{withSuspense(SignUp)}</GuestOnly> },
	{ path: "login", element: <GuestOnly>{withSuspense(Login)}</GuestOnly> },
]);

export default function App() {
	return (
		<AuthProvider>
			<Toaster
				position="top-right"
				closeButton
				toastOptions={{
					className:
						"font-sans text-sm rounded-2xl shadow-[0_12px_32px_-6px_rgba(15,23,42,0.12),0_4px_12px_-2px_rgba(15,23,42,0.06)] border border-slate-200/80 backdrop-blur-md transition-all duration-200",
					classNames: {
						toast: "bg-white text-slate-800",
						title: "font-semibold text-slate-900 text-sm",
						description: "text-xs text-slate-500 mt-0.5 leading-relaxed",
						success:
							"!bg-emerald-50/95 !border-emerald-200/80 !text-emerald-950",
						error: "!bg-rose-50/95 !border-rose-200/80 !text-rose-950",
						warning: "!bg-amber-50/95 !border-amber-200/80 !text-amber-950",
						info: "!bg-sky-50/95 !border-sky-200/80 !text-sky-950",
						closeButton:
							"!bg-white/90 hover:!bg-white !text-slate-500 hover:!text-slate-800 !border-slate-200 shadow-2xs",
					},
				}}
			/>
			<RouterProvider router={router} />
		</AuthProvider>
	);
}
