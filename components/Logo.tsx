export default function Logo({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="TriStar Baseball logo"
    >
      <rect width="100" height="100" fill="#000" />
      <path
        d="M8 8 L34 8 L50 26 L66 8 L92 8 L62 40 L92 72 L66 72 L50 54 L34 72 L8 72 L38 40 Z"
        fill="#fff"
      />
      <circle cx="50" cy="40" r="16" fill="#000" stroke="#fff" strokeWidth="2" />
      {[
        [50, 31],
        [42, 46],
        [58, 46],
      ].map(([cx, cy], i) => (
        <polygon
          key={i}
          fill="#fff"
          points={starPoints(cx, cy, 5)}
        />
      ))}
      <text
        x="50"
        y="92"
        textAnchor="middle"
        fill="#fff"
        fontSize="11"
        fontWeight="700"
        letterSpacing="2"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        BASEBALL
      </text>
    </svg>
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
