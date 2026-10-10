import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useData } from "../context/DataContext";
import TopBar from "../components/TopBar";
import VehicleFormModal from "../components/VehicleFormModal";
import VehiclePhotosModal from "../components/VehiclePhotosModal";
import { vehicleStats, portfolioTotals } from "../lib/calculations";
import { SellingPriceEditor } from "../components/SellingPrice";
import VehicleAvatar from "../components/VehicleAvatar";
import { formatMoney, formatDate } from "../lib/constants";
import VehicleDetailsModal from "../components/VehicleDetailsModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { listCarPhotos } from "../lib/supabase";
import {
  copyText, disableBulkShare, enableBulkShare, garageUrl, orderPhotos, publicFieldsOf,
  publishVehicle, shareUrl, unpublishVehicle, useBulkShare, useSharedVehicleSync,
} from "../lib/sharing";
import { Pencil, Images, Share2, Link2, LayoutGrid, Copy, Loader2 } from "lucide-react";

// Loads photos for the owner's own vehicle and shows the details modal with owner extras
function OwnerDetails({ vehicle, stats, uid, photoVersion, onClose, onShare, onEdit, onPhotos }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listCarPhotos(uid, vehicle.id)
      .then((list) => !cancelled && setPhotos(orderPhotos(list, vehicle.coverPath)))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [uid, vehicle.id, vehicle.coverPath, photoVersion]);

  return (
    <VehicleDetailsModal
      vehicle={{ ...publicFieldsOf(vehicle), sellingPrice: stats.sellingPrice }}
      photos={photos}
      photosLoading={loading}
      onClose={onClose}
      owner={{
        purchasePrice: stats.purchasePrice,
        expenses: stats.expenses,
        invested: stats.invested,
        sold: stats.sold,
        profit: stats.profit,
        onShare,
        onEdit,
        onPhotos,
      }}
    />
  );
}

