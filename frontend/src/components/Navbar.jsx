import React, { useState, useEffect } from "react";
import logoImg from "../assets/images/logo.png";
import { Link } from "react-router-dom";
import { LogIn, Search } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const [activeLink, setActiveLink] = useState("/");

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Scholarships", path: "/scholarships" },
    { name: "Explore", path: "/explore" },
    { name: "Resources", path: "/resources" },
    { name: "About", path: "/about" },
  ];

  return (
    <>
      <nav
        className={`font-satoshi fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 md:px-8 ${
          isScrolled
            ? "py-2.5 bg-white/95 backdrop-blur-md border-b border-black/[0.05] shadow-xs"
            : "py-4 bg-white/80 backdrop-blur-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link
            to="/"
            onClick={() => setActiveLink("/")}
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-102">
              <img
                src={logoImg}
                alt="Udaan"
                className="w-9 h-9 object-contain"
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

          <div className="hidden md:flex items-center bg-gray-100/80 border border-gray-200/50 rounded-full p-1 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setActiveLink(link.path)}
                className={`px-4 py-1.5 text-sm rounded-full transition-all duration-200 ease-out whitespace-nowrap ${
                  activeLink === link.path
                    ? "bg-white text-gray-900 font-semibold shadow-xs border border-black/[0.02]"
                    : "text-gray-500 font-medium hover:text-gray-900 hover:bg-white/40"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              className="cursor-pointer hidden sm:flex w-9 h-9 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-gray-500 hover:text-gray-900 hover:bg-white transition-all"
              aria-label="Search"
            >
              <Search size={16} />
            </button>

            <Link
              to="/login"
              className="group/btn relative inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gray-950 hover:bg-gray-900 rounded-full transition-all duration-200 shadow-sm border border-white/10 overflow-hidden active:scale-95"
            >
              <span>Login</span>
              <LogIn
                size={15}
                className="transition-transform duration-200 group-hover/btn:translate-x-0.5"
              />
            </Link>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        <div
          className={`fixed inset-x-0 top-0 bg-white/98 backdrop-blur-xl border-b border-gray-100 px-6 pt-22 pb-6 transition-all duration-300 md:hidden z-40 ${
            isOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-full pointer-events-none"
          }`}
        >
          <div className="flex flex-col gap-1.5">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => {
                  setActiveLink(link.path);
                  setIsOpen(false);
                }}
                className={`px-4 py-2.5 text-base rounded-lg transition-all ${
                  activeLink === link.path
                    ? "text-[#5AAD1F] font-bold bg-emerald-50/50 border-l-4 border-[#5AAD1F] rounded-l-none pl-3"
                    : "text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {link.name}
              </Link>
            ))}

            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="mt-4 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-gray-950 hover:bg-gray-900 rounded-xl active:scale-95 transition-transform shadow-sm"
            >
              <span>Login</span>
              <LogIn size={15} />
            </Link>
          </div>
        </div>
      </nav>

      <div className="h-[76px] md:h-[84px]" />
    </>
  );
};

export default Navbar;
