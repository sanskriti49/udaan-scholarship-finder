import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import Badge from "../components/Badge";

const MOCK_SCHOLARSHIPS = [
  {
    id: 1,
    title: "National Merit Scholarship",
    amount: "₹50,000 / year",
    deadline: "15 Oct 2026",
    description:
      "Financial assistance for high-performing students across various academic domains to support ongoing degree programs.",
    tags: ["Undergraduate", "Postgraduate", "Merit-Based"],
  },
  {
    id: 2,
    title: "Women in STEM Excellence",
    amount: "₹1,00,000 / year",
    deadline: "30 Nov 2026",
    description:
      "Exclusively for female students pursuing undergraduate or postgraduate programs in engineering, medicine, or core sciences.",
    tags: ["STEM", "Women Only"],
  },
  {
    id: 3,
    title: "State Higher Education Grant",
    amount: "₹25,000 / year",
    deadline: "01 Dec 2026",
    description:
      "State-sponsored tuition assistance program aimed at supporting learners pursuing engineering, medical, or general streams.",
    tags: ["Regional", "General Need"],
  },
  {
    id: 4,
    title: "NextGen Tech Fellowship",
    amount: "₹75,000 / year",
    deadline: "10 Jan 2027",
    description:
      "Empowering next-generation innovators in engineering, data sciences, and complex computing streams.",
    tags: ["Engineering", "Postgraduate", "EWS"],
  },
];

