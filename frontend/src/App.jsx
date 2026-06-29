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
import { GoogleOAuthProvider } from "@react-oauth/google";

const router = createBrowserRouter([
  {
    element: <Mainlayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "support", element: <Support /> },
      { path: "eligibility", element: <EligibilityPage /> },
      { path: "scholarships", element: <Scholarships /> },
      { path: "resources", element: <Resources /> },
    ],
  },
  { path: "signup", element: <SignUp /> },
  { path: "login", element: <Login /> },
]);

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Toaster richColors position="bottom-right" />
        <RouterProvider router={router} />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
