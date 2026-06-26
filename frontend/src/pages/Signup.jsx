import { useState } from "react";
import logoImg from "../assets/images/logo.png";
import { Link } from "react-router-dom";

function Badge({ children }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-[#EAF3DE] border border-[#C0DD97] text-[#27500A] text-[10px] font-bold tracking-widest px-3 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-[#5AAD1F]" />
      {children}
    </div>
  );
}

function SignupIllustration() {
  return (
    <svg
      viewBox="0 0 400 420"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className="w-full max-w-sm"
      aria-hidden="true"
    >
      {/* Ambient glow */}
      <circle cx="200" cy="210" r="155" fill="#5AAD1F" opacity="0.05" />
      <circle cx="200" cy="210" r="100" fill="#3B7DC8" opacity="0.04" />

      {/* Ground shadow */}
      <ellipse
        cx="200"
        cy="390"
        rx="145"
        ry="10"
        fill="#C0DD97"
        opacity="0.3"
      />

      {/* Floating certificate / scroll */}
      <g transform="translate(138 60)">
        {/* Certificate body */}
        <rect
          x="0"
          y="0"
          width="124"
          height="88"
          rx="8"
          fill="white"
          stroke="#C0DD97"
          strokeWidth="1.5"
        />
        <rect x="0" y="0" width="124" height="12" rx="8" fill="#EAF3DE" />
        <rect x="0" y="8" width="124" height="4" fill="#EAF3DE" />
        {/* Cert lines */}
        <rect x="14" y="22" width="96" height="2.5" rx="1.5" fill="#C0DD97" />
        <rect x="14" y="30" width="70" height="2.5" rx="1.5" fill="#DDECCB" />
        <rect x="14" y="38" width="82" height="2.5" rx="1.5" fill="#DDECCB" />
        {/* Seal */}
        <circle
          cx="62"
          cy="66"
          r="14"
          fill="#EAF3DE"
          stroke="#5AAD1F"
          strokeWidth="1.5"
        />
        <path
          d="M56 66 l4 4 8 -8"
          stroke="#5AAD1F"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Ribbon tails */}
        <path
          d="M54 79 L50 95 L62 88 L74 95 L70 79"
          fill="#5AAD1F"
          opacity="0.5"
        />
      </g>

      {/* Sparkles around cert */}
      <path
        d="M130 66 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z"
        fill="#5AAD1F"
        opacity="0.55"
      />
      <path
        d="M276 75 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z"
        fill="#3B7DC8"
        opacity="0.45"
      />
      <circle
        cx="285"
        cy="115"
        r="3"
        fill="none"
        stroke="#5AAD1F"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <circle cx="118" cy="120" r="2.5" fill="#5AAD1F" opacity="0.35" />

      {/* LEFT character — handing off cert */}
      {/* Legs */}
      <path
        d="M112 330 Q109 358 106 385 L117 385 Q120 360 126 344 Q132 360 135 385 L146 385 Q143 358 140 330Z"
        fill="#5AAD1F"
      />
      <ellipse cx="110" cy="386" rx="7" ry="3.5" fill="#2C1A0E" />
      <ellipse cx="142" cy="386" rx="7" ry="3.5" fill="#2C1A0E" />

      {/* Torso */}
      <rect x="104" y="278" width="52" height="56" rx="10" fill="#5AAD1F" />

      {/* Right arm — raised, holding cert out */}
      <path
        d="M156 286 Q174 270 185 258"
        stroke="#F5C894"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="187" cy="256" r="7" fill="#F5C894" />

      {/* Left arm */}
      <path
        d="M104 292 Q91 302 87 315"
        stroke="#F5C894"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* Neck + head */}
      <rect x="124" y="262" width="12" height="16" rx="4" fill="#F5C894" />
      <circle cx="130" cy="250" r="22" fill="#F5C894" />
      <path
        d="M109 246 Q111 225 130 222 Q149 225 151 246 Q144 234 130 234 Q116 234 109 246Z"
        fill="#2C1A0E"
      />

      {/* Face */}
      <circle cx="123" cy="250" r="2" fill="#2C1A0E" />
      <circle cx="137" cy="250" r="2" fill="#2C1A0E" />
      <path
        d="M124 259 Q130 263 136 259"
        stroke="#2C1A0E"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* RIGHT character — receiving cert */}
      {/* Legs */}
      <path
        d="M258 330 Q255 358 252 385 L263 385 Q266 360 272 344 Q278 360 281 385 L292 385 Q289 358 286 330Z"
        fill="#3B7DC8"
      />
      <ellipse cx="256" cy="386" rx="7" ry="3.5" fill="#2C1A0E" />
      <ellipse cx="288" cy="386" rx="7" ry="3.5" fill="#2C1A0E" />

      {/* Torso */}
      <rect x="250" y="278" width="52" height="56" rx="10" fill="#3B7DC8" />

      {/* Left arm — raised, reaching for cert */}
      <path
        d="M250 286 Q228 272 218 260"
        stroke="#F5C894"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="216" cy="258" r="7" fill="#F5C894" />

      {/* Right arm */}
      <path
        d="M302 292 Q315 300 318 313"
        stroke="#F5C894"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* Neck + head */}
      <rect x="270" y="262" width="12" height="16" rx="4" fill="#F5C894" />
      <circle cx="276" cy="250" r="22" fill="#F5C894" />
      {/* Different hair style */}
      <ellipse cx="276" cy="233" rx="16" ry="8" fill="#2C1A0E" />
      <rect x="260" y="233" width="32" height="10" rx="0" fill="#2C1A0E" />

      {/* Face */}
      <circle cx="269" cy="250" r="2" fill="#2C1A0E" />
      <circle cx="283" cy="250" r="2" fill="#2C1A0E" />
      <path
        d="M270 259 Q276 263 282 259"
        stroke="#2C1A0E"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Connecting line between hands (cert transfer) */}
      <line
        x1="187"
        y1="256"
        x2="216"
        y2="258"
        stroke="#C0DD97"
        strokeWidth="2"
        strokeDasharray="4 3"
        opacity="0.7"
      />
    </svg>
  );
}

