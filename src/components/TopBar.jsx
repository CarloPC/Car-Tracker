import { Menu, Plus } from "lucide-react";
import { useData } from "../context/DataContext";

export default function TopBar({ title, subtitle, onMenu, onAdd, addLabel = "Log expense" }) {
  const { vehicles, activeVehicleId, setActiveVehicleId } = useData();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-base/90 px-4 py-4 backdrop-blur sm:px-8" style={{ backgroundColor: "rgba(20,23,28,0.9)" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onMenu} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-lg font-semibold sm:text-xl">{title}</h1>
            {subtitle && <p className="text-xs text-ink-muted sm:text-sm">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeVehicleId}
            onChange={(e) => setActiveVehicleId(e.target.value)}
            className="hidden rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink sm:block"
          >
            <option value="all">All vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-base transition-transform active:scale-95"
              style={{ backgroundColor: "var(--color-amber)", color: "#14171c" }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{addLabel}</span>
            </button>
          )}
        </div>
      </div>

      <select
        value={activeVehicleId}
        onChange={(e) => setActiveVehicleId(e.target.value)}
        className="mt-3 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink sm:hidden"
      >
        <option value="all">All vehicles</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>
    </header>
  );
}
