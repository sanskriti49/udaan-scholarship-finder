export default function Badge({ children }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-[#EAF3DE] border border-[#C0DD97] text-[#27500A] text-[12px] font-bold tracking-wide px-3 py-1 rounded-full shadow-2xs">
      <span className="w-1.5 h-1.5 rounded-full bg-[#5AAD1F]" />
      {children}
    </div>
  );
}
