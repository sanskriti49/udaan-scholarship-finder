import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import Mainlayout from "./layouts/Mainlayout";
import HomePage from "./pages/HomePage";

const router = createBrowserRouter([
	{
		element: <Mainlayout />,
		children: [{ path: "/", element: <HomePage /> }],
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
