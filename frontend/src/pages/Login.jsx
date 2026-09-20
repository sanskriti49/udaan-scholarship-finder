import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import loginIllustration from "../assets/images/login.webp";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { Turnstile } from "react-turnstile";
import { useGoogleLogin } from "@react-oauth/google";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import gsap from "gsap";

function GoogleButton({ onClick, loading }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={loading}
			className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 sm:py-3 rounded-xl border border-forest-900/10 bg-white hover:bg-mint-50/60 transition text-sm font-semibold text-forest-900 shadow-2xs cursor-pointer disabled:opacity-60"
		>
			<svg
				width="18"
				height="18"
				viewBox="0 0 48 48"
				xmlns="http://www.w3.org/2000/svg"
				className="shrink-0"
			>
				<path
					fill="#EA4335"
					d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
				/>
				<path
					fill="#4285F4"
					d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
				/>
				<path
					fill="#FBBC05"
					d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
				/>
				<path
					fill="#34A853"
					d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
				/>
				<path fill="none" d="M0 0h48v48H0z" />
			</svg>
			<span>{loading ? "Signing in..." : "Continue with Google"}</span>
		</button>
	);
}

export default function Login() {
	const containerRef = useRef(null);
	const [form, setForm] = useState({ email: "", password: "" });
	const [showPassword, setShowPassword] = useState(false);
	const [turnstileToken, setTurnstileToken] = useState(null);
	const [googleLoading, setGoogleLoading] = useState(false);
	const turnstileRef = useRef(null);

	const { login, loginWithGoogle } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		window.scrollTo({ top: 0, left: 0, behavior: "instant" });
		const ctx = gsap.context(() => {
			gsap.fromTo(
				containerRef.current,
				{ opacity: 0, y: 6 },
				{
					opacity: 1,
					y: 0,
					duration: 0.28,
					ease: "power2.out",
					clearProps: "transform,opacity",
				},
			);
		}, containerRef);
		return () => ctx.revert();
	}, []);

	const inputClass =
		"w-full bg-white border border-forest-900/12 rounded-xl px-3.5 py-2.5 sm:py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 transition text-forest-950 placeholder-emerald-900/50 shadow-2xs font-medium";

	const hasTurnstile = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);
	const hasGoogleAuth = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (hasTurnstile && !turnstileToken) {
			toast.error("Please complete the security check");
			return;
		}
		try {
			await login({ ...form, turnstileToken: turnstileToken || "dev-bypass" });
			toast.success("Logged in successfully");
			navigate("/");
		} catch (err) {
			toast.error(err.response?.data?.message || "Login failed");
			turnstileRef.current?.reset();
			setTurnstileToken(null);
		}
	};

	const triggerGoogleOAuth = useGoogleLogin({
		onSuccess: async (tokenResponse) => {
			try {
				setGoogleLoading(true);
				await loginWithGoogle(tokenResponse.access_token);
				toast.success("Signed in with Google successfully!");
				navigate("/");
			} catch (err) {
				toast.error(
					err.response?.data?.message ||
						err.message ||
						"Google sign-in failed on the server.",
				);
			} finally {
				setGoogleLoading(false);
			}
		},
		onError: (errorResponse) => {
			toast.error(
				errorResponse?.error_description ||
					errorResponse?.error ||
					"Google login cancelled or failed.",
			);
		},
	});

	const handleGoogleClick = async () => {
		if (!hasGoogleAuth) {
			if (import.meta.env.DEV) {
				try {
					setGoogleLoading(true);
					await loginWithGoogle("dev-bypass");
					toast.success("Signed in with Demo Google Account (Dev Mode)");
					navigate("/");
				} catch (err) {
					toast.error(err.response?.data?.message || "Google sign-in failed.");
				} finally {
					setGoogleLoading(false);
				}
				return;
			}
			toast.error("Google sign-in is not configured yet.");
			return;
		}
		if (hasTurnstile && !turnstileToken) {
			toast.error("Please complete the security check first");
			return;
		}
		triggerGoogleOAuth();
	};

	return (
		<div
			ref={containerRef}
			className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-cream-canvas flex flex-col lg:flex-row will-change-[opacity,transform]"
		>
			<div className="flex-1 flex flex-col justify-center px-6 py-6 sm:px-10 lg:px-12 xl:px-16 overflow-y-auto">
				<div className="max-w-md mx-auto w-full my-auto py-2 sm:py-4">
					<div className="mb-4 sm:mb-5">
						<Logo size="md" tagline="find your scholarship" />
					</div>

					<h1 className="font-serif text-3xl sm:text-4xl leading-tight text-emerald-950 mb-1">
						Welcome back
					</h1>
					<p className="text-xs sm:text-sm text-emerald-950/90 mb-4 sm:mb-5 leading-relaxed">
						Sign in to access your saved scholarships, eligibility results, and
						tracked deadlines.
					</p>

					<form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
						<div className="space-y-1">
							<label className="text-[13.5px] font-semibold text-emerald-900/90">
								Email address
							</label>
							<input
								type="email"
								placeholder="student@example.com"
								required
								value={form.email}
								onChange={(e) => setForm({ ...form, email: e.target.value })}
								className={inputClass}
							/>
						</div>

						<div className="space-y-1">
							<div className="flex items-center justify-between">
								<label className="text-[13.5px] font-semibold text-emerald-900/90">
									Password
								</label>
								<Link
									to="/forgot-password"
									className="text-[13.5px] text-emerald-700 font-semibold hover:text-emerald-800 hover:underline"
								>
									Forgot password?
								</Link>
							</div>
							<div className="relative">
								<input
									type={showPassword ? "text" : "password"}
									placeholder="Enter your password"
									required
									value={form.password}
									onChange={(e) =>
										setForm({ ...form, password: e.target.value })
									}
									className={`${inputClass} pr-11`}
								/>
								<button
									type="button"
									onClick={() => setShowPassword((p) => !p)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-900/35 hover:text-forest-900/70 cursor-pointer transition"
									aria-label={showPassword ? "Hide password" : "Show password"}
								>
									{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
								</button>
							</div>
						</div>

						{hasTurnstile && (
							<div className="flex justify-center pt-1">
								<Turnstile
									ref={turnstileRef}
									sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
									onVerify={(token) => setTurnstileToken(token)}
									onExpire={() => setTurnstileToken(null)}
									onError={() => {
										setTurnstileToken(null);
										toast.error("Security check failed. Please try again.");
									}}
									theme="light"
								/>
							</div>
						)}

						<button
							type="submit"
							disabled={hasTurnstile && !turnstileToken}
							className="w-full py-2.5 sm:py-3 rounded-xl bg-forest-950 hover:bg-forest-900 text-white font-semibold text-sm transition shadow-[0_4px_16px_-4px_rgba(8,28,16,0.4)] hover:shadow-[0_8px_20px_-4px_rgba(8,28,16,0.45)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 group mt-1"
						>
							<span>Sign in</span>
							<ArrowRight
								size={15}
								className="transition-transform group-hover:translate-x-0.5"
							/>
						</button>
					</form>

					<div className="flex items-center gap-3 my-3.5 sm:my-4">
						<div className="flex-1 h-px bg-forest-900/10" />
						<span className="text-[11px] text-forest-900/40 font-semibold tracking-wide uppercase">
							or
						</span>
						<div className="flex-1 h-px bg-forest-900/10" />
					</div>

					<GoogleButton onClick={handleGoogleClick} loading={googleLoading} />

					<p className="text-center text-xs text-forest-900/60 mt-3.5 sm:mt-4">
						Don't have an account?{" "}
						<Link
							to="/signup"
							className="text-emerald-700 font-semibold hover:text-emerald-800 hover:underline"
						>
							Create one free
						</Link>
					</p>
				</div>
			</div>

			<div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative overflow-hidden bg-forest-950 flex-col justify-between p-6 xl:p-10 h-full">
				<div
					className="absolute inset-0"
					style={{
						backgroundImage:
							"radial-gradient(at 20% 15%, rgba(116,198,157,0.28) 0px, transparent 50%), radial-gradient(at 85% 75%, rgba(82,183,136,0.22) 0px, transparent 55%), radial-gradient(at 60% 0%, rgba(183,228,199,0.12) 0px, transparent 40%)",
					}}
				/>
				<div
					className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
					style={{
						backgroundImage:
							"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
					}}
				/>

				<div className="relative flex-1 flex flex-col justify-center items-center my-auto w-full max-w-sm mx-auto">
					<div className="max-h-[38vh] xl:max-h-[44vh] flex items-center justify-center animate-subtle-float">
						<img
							src={loginIllustration}
							alt="Student accessing scholarships"
							className="max-h-[34vh] xl:max-h-[80vh] w-auto object-contain rounded-2xl"
						/>
					</div>

					<div className="mt-4 text-center space-y-1">
						<h2 className="font-serif text-2xl xl:text-[1.75rem] leading-snug text-white">
							Every scholarship, verified at the source.
						</h2>
						<p className="text-xs xl:text-sm text-mint-100/70 leading-relaxed max-w-xs mx-auto">
							Official circulars, automated eligibility checks, and deadline
							tracking for Indian colleges and universities.
						</p>
					</div>
				</div>

				<div className="relative flex items-center justify-center gap-2 text-mint-100/50 text-xs">
					<Sparkles size={13} />
					<span>Trusted by students across 2,400+ profiles</span>
				</div>
			</div>
		</div>
	);
}
