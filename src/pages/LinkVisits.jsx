import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, ExternalLink, Globe2, Loader2, MapPin, Monitor, Smartphone, Tablet, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TopBar from "../components/TopBar";
import StatCard from "../components/StatCard";
import { useToast } from "../components/Toast";
import { clearAllVisits, deleteVisit, useLinkVisits } from "../lib/tracking";
import LocationMapModal from "../components/LocationMapModal";

const PAGE_FILTERS = [
  { id: "all", label: "All links" },
  { id: "garage", label: "Stock link" },
  { id: "vehicle", label: "Single car" },
];

const DEVICE_ICON = { mobile: Smartphone, tablet: Tablet, desktop: Monitor, bot: Bot };

function flag(code) {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

function timeAgo(date) {
  if (!date) return "just now";
  const s = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fullTime(date) {
  if (!date) return "";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function locationText(v) {
  const parts = [v.city, v.region, v.country].filter(Boolean);
  // avoid "Cebu, Cebu"
  return parts.filter((p, i) => p !== parts[i - 1]).join(", ");
}

// Admin-only: lives under ProtectedRoute, and Firestore rules only let the owner read their own visits.
export default function LinkVisits({ onMenu }) {
  const { user } = useAuth();
  const toast = useToast();
  const { visits, loading, error } = useLinkVisits(user?.uid);
  const [pageFilter, setPageFilter] = useState("all");
  const [hideMine, setHideMine] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mapVisit, setMapVisit] = useState(null);

  const shown = useMemo(
    () =>
      visits.filter((v) => (pageFilter === "all" || v.page === pageFilter) && !(hideMine && v.isOwner)),
    [visits, pageFilter, hideMine]
  );

  // How many times each visitor id shows up (to flag returning visitors) — across ALL visits
  const visitCounts = useMemo(() => {
    const m = new Map();
    visits.forEach((v) => v.visitorId && m.set(v.visitorId, (m.get(v.visitorId) || 0) + 1));
    return m;
  }, [visits]);

  const stats = useMemo(() => {
    const others = visits.filter((v) => !v.isOwner);
    const dayAgo = Date.now() - 86400000;
    return {
      total: others.length,
      unique: new Set(others.map((v) => v.visitorId).filter(Boolean)).size,
      last24: others.filter((v) => v.date && v.date.getTime() >= dayAgo).length,
      mine: visits.length - others.length,
    };
  }, [visits]);

  async function handleDelete(id) {
    try {
      await deleteVisit(user.uid, id);
    } catch {
      toast("Couldn't delete that record", "error");
    }
  }

  async function handleClear() {
    if (!window.confirm("Delete ALL recorded visits? This can't be undone.")) return;
    setBusy(true);
    try {
      await clearAllVisits(user.uid);
    } catch {
      toast("Couldn't clear the visits", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1">
      <TopBar title="Link visits" subtitle="Who opened your shared links, and from where" onMenu={onMenu} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Visits" value={stats.total} sub="Excluding your own" />
          <StatCard label="Unique visitors" value={stats.unique} tone="teal" sub="By browser" />
          <StatCard label="Last 24 hours" value={stats.last24} tone="amber" sub="Excluding your own" />
          <StatCard label="Your own opens" value={stats.mine} sub="Testing your links" />
        </div>

        <div className="mb-4 mt-6 flex flex-wrap items-center gap-2">
          {PAGE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setPageFilter(f.id)}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
              style={
                pageFilter === f.id
                  ? { backgroundColor: "var(--color-amber)", color: "#14171c" }
                  : { backgroundColor: "var(--color-surface-2)", color: "var(--color-ink-muted)" }
              }
            >
              {f.label}
            </button>
          ))}

          <label className="ml-1 flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
            <input type="checkbox" checked={hideMine} onChange={(e) => setHideMine(e.target.checked)} />
            Hide my own visits
          </label>

          {visits.length > 0 && (
            <button
              onClick={handleClear}
              disabled={busy}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear all
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading visits…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-border bg-surface px-5 py-8 text-center text-sm text-ink-muted">
            Couldn't load visits ({error.code || "error"}). Check that the <code>linkVisits</code> Firestore rule is published.
          </div>
        )}

        {!loading && !error && shown.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-ink-muted">
            {visits.length === 0 ? "No visits yet. Open one of your shared links to test it." : "No visits match these filters."}
          </div>
        )}

        {!loading && !error && shown.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Link</th>
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((v) => {
                  const Icon = DEVICE_ICON[v.deviceType] || Monitor;
                  const loc = locationText(v);
                  const repeat = (visitCounts.get(v.visitorId) || 0) > 1;
                  const href = v.page === "garage" ? `/stock/${v.targetId}` : `/v/${v.targetId}`;
                  const hasCoords = Number.isFinite(v.lat) && Number.isFinite(v.lng);
                  const exact = v.locationSource === "gps";
                  const text = loc || (hasCoords ? `${v.lat.toFixed(3)}, ${v.lng.toFixed(3)}` : "");
                  return (
                    <tr key={v.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="font-medium">{timeAgo(v.date)}</div>
                        <div className="text-[11px] text-ink-faint">{fullTime(v.date)}</div>
                      </td>

                      <td className="px-4 py-3">
                        <Link to={href} className="inline-flex items-center gap-1 font-medium hover:underline">
                          {v.page === "garage" ? "Stock link" : v.label || "Vehicle"}
                          <ExternalLink className="h-3 w-3 text-ink-faint" />
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {v.isOwner && <Badge tone="amber">You</Badge>}
                          {!v.isOwner && repeat && <Badge tone="teal">Returning</Badge>}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-ink-muted" />
                          <span className="capitalize">{v.deviceType}</span>
                        </div>
                        <div className="text-[11px] text-ink-muted">{[v.browser, v.os].filter(Boolean).join(" · ")}</div>
                        {(v.model || v.screen) && (
                          <div className="text-[11px] text-ink-faint">{[v.model, v.screen].filter(Boolean).join(" · ")}</div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {text ? (
                          <div className="flex items-center gap-1.5">
                            <span>{flag(v.countryCode)}</span>
                            {hasCoords ? (
                              <button
                                onClick={() => setMapVisit(v)}
                                className="inline-flex items-center gap-1 text-left font-medium underline-offset-2 hover:underline"
                                style={{ color: "var(--color-amber)" }}
                              >
                                {text} <MapPin className="h-3 w-3 shrink-0" />
                              </button>
                            ) : (
                              <span>{text}</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-ink-faint">
                            <Globe2 className="h-3.5 w-3.5" /> Unknown
                          </div>
                        )}
                        {hasCoords && (
                          <div className="mt-1">
                            <Badge tone={exact ? "teal" : "muted"}>{exact ? `GPS · ±${v.accuracy ?? "?"} m` : "IP estimate"}</Badge>
                          </div>
                        )}
                        <div className="font-mono text-[11px] text-ink-faint">{v.ip || "—"}</div>
                        {v.isp && <div className="text-[11px] text-ink-faint">{v.isp}</div>}
                      </td>

                      <td className="px-4 py-3 text-xs text-ink-muted">{v.referrer || "Direct / app"}</td>

                      <td className="px-2 py-3 text-right">
                        <button
                          onClick={() => handleDelete(v.id)}
                          aria-label="Delete record"
                          className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-coral"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {mapVisit && <LocationMapModal visit={mapVisit} onClose={() => setMapVisit(null)} />}

        <p className="mt-4 text-xs text-ink-faint">
          Showing the latest 500 visits. "GPS" locations come from the visitor's own device after they tapped Allow. Otherwise the
          location is an IP estimate, which usually points at the mobile carrier's hub rather than the visitor. Ad blockers or
          private DNS can make it Unknown.
        </p>
      </div>
    </div>
  );
}

function Badge({ tone, children }) {
  const style =
    tone === "amber"
      ? { backgroundColor: "var(--color-amber-dim)", color: "var(--color-amber)" }
      : tone === "muted"
        ? { backgroundColor: "var(--color-surface-2)", color: "var(--color-ink-muted)" }
        : { backgroundColor: "var(--color-teal-dim)", color: "var(--color-teal)" };
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={style}>
      {children}
    </span>
  );
}