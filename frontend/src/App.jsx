import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import Mainlayout from "./layouts/Mainlayout";
import HomePage from "./pages/HomePage";
import Contact from "./pages/Contact";

const router = createBrowserRouter([
	{
		element: <Mainlayout />,
		children: [
			{ path: "/", element: <HomePage /> },
			{ path: "contact", element: <Contact /> },
		],
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
