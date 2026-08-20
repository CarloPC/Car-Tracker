import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import TopBar from "../components/TopBar";
import EntryFormModal from "../components/EntryFormModal";
import { formatMoney, formatDate, categoryLabel, categoryColor, EXPENSE_CATEGORIES } from "../lib/constants";
import { Pencil, Search } from "lucide-react";

export default function Entries({ onMenu }) {
  const { entries, vehicles, activeVehicleId } = useData();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return entries
      .filter((e) => activeVehicleId === "all" || e.vehicleId === activeVehicleId)
      .filter((e) => categoryFilter === "all" || e.category === categoryFilter)
      .filter((e) => !query || (e.note || "").toLowerCase().includes(query.toLowerCase()) || categoryLabel(e.category).toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [entries, activeVehicleId, categoryFilter, query]);

  return (
    <div className="flex-1">
      <TopBar title="Expenses" subtitle={`${filtered.length} logged`} onMenu={onMenu} onAdd={() => setShowAdd(true)} addLabel="Log expense" />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes or categories…"
              className="input pl-9"
            />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input w-auto">
            <option value="all">All categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-muted">No expenses match those filters.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((e) => {
                const vehicle = vehicles.find((v) => v.id === e.vehicleId);
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(e.category) }} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{categoryLabel(e.category)}</div>
                        <div className="truncate text-xs text-ink-muted">
                          {formatDate(e.date)}{vehicle ? ` · ${vehicle.name}` : ""}{e.note ? ` · ${e.note}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold" style={{ color: "var(--color-coral)" }}>
                        −{formatMoney(e.amount)}
                      </span>
                      <button onClick={() => setEditing(e)} className="rounded-md p-1.5 text-ink-muted hover:bg-surface hover:text-ink">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {showAdd && <EntryFormModal onClose={() => setShowAdd(false)} />}
      {editing && <EntryFormModal entry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
