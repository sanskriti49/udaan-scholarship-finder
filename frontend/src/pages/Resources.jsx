import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Badge from "../components/Badge";

const GUIDES = [
  {
    title: "How to Apply for Scholarships",
    description:
      "A complete step-by-step walkthrough from finding the right match to hitting submit.",
    icon: "📋",
    bg: "bg-[#EAF3DE]",
  },
  {
    title: "Writing a Strong Application",
    description:
      "Learn how to structure your essays and highlight your achievements effectively.",
    icon: "✍️",
    bg: "bg-[#E6F1FB]",
  },
  {
    title: "Common Mistakes to Avoid",
    description:
      "Don't let simple errors disqualify you. Review the most frequent application pitfalls.",
    icon: "⚠️",
    bg: "bg-[#FCEBEB]",
  },
  {
    title: "Interview Preparation",
    description:
      "Master the scholarship interview with these proven communication strategies.",
    icon: "🎤",
    bg: "bg-[#FAEEDA]",
  },
];

const DOCUMENTS = [
  "Aadhaar Card",
  "Income Certificate",
  "Caste Certificate",
  "Previous Mark Sheets",
  "Bonafide Certificate",
  "Bank Account Details",
  "Passport Size Photographs",
  "Fee Receipt of Current Course",
];

const PORTALS = [
  { name: "National Scholarship Portal", color: "bg-[#5AAD1F]" },
  { name: "AICTE Scholarships", color: "bg-[#3B7DC8]" },
  { name: "UGC Scholarships", color: "bg-[#059669]" },
  { name: "State Education Portals", color: "bg-[#14B8A6]" },
];

const EDU_RESOURCES = [
  {
    icon: "📚",
    title: "Entrance Exam Hub",
    desc: "JEE, NEET, CUET, GATE resources & mock tests.",
    bg: "bg-[#EAF3DE]",
  },
  {
    icon: "🗺️",
    title: "Career Guidance",
    desc: "Articles and roadmaps for various career trajectories.",
    bg: "bg-[#E6F1FB]",
  },
  {
    icon: "⏱️",
    title: "Time Management",
    desc: "Study tips and productivity hacks for top performers.",
    bg: "bg-[#FAEEDA]",
  },
];

const DOWNLOADS = [
  { title: "Application Checklist", type: "PDF" },
  { title: "Standard Resume Template", type: "DOCX" },
  { title: "Statement of Purpose Draft", type: "DOCX" },
  { title: "2026 Scholarship Calendar", type: "PDF" },
];

const DOC_ICONS = {
  "Aadhaar Card": "🪪",
  "Income Certificate": "💰",
  "Caste Certificate": "📄",
  "Previous Mark Sheets": "📊",
  "Bonafide Certificate": "🏛️",
  "Bank Account Details": "🏦",
  "Passport Size Photographs": "📷",
  "Fee Receipt of Current Course": "🧾",
};

