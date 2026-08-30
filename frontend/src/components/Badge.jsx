export default function Badge({ children }) {
  return (
    <div className="flex items-center justify-center md:justify-start gap-3 text-[11px] font-bold text-emerald-800 uppercase tracking-[0.2em] mb-4 opacity-80">
      <div className="hidden md:block h-px w-6 bg-emerald-800"></div>
      {children}
      <div className="hidden md:block h-px w-6 bg-emerald-800"></div>
    </div>
  );
}
