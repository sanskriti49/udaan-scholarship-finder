import { useState } from "react";
import { Link } from "react-router-dom";
import logoImg from "../assets/images/logo.png";
import Badge from "../components/Badge";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

function LoginIllustration() {
	return (
		<svg
			viewBox="0 0 400 420"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			className="w-full max-w-sm h-auto drop-shadow-xs"
			aria-hidden="true"
		>
			{/* Ambient glow circles */}
			<circle cx="200" cy="210" r="150" fill="#5AAD1F" opacity="0.06" />
			<circle cx="200" cy="210" r="100" fill="#5AAD1F" opacity="0.06" />

			{/* Ground shadow */}
			<ellipse
				cx="200"
				cy="390"
				rx="130"
				ry="10"
				fill="#C0DD97"
				opacity="0.35"
			/>

			{/* Door frame */}
			<rect x="148" y="130" width="104" height="160" rx="52" fill="#EAF3DE" />
			<rect
				x="148"
				y="130"
				width="104"
				height="160"
				rx="52"
				fill="none"
				stroke="#5AAD1F"
				strokeWidth="2.5"
				opacity="0.5"
			/>

			{/* Door glow */}
			<ellipse
				cx="200"
				cy="210"
				rx="44"
				ry="64"
				fill="#5AAD1F"
				opacity="0.12"
			/>
			<ellipse
				cx="200"
				cy="210"
				rx="28"
				ry="48"
				fill="#5AAD1F"
				opacity="0.14"
			/>
			<circle cx="221" cy="218" r="4" fill="#5AAD1F" opacity="0.7" />

			{/* Door step */}
			<rect
				x="158"
				y="288"
				width="84"
				height="8"
				rx="4"
				fill="#C0DD97"
				opacity="0.6"
			/>

			{/* Stars / sparkles around door */}
			<path
				d="M136 148 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z"
				fill="#5AAD1F"
				opacity="0.6"
			/>
			<path
				d="M264 155 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z"
				fill="#5AAD1F"
				opacity="0.45"
			/>
			<circle
				cx="130"
				cy="185"
				r="3"
				fill="none"
				stroke="#5AAD1F"
				strokeWidth="1.5"
				opacity="0.4"
			/>
			<circle cx="272" cy="200" r="2.5" fill="#5AAD1F" opacity="0.35" />
			<path
				d="M268 240 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z"
				fill="#3B7DC8"
				opacity="0.35"
			/>

			{/* Character body */}
			<path
				d="M178 330 Q175 358 172 385 L183 385 Q186 360 192 344 Q198 360 201 385 L212 385 Q209 358 206 330Z"
				fill="#3B7DC8"
			/>
			<ellipse cx="176" cy="386" rx="7" ry="3.5" fill="#2C1A0E" />
			<ellipse cx="208" cy="386" rx="7" ry="3.5" fill="#2C1A0E" />
			<rect x="170" y="280" width="52" height="54" rx="10" fill="#5AAD1F" />
			<path
				d="M170 292 Q155 282 148 270"
				stroke="#F5C894"
				strokeWidth="9"
				strokeLinecap="round"
			/>
			<circle cx="146" cy="268" r="6" fill="#F5C894" />
			<path
				d="M222 292 Q234 300 238 312"
				stroke="#F5C894"
				strokeWidth="9"
				strokeLinecap="round"
			/>
			<circle cx="239" cy="314" r="6" fill="#F5C894" />
			<rect x="190" y="264" width="12" height="16" rx="4" fill="#F5C894" />
			<circle cx="196" cy="252" r="22" fill="#F5C894" />
			<path
				d="M175 248 Q177 226 196 224 Q215 226 217 248 Q210 236 196 236 Q182 236 175 248Z"
				fill="#2C1A0E"
			/>
			<circle cx="189" cy="252" r="2" fill="#2C1A0E" />
			<circle cx="203" cy="252" r="2" fill="#2C1A0E" />
			<path
				d="M190 261 Q196 265 202 261"
				stroke="#2C1A0E"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>

			{/* Floating document */}
			<g opacity="0.85" transform="translate(248 130) rotate(12)">
				<rect
					x="0"
					y="0"
					width="44"
					height="54"
					rx="5"
					fill="white"
					stroke="#C0DD97"
					strokeWidth="1.5"
				/>
				<rect x="7" y="10" width="30" height="2.5" rx="1.5" fill="#C0DD97" />
				<rect x="7" y="17" width="22" height="2.5" rx="1.5" fill="#C0DD97" />
				<rect x="7" y="24" width="26" height="2.5" rx="1.5" fill="#C0DD97" />
				<circle
					cx="22"
					cy="40"
					r="6"
					fill="#EAF3DE"
					stroke="#5AAD1F"
					strokeWidth="1.5"
				/>
				<path
					d="M19 40 l2.5 2.5 4.5 -4.5"
					stroke="#5AAD1F"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</g>
		</svg>
	);
}