export default function Vehicles({ onMenu }) {
  const { vehicles, entries, loading, updateVehicle } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingPhotos, setViewingPhotos] = useState(null); // vehicle object
  const [photoVersion, setPhotoVersion] = useState(0); // bump to refresh profile pictures
  const [photoTouch, setPhotoTouch] = useState({ vehicleId: null, version: 0 }); // which car's photos changed
  const [bulkBusy, setBulkBusy] = useState(false);

  const totals = portfolioTotals(vehicles, entries);

  // Keep public snapshots of shared vehicles up to date
  const bulk = useBulkShare(user?.uid);
  useSharedVehicleSync(user?.uid, vehicles, photoTouch, bulk.enabled, !loading && bulk.ready);

  // Details modal is driven by the URL (?vehicleId=...) so it can be linked and the back button closes it
  const detailsId = searchParams.get("vehicleId") || searchParams.get("sharedId");
  const detailsVehicle = vehicles.find((v) => v.id === detailsId);
  const openDetails = (v) => setSearchParams({ vehicleId: v.id });
  const closeDetails = () => setSearchParams({}, { replace: true });

  // A vehicleId that isn't in my garage (someone else's link) -> show the public view
  useEffect(() => {
    if (detailsId && !loading && !detailsVehicle) navigate(`/v/${encodeURIComponent(detailsId)}`, { replace: true });
  }, [detailsId, loading, detailsVehicle, navigate]);

  async function handleShare(v) {
    const url = shareUrl(v.id);
    try {
      if (v.shared || bulk.enabled) {
        // Already published: copy right away (keeps the click's clipboard permission)
        const ok = await copyText(url);
        if (!v.shared) updateVehicle(v.id, { shared: true });
        else publishVehicle(user.uid, v, bulk.enabled).catch(() => {});
        toast(ok ? "Link copied to clipboard!" : url);
        return;
      }
      await publishVehicle(user.uid, v, false);
      await updateVehicle(v.id, { shared: true });
      const ok = await copyText(url);
      toast(ok ? "Link copied to clipboard!" : "Sharing is on — tap Share again to copy the link");
    } catch (e) {
      console.error(e);
      toast("Couldn't create the share link. Check your Firestore rules.", "error");
    }
  }

  async function handleStopSharing(v) {
    if (!confirm("Stop sharing this vehicle's link? Anyone with the link will no longer be able to open it.")) return;
    try {
      // If the all-stock link is on, the car stays listed there
      if (bulk.enabled) await publishVehicle(user.uid, v, true);
      else await unpublishVehicle(v.id);
      await updateVehicle(v.id, { shared: false });
      toast("Sharing stopped");
    } catch (e) {
      console.error(e);
      toast("Couldn't stop sharing. Please try again.", "error");
    }
  }

  // ---- Bulk share: one link for all cars
  async function handleShareAll() {
    const url = garageUrl(user.uid);
    if (bulk.enabled) {
      const ok = await copyText(url);
      toast(ok ? "Stock link copied to clipboard!" : url);
      return;
    }
    setBulkBusy(true);
    try {
      await enableBulkShare(user.uid, vehicles);
      const ok = await copyText(url);
      toast(ok ? "Stock link copied to clipboard!" : "Stock sharing is on — tap Copy link");
    } catch (e) {
      console.error(e);
      toast("Couldn't create the stock link. Check your Firestore rules.", "error");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleStopBulk() {
    if (!confirm("Stop sharing your stock? The all-cars link will stop working.")) return;
    setBulkBusy(true);
    try {
      await disableBulkShare(user.uid, vehicles);
      toast("Stock sharing stopped");
    } catch (e) {
      console.error(e);
      toast("Couldn't stop sharing. Please try again.", "error");
    } finally {
      setBulkBusy(false);
    }
  }

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
          {/* Bulk share: one link, every car */}
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: "rgba(91,157,242,0.15)" }}
              >
                <LayoutGrid className="h-4 w-4" style={{ color: "var(--color-blue)" }} />
              </span>
              <div>
                <div className="text-sm font-semibold">Share all my stock</div>
                <div className="text-xs text-ink-muted">
                  {bulk.enabled
                    ? "Live — anyone with the link can browse all your cars."
                    : "One link where buyers can browse every car you have."}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={handleShareAll}
                disabled={bulkBusy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60 sm:flex-none"
                style={{ backgroundColor: "var(--color-amber)", color: "#14171c" }}
              >
                {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : bulk.enabled ? <Copy className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                {bulkBusy ? "Publishing…" : bulk.enabled ? "Copy stock link" : "Share all stock"}
              </button>
              {bulk.enabled && !bulkBusy && (
                <button
                  onClick={handleStopBulk}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink-muted hover:border-ink-faint hover:text-ink"
                >
                  Stop
                </button>
              )}
            </div>
          </div>

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
                      <VehicleAvatar vehicle={v} refreshKey={photoVersion} size={72} onClick={() => openDetails(v)} />
                      <button onClick={() => openDetails(v)} className="text-left">
                        <div className="font-display text-sm font-semibold">{v.name}</div>
                        <div className="text-xs text-ink-muted">{[v.year, v.make, v.model].filter(Boolean).join(" ") || "No details yet"}</div>
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Share / copy link */}
                      <button
                        onClick={() => handleShare(v)}
                        title="Share / copy link"
                        className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
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
                    {v.shared && (
                      <button
                        onClick={() => handleStopSharing(v)}
                        title="Shared — tap to stop sharing"
                        className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{ backgroundColor: "rgba(91,157,242,0.15)", color: "var(--color-blue)" }}
                      >
                        <Link2 className="h-3 w-3" /> Shared
                      </button>
                    )}
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

      {detailsVehicle && (
        <OwnerDetails
          vehicle={detailsVehicle}
          stats={vehicleStats(detailsVehicle, entries)}
          uid={user.uid}
          photoVersion={photoVersion}
          onClose={closeDetails}
          onShare={() => handleShare(detailsVehicle)}
          onEdit={() => setEditing(detailsVehicle)}
          onPhotos={() => setViewingPhotos(detailsVehicle)}
        />
      )}
      {showAdd && <VehicleFormModal onClose={() => setShowAdd(false)} />}
      {editing && <VehicleFormModal vehicle={editing} onClose={() => setEditing(null)} />}
      {viewingPhotos && <VehiclePhotosModal vehicle={viewingPhotos} onClose={() => {
          setPhotoTouch((t) => ({ vehicleId: viewingPhotos.id, version: t.version + 1 }));
          setViewingPhotos(null);
          setPhotoVersion((n) => n + 1);
        }} />}
    </div>
  );
}