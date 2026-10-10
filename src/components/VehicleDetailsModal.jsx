import { useEffect, useRef, useState } from "react";
import {
  X, ChevronLeft, ChevronRight, ImageOff, Share2, Pencil, Images,
  Car, Calendar, Cog, Gauge, Fuel, Palette, Tag,
} from "lucide-react";
import PriceCalculator from "./PriceCalculator";
import { ProfitPreview } from "./SellingPrice";
import { formatMoney } from "../lib/constants";

// Netflix-style preview: big hero photo, thumbnail strip, specs, price calculator.
// - `vehicle` is the public-safe shape: { name, make, model, year, odometer, color,
//   bodyColor, transmission, fuelType, description, status, sellingPrice }
// - `photos` is [{ url }]
// - `isPublicView` hides everything owner-only. `owner` (costs + action buttons)
//   is only passed when the signed-in owner opens their own vehicle.
export default function VehicleDetailsModal({ vehicle, photos = [], photosLoading = false, isPublicView = false, owner = null, onClose }) {
  const [index, setIndex] = useState(0);
  const thumbsRef = useRef(null);
  const touchX = useRef(null);
  const count = photos.length;
  const sold = vehicle.status === "sold";
  const subtitle = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");

  const go = (delta) => count > 1 && setIndex((i) => (i + delta + count) % count);

  // Keep index valid if photos change
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  // Keyboard + body scroll lock
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, onClose]);

  // Scroll the active thumbnail into view (horizontally only)
  useEffect(() => {
    const box = thumbsRef.current;
    const el = box?.children[index];
    if (!box || !el) return;
    box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [index]);

  const specs = [
    { icon: Car, label: "Make", value: vehicle.make },
    { icon: Car, label: "Model", value: vehicle.model },
    { icon: Calendar, label: "Year", value: vehicle.year },
    { icon: Cog, label: "Transmission", value: vehicle.transmission },
    { icon: Gauge, label: "Mileage", value: vehicle.odometer > 0 ? `${Number(vehicle.odometer).toLocaleString()} km` : "" },
    { icon: Fuel, label: "Fuel type", value: vehicle.fuelType },
    { icon: Palette, label: "Color", value: vehicle.bodyColor },
    { icon: Tag, label: "Status", value: sold ? "Sold" : "On Stock · Available" },
  ].filter((s) => s.value);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={vehicle.name}>
      <div className="fade-in absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-pop relative flex h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Floating controls */}
          <div className="pointer-events-none sticky top-0 z-20 h-0">
            <div className="flex items-start justify-between p-3">
              <div className="pointer-events-auto flex gap-2">
                {owner && (
                  <>
                    <PillButton onClick={owner.onShare} icon={Share2} label="Share" />
                    <PillButton onClick={owner.onEdit} icon={Pencil} label="Edit" />
                    <PillButton onClick={owner.onPhotos} icon={Images} label="Photos" />
                  </>
                )}
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* HERO */}
          <div
            className="relative aspect-[4/3] w-full bg-black sm:aspect-video"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              touchX.current = null;
              if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            }}
          >
            {count > 0 ? (
              <img
                key={photos[index].url}
                src={photos[index].url}
                alt={`${vehicle.name} photo ${index + 1}`}
                className="hero-swap h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div
                className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-faint"
                style={{ background: `linear-gradient(135deg, ${vehicle.color}33, var(--color-base))` }}
              >
                <ImageOff className="h-10 w-10" />
                <span className="text-sm">{photosLoading ? "Loading photos…" : "No photos yet"}</span>
              </div>
            )}

            {/* Bottom fade into the card */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5"
              style={{ background: "linear-gradient(to top, var(--color-surface) 0%, rgba(27,31,39,0.55) 45%, transparent 100%)" }}
            />

            {count > 1 && (
              <>
                <ArrowButton side="left" onClick={() => go(-1)} />
                <ArrowButton side="right" onClick={() => go(1)} />
                <div className="absolute right-3 top-14 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm sm:top-3 sm:right-14">
                  {index + 1} / {count}
                </div>
              </>
            )}

            {/* Title block */}
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                style={
                  sold
                    ? { backgroundColor: "var(--color-coral-dim)", color: "var(--color-coral)" }
                    : { backgroundColor: "var(--color-teal-dim)", color: "var(--color-teal)" }
                }
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "currentColor" }} />
                {sold ? "Sold" : "On Stock · Available"}
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold leading-tight sm:text-4xl">{vehicle.name}</h2>
              {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
              {!sold && (
                <div className="mt-2 font-display text-xl font-semibold sm:text-2xl" style={{ color: "var(--color-amber)" }}>
                  {vehicle.sellingPrice ? formatMoney(vehicle.sellingPrice) : "Price on request"}
                </div>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          {count > 1 && (
            <div ref={thumbsRef} className="flex gap-2 overflow-x-auto px-4 pb-1 pt-3 sm:px-6" style={{ scrollbarWidth: "thin" }}>
              {photos.map((p, i) => (
                <button
                  key={p.url}
                  onClick={() => setIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                  className="h-14 w-20 shrink-0 overflow-hidden rounded-lg transition-all sm:h-16 sm:w-24"
                  style={{
                    outline: i === index ? "2px solid var(--color-amber)" : "2px solid transparent",
                    outlineOffset: "1px",
                    opacity: i === index ? 1 : 0.55,
                  }}
                >
                  <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* BODY */}
          <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              {vehicle.description && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">About this unit</h3>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink/90">{vehicle.description}</p>
                </section>
              )}

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Specifications</h3>
                <dl className="grid grid-cols-2 gap-2.5">
                  {specs.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-3 py-2.5">
                      <Icon className="h-4 w-4 shrink-0 text-ink-faint" />
                      <div className="min-w-0">
                        <dt className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</dt>
                        <dd className="truncate text-sm font-medium">{value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Owner-only: never rendered for guests */}
              {owner && !isPublicView && (
                <section className="rounded-2xl border border-dashed border-border p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Only you can see this
                  </h3>
                  <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                    <Mini label="Bought for" value={formatMoney(owner.purchasePrice)} />
                    <Mini label="Expenses" value={formatMoney(owner.expenses)} />
                    <Mini label="Invested" value={formatMoney(owner.invested)} />
                  </dl>
                  {owner.sold ? (
                    <div className="mt-3 text-center text-sm" style={{ color: owner.profit >= 0 ? "var(--color-teal)" : "var(--color-coral)" }}>
                      {owner.profit >= 0 ? "+" : "−"}{formatMoney(Math.abs(owner.profit))} profit
                    </div>
                  ) : (
                    <ProfitPreview sellingPrice={vehicle.sellingPrice} invested={owner.invested} />
                  )}
                </section>
              )}
            </div>

            <div className="lg:col-span-2">
              {sold ? (
                <div className="rounded-2xl border border-border bg-surface-2/40 p-5 text-center text-sm text-ink-muted">
                  This unit has already been sold.
                </div>
              ) : (
                <PriceCalculator listedPrice={vehicle.sellingPrice} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PillButton({ onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 items-center gap-1.5 rounded-full bg-black/60 px-3 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/80"
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ArrowButton({ side, onClick }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/75 ${side === "left" ? "left-2 sm:left-3" : "right-2 sm:right-3"}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-lg bg-surface-2 px-1.5 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className="truncate font-mono">{value}</dd>
    </div>
  );
}
