export default function Badge({ children }) {
	return (
		<div className="font-inter inline-flex items-center gap-1.5 bg-[#EAF3DE] border border-[#C0DD97] text-[#27500A] text-[11.5px] font-bold px-3 py-1 rounded-full">
			<span className="w-1.5 h-1.5 rounded-full bg-[#5AAD1F]" />
			{children}
		</div>
	);
}