export default function EligibilityPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    educationLevel: "",
    courseStream: "",
    income: "",
    gender: "",
    category: "",
    state: "",
    cgpa: "",
    disability: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const resultsRef = useRef(null);

  const educationLevels = [
    "Class 10",
    "Class 12",
    "Undergraduate",
    "Postgraduate",
  ];
  const streams = [
    "Engineering",
    "Medical",
    "Arts",
    "Commerce",
    "Science",
    "Other",
  ];
  const categories = ["General", "OBC", "SC", "ST", "EWS"];
  const states = [
    "Delhi",
    "West Bengal",
    "Maharashtra",
    "Karnataka",
    "Tamil Nadu",
    "Other",
  ];

  const requiredFields = [
    "educationLevel",
    "courseStream",
    "income",
    "gender",
    "category",
    "state",
    "cgpa",
    "disability",
  ];
  const completedFieldsCount = Object.keys(formData).filter((key) => {
    if (key === "fullName") return false;
    return formData[key] !== "" && formData[key] !== undefined;
  }).length;
  const progress = Math.round(
    (completedFieldsCount / requiredFields.length) * 100,
  );

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckEligibility = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResultsVisible(false);

    setTimeout(() => {
      let evaluated = [...MOCK_SCHOLARSHIPS];
      if (formData.gender === "Male") {
        evaluated = evaluated.filter((s) => !s.tags.includes("Women Only"));
      }
      setFilteredResults(evaluated);
      setIsSubmitting(false);
      setResultsVisible(true);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }, 1500);
  };

  const inputClass =
    "w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#5AAD1F] focus:ring-2 focus:ring-[#5AAD1F]/20 transition text-gray-900 placeholder-gray-500 shadow-2xs";
  const selectClass =
    "w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#5AAD1F] focus:ring-2 focus:ring-[#5AAD1F]/20 transition text-gray-900 appearance-none cursor-pointer shadow-2xs font-medium";

  return (
    <div className="min-h-screen bg-white text-gray-900 font-pangea">
      {/* Hero */}
      <section className="bg-[#F6FAF1] border-b border-[#DDECCB] py-14 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge>Eligibility Engine</Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mt-3 mb-3">
            Find scholarships you{" "}
            <span className="text-[#5AAD1F]">actually qualify for</span>
          </h1>
          <p className="text-[15.5px] text-gray-600 leading-relaxed max-w-xl mx-auto font-medium">
            Enter your academic and demographic details below, and our engine
            will instantly cross-reference hundreds of active grants to find
            your best matches.
          </p>
        </div>
      </section>

      {/* How it works strip */}
      <section className="py-12 px-6 border-b border-gray-100 bg-[#FAFCF7]">
        <div className="max-w-5xl mx-auto">
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-0.5 border-t-2 border-dashed border-[#C0DD97] opacity-60 z-0"></div>

            {[
              {
                icon: "👤",
                label: "Tell us about yourself",
                desc: "Share your education, background, and financial status.",
              },
              {
                icon: "⚡",
                label: "Get matched instantly",
                desc: "We scan the full database in seconds for your profile.",
              },
              {
                icon: "📬",
                label: "Review and apply",
                desc: "Head straight to official pages and submit your application.",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="relative bg-white border border-gray-200/90 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[#5AAD1F] z-10 flex flex-col h-full shadow-2xs"
              >
                {/* Step Number Badge */}
                <div className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F6FAF1] text-[#5AAD1F] text-sm font-bold flex items-center justify-center border border-[#C0DD97]">
                  {i + 1}
                </div>

                {/* Icon Container */}
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#EAF3DE] to-[#D4EBB0] flex items-center justify-center text-2xl mb-5 shadow-sm border border-white">
                  {step.icon}
                </div>

                <h3 className="text-[18px] font-bold text-gray-900 mb-1.5 pr-8">
                  {step.label}
                </h3>
                <p className="text-[13.5px] text-gray-600 leading-relaxed font-normal">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form + Sidebar */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[0.9fr_1.35fr] gap-8 items-start">
          {/* Sidebar */}
          <div className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-24">
            {/* Profile completion */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-2xs">
              <Badge>Your profile</Badge>
              <h3 className="text-[18px] font-bold text-gray-900 mt-2 mb-1">
                Profile completion
              </h3>
              <p className="text-[13.5px] text-gray-600 mb-5 font-normal">
                Complete all fields to unlock the most accurate matches.
              </p>

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#27500A] uppercase tracking-wider">
                  Progress
                </span>
                <span className="text-[13px] font-bold text-gray-900">
                  {progress}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#EAF3DE] mb-6 overflow-hidden">
                <div
                  style={{ width: `${progress}%` }}
                  className="h-full rounded-full bg-[#5AAD1F] transition-all duration-500"
                />
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { label: "Academics", done: !!formData.educationLevel },
                  { label: "Demographics", done: !!formData.category },
                  { label: "Financials", done: !!formData.income },
                ].map(({ label, done }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 text-[13.5px]"
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 text-[11px] font-bold ${
                        done
                          ? "bg-[#5AAD1F] border-[#5AAD1F] text-white"
                          : "bg-white border-gray-300 text-transparent"
                      }`}
                    >
                      ✓
                    </div>
                    <span
                      className={
                        done ? "text-[#27500A] font-bold" : "text-gray-600 font-medium"
                      }
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy card */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs flex items-start gap-4 hover:border-[#C0DD97] transition-colors duration-150">
              <div className="w-9 h-9 rounded-xl bg-[#EAF3DE] flex items-center justify-center shrink-0 text-lg">
                🔒
              </div>
              <div>
                <h4 className="text-[14px] font-bold text-gray-900 mb-1">
                  Privacy first
                </h4>
                <p className="text-[13px] text-gray-600 leading-relaxed">
                  Your financial and demographic data is processed securely and
                  never shared without explicit consent.
                </p>
              </div>
            </div>

            {/* Pro tip */}
            <div className="bg-[#EAF3DE] border border-[#C0DD97] rounded-2xl p-5 shadow-2xs">
              <p className="text-[13.5px] text-gray-800 leading-relaxed">
                <strong className="text-[#27500A]">Tip:</strong> Users who reach
                100% completion are 4× more likely to discover high-value
                regional grants.
              </p>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white border border-gray-200/90 rounded-3xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-[#5AAD1F]" />

            <form
              onSubmit={handleCheckEligibility}
              className="p-6 sm:p-8 flex flex-col gap-10"
            >
              {/* Section — Identity */}
              <div>
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-[#EAF3DE] flex items-center justify-center text-sm">
                    👤
                  </div>
                  <h2 className="text-[18px] font-extrabold text-gray-900">
                    Basic identity
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Full name{" "}
                      <span className="text-gray-500 normal-case font-normal tracking-normal">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="Priya Sharma"
                      value={formData.fullName}
                      onChange={(e) =>
                        handleInputChange("fullName", e.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Gender
                    </label>
                    <div className="flex gap-2 h-11.5">
                      {["Male", "Female", "Other"].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => handleInputChange("gender", g)}
                          className={`cursor-pointer flex-1 rounded-xl text-[13px] font-bold border transition-all duration-150 ${
                            formData.gender === g
                              ? "bg-[#5AAD1F] text-white border-[#5AAD1F] shadow-xs"
                              : "bg-[#F6FAF1] border-[#C0DD97] text-gray-700 hover:border-[#5AAD1F] hover:bg-white"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-[#EAF3DE] flex items-center justify-center text-sm">
                    🎓
                  </div>
                  <h2 className="text-[18px] font-extrabold text-gray-900">
                    Academic standing
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Education level
                    </label>
                    <select
                      value={formData.educationLevel}
                      onChange={(e) =>
                        handleInputChange("educationLevel", e.target.value)
                      }
                      className={selectClass}
                      required
                    >
                      <option value="" disabled>
                        Select level…
                      </option>
                      {educationLevels.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Course / stream
                    </label>
                    <select
                      value={formData.courseStream}
                      onChange={(e) =>
                        handleInputChange("courseStream", e.target.value)
                      }
                      className={selectClass}
                      required
                    >
                      <option value="" disabled>
                        Select stream…
                      </option>
                      {streams.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Current CGPA / %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="e.g. 8.5 or 85"
                      value={formData.cgpa}
                      onChange={(e) =>
                        handleInputChange("cgpa", e.target.value)
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Domicile state
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) =>
                        handleInputChange("state", e.target.value)
                      }
                      className={selectClass}
                      required
                    >
                      <option value="" disabled>
                        Select state…
                      </option>
                      {states.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section — Financial & Category */}
              <div>
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-[#EAF3DE] flex items-center justify-center text-sm">
                    💰
                  </div>
                  <h2 className="text-[18px] font-extrabold text-gray-900">
                    Financial &amp; category
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Annual family income
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.income}
                        onChange={(e) =>
                          handleInputChange("income", e.target.value)
                        }
                        className={inputClass + " pl-8"}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        handleInputChange("category", e.target.value)
                      }
                      className={selectClass}
                      required
                    >
                      <option value="" disabled>
                        Select category…
                      </option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Person with disability (PwD)?
                    </label>
                    <div className="flex gap-2 h-11.5 max-w-50">
                      {["No", "Yes"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleInputChange("disability", opt)}
                          className={`cursor-pointer flex-1 rounded-xl text-[13px] font-bold border transition-all duration-150 ${
                            formData.disability === opt
                              ? "bg-[#5AAD1F] text-white border-[#5AAD1F] shadow-xs"
                              : "bg-[#F6FAF1] border-[#C0DD97] text-gray-700 hover:border-[#5AAD1F] hover:bg-white"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2 border-t border-gray-100">
                {progress < 100 && (
                  <p className="text-[13px] text-gray-600 mb-4 text-center font-medium">
                    Fill all required fields to generate your matches.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || progress < 100}
                  className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-3xl
                    bg-[#5AAD1F] hover:bg-[#4A9A18]
                    text-white font-bold text-[15px]
                    transition-all duration-200
                    shadow-sm hover:shadow-md
                    active:scale-[0.98]
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Analyzing database…
                    </>
                  ) : (
                    <>
                      Generate scholarship matches
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
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Results */}
      <div ref={resultsRef} className="scroll-mt-10">
        {resultsVisible && (
          <section className="py-12 px-6 bg-[#F6FAF1] border-t border-[#DDECCB]">
            <div className="max-w-5xl mx-auto">
              <div className="mb-8">
                <Badge>Your matches</Badge>
                <h2 className="mt-3 text-3xl font-extrabold text-gray-900">
                  Eligible scholarships
                </h2>
                <p className="text-[14px] text-gray-600 mt-1 font-medium">
                  We found {filteredResults.length} opportunities tailored to
                  your profile.
                </p>
              </div>

              {filteredResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredResults.map((s) => (
                    <div
                      key={s.id}
                      className="bg-white border border-gray-200/90 hover:border-[#C0DD97] rounded-2xl p-6 transition-all duration-150 shadow-2xs hover:shadow-md"
                    >
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {s.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#EAF3DE] text-[#27500A]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-[18px] font-bold text-gray-900 mb-1">
                        {s.title}
                      </h3>
                      <p className="text-[14px] text-gray-700 leading-relaxed mb-4">
                        {s.description}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div>
                          <p className="text-[18px] font-extrabold text-[#3B8210]">
                            {s.amount}
                          </p>
                          <p className="text-[12.5px] text-gray-600 font-medium">
                            Deadline: {s.deadline}
                          </p>
                        </div>
                        <button className="cursor-pointer text-[13px] font-bold text-[#27500A] bg-[#EAF3DE] hover:bg-[#D4EBB0] px-4.5 py-2 rounded-full transition-colors duration-150 shadow-2xs">
                          View details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200/90 rounded-2xl p-16 text-center shadow-2xs">
                  <div className="w-14 h-14 bg-[#EAF3DE] rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
                    🔍
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 mb-2">
                    No matches found
                  </h3>
                  <p className="text-[14px] text-gray-600 max-w-sm mx-auto mb-6 leading-relaxed">
                    Your combination didn't match today, but new opportunities
                    are added weekly.
                  </p>
                  <Link
                    to="/scholarships"
                    className="inline-block cursor-pointer bg-[#5AAD1F] text-white text-[13px] font-bold px-6 py-2.5 rounded-full hover:bg-[#4A9A18] transition-colors shadow-2xs"
                  >
                    Browse all scholarships
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Bottom CTA */}
      <section className="py-8 px-6 border-t border-gray-100">
        <div className="max-w-5xl mx-auto bg-[#EAF3DE] border border-[#C0DD97] rounded-2xl px-8 py-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-2xs">
          <div>
            <h3 className="text-[18px] font-bold text-gray-900 mb-1">
              Prefer to browse on your own?
            </h3>
            <p className="text-[14px] text-gray-700 max-w-md leading-relaxed">
              Explore our full directory and apply your own filters to find what
              you need.
            </p>
          </div>
          <Link
            to="/scholarships"
            className="cursor-pointer shrink-0 bg-[#5AAD1F] text-white text-[15px] font-bold px-6 py-2.5 rounded-full hover:bg-[#4A9A18] transition-colors shadow-2xs"
          >
            Explore all scholarships
          </Link>
        </div>
      </section>
    </div>
  );
}
