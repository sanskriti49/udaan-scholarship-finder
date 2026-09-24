import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import Mainlayout from "./layouts/Mainlayout";
import HomePage from "./pages/HomePage";
import FullScreenLoader from "./components/FullScreenLoader";

// Route-level code splitting: secondary routes and heavy libraries (gsap, oauth, turnstile)
// are loaded on-demand, keeping the initial home page bundle ultra-compact.
const Support = lazy(() => import("./pages/Support"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Login = lazy(() => import("./pages/Login"));
const Resources = lazy(() => import("./pages/Resources"));
const EligibilityPage = lazy(() => import("./pages/Eligibility"));
const Scholarships = lazy(() => import("./pages/Scholarships"));
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

const router = createBrowserRouter([
	{
		element: <Mainlayout />,
		children: [
			{ path: "/", element: <HomePage /> },
			{ path: "support", element: withSuspense(Support) },
			{ path: "eligibility", element: withSuspense(EligibilityPage) },
			{ path: "scholarships", element: withSuspense(Scholarships) },
			{ path: "trust-shield", element: withSuspense(TrustShield) },
			{ path: "verify", element: withSuspense(TrustShield) },
			{ path: "documents", element: withSuspense(DocumentVault) },
			{ path: "document-vault", element: withSuspense(DocumentVault) },
			{ path: "saved", element: withSuspense(SavedScholarships) },
			{ path: "bookmarks", element: withSuspense(SavedScholarships) },
			{ path: "resources", element: withSuspense(Resources) },
			{ path: "application-guide", element: withSuspense(ApplicationGuide) },
			{ path: "how-to-apply", element: withSuspense(HowToApply) },
			{ path: "settings", element: withSuspense(Settings) },
			{ path: "*", element: withSuspense(NotFoundPage) },
		],
	},
	{ path: "signup", element: withSuspense(SignUp) },
	{ path: "login", element: withSuspense(Login) },
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