export default function Signup() {
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
      <div className="hidden lg:flex flex-1 bg-[#F6FAF1] border-r border-[#DDECCB] flex-col items-center justify-center px-12 py-14 relative overflow-hidden">
        {/* Decorative bg circles */}
        <div className="absolute top-[-10%] left-[-10%] w-80 h-80 rounded-full bg-[#5AAD1F]/5" />
        <div className="absolute bottom-[-5%] right-[-5%] w-60 h-60 rounded-full bg-[#3B7DC8]/5" />

        <SignupIllustration />

        <div className="mt-10 text-center max-w-xs">
          <p className="text-[22px] font-extrabold tracking-tight text-gray-900 mb-2 leading-snug">
            Start your scholarship journey
          </p>
          <p className="text-[14px] text-gray-500 leading-relaxed">
            Join thousands of students who found funding they didn't know they
            qualified for.
          </p>
        </div>

        {/* Social proof */}
        <div className="mt-8 bg-white border border-[#C0DD97] rounded-2xl px-6 py-4 max-w-xs w-full">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["#5AAD1F", "#3B7DC8", "#E8884A"].map((c, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: c }}
                >
                  {["P", "R", "A"][i]}
                </div>
              ))}
            </div>
            <p className="text-[12.5px] text-gray-600 leading-snug">
              <strong className="text-gray-900">2,400+ students</strong> joined
              this month
            </p>
          </div>
        </div>
      </div>

      {/* Form panel — RIGHT */}
      <div className="flex-1 flex flex-col justify-center px-8 py-14 sm:px-14 lg:px-20 xl:px-28">
        {/* Logo */}
        <div className="mb-10">
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-12 h-12 rounded-xl bg-[#C0DD97]/20 border border-emerald-100 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-102">
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
        </div>

        <div className="max-w-sm w-full">
          <Badge>Get started — it's free</Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mt-3 mb-1">
            Create your account
          </h1>
          <p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
            Build your profile once. We'll match it against hundreds of
            scholarships automatically.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-gray-600 uppercase tracking-widest">
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

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-gray-600 uppercase tracking-widest">
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

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-gray-600 uppercase tracking-widest">
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
                  className={inputClass + " pr-12"}
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
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 h-1.5 rounded-full bg-[#DDECCB] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-gray-500 min-w-11">
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-gray-600 uppercase tracking-widest">
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
                  className={
                    inputClass +
                    (form.confirmPassword &&
                    form.confirmPassword !== form.password
                      ? " border-red-300 focus:border-red-400 focus:ring-red-100"
                      : form.confirmPassword &&
                          form.confirmPassword === form.password
                        ? " border-[#5AAD1F]"
                        : "")
                  }
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
                  <p className="text-[11px] text-red-500 font-medium">
                    Passwords don't match
                  </p>
                )}
            </div>

            <p className="text-[12px] text-gray-400 leading-relaxed -mt-1">
              By signing up you agree to our{" "}
              <Link
                to="/terms"
                className="text-[#5AAD1F] font-semibold hover:underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                to="/privacy"
                className="text-[#5AAD1F] font-semibold hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>

            <button
              type="submit"
              className="mt-1 w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-3xl
                bg-[#5AAD1F] hover:bg-[#4A9A18]
                text-white font-semibold text-[14px]
                transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
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
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#DDECCB]" />
            <span className="text-[12px] text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-[#DDECCB]" />
          </div>

          {/* Google SSO */}
          <button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[#DDECCB] bg-[#F6FAF1] hover:border-gray-300 hover:bg-white transition-all duration-150 text-[14px] font-semibold text-gray-700">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
