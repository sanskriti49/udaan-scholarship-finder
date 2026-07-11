export default function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#F6FAF1]">
      <div className="relative w-14 h-14 mb-5">
        {/* Faded background ring */}
        <div className="absolute inset-0 rounded-full border-[3px] border-[#C0DD97]/40"></div>
        {/* Spinning gradient-like ring using Udaan colors */}
        <div className="absolute inset-0 rounded-full border-[3px] border-t-[#5AAD1F] border-r-[#3B7DC8] border-b-transparent border-l-transparent animate-spin"></div>
      </div>

      {/* Pulsing Logo Text */}
      <div className="flex flex-col items-center animate-pulse">
        <span className="text-2xl font-black tracking-tight leading-none mb-1">
          <span style={{ color: "#5AAD1F" }}>uda</span>
          <span style={{ color: "#3B7DC8" }}>an</span>
        </span>
        <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">
          Loading...
        </span>
      </div>
    </div>
  );
}
