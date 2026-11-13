import { useData } from "../context/DataContext";
import { CAPITAL_MODES } from "../lib/calculations";

const OPTIONS = [
  { id: CAPITAL_MODES.CUMULATIVE, label: "Cumulative", hint: "Every purchase + expense stacked up" },
  { id: CAPITAL_MODES.RECYCLING, label: "Cash-recycling", hint: "Sale proceeds fund the next purchase (net capital)" },
];

export default function CapitalModeToggle({ className = "" }) {
  const { capitalMode, setCapitalMode } = useData();
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">Totals</span>
      <div className="inline-flex rounded-full p-0.5" style={{ backgroundColor: "var(--color-surface-2)" }} role="group" aria-label="Totals mode">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            title={o.hint}
            aria-pressed={capitalMode === o.id}
            onClick={() => setCapitalMode(o.id)}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
            style={
              capitalMode === o.id
                ? { backgroundColor: "var(--color-amber)", color: "#14171c" }
                : { color: "var(--color-ink-muted)" }
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
