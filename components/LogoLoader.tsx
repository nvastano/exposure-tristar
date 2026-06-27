export default function LogoLoader({ size = 128, label = "Loading..." }: { size?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={label}
      >
        <rect width="100" height="100" fill="#000" />
        <path
          d="M8 8 L34 8 L50 26 L66 8 L92 8 L62 40 L92 72 L66 72 L50 54 L34 72 L8 72 L38 40 Z"
          fill="#fff"
        />
        <circle cx="50" cy="40" r="16" fill="#000" stroke="#fff" strokeWidth="2" />
        <g
          style={{
            transformOrigin: "50px 40px",
            animation: "logo-loader-spin 1.4s linear infinite",
          }}
        >
          {[
            [50, 31],
            [42, 46],
            [58, 46],
          ].map(([cx, cy], i) => (
            <polygon key={i} fill="#fff" points={starPoints(cx, cy, 5)} />
          ))}
        </g>
      </svg>
      <span className="text-white/50 text-sm">{label}</span>
      <style>{`
        @keyframes logo-loader-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function starPoints(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r / 2.4;
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return points.join(" ");
}
