import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import hero from "../assets/images/support2.png";

import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { faqs } from "../utils/faqs";
import Badge from "../components/Badge";

gsap.registerPlugin(ScrollToPlugin);

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
        className="cursor-pointer w-full flex items-start justify-between gap-3 px-4 py-4.5 text-left bg-transparent"
        aria-expanded={isOpen}
      >
        <span className="text-[14.5px] font-medium text-gray-900 leading-snug">
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
          <p className="font-inter px-4 pb-3.5 text-[13.5px] text-gray-600 leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

function Support() {
  const [openFaq, setOpenFaq] = useState(null);
  useEffect(() => {
    gsap.set(window, { scrollTo: 0 });
  }, []);
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
            <h1 className="hero-line text-5xl md:text-7xl font-bold leading-[0.95] mb-5">
              We're here
              <br />
              <span className="text-[#5AAD1F]">when you</span>{" "}
              <span className="relative inline-block">
                need us.
                {/* underline squiggle */}
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  viewBox="0 0 200 8"
                  preserveAspectRatio="none"
                  style={{ height: "6px" }}
                >
                  <path
                    d="M0 5 Q50 0 100 5 Q150 10 200 5"
                    stroke="#E8884A"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="hero-line text-[15.5px] text-[#5A5A50] max-w-md mb-8">
              Searching for scholarships, facing an application issue, or
              spotted incorrect info? Jump to the section that fits.
            </p>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 bg-[#3B7DC8] text-white text-[16px] font-semibold px-5 py-2.5 rounded-full hover:bg-[#2D6AB5] transition-colors"
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
            <img src={hero} />
          </div>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <Badge>Quick help</Badge>
          <h2 className="text-3xl font-bold mb-1">
            What do you need help with?
          </h2>
          <p className="text-[13.5px] text-gray-500 mb-6">
            Jump straight to the section that matches your question.
          </p>
          <div className="font-pangea grid grid-cols-2 md:grid-cols-3 gap-3">
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
                <p className="text-[13.5px] text-gray-500 leading-relaxed">
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
        className="font-pangea py-14 px-6 bg-[#F6FAF1] border-y border-[#DDECCB]"
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.35fr_0.9fr] gap-8 items-start">
          {/* Left: Contact Form */}
          <div>
            <Badge>Contact Support</Badge>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mt-4 mb-6">
              Let's talk.
            </h2>
            <p className="text-gray-500 mb-10 max-w-md">
              Tell us what's going on. Choose a topic so your query reaches the
              right team. We typically reply within a few hours during business
              days.
            </p>
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
              className="flex flex-col gap-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Priya Sharma"
                    value={contactForm.name}
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        name: e.target.value,
                      })
                    }
                    className="bg-transparent border-b border-gray-200 py-3 text-lg focus:border-[#5AAD1F] outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="priya@example.com"
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        email: e.target.value,
                      })
                    }
                    className="bg-transparent border-b border-gray-200 py-3 text-lg focus:border-[#5AAD1F] outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                  Topic
                </label>
                <select
                  value={contactForm.topic}
                  onChange={(e) =>
                    setContactForm({
                      ...contactForm,
                      topic: e.target.value,
                    })
                  }
                  className="bg-transparent border-b border-gray-200 py-3 text-lg focus:border-[#5AAD1F] outline-none transition-colors cursor-pointer"
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
                <label className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                  Message
                </label>
                <textarea
                  required
                  placeholder="Describe your issue or question..."
                  value={contactForm.message}
                  onChange={(e) =>
                    setContactForm({
                      ...contactForm,
                      message: e.target.value,
                    })
                  }
                  className="bg-transparent border-b border-gray-200 py-3 text-lg focus:border-[#5AAD1F] outline-none transition-colors resize-none min-h-20"
                />
              </div>

              <div className="mt-4">
                <button
                  type="submit"
                  className="cursor-pointer inline-flex items-center gap-3 bg-[#112915] text-white text-base font-semibold px-10 py-4 rounded-full hover:bg-[#5AAD1F] transition-all duration-300 active:scale-95"
                >
                  Send Message
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>

          {/* Right: Contact Info */}
          <div className="flex flex-col gap-10 h-fit">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <Mail className="w-5 h-5 text-[#5AAD1F]" />
                <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                  Email
                </span>
              </div>
              <a
                href="mailto:support@udaan.com"
                className="text-xl font-medium hover:text-[#5AAD1F] transition-colors block"
              >
                support@udaan.com
              </a>
            </div>

            <div>
              <div className="flex items-center gap-4 mb-3">
                <Phone className="w-5 h-5 text-[#5AAD1F]" />
                <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                  Phone
                </span>
              </div>
              <p className="text-xl font-medium">+91 98765 43210</p>
              <p className="text-sm text-gray-400 mt-1">
                Mon - Fri: 9am - 6pm IST
              </p>
            </div>

            <div>
              <div className="flex items-center gap-4 mb-3">
                <MapPin className="w-5 h-5 text-[#5AAD1F]" />
                <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                  Office
                </span>
              </div>
              <p className="text-xl font-medium">Kolkata, India</p>
            </div>

            <div className="bg-[#EAF3DE] border border-[#C0DD97] rounded-2xl p-6 mt-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong className="text-[#27500A]">Pro tip:</strong> If you're
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
          <h2 className="text-3xl font-bold tracking-tight mb-1">
            Report or suggest
          </h2>
          <p className="text-[13.5px] text-gray-500 mb-6">
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
            className="shrink-0 bg-[#5AAD1F] text-white text-[15px] font-semibold px-6 py-2.5 rounded-full hover:bg-[#4A9A18] transition-colors"
          >
            Explore scholarships
          </Link>
        </div>
      </section>

      <hr className="border-gray-100 mx-6" />

      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <Badge>FAQs</Badge>
          <h2 className="text-2xl font-bold tracking-tight mb-1">
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
        <p className="text-[13px] text-gray-500 mb-5">
          We'll get back to you within one business day.
        </p>
        <a
          href="#contact"
          className="inline-flex items-center gap-2 bg-gray-900 text-white text-[15px] font-semibold px-6 py-2.5 rounded-full hover:bg-gray-800 transition-colors"
        >
          Contact us
        </a>
      </div>
    </main>
  );
}

export default Support;
