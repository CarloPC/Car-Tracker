import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Gauge, ImageOff, LinkIcon, Loader2 } from "lucide-react";
import { fetchPublicGarage } from "../lib/sharing";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../lib/constants";
import VehicleDetailsModal from "../components/VehicleDetailsModal";

// Public, no-login "all my stock" page at /stock/:ownerId.
// Buyers browse every car; tapping one opens the same gallery + price calculator.
export default function PublicGarage() {
  const { ownerId } = useParams();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({ status: "loading", vehicles: [] });
  const [filter, setFilter] = useState("available");

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", vehicles: [] });
    fetchPublicGarage(ownerId)
      .then((list) => !cancelled && setState(list ? { status: "ready", vehicles: list } : { status: "missing", vehicles: [] }))
      .catch(() => !cancelled && setState({ status: "error", vehicles: [] }));
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  const { available, sold } = useMemo(() => {
    const byRecent = (a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
    return {
      available: state.vehicles.filter((v) => v.status !== "sold").sort(byRecent),
      sold: state.vehicles.filter((v) => v.status === "sold").sort(byRecent),
    };
  }, [state.vehicles]);

  const shown = filter === "sold" ? sold : available;
  const openId = searchParams.get("car");
  const openVehicle = state.vehicles.find((v) => v.id === openId);

  return (
    <div className="min-h-screen bg-base text-ink">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <Gauge className="h-5 w-5" style={{ color: "var(--color-amber)" }} /> Sakyanan
        </div>
        {user && (
          <Link to="/vehicles" className="text-xs font-medium text-ink-muted hover:text-ink">
            Open my garage
          </Link>
        )}
      </header>

      {state.status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading stock…
        </div>
      )}

      {(state.status === "missing" || state.status === "error") && (
        <div className="mx-auto max-w-sm px-6 py-24 text-center">
          <LinkIcon className="mx-auto mb-3 h-8 w-8 text-ink-faint" />
          <h1 className="font-display text-lg font-semibold">
            {state.status === "missing" ? "This link isn't available" : "Couldn't load the stock"}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {state.status === "missing"
              ? "The owner may have stopped sharing, or the link is incorrect."
              : "Please check your connection and try again."}
          </p>
        </div>
      )}

      {state.status === "ready" && (
        <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">Vehicle stock</h1>
              <p className="text-sm text-ink-muted">
                {available.length} available{sold.length > 0 ? ` · ${sold.length} sold` : ""}
              </p>
            </div>
            {sold.length > 0 && (
              <div className="flex gap-1 rounded-full bg-surface p-1 text-xs font-semibold">
                {[["available", `Available (${available.length})`], ["sold", `Sold (${sold.length})`]].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className="rounded-full px-3.5 py-1.5 transition-colors"
                    style={filter === id ? { backgroundColor: "var(--color-amber)", color: "#14171c" } : { color: "var(--color-ink-muted)" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {shown.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-ink-muted">
              {filter === "sold" ? "No sold cars to show." : "No cars available right now. Please check back soon."}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((v) => (
                <StockCard key={v.id} v={v} onOpen={() => setSearchParams({ car: v.id })} />
              ))}
            </div>
          )}
        </main>
      )}

      {openVehicle && (
        <VehicleDetailsModal
          vehicle={openVehicle}
          photos={openVehicle.photos}
          isPublicView
          onClose={() => setSearchParams({}, { replace: true })}
        />
      )}
    </div>
  );
}

function StockCard({ v, onOpen }) {
  const sold = v.status === "sold";
  const cover = v.photos[0]?.url;
  const subtitle = [v.year, v.make, v.model].filter(Boolean).join(" ");
  const meta = [v.odometer > 0 ? `${Number(v.odometer).toLocaleString()} km` : "", v.transmission, v.fuelType].filter(Boolean);

  return (
    <button
      onClick={onOpen}
      className="group overflow-hidden rounded-2xl border border-border bg-surface text-left transition-all hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-2xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-black">
        {cover ? (
          <img
            src={cover}
            alt={v.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={sold ? { filter: "grayscale(0.6)" } : undefined}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-ink-faint"
            style={{ background: `linear-gradient(135deg, ${v.color}33, var(--color-base))` }}
          >
            <ImageOff className="h-8 w-8" />
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)" }}
        />
        <span
          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm"
          style={
            sold
              ? { backgroundColor: "var(--color-coral-dim)", color: "var(--color-coral)" }
              : { backgroundColor: "var(--color-teal-dim)", color: "var(--color-teal)" }
          }
        >
          {sold ? "Sold" : "On Stock"}
        </span>
        {!sold && (
          <div className="absolute bottom-3 left-3 font-display text-lg font-semibold text-white">
            {v.sellingPrice ? formatMoney(v.sellingPrice) : "Price on request"}
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="font-display text-sm font-semibold">{v.name}</div>
        {subtitle && <div className="text-xs text-ink-muted">{subtitle}</div>}
        {meta.length > 0 && <div className="mt-2 text-[11px] text-ink-faint">{meta.join(" · ")}</div>}
      </div>
    </button>
  );
}
