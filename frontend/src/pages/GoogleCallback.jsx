import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const token = searchParams.get("token");

    if (!token) {
      toast.error("Google sign-in failed. Please try again.");
      navigate("/login");
      return;
    }

    loginWithToken(token)
      .then(() => {
        toast.success("Logged in with Google");
        navigate("/");
      })
      .catch(() => {
        toast.error("Could not complete sign-in");
        navigate("/login");
      });
  }, [searchParams, loginWithToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 text-sm">Signing you in…</p>
    </div>
  );
}
