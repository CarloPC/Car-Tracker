import { useState } from "react";
import { useData } from "../context/DataContext";
import TopBar from "../components/TopBar";
import VehicleFormModal from "../components/VehicleFormModal";
import VehiclePhotosModal from "../components/VehiclePhotosModal";
import { vehicleStats, portfolioTotals } from "../lib/calculations";
import { SellingPriceEditor } from "../components/SellingPrice";
import VehicleAvatar from "../components/VehicleAvatar";
import { formatMoney, formatDate } from "../lib/constants";
import { Pencil, Images } from "lucide-react";

export default function Vehicles({ onMenu }) {
  const { vehicles, entries } = useData();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingPhotos, setViewingPhotos] = useState(null); // vehicle object
  const [photoVersion, setPhotoVersion] = useState(0); // bump to refresh profile pictures

  const totals = portfolioTotals(vehicles, entries);

  return (
    <div className="flex-1">
      <TopBar title="Vehicles" subtitle={`${vehicles.length} in your garage`} onMenu={onMenu} onAdd={() => setShowAdd(true)} addLabel="Add vehicle" />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        {vehicles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-ink-muted">
            No vehicles yet. Add one to start tracking what you bought it for.
          </div>
        ) : (
          <>
          {totals.projectedCount > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 text-sm sm:max-w-md">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink-muted">Expected revenue</div>
                <div className="font-mono">{formatMoney(totals.projectedRevenue)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink-muted">Expected net profit</div>
                <div className="font-mono font-semibold" style={{ color: totals.projectedProfit >= 0 ? "var(--color-teal)" : "var(--color-coral)" }}>
                  {totals.projectedProfit >= 0 ? "+" : "−"}{formatMoney(Math.abs(totals.projectedProfit))}
                </div>
              </div>
              <div className="col-span-2 text-[11px] text-ink-faint">
                Across {totals.projectedCount} unsold car{totals.projectedCount !== 1 ? "s" : ""} with a selling price
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => {
              const s = vehicleStats(v, entries);
              return (
                <div key={v.id} className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <VehicleAvatar vehicle={v} refreshKey={photoVersion} size={72} onClick={() => setViewingPhotos(v)} />
                      <div>
                        <div className="font-display text-sm font-semibold">{v.name}</div>
                        <div className="text-xs text-ink-muted">{[v.year, v.make, v.model].filter(Boolean).join(" ") || "No details yet"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Photos button */}
                      <button
                        onClick={() => setViewingPhotos(v)}
                        title="View photos"
                        className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
                      >
                        <Images className="h-3.5 w-3.5" />
                      </button>
                      {/* Edit button */}
                      <button onClick={() => setEditing(v)} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
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
                    <span className="text-xs text-ink-muted">{v.plate || "No plate"}</span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-ink-muted">Bought for</dt>
                      <dd className="font-mono">{formatMoney(s.purchasePrice)}</dd>
                      <dd className="mt-0.5 text-ink-faint">{formatDate(v.purchaseDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">{s.sold ? "Sold for" : "Odometer"}</dt>
                      <dd className="font-mono">
                        {s.sold ? formatMoney(s.salePrice) : v.odometer ? `${Number(v.odometer).toLocaleString()} km` : "—"}
                      </dd>
                      {s.sold && <dd className="mt-0.5 text-ink-faint">{formatDate(v.saleDate)}</dd>}
                    </div>
                  </dl>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-ink-muted">−{formatMoney(s.expenses)} expenses</span>
                    {s.sold ? (
                      <span style={{ color: s.profit >= 0 ? "var(--color-teal)" : "var(--color-coral)" }}>
                        {s.profit >= 0 ? "+" : "−"}{formatMoney(Math.abs(s.profit))} profit
                      </span>
                    ) : (
                      <span className="text-ink-muted">{formatMoney(s.invested)} invested</span>
                    )}
                  </div>

                  {!s.sold && <SellingPriceEditor vehicle={v} invested={s.invested} />}

                  {/* Photos quick-link row */}
                  <button
                    onClick={() => setViewingPhotos(v)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-medium text-ink-muted transition-colors hover:border-ink-faint hover:text-ink"
                  >
                    <Images className="h-3.5 w-3.5" />
                    View / add photos
                  </button>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      {showAdd && <VehicleFormModal onClose={() => setShowAdd(false)} />}
      {editing && <VehicleFormModal vehicle={editing} onClose={() => setEditing(null)} />}
      {viewingPhotos && <VehiclePhotosModal vehicle={viewingPhotos} onClose={() => { setViewingPhotos(null); setPhotoVersion((n) => n + 1); }} />}
    </div>
  );
}