export default function Login() {
	const [form, setForm] = useState({ email: "", password: "" });
	const [showPassword, setShowPassword] = useState(false);

	const inputClass =
		"w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:border-[#5AAD1F] focus:ring-4 focus:ring-[#5AAD1F]/5 hover:border-gray-300 transition-all duration-200";

	const handleSubmit = (e) => {
		e.preventDefault();
		console.log("Login:", form);
	};

	return (
		<div className="min-h-screen bg-white flex flex-col lg:flex-row font-pangea">
			{/* Form panel — LEFT */}
			<div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-14 lg:px-20 xl:px-24 max-w-2xl mx-auto w-full order-2 lg:order-1">
				{/* Logo */}
				<div className="mb-8">
					<Link to="/" className="inline-flex items-center gap-2.5 group">
						<div className="w-11 h-11 rounded-xl bg-[#C0DD97]/20 border border-emerald-100 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
							<img
								src={logoImg}
								alt="Udaan"
								className="w-9 h-9 object-contain"
							/>
						</div>
						<div className="flex flex-col leading-none">
							<span className="text-xl font-black tracking-tight">
								<span style={{ color: "#5AAD1F" }}>uda</span>
								<span style={{ color: "#3B7DC8" }}>an</span>
							</span>
							<span className="text-[8px] font-bold tracking-widest text-gray-400 uppercase mt-0.5">
								find your scholarship
							</span>
						</div>
					</Link>
				</div>

				<div className="w-full max-w-md">
					<Badge>Welcome back</Badge>
					<h1 className="text-3xl font-extrabold text-gray-900 mt-3 mb-2 tracking-tight">
						Sign in to your account
					</h1>
					<p className="text-[14px] text-gray-500 mb-6 leading-relaxed">
						Pick up right where you left off — your bookmarks, matches, and
						applications are waiting.
					</p>

					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
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

						<div className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between">
								<label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
									Password
								</label>
								<Link
									to="/forgot-password"
									className="text-[12px] text-[#5AAD1F] font-bold hover:text-[#4A9A18] transition-colors"
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
									className="cursor-pointer absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
									aria-label={showPassword ? "Hide password" : "Show password"}
								>
									{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
						</div>

						<button
							type="submit"
							className="cursor-pointer mt-2 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#5AAD1F] hover:bg-[#4A9A18] text-white font-bold text-sm shadow-md shadow-emerald-600/10 transition-all duration-200 active:scale-[0.99]"
						>
							Sign in
							<ArrowRight size={16} />
						</button>
					</form>

					{/* Divider */}
					<div className="flex items-center gap-3 my-6">
						<div className="flex-1 h-px bg-gray-100" />
						<span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
							or
						</span>
						<div className="flex-1 h-px bg-gray-100" />
					</div>

					{/* Google SSO */}
					<button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 text-[14px] font-bold text-gray-600 cursor-pointer shadow-2xs">
						<svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

					<p className="text-center text-[13px] text-gray-500 mt-6">
						Don't have an account?{" "}
						<Link
							to="/signup"
							className="text-[#5AAD1F] font-bold hover:text-[#4A9A18] transition-colors"
						>
							Create one free
						</Link>
					</p>
				</div>
			</div>

			{/* Illustration panel — RIGHT */}
			<div className="hidden lg:flex flex-1 bg-[#F6FAF1] border-l border-[#DDECCB] flex-col items-center justify-center px-12 py-9 relative overflow-hidden order-1 lg:order-2">
				<div className="absolute top-[-10%] right-[-10%] w-80 h-80 rounded-full bg-[#5AAD1F]/5" />
				<div className="absolute bottom-[-5%] left-[-5%] w-60 h-60 rounded-full bg-[#3B7DC8]/5" />

				<LoginIllustration />

				<div className="mt-10 text-center max-w-sm relative z-10">
					<h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">
						Your scholarships are waiting
					</h2>
					<p className="text-[15px] text-gray-600 leading-relaxed">
						Over 500 verified grants updated every week. Sign in to see what
						matches your profile today.
					</p>
				</div>

				<div className="flex flex-wrap justify-center gap-2 mt-8 relative z-10">
					{["500+ scholarships", "100% free", "Verified listings"].map((t) => (
						<span
							key={t}
							className="font-inter inline-flex items-center gap-1.5 bg-white border border-[#C0DD97] text-[#27500A] text-[12px] font-bold px-3.5 py-1.5 rounded-full shadow-2xs"
						>
							<span className="w-1.5 h-1.5 rounded-full bg-[#5AAD1F]" />
							{t}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}
