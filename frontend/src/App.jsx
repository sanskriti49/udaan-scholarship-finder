import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import Mainlayout from "./layouts/Mainlayout";
import HomePage from "./pages/HomePage";
import Support from "./pages/Support";
import Elgibility from "./pages/Elgibility";
import Signup from "./pages/Signup";
import Login from "./pages/Login";

const router = createBrowserRouter([
	{
		element: <Mainlayout />,
		children: [
			{ path: "/", element: <HomePage /> },
			{ path: "support", element: <Support /> },

			{ path: "eligibility", element: <Elgibility /> },
		],
	},
	{
		path: "signup",
		element: <Signup />,
	},
	{
		path: "login",
		element: <Login />,
	},
]);

export default function App() {
	return (
		<>
			<Toaster richColors position="top-right" />
			<RouterProvider router={router} />
		</>
	);
}