export default function Resources() {
  const [searchQuery, setSearchQuery] = useState("");
  const [checkedDocs, setCheckedDocs] = useState(() =>
    JSON.parse(localStorage.getItem("checkedDocs") || "[]"),
  );
  const [showConfetti, setShowConfetti] = useState(false);

  const toggleDoc = (doc) => {
    const next = checkedDocs.includes(doc)
      ? checkedDocs.filter((d) => d !== doc)
      : [...checkedDocs, doc];
    setCheckedDocs(next);
    localStorage.setItem("checkedDocs", JSON.stringify(next));
  };

  const resetDocs = () => {
    setCheckedDocs([]);
    localStorage.setItem("checkedDocs", "[]");
  };

  const progress = Math.round((checkedDocs.length / DOCUMENTS.length) * 100);
  const allDone = checkedDocs.length === DOCUMENTS.length;
  const remaining = DOCUMENTS.length - checkedDocs.length;

  useEffect(() => {
    if (allDone) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 2800);
      return () => clearTimeout(t);
    }
  }, [allDone]);

  /* ── SVG Ring Math ── */
  const RING = 136;
  const SW = 10;
  const radius = (RING - SW) / 2;
  const circ = 2 * Math.PI * radius;
  const dashOff = circ - (progress / 100) * circ;

  /* ── Confetti Particles ── */
  const particles = showConfetti
    ? Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: [
          "#5AAD1F",
          "#F59E0B",
          "#3B82F6",
          "#EF4444",
          "#8B5CF6",
          "#EC4899",
        ][i % 6],
        delay: Math.random() * 0.5,
        dur: 1.1 + Math.random() * 1.4,
        size: 4 + Math.random() * 5,
        round: Math.random() > 0.5,
      }))
    : [];

  return (
    <>
      <style>{`
        @keyframes cfall{0%{transform:translateY(-8px) scale(1);opacity:1}100%{transform:translateY(300px) scale(.4);opacity:0}}
        @keyframes ringPulse{0%,100%{filter:drop-shadow(0 0 6px rgba(245,158,11,.25))}50%{filter:drop-shadow(0 0 20px rgba(245,158,11,.55))}}
        @keyframes fadeUp{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
        .ring-pulse{animation:ringPulse 1.6s ease-in-out infinite}
        .fade-up{animation:fadeUp .4s ease-out both}
      `}</style>

      <div className="min-h-screen bg-white text-gray-900 font-pangea">
        {/* HERO */}
        <section className="relative overflow-hidden bg-[#F6FAF1] border-b border-[#DDECCB] py-12 sm:py-16 px-4 sm:px-6">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#5AAD1F]/4 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#5AAD1F]/4 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-5xl mx-auto text-center">
            <Badge>Student knowledge base</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mt-4 mb-3">
              Everything you need to{" "}
              <span className="text-[#5AAD1F]">succeed and get funded</span>
            </h1>
            <p className="text-sm sm:text-[15px] text-gray-500 leading-relaxed max-w-xl mx-auto px-2">
              Guides, document checklists, templates, and essential resources to
              maximize your chances of securing a scholarship.
            </p>
            <div className="max-w-md mx-auto mt-6 relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#DDECCB] rounded-full px-11 py-3 text-sm sm:text-[14px] outline-none focus:border-[#5AAD1F] focus:ring-2 focus:ring-[#5AAD1F]/10 transition text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>
        </section>

        {/* ════════ GUIDES — LEARNING PATH ════════ */}
        <section className="py-10 sm:py-14 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6 sm:mb-8">
              <Badge>Guides</Badge>
              <h2 className="text-xl sm:text-2xl font-semibold mt-1.5">
                Your learning path
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Follow these steps to build a winning application.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {GUIDES.map((g, i) => (
                <div
                  key={i}
                  className="relative border border-gray-200/80 hover:border-[#C0DD97] hover:shadow-lg rounded-2xl p-5 sm:p-6 cursor-pointer transition-all duration-300 flex flex-col group bg-white fade-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${g.bg} flex items-center justify-center text-xl mb-3 sm:mb-4 mt-1 group-hover:scale-110 transition-transform duration-300`}
                  >
                    {g.icon}
                  </div>
                  <h3 className="text-[15px] sm:text-[17px] font-semibold text-gray-900 mb-1.5 leading-snug">
                    {g.title}
                  </h3>
                  <p className="text-xs sm:text-[13.5px] tracking-wide text-gray-500 leading-relaxed flex-1">
                    {g.description}
                  </p>
                  <div className="mt-4 sm:mt-5 flex items-center gap-1 text-[#5AAD1F] text-[13px] sm:text-[14px] font-bold group-hover:gap-2.5 transition-all duration-200">
                    Read guide
                    <svg
                      className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr className="border-gray-100 mx-4 sm:mx-6" />

        {/* DASHBOARD */}
        <section className="py-10 sm:py-14 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6 sm:mb-8">
              <Badge>Documents</Badge>
              <h2 className="text-xl sm:text-2xl font-semibold mt-1.5">
                Document readiness
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Track which documents you have ready in digital format (PDF /
                JPEG).
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-4 sm:gap-6">
              {/* ── Progress Ring ── */}
              <div className="relative overflow-hidden bg-linear-to-br from-[#F6FAF1] to-[#EAF3DE] border border-[#DDECCB] rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-60 sm:min-h-72.5">
                {/* Confetti layer */}
                {particles.map((p) => (
                  <div
                    key={p.id}
                    className="absolute pointer-events-none z-20"
                    style={{
                      left: `${p.left}%`,
                      top: 0,
                      width: p.size,
                      height: p.size,
                      backgroundColor: p.color,
                      borderRadius: p.round ? "50%" : "2px",
                      animation: `cfall ${p.dur}s ease-out ${p.delay}s forwards`,
                    }}
                  />
                ))}

                {/* Ring */}
                <div className={`relative ${allDone ? "ring-pulse" : ""}`}>
                  <svg
                    width={RING}
                    height={RING}
                    className="transform -rotate-90"
                  >
                    <circle
                      cx={RING / 2}
                      cy={RING / 2}
                      r={radius}
                      fill="none"
                      stroke="#DDECCB"
                      strokeWidth={SW}
                    />
                    <circle
                      cx={RING / 2}
                      cy={RING / 2}
                      r={radius}
                      fill="none"
                      stroke={allDone ? "#F59E0B" : "#5AAD1F"}
                      strokeWidth={SW}
                      strokeDasharray={circ}
                      strokeDashoffset={dashOff}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  {/* Score overlay — positioned relative to the non-rotated wrapper */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[28px] sm:text-[32px] font-extrabold text-gray-900 leading-none">
                      {progress}%
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-bold tracking-[.2em] text-gray-400 uppercase mt-1">
                      Ready
                    </span>
                  </div>
                </div>

                {/* Status text */}
                <div className="mt-4 sm:mt-5">
                  <p className="text-[13px] sm:text-[14px] font-semibold text-gray-700">
                    {allDone
                      ? "🎉 All documents ready!"
                      : `${remaining} document${remaining !== 1 ? "s" : ""} left`}
                  </p>
                  <p className="text-[11px] sm:text-[12px] text-gray-500 mt-0.5 leading-relaxed max-w-45">
                    {allDone
                      ? "You're fully prepared to apply."
                      : "Keep these ready before starting any application."}
                  </p>
                </div>
              </div>

              {/* ── Document Chips ── */}
              <div className="bg-white border border-gray-200/80 rounded-2xl p-5 sm:p-7 shadow-sm">
                <div className="flex items-center justify-between mb-4 sm:mb-5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-[13.5px] text-gray-500">
                      <span className="font-bold text-gray-900">
                        {checkedDocs.length}
                      </span>{" "}
                      of {DOCUMENTS.length} collected
                    </span>
                  </div>
                  {checkedDocs.length > 0 && (
                    <button
                      onClick={resetDocs}
                      className="text-xs sm:text-[13px] text-gray-400 hover:text-red-500 transition-colors cursor-pointer font-medium"
                    >
                      Reset all
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                  {DOCUMENTS.map((doc, idx) => {
                    const isChecked = checkedDocs.includes(doc);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleDoc(doc)}
                        className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-xl border transition-all duration-200 text-left cursor-pointer group/chip ${
                          isChecked
                            ? "bg-[#EAF3DE] border-[#C0DD97] shadow-[0_1px_4px_rgba(90,173,31,.08)]"
                            : "bg-[#FAFAFA] border-gray-200/80 hover:bg-[#F6FAF1] hover:border-[#DDECCB]"
                        }`}
                      >
                        <div
                          className={`w-4 sm:w-4.5 h-4 sm:h-4.5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 ${
                            isChecked
                              ? "bg-[#5AAD1F] scale-100"
                              : "bg-white border-2 border-gray-300 group-hover/chip:border-[#5AAD1F]/40 scale-95"
                          }`}
                        >
                          {isChecked && (
                            <svg
                              className="w-2.5 sm:w-2.75 h-2.5 sm:h-2.75 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>

                        {/* Icon */}
                        <span className="text-xs sm:text-sm shrink-0">
                          {DOC_ICONS[doc]}
                        </span>

                        {/* Label */}
                        <span
                          className={`text-xs sm:text-[13.5px] font-inter font-medium transition-all duration-200 truncate ${
                            isChecked ? "text-[#27500A]" : "text-gray-600"
                          }`}
                        >
                          {doc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-gray-100 mx-4 sm:mx-6" />

        {/* EDUCATIONAL RESOURCES */}
        <section className="py-10 sm:py-14 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6 sm:mb-8">
              <Badge>Resources</Badge>
              <h2 className="text-xl sm:text-2xl font-semibold mt-1.5">
                Study smarter, not harder
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Beyond scholarships — tools to accelerate your academic journey.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {EDU_RESOURCES.map((res, i) => (
                <div
                  key={i}
                  className="group border border-gray-200/80 hover:border-[#C0DD97] hover:shadow-lg rounded-2xl p-5 sm:p-6 cursor-pointer transition-all duration-300 bg-white fade-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div
                    className={`w-10 sm:w-11 h-10 sm:h-11 rounded-xl ${res.bg} flex items-center justify-center text-base sm:text-lg mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    {res.icon}
                  </div>
                  <h4 className="text-[15px] sm:text-[16.5px] font-semibold text-gray-900 group-hover:text-[#5AAD1F] transition-colors mb-1.5">
                    {res.title}
                  </h4>
                  <p className="text-xs sm:text-[13.5px] text-gray-500 leading-relaxed">
                    {res.desc}
                  </p>
                  <div className="mt-3 sm:mt-4 flex items-center gap-1 text-[#5AAD1F] text-xs sm:text-[13px] font-bold opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                    Explore
                    <svg
                      className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr className="border-gray-100 mx-4 sm:mx-6" />

        {/* OFFICIAL PORTALS */}
        <section className="py-10 sm:py-14 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6 sm:mb-8">
              <Badge>Government portals</Badge>
              <h2 className="text-xl sm:text-2xl font-semibold mt-1.5">
                Official scholarship portals
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Always apply through verified government sources.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {PORTALS.map((portal, i) => (
                <a
                  key={i}
                  href="#"
                  className="group relative overflow-hidden bg-white border border-gray-200/80 hover:border-[#C0DD97] hover:shadow-lg rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-all duration-300"
                >
                  <div
                    className={`absolute left-0 top-0 w-1 h-full ${portal.color} rounded-l-2xl group-hover:w-1.5 transition-all duration-300`}
                  />
                  <span className="font-jakarta font-bold text-[13px] sm:text-[14px] text-gray-800 pl-2 sm:pl-3 group-hover:text-[#5AAD1F] transition-colors duration-200">
                    {portal.name}
                  </span>
                  <svg
                    className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-400 group-hover:text-[#5AAD1F] group-hover:translate-x-1 transition-all shrink-0 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </section>

        <hr className="border-gray-100 mx-4 sm:mx-6" />

        {/* DOWNLOADS */}
        <section className="py-10 sm:py-14 px-4 sm:px-6 bg-[#F6FAF1] border-y border-[#DDECCB]">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 sm:gap-8 items-start">
            <div>
              <Badge>Downloads</Badge>
              <h2 className="text-xl sm:text-2xl font-bold mt-1.5 mb-2">
                Templates & downloads
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-sm">
                Save hours of formatting. Pre-built templates for resumes,
                statements of purpose, and scholarship tracking.
              </p>
              <button className="cursor-pointer inline-flex items-center gap-2 bg-[#5AAD1F] hover:bg-[#4A9A18] active:bg-[#3D8813] text-white text-[14px] sm:text-[15px] font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]">
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download complete toolkit (.zip)
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:gap-2.5">
              {DOWNLOADS.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 sm:p-4 bg-white border border-gray-200/80 hover:border-[#C0DD97] hover:shadow-sm rounded-xl cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold tracking-wider shrink-0 ${
                        item.type === "PDF"
                          ? "bg-[#FCEBEB] text-[#791F1F]"
                          : "bg-[#E6F1FB] text-[#1a4a8a]"
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="text-[13px] sm:text-[14px] font-medium text-gray-800 group-hover:text-[#5AAD1F] transition-colors truncate">
                      {item.title}
                    </span>
                  </div>
                  <svg
                    className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-400 group-hover:text-[#5AAD1F] group-hover:translate-y-0.5 transition-all shrink-0 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="py-8 sm:py-10 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto bg-[#EAF3DE] border border-[#C0DD97] rounded-2xl px-6 sm:px-8 py-6 sm:py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-gray-900 mb-1">
                Ready to find your match?
              </h3>
              <p className="text-sm text-gray-600 max-w-md leading-relaxed">
                Put your new knowledge to work. Check eligibility or browse the
                complete directory.
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-3 shrink-0 w-full sm:w-auto">
              <Link
                to="/eligibility"
                className="inline-flex items-center justify-center bg-[#5AAD1F] text-white text-[14px] sm:text-[15px] font-semibold px-5 sm:px-6 py-2.5 rounded-full hover:bg-[#4A9A18] active:bg-[#3D8813] transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] flex-1 sm:flex-none"
              >
                Check eligibility
              </Link>
              <Link
                to="/scholarships"
                className="inline-flex items-center justify-center bg-white border border-[#C0DD97] text-[#27500A] text-[14px] sm:text-[15px] font-semibold px-5 sm:px-6 py-2.5 rounded-full hover:bg-[#F6FAF1] hover:border-[#5AAD1F] transition-all duration-200 flex-1 sm:flex-none"
              >
                Browse scholarships
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
