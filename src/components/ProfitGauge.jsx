import { formatMoney } from "../lib/constants";

// A speedometer-style arc: 0 = all-expense (red), 0.5 = break-even (amber), 1 = all-revenue (green).
// The needle rotates from -90deg to +90deg across that range.
export default function ProfitGauge({ score, net }) {
  const cx = 110;
  const cy = 110;
  const r = 86;

  const arcPoint = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  // three zones, each 60deg, from -180 (left) to 0 (right) on a standard arc frame
  const zones = [
    { from: -180, to: -60, color: "var(--color-coral)" },
    { from: -60, to: -20, color: "var(--color-amber)" },
    { from: -20, to: 0, color: "var(--color-teal)" },
  ];

  const describeArc = (from, to) => {
    const [x1, y1] = arcPoint(from);
    const [x2, y2] = arcPoint(to);
    const large = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const needleAngle = -180 + score * 180; // -180 (left/red) .. 0 (right/green)
  const [nx, ny] = arcPoint(needleAngle);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 140" className="w-full max-w-[280px]" role="img" aria-label={`Profitability gauge: net ${formatMoney(net)}`}>
        <g strokeLinecap="round">
          {zones.map((z, i) => (
            <path key={i} d={describeArc(z.from, z.to)} stroke={z.color} strokeWidth="14" fill="none" opacity="0.9" />
          ))}
        </g>
        {/* tick marks */}
        {Array.from({ length: 7 }).map((_, i) => {
          const deg = -180 + (i * 180) / 6;
          const [tx1, ty1] = arcPoint(deg);
          const rad = (deg * Math.PI) / 180;
          const tx2 = cx + (r - 14) * Math.cos(rad);
          const ty2 = cy + (r - 14) * Math.sin(rad);
          return <line key={i} x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--color-border)" strokeWidth="2" />;
        })}
        {/* needle */}
        <g style={{ transition: "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}>
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="6" fill="var(--color-ink)" />
        </g>
        <text x="20" y="128" fill="var(--color-coral)" fontSize="10" fontFamily="var(--font-mono)">LOSS</text>
        <text x="176" y="128" fill="var(--color-teal)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="end">PROFIT</text>
      </svg>
      <div className="-mt-2 text-center">
        <div className={`font-mono text-3xl font-semibold ${net >= 0 ? "text-teal" : "text-coral"}`} style={{ color: net >= 0 ? "var(--color-teal)" : "var(--color-coral)" }}>
          {net >= 0 ? "+" : "−"}{formatMoney(Math.abs(net))}
        </div>
        <div className="mt-1 text-xs uppercase tracking-wider text-ink-muted" style={{ color: "var(--color-ink-muted)" }}>
          Net {net >= 0 ? "profit" : "loss"} this period
        </div>
      </div>
    </div>
  );
}
