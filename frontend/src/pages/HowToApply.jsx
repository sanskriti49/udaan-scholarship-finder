import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageStyles, Stamp } from "../components/PageKit";

const focusRing = "focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200";
const STEPS = [
  {
    id: "discovery", number: "01", title: "Find and shortlist scholarships", category: "Discovery",
    description: "Build a shortlist you can act on. Start with schemes that match your profile, then check the official requirements before investing time in an application.",
    details: [
      "Filter by your state, course and level of study. Check category, income and academic requirements for each scheme.",
      "Read the current official notice. Check the deadline, award amount, renewal rules and whether you can hold other scholarships at the same time.",
      "Save a manageable shortlist. Note the official application link and deadline for each scholarship, and add reminders to your calendar.",
    ],
    note: "Finish this step when you have a shortlist of eligible schemes with their official links and deadlines.",
    links: [{ to: "/scholarships", label: "Browse scholarships" }, { to: "/eligibility", label: "Check eligibility" }],
  },
  {
    id: "documents", number: "02", title: "Prepare your documents", category: "Paperwork",
    description: "Use the scheme's document list as your source of truth. Keep readable digital copies in one folder so you can upload them without a last-minute search.",
    details: [
      "Start certificates issued by government offices and any required bank verification early. Check the accepted financial year, validity and issuing authority.",
      "Collect the required identity documents, mark sheets, fee receipts and bank details. Request bonafide or recommendation letters if the scheme asks for them.",
      "Follow the portal's file type and size limits. Open every scan to check readability, page order and orientation; compare names and dates across documents.",
    ],
    note: "The Resources checklist saves your ticks on this device. Use it to keep track while you collect your files.",
    links: [{ to: "/resources#checklist", label: "Open document checklist" }],
  },
  {
    id: "statement", number: "03", title: "Write a personal statement, if required", category: "Statement · Optional",
    description: "Only write a statement when your chosen scholarship requests one. Follow its prompt and word limit; give a focused, honest account of your goals and experience.",
    details: [
      "Answer the actual prompt. Explain your goals and how the scholarship would help with your studies.",
      "Use specific examples of your work, responsibilities or challenges. Describe what you did and the result, using numbers where they are accurate.",
      "Proofread your draft and ask someone you trust to review it. Request recommendation letters separately if they are required.",
    ],
    note: "No statement in the requirements? Choose 'Not required for my scholarship' on the Resources roadmap to complete this step.",
    links: [{ to: "/application-guide", label: "Read statement guide" }],
  },
  {
    id: "submission", number: "04", title: "Verify and submit without errors", category: "Final submit",
    description: "Take one final pass through the application on the official portal. Leave time to fix upload errors and confirm that the application was submitted, rather than saved as a draft.",
    details: [
      "Compare your name, date of birth, course and bank details with your supporting documents. Check all required fields and declarations.",
      "Preview every uploaded file. Confirm that it is the correct document, readable and within the portal's format and size limits.",
      "Review the final preview, then submit before the deadline. Save the application ID and acknowledgement receipt as a PDF or screenshot.",
      "Check the portal for verification updates and any correction requests. Note deadlines for institution verification or follow-up actions if the scheme specifies them.",
    ],
    note: "Finish this step when the portal confirms submission and you have saved the acknowledgement. Submission does not guarantee an award.",
    links: [{ to: "/resources#portals", label: "Find official portals" }, { to: "/resources#roadmap", label: "Return to your roadmap" }],
  },
];

