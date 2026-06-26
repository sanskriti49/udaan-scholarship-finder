import { useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";

const faqs = [
  {
    question: "Who can apply for scholarships on Udaan?",
    answer:
      "Students from Class 1 to postgraduate level can explore scholarships based on eligibility criteria such as academic performance, income, category, gender, state, and course.",
  },
  {
    question: "Can I apply for multiple scholarships?",
    answer:
      "Yes. You can apply for multiple scholarships as long as you meet the eligibility criteria and the scholarship guidelines allow it.",
  },
  {
    question: "Are the scholarships verified?",
    answer:
      "Yes. We curate scholarships from trusted government portals, educational institutions, and recognized organizations to help you apply with confidence.",
  },
  {
    question: "What documents are usually required?",
    answer:
      "Common requirements include academic mark sheets, Aadhaar, income certificate, caste certificate (if applicable), bank account details, and recent passport-size photographs.",
  },
  {
    question: "Does Udaan charge any application fee?",
    answer:
      "No. Browsing scholarships and applying through official sources is completely free. Udaan never charges students to access scholarship information.",
  },
  {
    question: "How are application deadlines updated?",
    answer:
      "Our team regularly reviews scholarship listings and updates deadlines whenever official notifications are released.",
  },
  {
    question: "How do I know which scholarships I'm eligible for?",
    answer:
      "Use our filters to narrow opportunities by education level, state, category, gender, course, and scholarship type. Soon, you'll also receive personalized recommendations.",
  },
  {
    question: "How can I stay updated about new scholarships?",
    answer:
      "Create an account to bookmark opportunities, receive deadline reminders, and get notified when scholarships matching your profile become available.",
  },
];

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 320 260"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className="w-full max-w-xs"
      aria-hidden="true"
    >
      <circle cx="160" cy="130" r="90" fill="#EAF3DE" opacity="0.5" />
      <circle cx="110" cy="110" r="50" fill="#C0DD97" opacity="0.2" />
      <circle cx="210" cy="120" r="50" fill="#BFDDF8" opacity="0.25" />
      <text
        x="148"
        y="200"
        fontFamily="Georgia,serif"
        fontSize="130"
        fontWeight="900"
        fill="#6BBF2E"
        opacity="0.8"
        textAnchor="middle"
      >
        ?
      </text>
      <text
        x="198"
        y="205"
        fontFamily="Georgia,serif"
        fontSize="115"
        fontWeight="900"
        fill="#3B7DC8"
        opacity="0.65"
        textAnchor="middle"
      >
        ?
      </text>
      <text
        x="80"
        y="138"
        fontFamily="Georgia,serif"
        fontSize="48"
        fontWeight="900"
        fill="#E8884A"
        opacity="0.7"
        textAnchor="middle"
      >
        ?
      </text>
      <text
        x="308"
        y="92"
        fontFamily="Georgia,serif"
        fontSize="38"
        fontWeight="900"
        fill="#5AAD1F"
        opacity="0.55"
        textAnchor="middle"
      >
        ?
      </text>
      <rect
        x="138"
        y="62"
        width="108"
        height="135"
        rx="4"
        fill="none"
        stroke="#3B7DC8"
        strokeWidth="1.5"
        opacity="0.35"
      />
      {/* Left character */}
      <circle cx="106" cy="148" r="13" fill="#F5C894" />
      <path
        d="M93 144 Q95 133 106 131 Q117 133 119 144 Q114 137 106 137 Q98 137 93 144Z"
        fill="#2C1A0E"
      />
      <rect
        x="91"
        y="160"
        width="30"
        height="34"
        rx="7"
        fill="#fff"
        stroke="#e8e8e4"
        strokeWidth="1"
      />
      <path
        d="M91 170 Q79 174 74 184"
        stroke="#F5C894"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="73" cy="184" r="5" fill="#F5C894" />
      <path
        d="M121 170 Q130 173 133 181"
        stroke="#F5C894"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M91 192 Q87 222 83 248 L94 248 Q98 222 106 206 Q114 222 118 248 L129 248 Q125 222 121 192Z"
        fill="#5AAD1F"
      />
      <ellipse cx="87" cy="249" rx="7" ry="3.5" fill="#2C1A0E" />
      <ellipse cx="121" cy="249" rx="7" ry="3.5" fill="#2C1A0E" />
      {/* Right character */}
      <circle cx="232" cy="148" r="13" fill="#F5C894" />
      <path
        d="M219 144 Q221 133 232 131 Q243 133 245 144 Q240 137 232 137 Q224 137 219 144Z"
        fill="#2C1A0E"
      />
      <rect x="217" y="160" width="30" height="34" rx="7" fill="#3B7DC8" />
      <path
        d="M247 170 Q256 163 254 153"
        stroke="#F5C894"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="253" cy="152" r="4.5" fill="#F5C894" />
      <path
        d="M217 170 Q208 175 206 183"
        stroke="#F5C894"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M217 192 Q213 222 209 248 L220 248 Q224 222 232 206 Q240 222 244 248 L255 248 Q251 222 247 192Z"
        fill="#6BBF2E"
      />
      <ellipse cx="213" cy="249" rx="7" ry="3.5" fill="#2C1A0E" />
      <ellipse cx="247" cy="249" rx="7" ry="3.5" fill="#2C1A0E" />
      <line
        x1="50"
        y1="252"
        x2="270"
        y2="252"
        stroke="#C0DD97"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <ellipse cx="160" cy="255" rx="110" ry="6" fill="#EAF3DE" opacity="0.4" />
      <path
        d="M48 155 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z"
        fill="#5AAD1F"
        opacity="0.5"
      />
      <path
        d="M278 130 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z"
        fill="#3B7DC8"
        opacity="0.45"
      />
      <circle
        cx="56"
        cy="195"
        r="4"
        fill="none"
        stroke="#5AAD1F"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <circle cx="270" cy="200" r="3" fill="#E8884A" opacity="0.4" />
    </svg>
  );
}

