import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import TopBar from "../components/TopBar";
import StatCard from "../components/StatCard";
import { portfolioTotals, byCategory, monthlySeries, vehicleStats } from "../lib/calculations";
import { formatMoney, formatDate, categoryLabel, categoryColor } from "../lib/constants";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const RANGE_OPTIONS = [
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "365", label: "Last 12 months" },
  { id: "all", label: "All time" },
];

export default function Statistics({ onMenu }) {
  const { vehicles, entries, activeVehicleId } = useData();
  const [range, setRange] = useState("90");

  const scopedVehicles = useMemo(
    () => (activeVehicleId === "all" ? vehicles : vehicles.filter((v) => v.id === activeVehicleId)),
    [vehicles, activeVehicleId]
  );

  const cutoffIso = useMemo(() => {
    if (range === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - Number(range));
    return d.toISOString().slice(0, 10);
  }, [range]);

  const scopedEntries = useMemo(() => {
    let list = activeVehicleId === "all" ? entries : entries.filter((e) => e.vehicleId === activeVehicleId);
    if (cutoffIso) list = list.filter((e) => e.date >= cutoffIso);
    return list;
  }, [entries, activeVehicleId, cutoffIso]);

  const rangedVehicles = useMemo(() => {
    if (!cutoffIso) return scopedVehicles;
    // include a vehicle if it was bought or sold within the range
    return scopedVehicles.filter((v) => (v.purchaseDate && v.purchaseDate >= cutoffIso) || (v.saleDate && v.saleDate >= cutoffIso));
  }, [scopedVehicles, cutoffIso]);

  const t = portfolioTotals(rangedVehicles, scopedEntries);
  const invested = t.bought + t.expenses;
  const avgProfit = t.soldCount > 0 ? t.profit / t.soldCount : null;
  const expenseBreakdown = byCategory(scopedEntries);
  const months = range === "365" ? 12 : range === "30" ? 3 : 6;
  const series = monthlySeries(scopedVehicles, scopedEntries, months);

  const soldVehicles = scopedVehicles
    .map((v) => ({ vehicle: v, stats: vehicleStats(v, entries) }))
    .filter((x) => x.stats.sold)
    .sort((a, b) => b.stats.profit - a.stats.profit);

  const hasData = rangedVehicles.length > 0 || scopedEntries.length > 0;

  return (
    <div className="flex-1">
      <TopBar title="Statistics" subtitle="What you bought cars for, spent on them, and sold them for" onMenu={onMenu} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setRange(opt.id)}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
              style={
                range === opt.id
                  ? { backgroundColor: "var(--color-amber)", color: "#14171c" }
                  : { backgroundColor: "var(--color-surface-2)", color: "var(--color-ink-muted)" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        {!hasData ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-ink-muted">
            No activity in this range yet.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total invested" value={formatMoney(invested)} sub="Bought + expenses" />
              <StatCard label="Total sales" value={formatMoney(t.sold)} tone="teal" sub={`${t.soldCount} car${t.soldCount === 1 ? "" : "s"} sold`} />
              <StatCard label="Net profit" value={formatMoney(t.profit)} tone={t.profit >= 0 ? "teal" : "coral"} sub="Realized, sold cars only" />
              <StatCard label="Avg. profit / car" value={avgProfit === null ? "—" : formatMoney(avgProfit)} tone={avgProfit >= 0 ? "teal" : "coral"} sub={avgProfit === null ? "No sales yet" : "Per sold vehicle"} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
                <h2 className="mb-4 font-display text-sm font-semibold">Bought, sold & expenses by month</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={series} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--color-ink-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-ink-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${v}`} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-surface-2)" }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-ink-muted)" }} />
                    <Bar dataKey="bought" name="Bought" fill="var(--color-ink-muted)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill="var(--color-coral)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sold" name="Sold" fill="var(--color-teal)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-5">
                <h2 className="mb-4 font-display text-sm font-semibold">Expense breakdown</h2>
                {expenseBreakdown.length === 0 ? (
                  <p className="py-10 text-center text-sm text-ink-muted">No expenses logged.</p>
                ) : (
                  <CategoryPie data={expenseBreakdown} />
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
              <h2 className="mb-4 font-display text-sm font-semibold">Profit by vehicle</h2>
              {soldVehicles.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-muted">No vehicles sold yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
                        <th className="pb-2 font-medium">Vehicle</th>
                        <th className="pb-2 font-medium">Bought</th>
                        <th className="pb-2 font-medium">Expenses</th>
                        <th className="pb-2 font-medium">Sold</th>
                        <th className="pb-2 text-right font-medium">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {soldVehicles.map(({ vehicle, stats }) => (
                        <tr key={vehicle.id}>
                          <td className="py-2.5 font-sans font-medium">
                            {vehicle.name}
                            <div className="font-sans text-xs text-ink-muted">{formatDate(vehicle.saleDate)}</div>
                          </td>
                          <td className="py-2.5">{formatMoney(stats.purchasePrice)}</td>
                          <td className="py-2.5">{formatMoney(stats.expenses)}</td>
                          <td className="py-2.5">{formatMoney(stats.salePrice)}</td>
                          <td className="py-2.5 text-right font-semibold" style={{ color: stats.profit >= 0 ? "var(--color-teal)" : "var(--color-coral)" }}>
                            {stats.profit >= 0 ? "+" : "−"}{formatMoney(Math.abs(stats.profit))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CategoryPie({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="amount" nameKey="category" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.category} fill={categoryColor(d.category)} stroke="var(--color-surface)" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs shadow-xl">
      {label && <div className="mb-1 font-medium text-ink-muted">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 font-mono">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.payload?.fill }} />
          <span>{categoryLabel(p.name) !== p.name ? categoryLabel(p.name) : p.name}:</span>
          <span className="font-semibold">{formatMoney(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
