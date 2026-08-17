export default function LogoLoader({ size = 120, label = "Loading..." }: { size?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <img
        src="/exposure-tristar/te-logo.png"
        alt="Team Elite Baseball"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          filter: "brightness(0) invert(1)",
          animation: "te-logo-pulse 1.6s ease-in-out infinite",
        }}
      />
      <span className="text-white/40 text-sm tracking-widest uppercase">{label}</span>
      <style>{`
        @keyframes te-logo-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.93); }
        }
      `}</style>
    </div>
  );
}
