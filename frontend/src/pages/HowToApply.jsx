import React from "react";
import { Link } from "react-router-dom";

const STEPS = [
  {
    number: "01",
    title: "Research & Shortlist",
    description:
      "Start by finding scholarships that match your profile. Don't limit yourself to national awards — local, state-level, and institution-specific grants are often less competitive.",
    details: [
      "Use Udaan's smart match to filter by your level and state",
      "Check eligibility criteria carefully before applying",
      "Track deadlines in a calendar — missing one is costly",
    ],
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Gather Your Documents",
    description:
      "Prepare a master folder with digital copies of everything you'll need. Having these ready prevents last-minute scrambling when a deadline sneaks up.",
    details: [
      "Academic transcripts and latest mark sheets",
      "Income certificate and caste certificate if applicable",
      "Aadhaar card or any valid government ID",
      "Bank account details (passbook front page)",
    ],
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Get Letters of Recommendation",
    description:
      "Many scholarships ask for references. Choose teachers, professors, or mentors who know you well and can speak specifically to your achievements.",
    details: [
      "Ask at least 3 weeks before the deadline",
      "Share your resume and the scholarship brief with them",
      "Follow up politely — they are doing you a favour",
    ],
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
        />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Write a Compelling Essay",
    description:
      "Your personal statement is your chance to stand out from hundreds of similar applicants. Tailor your story to match the values of the scholarship body.",
    details: [
      "Answer the prompt directly — don't go off-topic",
      "Talk about your goals, not just your past",
      "Proofread at least three times and ask someone to read it",
    ],
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
  },
  {
    number: "05",
    title: "Review, Then Submit",
    description:
      "A single mistake — wrong file format, missing field — can disqualify an otherwise strong application. Always double-check before you hit submit.",
    details: [
      "Confirm every field is correctly filled",
      "Verify the right documents are attached and within size limits",
      "Submit at least 2 days early in case of portal issues",
    ],
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

const TIPS = [
  {
    emoji: "📅",
    title: "Apply to many",
    body: "Cast a wide net. Apply to 8–10 scholarships — most students only try 1 or 2 and miss out.",
  },
  {
    emoji: "🔁",
    title: "Reuse your essays",
    body: "Once you've written a strong personal statement, adapting it saves time across multiple applications.",
  },
  {
    emoji: "📬",
    title: "Follow up",
    body: "After submitting, confirm receipt with the scholarship body — especially for offline or government portals.",
  },
];

export default function HowToApply() {
  return (
    <div className="min-h-screen bg-[#F7FAF3] font-pangea text-gray-900">
      {/* ── Hero ── */}
      <section className="bg-white border-b border-[#E2EDCC] px-5 pt-10 pb-9 sm:pt-16 sm:pb-14 text-center">
        <div className="max-w-2xl mx-auto">
          {/* badge */}
          <div className="inline-flex items-center gap-2 bg-[#EAF3DE] border border-[#C0DD97] text-[#27500A] text-xs font-bold tracking-wider px-4 py-1.5 rounded-full mb-5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5AAD1F]" />
            Step-by-step guide
          </div>

          <h1 className="text-[32px] sm:text-[48px] font-extrabold tracking-tight leading-[1.1] mb-3 sm:mb-4">
            How to apply for a{" "}
            <span className="text-[#5AAD1F]">scholarship</span>
          </h1>
          <p className="text-[15px] sm:text-[16px] text-gray-600 leading-relaxed max-w-xl mx-auto font-medium">
            From finding the right match to hitting submit — follow these five
            steps to put together an application that gets noticed.
          </p>

          {/* quick stat strip */}
          <div className="flex justify-center gap-6 sm:gap-10 mt-8 pt-7 border-t border-[#E2EDCC]">
            {[
              { num: "5", label: "clear steps" },
              { num: "10 min", label: "to read" },
              { num: "1,240+", label: "scholarships waiting" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-[20px] sm:text-[24px] font-extrabold text-gray-900">
                  {s.num}
                </div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Steps ── */}
      <section className="max-w-2xl mx-auto px-4 sm:px-5 py-10 sm:py-16">
        <div className="relative">
          {/* Vertical dashed rail */}
          <div
            className="absolute left-4.75 top-6 bottom-6 w-0.5"
            style={{
              background:
                "repeating-linear-gradient(to bottom, #C0DD97 0px, #C0DD97 6px, transparent 6px, transparent 12px)",
            }}
          />

          <div className="space-y-4 sm:space-y-6">
            {STEPS.map((step, idx) => (
              <div key={idx} className="relative flex gap-3 sm:gap-6">
                {/* Step dot */}
                <div className="relative z-10 flex flex-col items-center shrink-0">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-[#5AAD1F] flex items-center justify-center shadow-xs">
                    <span className="text-[#5AAD1F]">{step.icon}</span>
                  </div>
                </div>

                {/* Card */}
                <div className="flex-1 min-w-0 bg-white border border-[#E2EDCC] rounded-2xl p-5 sm:p-6 mb-2 hover:border-[#C0DD97] hover:shadow-md transition-all duration-200 shadow-2xs">
                  {/* number pill + title */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-2.5">
                    <span className="text-[11px] font-extrabold tracking-wider text-[#27500A] bg-[#EAF3DE] px-3 py-1 rounded-full shrink-0">
                      STEP {step.number}
                    </span>
                    <h3 className="text-[17px] sm:text-[18px] font-bold text-gray-900 leading-snug">
                      {step.title}
                    </h3>
                  </div>

                  <p className="text-[14px] text-gray-700 leading-relaxed mb-4">
                    {step.description}
                  </p>

                  {/* checklist */}
                  <ul className="space-y-2.5">
                    {step.details.map((d, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-[13.5px] text-gray-800 font-medium"
                      >
                        <span className="mt-0.5 w-4.5 h-4.5 rounded-full bg-[#EAF3DE] flex items-center justify-center shrink-0">
                          <svg
                            className="w-2.5 h-2.5 text-[#5AAD1F]"
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
                        </span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pro tips strip ── */}
      <section className="bg-white border-y border-[#E2EDCC] px-4 sm:px-5 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-7 sm:mb-10">
            <p className="text-xs font-bold tracking-wider text-gray-600 uppercase mb-2">
              Things most students don't do
            </p>
            <h2 className="text-[22px] sm:text-[26px] font-extrabold tracking-tight text-gray-900">
              Pro tips that actually help
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {TIPS.map((t) => (
              <div
                key={t.title}
                className="bg-[#F7FAF3] border border-[#E2EDCC] rounded-2xl p-5 hover:border-[#C0DD97] hover:shadow-2xs transition-all duration-150"
              >
                <div className="text-2xl mb-3">
                  {t.emoji}
                </div>
                <p className="text-[15px] font-bold text-gray-900 mb-1">
                  {t.title}
                </p>
                <p className="text-[13.5px] text-gray-700 leading-relaxed font-normal">
                  {t.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 sm:px-5 py-10 sm:py-16">
        <div className="max-w-2xl mx-auto bg-white border border-[#E2EDCC] rounded-2xl sm:rounded-3xl px-6 py-9 sm:px-8 sm:py-12 text-center shadow-2xs">
          {/* green circle accent */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#EAF3DE] border border-[#C0DD97] flex items-center justify-center mx-auto mb-4 sm:mb-5">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-[#5AAD1F]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </div>
          <h2 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight text-gray-900 mb-2.5 sm:mb-3">
            Ready to find your scholarship?
          </h2>
          <p className="text-[14px] sm:text-[15px] text-gray-600 leading-relaxed mb-6 sm:mb-8 max-w-md mx-auto font-medium">
            Answer a few quick questions about your background and we'll surface
            every scholarship you're eligible for — ranked by deadline.
          </p>
          <div className="flex flex-col items-stretch sm:flex-row sm:items-center sm:justify-center gap-3">
            <Link
              to="/eligibility"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#5AAD1F] hover:bg-[#4A9A18] text-white text-[15px] font-bold transition-all duration-150 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              Check my eligibility
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
            </Link>
            <Link
              to="/scholarships"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-gray-300 bg-white hover:border-[#5AAD1F] hover:text-[#27500A] hover:bg-[#F6FAF1] text-[15px] font-bold text-gray-800 transition-all duration-150 shadow-2xs"
            >
              Browse all scholarships
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
