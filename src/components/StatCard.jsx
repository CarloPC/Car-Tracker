export default function StatCard({ label, value, sub, tone = "ink", icon }) {
  const toneColor = {
    ink: "var(--color-ink)",
    teal: "var(--color-teal)",
    coral: "var(--color-coral)",
    amber: "var(--color-amber)",
  }[tone];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="punch-edge" />
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</span>
          {icon}
        </div>
        <div className="mt-2 font-mono text-2xl font-semibold sm:text-3xl" style={{ color: toneColor }}>
          {value}
        </div>
        {sub && <div className="mt-1 text-xs text-ink-muted">{sub}</div>}
      </div>
    </div>
  );
}
