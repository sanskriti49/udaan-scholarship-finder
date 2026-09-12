import { useState, useRef, useEffect } from "react";
import Logo from "../components/Logo";
import { Link, useNavigate } from "react-router-dom";
import signupIllustration from "../assets/images/signup.webp";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { Turnstile } from "react-turnstile";
import { useGoogleLogin } from "@react-oauth/google";
import { ArrowRight, Eye, EyeOff, Check, Sparkles } from "lucide-react";
import gsap from "gsap";

function GoogleButton({ onClick, loading }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={loading}
			className="w-full flex items-center justify-center gap-2.5 px-4 py-2 sm:py-2.5 rounded-xl border border-forest-900/10 bg-white hover:bg-mint-50/60 transition text-sm font-semibold text-forest-900 shadow-2xs cursor-pointer disabled:opacity-60"
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
			<span>{loading ? "Signing up..." : "Continue with Google"}</span>
		</button>
	);
}

export default function SignUp() {
	const containerRef = useRef(null);
	const [form, setForm] = useState({
		name: "",
		email: "",
		password: "",
		confirmPassword: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [turnstileToken, setTurnstileToken] = useState(null);
	const [googleLoading, setGoogleLoading] = useState(false);
	const turnstileRef = useRef(null);

	const { signup, loginWithGoogle } = useAuth();
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
		"w-full bg-white border border-forest-900/12 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 transition text-forest-950 placeholder-emerald-950/50 shadow-2xs font-medium";

	const passwordStrength = (() => {
		const p = form.password;
		if (!p) return null;
		if (p.length < 6)
			return { label: "Too short", color: "bg-rose-500", width: "w-1/4" };
		if (p.length < 8 || !/[0-9]/.test(p))
			return { label: "Weak", color: "bg-gold-ochre", width: "w-2/4" };
		if (!/[^a-zA-Z0-9]/.test(p))
			return { label: "Good", color: "bg-sage-600", width: "w-3/4" };
		return { label: "Strong", color: "bg-emerald-700", width: "w-full" };
	})();

	const hasTurnstile = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);
	const hasGoogleAuth = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (form.password !== form.confirmPassword) {
			toast.error("Passwords do not match");
			return;
		}
		if (hasTurnstile && !turnstileToken) {
			toast.error("Please complete the security check");
			return;
		}
		try {
			await signup({ ...form, turnstileToken: turnstileToken || "dev-bypass" });
			toast.success("Account created successfully");
			navigate("/");
		} catch (err) {
			toast.error(err.response?.data?.message || "Signup failed");
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
			toast.error("Google login is not configured yet.");
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
			{/* Left Illustration Panel */}
			<div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative overflow-hidden bg-forest-950 flex-col justify-between p-6 xl:p-10 h-full">
				<div
					className="absolute inset-0"
					style={{
						backgroundImage:
							"radial-gradient(at 80% 10%, rgba(149,213,178,0.25) 0px, transparent 50%), radial-gradient(at 10% 85%, rgba(64,145,108,0.28) 0px, transparent 55%), radial-gradient(at 50% 45%, rgba(216,243,220,0.08) 0px, transparent 45%)",
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
					<div className="max-h-[36vh] xl:max-h-[42vh] flex items-center justify-center animate-subtle-float">
						<img
							src={signupIllustration}
							alt="Students celebrating scholarship success"
							className="max-h-[32vh] xl:max-h-[38vh] w-auto object-contain rounded-2xl"
						/>
					</div>

					<div className="mt-4 text-center space-y-1">
						<h2 className="font-serif text-2xl xl:text-[1.75rem] leading-snug text-white">
							Join over 2,400 students already ahead.
						</h2>
						<p className="text-xs xl:text-sm text-mint-100/70 leading-relaxed max-w-xs mx-auto">
							Build your profile once. Udaan checks it against 37+ central,
							state, and corporate schemes automatically.
						</p>
					</div>
				</div>

				<div className="relative flex items-center justify-center gap-2 text-mint-100/50 text-xs">
					<Sparkles size={13} />
					<span>No subscription fees. No hidden costs. Ever.</span>
				</div>
			</div>

			{/* Right Form Panel */}
			<div className="flex-1 flex flex-col justify-center px-6 py-5 sm:px-10 lg:px-12 xl:px-16 overflow-y-auto">
				<div className="max-w-md mx-auto w-full my-auto py-1 sm:py-2">
					<div className="mb-3.5 sm:mb-4">
						<Logo size="md" tagline="find your scholarship" />
					</div>

					<h1 className="font-serif text-2xl sm:text-3xl leading-tight text-emerald-950 mb-0.5">
						Create your account
					</h1>
					<p className="text-sm text-emerald-950/90 mb-3 sm:mb-4 leading-relaxed">
						Free forever for students: no subscription fees, no hidden costs.
					</p>

					<form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
						<div className="space-y-0.5">
							<label className="text-xs font-semibold text-emerald-900/95">
								Full name
							</label>
							<input
								type="text"
								placeholder="Priya Sharma"
								required
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								className={inputClass}
							/>
						</div>

						<div className="space-y-0.5">
							<label className="text-xs font-semibold text-emerald-900/95">
								Email address
							</label>
							<input
								type="email"
								placeholder="priya@example.com"
								required
								value={form.email}
								onChange={(e) => setForm({ ...form, email: e.target.value })}
								className={inputClass}
							/>
						</div>

						<div className="space-y-0.5">
							<label className="text-xs font-semibold text-emerald-900/95">
								Password
							</label>
							<div className="relative">
								<input
									type={showPassword ? "text" : "password"}
									placeholder="At least 8 characters"
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
							{passwordStrength && (
								<div className="flex items-center gap-2 mt-1">
									<div className="flex-1 h-1 rounded-full bg-forest-900/10 overflow-hidden">
										<div
											className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`}
										/>
									</div>
									<span className="text-[10px] font-semibold text-forest-900/50 min-w-12">
										{passwordStrength.label}
									</span>
								</div>
							)}
						</div>

						<div className="space-y-0.5">
							<label className="text-xs font-semibold text-emerald-900/95">
								Confirm password
							</label>
							<div className="relative">
								<input
									type={showPassword ? "text" : "password"}
									placeholder="Repeat password"
									required
									value={form.confirmPassword}
									onChange={(e) =>
										setForm({ ...form, confirmPassword: e.target.value })
									}
									className={`${inputClass} pr-11 ${
										form.confirmPassword &&
										form.confirmPassword !== form.password
											? "border-rose-400 focus:border-rose-500"
											: form.confirmPassword &&
												  form.confirmPassword === form.password
												? "border-emerald-600"
												: ""
									}`}
								/>
								{form.confirmPassword &&
									form.confirmPassword === form.password && (
										<div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700">
											<Check size={15} />
										</div>
									)}
							</div>
							{form.confirmPassword &&
								form.confirmPassword !== form.password && (
									<p className="text-[11px] text-rose-600 font-medium mt-0.5">
										Passwords do not match
									</p>
								)}
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
							className="w-full py-2.5 sm:py-2.5 rounded-xl bg-forest-950 hover:bg-forest-900 text-white font-semibold text-sm transition shadow-[0_4px_16px_-4px_rgba(8,28,16,0.4)] hover:shadow-[0_8px_20px_-4px_rgba(8,28,16,0.45)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 group mt-1"
						>
							<span>Create account</span>
							<ArrowRight
								size={15}
								className="transition-transform group-hover:translate-x-0.5"
							/>
						</button>
					</form>

					<div className="flex items-center gap-3 my-2.5 sm:my-3">
						<div className="flex-1 h-px bg-forest-900/10" />
						<span className="text-[10px] text-forest-900/40 font-semibold tracking-wide uppercase">
							or
						</span>
						<div className="flex-1 h-px bg-forest-900/10" />
					</div>

					<GoogleButton onClick={handleGoogleClick} loading={googleLoading} />

					<p className="text-center text-xs text-forest-900/60 mt-2.5 sm:mt-3">
						Already have an account?{" "}
						<Link
							to="/login"
							className="text-emerald-700 font-semibold hover:text-emerald-800 hover:underline"
						>
							Log in
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
