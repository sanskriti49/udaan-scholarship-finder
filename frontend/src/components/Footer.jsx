import React from "react";
import logoImg from "../assets/images/logo.png";

function Footer() {
  return (
    <footer className="font-pangea bg-white border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-gray-100">
          {/* Brand Column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <a href="#" className="flex items-center space-x-3 w-max">
              <img
                src={logoImg}
                alt="Udaan Logo"
                className="w-9 h-9 object-contain"
              />
              <span
                className="text-2xl font-bold tracking-tight"
                style={{ color: "#6BBF2E" }}
              >
                uda<span style={{ color: "#3B7DC8" }}>an</span>
              </span>
            </a>
            <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
              Connecting students with life-changing opportunities. Discover,
              apply, and secure funding for your higher education journey.
            </p>
          </div>

          {/* Navigation Columns */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              Platform
            </h3>
            <ul className="flex flex-col gap-2.5 text-sm text-gray-500">
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-600 transition-colors"
                >
                  Browse Scholarships
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-600 transition-colors"
                >
                  Partner Colleges
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-600 transition-colors"
                >
                  Success Stories
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-600 transition-colors"
                >
                  Resources
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              Company
            </h3>
            <ul className="flex flex-col gap-2.5 text-sm text-gray-500">
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-600 transition-colors"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-600 transition-colors"
                >
                  Careers
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-600 transition-colors"
                >
                  Press
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-600 transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              Stay Updated
            </h3>
            <p className="text-sm text-gray-500">
              Get weekly alerts for new matching funding options.
            </p>
            <form
              className="flex flex-col sm:flex-row gap-2 max-w-sm mt-1"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Your email"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
              <button className="cursor-pointer px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm rounded-xl transition-colors shrink-0">
                Join
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Section: Copyright & Legal */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-gray-400 font-medium">
          <p>&copy; {new Date().getFullYear()} Udaan. All rights reserved.</p>

          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-600 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-gray-600 transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-gray-600 transition-colors">
              Cookie Settings
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
