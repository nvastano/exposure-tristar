import type { SituationVisual } from "@/lib/situations";

const BASE_COORDS = {
  home: { x: 140, y: 228 },
  first: { x: 214, y: 156 },
  second: { x: 140, y: 84 },
  third: { x: 66, y: 156 },
  pitcher: { x: 140, y: 158 },
};

function diamondPath(cx: number, cy: number, size: number) {
  return `M ${cx} ${cy - size} L ${cx + size} ${cy} L ${cx} ${cy + size} L ${cx - size} ${cy} Z`;
}

export default function DiamondView({ visual }: { visual: SituationVisual }) {
  const { runners, outs, ball, ballFrom } = visual;
  const origin = ballFrom ?? BASE_COORDS.home;

  const bases = [
    { num: 1, ...BASE_COORDS.first },
    { num: 2, ...BASE_COORDS.second },
    { num: 3, ...BASE_COORDS.third },
  ];

  return (
    <svg viewBox="0 0 280 260" className="w-full max-w-xs mx-auto" aria-label="Baseball diamond diagram">
      {/* Outfield arc */}
      <path
        d="M 14 228 Q 14 14 140 14 Q 266 14 266 228"
        fill="none"
        stroke="white"
        strokeOpacity="0.1"
        strokeWidth="1.5"
      />

      {/* Base paths */}
      <polygon
        points={`${BASE_COORDS.home.x},${BASE_COORDS.home.y} ${BASE_COORDS.first.x},${BASE_COORDS.first.y} ${BASE_COORDS.second.x},${BASE_COORDS.second.y} ${BASE_COORDS.third.x},${BASE_COORDS.third.y}`}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
      />

      {/* Pitcher's mound */}
      <circle cx={BASE_COORDS.pitcher.x} cy={BASE_COORDS.pitcher.y} r="6" fill="rgba(255,255,255,0.12)" />

      {/* Bases */}
      {bases.map((b) => {
        const occupied = runners.includes(b.num);
        return (
          <path
            key={b.num}
            d={diamondPath(b.x, b.y, 8)}
            fill={occupied ? "#f59e0b" : "rgba(255,255,255,0.12)"}
            stroke={occupied ? "#fbbf24" : "rgba(255,255,255,0.3)"}
            strokeWidth="1"
          />
        );
      })}

      {/* Home plate */}
      <path
        d={diamondPath(BASE_COORDS.home.x, BASE_COORDS.home.y, 8)}
        fill="rgba(255,255,255,0.15)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1"
      />

      {/* Ball trajectory */}
      <line
        x1={origin.x}
        y1={origin.y}
        x2={ball.x}
        y2={ball.y}
        stroke="#ef4444"
        strokeWidth="1.5"
        strokeDasharray="5 3"
        strokeOpacity="0.7"
      />

      {/* Ball */}
      <circle cx={ball.x} cy={ball.y} r="7" fill="white" stroke="#ef4444" strokeWidth="2" />
      <text x={ball.x} y={ball.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#ef4444" fontWeight="bold">⚾</text>

      {/* Ball label */}
      <text
        x={ball.x}
        y={ball.y - 12}
        textAnchor="middle"
        fontSize="7"
        fill="rgba(255,255,255,0.7)"
        fontWeight="600"
      >
        {ball.label}
      </text>

      {/* Runner labels */}
      {bases.map((b) =>
        runners.includes(b.num) ? (
          <text key={`r${b.num}`} x={b.x} y={b.y + 18} textAnchor="middle" fontSize="7" fill="#fbbf24" fontWeight="600">
            R
          </text>
        ) : null
      )}

      {/* Outs indicator */}
      <g transform="translate(12, 240)">
        <text x="0" y="0" fontSize="7" fill="rgba(255,255,255,0.4)" dominantBaseline="middle">OUTS</text>
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={28 + i * 14}
            cy="0"
            r="5"
            fill={i < outs ? "#ef4444" : "none"}
            stroke={i < outs ? "#ef4444" : "rgba(255,255,255,0.3)"}
            strokeWidth="1.5"
          />
        ))}
      </g>
    </svg>
  );
}
