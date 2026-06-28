import { useState } from "react";
import logoImg from "../assets/images/logo.png";
import { Link } from "react-router-dom";

import signupIllustration from "../assets/images/singup.png";
import Badge from "../components/Badge";

export default function SignUp() {
	const [form, setForm] = useState({
		fullName: "",
		email: "",
		password: "",
		confirmPassword: "",
	});
	const [showPassword, setShowPassword] = useState(false);

	const inputClass =
		"w-full bg-[#F6FAF1] border border-[#DDECCB] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#5AAD1F] focus:ring-2 focus:ring-[#5AAD1F]/10 transition text-gray-900 placeholder-gray-400";

	const passwordStrength = (() => {
		const p = form.password;
		if (!p) return null;
		if (p.length < 6)
			return { label: "Too short", color: "bg-red-400", width: "w-1/4" };
		if (p.length < 8 || !/[0-9]/.test(p))
			return { label: "Weak", color: "bg-amber-400", width: "w-2/4" };
		if (!/[^a-zA-Z0-9]/.test(p))
			return { label: "Good", color: "bg-[#5AAD1F]", width: "w-3/4" };
		return { label: "Strong", color: "bg-[#5AAD1F]", width: "w-full" };
	})();

	const handleSubmit = (e) => {
		e.preventDefault();
		console.log("Signup:", form);
	};

	return (
		<div className="min-h-screen bg-white flex flex-col lg:flex-row font-pangea">
			{/* Illustration panel — LEFT */}
			<div className="hidden lg:flex lg:w-[45%] xl:w-[50%] bg-[#F6FAF1] border-r border-[#DDECCB] flex-col items-center justify-center px-8 py-12 relative">
				{/* Decorative bg elements */}
				<div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
					<div className="absolute top-[-10%] left-[-10%] w-80 h-80 rounded-full bg-[#5AAD1F]/5" />
					<div className="absolute bottom-[-5%] right-[-5%] w-60 h-60 rounded-full bg-[#3B7DC8]/5" />
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 rounded-full bg-[#C0DD97]/5" />
				</div>

				{/* Image container */}
				<div className="relative z-10 w-full max-w-md">
					<img
						src={signupIllustration}
						alt="Students celebrating scholarship success"
						className="w-full h-auto object-contain"
					/>
				</div>

				{/* Text content */}
				<div className="relative z-10 mt-8 text-center max-w-sm">
					<h2 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-3 leading-snug">
						Start your scholarship journey
					</h2>
					<p className="text-[15px] text-gray-500 leading-relaxed">
						Join thousands of students who found funding they didn't know they
						qualified for.
					</p>
				</div>

				{/* Social proof */}
				<div className="relative z-10 mt-8 bg-white/80 backdrop-blur-sm border border-[#C0DD97] rounded-2xl px-6 py-4 max-w-xs w-full shadow-sm">
					<div className="flex items-center gap-4">
						<div className="flex -space-x-2">
							{["#5AAD1F", "#3B7DC8", "#E8884A"].map((c, i) => (
								<div
									key={i}
									className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-white shadow-sm"
									style={{ backgroundColor: c }}
								>
									{["P", "R", "A"][i]}
								</div>
							))}
						</div>
						<div className="flex flex-col">
							<p className="text-[13px] font-semibold text-gray-900">
								2,400+ students
							</p>
							<p className="text-[11px] text-gray-500">joined this month</p>
						</div>
					</div>
				</div>
			</div>

			{/* Form panel — RIGHT */}
			<div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20">
				<div className="max-w-md mx-auto w-full">
					{/* Logo */}
					<Link to="/" className="flex items-center gap-3 group mb-10">
						<div className="w-12 h-12 rounded-xl bg-[#C0DD97]/20 border border-[#DDECCB] flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
							<img
								src={logoImg}
								alt="Udaan"
								className="w-10 h-10 object-contain"
							/>
						</div>
						<div className="flex flex-col leading-none">
							<span className="text-2xl font-black tracking-tight">
								<span style={{ color: "#5AAD1F" }}>uda</span>
								<span style={{ color: "#3B7DC8" }}>an</span>
							</span>
							<span className="text-[8px] font-bold tracking-widest text-gray-400 uppercase mt-0.5">
								find your scholarship
							</span>
						</div>
					</Link>

					<Badge>Get started — it's free</Badge>
					<h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mt-4 mb-2">
						Create your account
					</h1>
					<p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
						Build your profile once. We'll match it against hundreds of
						scholarships automatically.
					</p>

					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-1.5">
							<label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
								Full name
							</label>
							<input
								type="text"
								placeholder="Priya Sharma"
								required
								value={form.fullName}
								onChange={(e) => setForm({ ...form, fullName: e.target.value })}
								className={inputClass}
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
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

						<div className="space-y-1.5">
							<label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
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
									className={`${inputClass} pr-12`}
								/>
								<button
									type="button"
									onClick={() => setShowPassword((p) => !p)}
									className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
									aria-label={showPassword ? "Hide password" : "Show password"}
								>
									{showPassword ? (
										<svg
											className="w-4 h-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
											/>
										</svg>
									) : (
										<svg
											className="w-4 h-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
									)}
								</button>
							</div>

							{/* Password strength */}
							{passwordStrength && (
								<div className="flex items-center gap-3 mt-1.5">
									<div className="flex-1 h-1.5 rounded-full bg-[#DDECCB] overflow-hidden">
										<div
											className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`}
										/>
									</div>
									<span className="text-[10px] font-bold text-gray-500 min-w-14">
										{passwordStrength.label}
									</span>
								</div>
							)}
						</div>

						<div className="space-y-1.5">
							<label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
								Confirm password
							</label>
							<div className="relative">
								<input
									type={showPassword ? "text" : "password"}
									placeholder="Repeat your password"
									required
									value={form.confirmPassword}
									onChange={(e) =>
										setForm({ ...form, confirmPassword: e.target.value })
									}
									className={`${inputClass} ${
										form.confirmPassword &&
										form.confirmPassword !== form.password
											? "border-red-300 focus:border-red-400 focus:ring-red-100"
											: form.confirmPassword &&
												  form.confirmPassword === form.password
												? "border-[#5AAD1F]"
												: ""
									}`}
								/>
								{form.confirmPassword &&
									form.confirmPassword === form.password && (
										<div className="absolute right-4 top-1/2 -translate-y-1/2">
											<svg
												className="w-4 h-4 text-[#5AAD1F]"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2.5"
													d="M5 13l4 4L19 7"
												/>
											</svg>
										</div>
									)}
							</div>
							{form.confirmPassword &&
								form.confirmPassword !== form.password && (
									<p className="text-[11px] text-red-500 font-medium mt-1">
										Passwords don't match
									</p>
								)}
						</div>

						<p className="text-[12px] text-gray-400 leading-relaxed">
							By signing up you agree to our{" "}
							<Link
								to="/terms"
								className="text-[#5AAD1F] font-semibold hover:underline transition-colors"
							>
								Terms of Service
							</Link>{" "}
							and{" "}
							<Link
								to="/privacy"
								className="text-[#5AAD1F] font-semibold hover:underline transition-colors"
							>
								Privacy Policy
							</Link>
							.
						</p>

						<button
							type="submit"
							className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-3xl
                bg-[#5AAD1F] hover:bg-[#4A9A18] active:bg-[#3D8813]
                text-white font-semibold text-[14px]
                transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
						>
							Create account
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2.5"
									d="M5 12h14M12 5l7 7-7 7"
								/>
							</svg>
						</button>
					</form>

					{/* Divider */}
					<div className="flex items-center gap-4 my-7">
						<div className="flex-1 h-px bg-[#DDECCB]" />
						<span className="text-[12px] text-gray-400 font-medium tracking-wide">
							or continue with
						</span>
						<div className="flex-1 h-px bg-[#DDECCB]" />
					</div>

					{/* Google SSO */}
					<button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[#DDECCB] bg-white hover:border-gray-300 hover:bg-[#F6FAF1] transition-all duration-150 text-[14px] font-semibold text-gray-700">
						<svg className="w-5 h-5" viewBox="0 0 24 24">
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						Continue with Google
					</button>

					<p className="text-center text-[13px] text-gray-500 mt-7">
						Already have an account?{" "}
						<Link
							to="/login"
							className="text-[#5AAD1F] font-bold hover:text-[#4A9A18] transition-colors"
						>
							Log in
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