const quickHelp = [
  {
    icon: "📚",
    bg: "bg-[#EAF3DE]",
    title: "Scholarship help",
    desc: "How to find scholarships that match your profile and eligibility.",
  },
  {
    icon: "📄",
    bg: "bg-[#EAF3DE]",
    title: "Required documents",
    desc: "Know which documents you'll typically need before applying.",
  },
  {
    icon: "✅",
    bg: "bg-[#E6F1FB]",
    title: "Eligibility questions",
    desc: "Understand who can apply and how eligibility is determined.",
  },
  {
    icon: "🚩",
    bg: "bg-[#FCEBEB]",
    title: "Report incorrect listing",
    desc: "Help us keep scholarship information accurate and up to date.",
  },
  {
    icon: "💡",
    bg: "bg-[#FAEEDA]",
    title: "Suggest a scholarship",
    desc: "Found a scholarship we missed? Let us know and we'll add it.",
  },
  {
    icon: "💬",
    bg: "bg-[#E6F1FB]",
    title: "Contact support",
    desc: "Still need help? Send us a message and we'll respond within 24 hours.",
  },
];

function Badge({ children }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-[#EAF3DE] border border-[#C0DD97] text-[#27500A] text-[10px] font-bold tracking-widest px-3 py-1 rounded-full mb-3">
      <span className="w-1.5 h-1.5 rounded-full bg-[#5AAD1F]" />
      {children}
    </div>
  );
}

