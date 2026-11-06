import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MapPin, X } from "lucide-react";
import { dismissPreciseLocation, shareExactLocation, subscribePendingVisit } from "../lib/tracking";

// Small opt-in card for public pages. It only appears after a visit has been logged, and
// tapping "Share my location" triggers the browser's own permission prompt.
export default function LocationPrompt() {
  const [ref, setRef] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | working | done | error
  const [message, setMessage] = useState("");
  const timer = useRef(null);

  useEffect(() => subscribePendingVisit(setRef), []);
  useEffect(() => () => clearTimeout(timer.current), []);

  function flash(nextStatus, text) {
    setStatus(nextStatus);
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 3000);
  }

  async function handleShare() {
    if (!ref) return;
    setStatus("working");
    try {
      await shareExactLocation(ref);
      flash("done", "Thanks!");
    } catch (err) {
      dismissPreciseLocation(); // don't nag again this session
      flash(
        "error",
        err?.code === 1
          ? "No problem. Your location stays private."
          : "Couldn't get your location. Try opening this link in Chrome or Safari."
      );
    }
  }

  const showCard = ref && status !== "done" && status !== "error";
  const showResult = status === "done" || status === "error";
  if (!showCard && !showResult) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-surface-2 p-4 shadow-2xl"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {showResult ? (
          <div className="flex items-center gap-2 text-sm font-medium">
            {status === "done" ? (
              <Check className="h-4 w-4 shrink-0" style={{ color: "var(--color-teal)" }} />
            ) : (
              <MapPin className="h-4 w-4 shrink-0 text-ink-muted" />
            )}
            {message}
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--color-amber)" }} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-sm font-semibold">Share your location with the seller?</div>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Helps the seller know your area for viewings and delivery. It's used for this visit only, and you can say no.
                </p>
              </div>
              <button onClick={dismissPreciseLocation} aria-label="Dismiss" className="rounded-md p-1 text-ink-faint hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleShare}
                disabled={status === "working"}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-70"
                style={{ backgroundColor: "var(--color-amber)", color: "#14171c" }}
              >
                {status === "working" && <Loader2 className="h-4 w-4 animate-spin" />}
                Share my location
              </button>
              <button
                onClick={handleShare}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink"
              >
                No thanks
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}