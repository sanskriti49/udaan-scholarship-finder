import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import Mainlayout from "./layouts/Mainlayout";
import HomePage from "./pages/HomePage";
import Support from "./pages/Support";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import Resources from "./pages/Resources";
import EligibilityPage from "./pages/Eligibility";
import Scholarships from "./pages/Scholarships";
import ApplicationGuide from "./pages/ApplicationGuide";
import HowToApply from "./pages/HowToApply";
import Settings from "./pages/Settings";
import NotFoundPage from "./pages/NotFoundPage";

const router = createBrowserRouter([
	{
		element: <Mainlayout />,
		children: [
			{ path: "/", element: <HomePage /> },
			{ path: "support", element: <Support /> },
			{ path: "eligibility", element: <EligibilityPage /> },
			{ path: "scholarships", element: <Scholarships /> },
			{ path: "resources", element: <Resources /> },
			{ path: "application-guide", element: <ApplicationGuide /> },
			{ path: "how-to-apply", element: <HowToApply /> },
			{ path: "settings", element: <Settings /> },
			{ path: "*", element: <NotFoundPage /> },
		],
	},
	{ path: "signup", element: <SignUp /> },
	{ path: "login", element: <Login /> },
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