function FaqItem({ question, answer, isOpen, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`border rounded-xl overflow-hidden cursor-pointer transition-colors duration-150 ${
        isOpen
          ? "border-[#C0DD97]"
          : "border-gray-200/80 hover:border-[#C0DD97]"
      }`}
    >
      <button
        className="w-full flex items-start justify-between gap-3 px-4 py-3.5 text-left bg-transparent"
        aria-expanded={isOpen}
      >
        <span className="text-[13px] font-medium text-gray-900 leading-snug">
          {question}
        </span>
        <span
          className={`mt-0.5 w-4.5 h-4.5 shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-150 ${isOpen ? "bg-[#5AAD1F] border-[#5AAD1F]" : "border-gray-300"}`}
        >
          <svg
            className={`w-2 h-2 transition-transform duration-200 ${isOpen ? "rotate-45 stroke-white" : "stroke-gray-400"}`}
            viewBox="0 0 12 12"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="6" y1="1" x2="6" y2="11" />
            <line x1="1" y1="6" x2="11" y2="6" />
          </svg>
        </span>
      </button>
      <div
        className={`grid transition-all duration-280 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-3.5 text-[12.5px] text-gray-500 leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

function Support() {
  const [openFaq, setOpenFaq] = useState(null);
  const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);

  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    topic: "Scholarship issue",
    message: "",
  });
  const [reportForm, setReportForm] = useState({ link: "", issue: "" });
  const [suggestForm, setSuggestForm] = useState({
    org: "",
    name: "",
    website: "",
    notes: "",
  });

  const faqLeft = faqs.filter((_, i) => i % 2 === 0);
  const faqRight = faqs.filter((_, i) => i % 2 !== 0);

  return (
    <main className="font-pangea bg-white text-gray-900">
      <section className="bg-[#F6FAF1] border-b border-[#DDECCB] py-14 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <Badge>Help center</Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mt-2 mb-3">
              Need <span className="text-[#5AAD1F]">help?</span>
            </h1>
            <p className="text-[15px] text-gray-500 leading-relaxed mb-6 max-w-sm">
              Whether you're searching for scholarships, facing application
              issues, or want to report incorrect information — we're here to
              help.
            </p>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 bg-[#3B7DC8] text-white text-[13px] font-semibold px-5 py-2.5 rounded-full hover:bg-[#2D6AB5] transition-colors"
            >
              Contact support
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </svg>
            </a>
          </div>
          <div className="flex justify-center">
            <HeroIllustration />
          </div>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <Badge>Quick help</Badge>
          <h2 className="text-3xl font-extrabold tracking-tight mb-1">
            What do you need help with?
          </h2>
          <p className="text-[13px] text-gray-500 mb-6">
            Jump straight to the section that matches your question.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickHelp.map((c, i) => (
              <div
                key={i}
                className="border border-gray-200/80 hover:border-[#C0DD97] rounded-2xl p-5 cursor-pointer transition-colors duration-150"
              >
                <div
                  className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center text-lg mb-3`}
                >
                  {c.icon}
                </div>
                <h3 className="text-[18px] font-semibold text-gray-900 mb-1">
                  {c.title}
                </h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="border-gray-100 mx-6" />

      <section
        id="contact"
        className="py-14 px-6 bg-[#F6FAF1] border-y border-[#DDECCB]"
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.35fr_0.9fr] gap-8 items-start">
          <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="mb-6">
              <Badge>Contact support</Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
                Send us a message
              </h2>
              <p className="mt-2 text-[13px] text-gray-500 max-w-md leading-relaxed">
                Tell us what you need help with. Choose a topic so your query
                reaches the right support queue.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                console.log("Support form submitted:", contactForm);
                alert("Message sent successfully!");
                setContactForm({
                  name: "",
                  email: "",
                  topic: "Scholarship issue",
                  message: "",
                });
              }}
              className="flex flex-col gap-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="supportName"
                    className="text-[12px] font-bold text-gray-600"
                  >
                    Full Name
                  </label>
                  <input
                    id="supportName"
                    name="name"
                    type="text"
                    required
                    placeholder="Priya Sharma"
                    value={contactForm.name}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, name: e.target.value })
                    }
                    className="w-full bg-[#F6FAF1] border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#3B7DC8] focus:ring-2 focus:ring-[#3B7DC8]/10 transition"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="supportEmail"
                    className="text-[12px] font-bold text-gray-600"
                  >
                    Email
                  </label>
                  <input
                    id="supportEmail"
                    name="email"
                    type="email"
                    required
                    placeholder="priya@example.com"
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, email: e.target.value })
                    }
                    className="w-full bg-[#F6FAF1] border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#3B7DC8] focus:ring-2 focus:ring-[#3B7DC8]/10 transition"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="supportTopic"
                  className="text-[12px] font-bold text-gray-600"
                >
                  Topic
                </label>
                <select
                  id="supportTopic"
                  name="topic"
                  value={contactForm.topic}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, topic: e.target.value })
                  }
                  className="w-full bg-[#F6FAF1] border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#3B7DC8] focus:ring-2 focus:ring-[#3B7DC8]/10 transition"
                >
                  <option>Scholarship issue</option>
                  <option>Eligibility question</option>
                  <option>Technical problem</option>
                  <option>Suggest a scholarship</option>
                  <option>Report incorrect information</option>
                  <option>Feedback</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="supportMessage"
                  className="text-[12px] font-bold text-gray-600"
                >
                  Message
                </label>
                <textarea
                  id="supportMessage"
                  name="message"
                  required
                  placeholder="Describe your issue or question..."
                  value={contactForm.message}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, message: e.target.value })
                  }
                  className="w-full bg-[#F6FAF1] border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#3B7DC8] focus:ring-2 focus:ring-[#3B7DC8]/10 transition resize-none min-h-30"
                />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="cursor-pointer inline-flex items-center gap-2 px-8 py-3.5 rounded-3xl
	bg-linear-to-r from-emerald-600 to-teal-500
	hover:from-emerald-700 hover:to-teal-500
	text-white font-semibold
	transition-all duration-300
	shadow-md shadow-emerald-500/20
	hover:shadow-lg hover:shadow-emerald-500/30
	active:scale-95"
                >
                  Send Message
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex-1 flex flex-col justify-center">
              <h3 className="text-xl font-bold tracking-tight text-gray-900 mb-6">
                Contact Information
              </h3>
              <div className="flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      ></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Email Us
                    </p>
                    <a
                      href="mailto:support@udaan.com"
                      className="text-emerald-600 hover:text-emerald-700 text-md font-medium transition-colors"
                    >
                      support@udaan.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      ></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Call Us
                    </p>
                    <p className="text-gray-600 text-md">+91 98765 43210</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      ></path>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      ></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Visit Us
                    </p>
                    <p className="text-gray-600 text-md">Kolkata, India</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Hours Card */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex-1 flex flex-col justify-center">
              <h3 className="text-xl font-bold tracking-tight text-gray-900 mb-6">
                Support Hours
              </h3>
              <ul className="flex flex-col gap-4">
                <li className="flex justify-between items-center pb-4 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">
                    Monday - Friday
                  </span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-lg text-sm">
                    9:00 AM - 6:00 PM
                  </span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Saturday</span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-lg text-sm">
                    10:00 AM - 2:00 PM
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-[#EAF3DE] border border-[#C0DD97] rounded-3xl p-6">
              <p className="text-[13px] text-gray-700 leading-relaxed">
                <strong className="text-[#27500A]">Tip:</strong> If you're
                reporting a scholarship issue, include the scholarship name,
                official link, and what looks incorrect.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <Badge>Help us improve</Badge>
          <h2 className="text-3xl font-extrabold tracking-tight mb-1">
            Report or suggest
          </h2>
          <p className="text-[13px] text-gray-500 mb-6">
            Your feedback directly improves listings for every student on Udaan.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200/80 rounded-2xl p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#FCEBEB] flex items-center justify-center text-sm">
                  🚩
                </div>
                <h3 className="text-[18px] font-bold">
                  Report incorrect scholarship
                </h3>
              </div>
              <p className="text-[12.5px] text-gray-500 leading-relaxed mb-4">
                Found a wrong deadline, broken link, or incorrect amount? Help
                us fix it.
              </p>
              <div className="mb-3">
                <label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1.5">
                  Scholarship link
                </label>
                <input
                  type="url"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3B7DC8]"
                  placeholder="https://..."
                  value={reportForm.link}
                  onChange={(e) =>
                    setReportForm({ ...reportForm, link: e.target.value })
                  }
                />
              </div>
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1.5">
                  What's wrong?
                </label>
                <textarea
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3B7DC8] resize-y min-h-18"
                  placeholder="Describe the issue..."
                  value={reportForm.issue}
                  onChange={(e) =>
                    setReportForm({ ...reportForm, issue: e.target.value })
                  }
                />
              </div>
              <button className="inline-flex items-center gap-1.5 bg-[#FCEBEB] text-[#791F1F] text-[14px] font-bold px-4 py-2 rounded-full border-none cursor-pointer hover:bg-red-100 transition-colors">
                Submit report
              </button>
            </div>

            <div className="border border-gray-200/80 rounded-2xl p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#FAEEDA] flex items-center justify-center text-sm">
                  💡
                </div>
                <h3 className="text-[18px] font-bold">Suggest a scholarship</h3>
              </div>
              <p className="text-[12.5px] text-gray-500 leading-relaxed mb-4">
                Know a scholarship we haven't listed? Share it and we'll review
                it.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1.5">
                    Organisation
                  </label>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3B7DC8]"
                    placeholder="Name"
                    value={suggestForm.org}
                    onChange={(e) =>
                      setSuggestForm({ ...suggestForm, org: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1.5">
                    Scholarship name
                  </label>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3B7DC8]"
                    placeholder="Name"
                    value={suggestForm.name}
                    onChange={(e) =>
                      setSuggestForm({ ...suggestForm, name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1.5">
                  Website
                </label>
                <input
                  type="url"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3B7DC8]"
                  placeholder="https://..."
                  value={suggestForm.website}
                  onChange={(e) =>
                    setSuggestForm({ ...suggestForm, website: e.target.value })
                  }
                />
              </div>
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1.5">
                  Notes
                </label>
                <textarea
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3B7DC8] resize-y min-h-11"
                  placeholder="Any additional details..."
                  value={suggestForm.notes}
                  onChange={(e) =>
                    setSuggestForm({ ...suggestForm, notes: e.target.value })
                  }
                />
              </div>
              <button className="inline-flex items-center gap-1.5 bg-[#EAF3DE] text-[#27500A] text-[14px] font-bold px-4 py-2 rounded-full border-none cursor-pointer hover:bg-[#D4EBB0] transition-colors">
                + Suggest scholarship
              </button>
            </div>
          </div>
        </div>
      </section>

      <hr className="border-gray-100 mx-6" />

      <section className="py-8 px-6">
        <div className="max-w-5xl mx-auto bg-[#EAF3DE] border border-[#C0DD97] rounded-2xl px-8 py-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <h3 className="text-[17px] font-bold mb-1">
              Can't find the right scholarship?
            </h3>
            <p className="text-[13px] text-gray-600 max-w-md leading-relaxed">
              Tell us your course, state, and category — Udaan will surface
              opportunities suited to your profile.
            </p>
          </div>
          <Link
            to="/scholarships"
            className="shrink-0 bg-[#5AAD1F] text-white text-[13px] font-semibold px-6 py-2.5 rounded-full hover:bg-[#4A9A18] transition-colors"
          >
            Explore scholarships
          </Link>
        </div>
      </section>

      <hr className="border-gray-100 mx-6" />

      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <Badge>FAQs</Badge>
          <h2 className="text-2xl font-extrabold tracking-tight mb-1">
            Frequently asked questions
          </h2>
          <p className="text-[13px] text-gray-500 mb-6">
            Everything you need to know about applying through Udaan.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex flex-col gap-2">
              {faqLeft.map((f, i) => (
                <FaqItem
                  key={i * 2}
                  question={f.question}
                  answer={f.answer}
                  isOpen={openFaq === i * 2}
                  onClick={() => toggleFaq(i * 2)}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {faqRight.map((f, i) => (
                <FaqItem
                  key={i * 2 + 1}
                  question={f.question}
                  answer={f.answer}
                  isOpen={openFaq === i * 2 + 1}
                  onClick={() => toggleFaq(i * 2 + 1)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="text-center py-12 px-6 border-t border-gray-100">
        <h2 className="text-2xl font-extrabold tracking-tight mb-2">
          Still can't find your answer?
        </h2>
        <p className="text-[13px] text-gray-400 mb-5">
          We'll get back to you within one business day.
        </p>
        <a
          href="#contact"
          className="inline-flex items-center gap-2 bg-gray-900 text-white text-[13px] font-semibold px-6 py-2.5 rounded-full hover:bg-gray-800 transition-colors"
        >
          Contact us
        </a>
      </div>
    </main>
  );
}

export default Support;
