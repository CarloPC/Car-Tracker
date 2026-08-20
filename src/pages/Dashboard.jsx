import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import TopBar from "../components/TopBar";
import StatCard from "../components/StatCard";
import ProfitGauge from "../components/ProfitGauge";
import EntryFormModal from "../components/EntryFormModal";
import { portfolioTotals, profitScore, activityFeed, vehicleStats } from "../lib/calculations";
import { formatMoney, formatDate, categoryLabel } from "../lib/constants";
import { Wallet, TrendingUp, TrendingDown, Car, Plus, Receipt } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard({ onMenu }) {
  const { vehicles, entries, activeVehicleId } = useData();
  const [showAdd, setShowAdd] = useState(false);

  const scopedVehicles = useMemo(
    () => (activeVehicleId === "all" ? vehicles : vehicles.filter((v) => v.id === activeVehicleId)),
    [vehicles, activeVehicleId]
  );
  const scopedEntries = useMemo(
    () => (activeVehicleId === "all" ? entries : entries.filter((e) => e.vehicleId === activeVehicleId)),
    [entries, activeVehicleId]
  );

  const t = portfolioTotals(scopedVehicles, scopedEntries);
  const score = profitScore(t);
  const recent = activityFeed(scopedVehicles, scopedEntries, 6);

  return (
    <div className="flex-1">
      <TopBar
        title="Dashboard"
        subtitle={activeVehicleId === "all" ? "All vehicles, all time" : vehicles.find((v) => v.id === activeVehicleId)?.name}
        onMenu={onMenu}
        onAdd={() => setShowAdd(true)}
        addLabel="Log expense"
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        {vehicles.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <StatCard
                label="Bought"
                value={formatMoney(t.bought)}
                tone="ink"
                icon={<Wallet className="h-4 w-4 text-ink-muted" />}
                sub={`${scopedVehicles.length} vehicle${scopedVehicles.length === 1 ? "" : "s"}`}
              />
              <StatCard
                label="Expenses"
                value={formatMoney(t.expenses)}
                tone="coral"
                icon={<TrendingDown className="h-4 w-4" style={{ color: "var(--color-coral)" }} />}
                sub={`${scopedEntries.length} logged`}
              />
              <StatCard
                label="Total Spent"
                value={formatMoney(t.bought + t.expenses)}
                tone="coral"
                icon={<Receipt className="h-4 w-4" style={{ color: "var(--color-coral)" }} />}
                sub="Bought + expenses"
              />
              <StatCard
                label="Sold"
                value={formatMoney(t.sold)}
                tone="teal"
                icon={<TrendingUp className="h-4 w-4" style={{ color: "var(--color-teal)" }} />}
                sub={`${t.soldCount} sold · ${t.stockCount} in stock`}
              />
              <div className="row-span-2 flex items-center justify-center rounded-2xl border border-border bg-surface p-4 lg:row-span-1">
                <ProfitGauge score={score} net={t.profit} />
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold">Recent activity</h2>
                  <Link to="/entries" className="text-xs font-medium text-ink-muted hover:text-ink">View all →</Link>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                  {recent.length === 0 ? (
                    <p className="p-6 text-sm text-ink-muted">No activity yet. Add a vehicle and log its purchase to get started.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {recent.map((item) => {
                        const vehicle = vehicles.find((v) => v.id === item.vehicleId);
                        const isInflow = item.kind === "sold";
                        return (
                          <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{
                                  backgroundColor:
                                    item.kind === "bought" ? "var(--color-ink-muted)"
                                    : item.kind === "sold" ? "var(--color-teal)"
                                    : "var(--color-coral)",
                                }}
                              />
                              <div>
                                <div className="text-sm font-medium">
                                  {item.kind === "expense" ? categoryLabel(item.category) : item.label}
                                </div>
                                <div className="text-xs text-ink-muted">
                                  {formatDate(item.date)}
                                  {vehicle && item.kind === "expense" ? ` · ${vehicle.name}` : ""}
                                </div>
                              </div>
                            </div>
                            <span
                              className="font-mono text-sm font-semibold"
                              style={{ color: isInflow ? "var(--color-teal)" : "var(--color-coral)" }}
                            >
                              {isInflow ? "+" : "−"}{formatMoney(item.amount)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <h2 className="mb-3 font-display text-base font-semibold">Your vehicles</h2>
                <div className="space-y-3">
                  {vehicles.map((v) => {
                    const s = vehicleStats(v, entries);
                    return (
                      <Link
                        key={v.id}
                        to="/vehicles"
                        className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-ink-faint"
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: v.color }} />
                            <span className="text-sm font-semibold">{v.name}</span>
                          </div>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                            style={
                              s.sold
                                ? { backgroundColor: "var(--color-teal-dim)", color: "var(--color-teal)" }
                                : { backgroundColor: "var(--color-surface-2)", color: "var(--color-ink-muted)" }
                            }
                          >
                            {s.sold ? "Sold" : "In stock"}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-ink-muted">
                          {[v.year, v.make, v.model].filter(Boolean).join(" ") || "No details yet"}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs">
                          {s.sold ? (
                            <span style={{ color: s.profit >= 0 ? "var(--color-teal)" : "var(--color-coral)" }}>
                              {s.profit >= 0 ? "+" : "−"}{formatMoney(Math.abs(s.profit))} profit
                            </span>
                          ) : (
                            <span className="text-ink-muted">{formatMoney(s.invested)} invested</span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showAdd && <EntryFormModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(242,169,59,0.12)" }}>
        <Car className="h-6 w-6" style={{ color: "var(--color-amber)" }} />
      </div>
      <h2 className="font-display text-lg font-semibold">Add your first vehicle</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">
        Mileway tracks what you bought a car for, what you spent fixing it up, and what you sold it for. Start by adding one from the Vehicles tab.
      </p>
      <Link
        to="/vehicles"
        className="mt-5 flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold"
        style={{ backgroundColor: "var(--color-amber)", color: "#14171c" }}
      >
        <Plus className="h-4 w-4" />
        Go to Vehicles
      </Link>
    </div>
  );
}