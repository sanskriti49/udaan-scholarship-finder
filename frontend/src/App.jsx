import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import Mainlayout from "./layouts/Mainlayout";
import HomePage from "./pages/HomePage";
import Support from "./pages/Support";
import Elgibility from "./pages/Elgibility";

const router = createBrowserRouter([
  {
    element: <Mainlayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "support", element: <Support /> },
      { path: "support", element: <Support /> },
      { path: "support", element: <Support /> },
      { path: "eligibility", element: <Elgibility /> },
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
