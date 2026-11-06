import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink, X } from "lucide-react";

const AMBER = "#f2a93b";
// IP geolocation is only accurate to roughly the city / ISP hub, so we draw that uncertainty on the map
const APPROX_RADIUS_M = 5000;

export default function LocationMapModal({ visit, onClose }) {
  const mapEl = useRef(null);
  const { lat, lng } = visit;
  const place = [visit.city, visit.region, visit.country].filter(Boolean).join(", ") || "Approximate location";

  useEffect(() => {
    const map = L.map(mapEl.current).setView([lat, lng], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    L.circle([lat, lng], { radius: APPROX_RADIUS_M, color: AMBER, weight: 1, fillColor: AMBER, fillOpacity: 0.15 }).addTo(map);

    // Plain DOM node (not an HTML string) so city/ISP text from the IP service can never inject markup
    const popup = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = place;
    popup.appendChild(title);
    if (visit.ip) {
      popup.appendChild(document.createElement("br"));
      popup.appendChild(document.createTextNode(visit.ip));
    }

    L.circleMarker([lat, lng], { radius: 9, color: "#14171c", weight: 2, fillColor: AMBER, fillOpacity: 1 })
      .addTo(map)
      .bindPopup(popup)
      .openPopup();

    // The modal has just mounted, so make Leaflet re-measure its container
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => {
      clearTimeout(t);
      map.remove();
    };
  }, [lat, lng, place, visit.ip]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" />
      <div className="relative w-full overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-semibold">{place}</h2>
            <p className="text-xs text-ink-muted">
              {visit.isp ? `${visit.isp} · ` : ""}
              <span className="font-mono">
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </span>
            </p>
          </div>
          <button onClick={onClose} aria-label="Close map" className="rounded-md p-1 text-ink-muted hover:bg-surface-2 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={mapEl} className="h-[55vh] min-h-[280px] w-full sm:h-[420px]" style={{ isolation: "isolate" }} />

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-ink-muted sm:px-5">
          <span>The shaded circle shows the approximate area; IP locations aren't exact.</span>
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium hover:underline"
            style={{ color: "var(--color-amber)" }}
          >
            Open in Google Maps <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}