export default function HowToApply() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    // Wait until the layout's route scroll reset has finished.
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(hash.slice(1));
      target?.scrollIntoView({ block: "start", behavior: "instant" });
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  return (
    <div className="ud-root min-h-screen bg-[#E9F0EA] font-sans text-emerald-950">
      <PageStyles />
      <header className="mx-auto max-w-7xl px-5 pb-12 pt-12 sm:px-8 sm:pt-20">
        <Link to="/resources#roadmap" className={`inline-flex items-center gap-2 text-sm font-semibold underline decoration-yellow-300 decoration-2 underline-offset-4 ${focusRing}`}>
          <ArrowLeft size={16} /> Back to your roadmap
        </Link>
        <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-950/60">Student application guide</p>
            <h1 className="mt-4 font-georgia text-5xl leading-[1.05] sm:text-6xl">From your first shortlist to submitted.</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-emerald-950/75">Four steps to help you prepare and apply. Start at the beginning, or jump to the help you need right now.</p>
          </div>
          <aside className="relative max-w-xs rotate-2 bg-yellow-200 px-5 pb-5 pt-7 shadow-[3px_4px_0_rgba(2,44,34,0.3)]">
            <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 bg-white/60" />
            <Stamp tilt={-4} className="text-sm">Before you begin</Stamp>
            <p className="mt-4 text-sm leading-relaxed">Every scheme has its own rules. Check the current official notice for deadlines, documents and application requirements.</p>
          </aside>
        </div>
        <nav aria-label="Application guide sections" className="mt-12 flex flex-wrap gap-x-7 gap-y-4 border-y-[1.5px] border-emerald-950 py-5">
          {STEPS.map((step) => <Link key={step.id} to={`#${step.id}`} className={`text-sm font-semibold underline decoration-yellow-300 decoration-2 underline-offset-4 ${focusRing}`}>{step.number} {step.category}</Link>)}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        {STEPS.map((step) => (
          <section key={step.id} id={step.id} tabIndex={-1} aria-labelledby={`${step.id}-title`} className="grid scroll-mt-28 grid-cols-[3rem_minmax(0,1fr)] gap-x-4 border-b border-emerald-950/20 py-12 sm:grid-cols-[5rem_minmax(0,1fr)] lg:grid-cols-[7rem_minmax(0,5fr)_minmax(0,6fr)] lg:gap-x-8 lg:py-16">
            <span aria-hidden className="font-georgia text-5xl leading-none text-emerald-950/25 sm:text-7xl">{step.number}</span>
            <div>
              <p className="mb-2 text-sm font-semibold text-emerald-950/60">{step.category}</p>
              <h2 id={`${step.id}-title`} className="font-georgia text-3xl leading-snug sm:text-4xl">{step.title}</h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-emerald-950/80">{step.description}</p>
            </div>
            <div className="col-start-2 pt-7 lg:col-start-3 lg:pt-0">
              <ul className="relative space-y-4 rounded-sm border-[1.5px] border-emerald-950 bg-white py-5 pl-12 pr-5 text-[15px] leading-7 shadow-[3px_3px_0_#022c22] before:absolute before:inset-y-0 before:left-8 before:w-px before:bg-rose-300" style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(2,44,34,0.08) 27px, rgba(2,44,34,0.08) 28px)" }}>
                {step.details.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
              <p className="mt-7 border-l-4 border-yellow-300 pl-4 text-sm leading-relaxed text-emerald-950/75">{step.note}</p>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
                {step.links.map((link) => <Link key={link.to} to={link.to} className={`inline-flex items-center gap-2 text-sm font-semibold underline decoration-yellow-300 decoration-2 underline-offset-4 hover:decoration-emerald-950 ${focusRing}`}>{link.label} <ArrowRight size={14} /></Link>)}
              </div>
            </div>
          </section>
        ))}
      </main>
      <footer className="bg-emerald-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-16 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-georgia text-4xl leading-[1.05]">Keep your next step in sight.</h2>
            <p className="mt-4 text-base leading-relaxed text-emerald-50/80">Return to Resources to track your documents and mark each roadmap step as complete.</p>
          </div>
          <Link to="/resources#roadmap" className={`inline-flex items-center justify-center gap-2 self-start rounded-md bg-yellow-300 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-yellow-200 ${focusRing}`}>Back to your roadmap <ArrowRight size={16} /></Link>
        </div>
      </footer>
    </div>
  );
}
