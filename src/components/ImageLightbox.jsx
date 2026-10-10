import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

const MAX_SCALE = 5;
const TAP_ZOOM = 2.5;

// Fullscreen photo viewer.
// PC:     click to zoom / click again to reset, scroll wheel to zoom, drag to pan,
//         ← → to browse, Esc to close (handled by the parent so Esc closes only this).
// Mobile: pinch to zoom, drag to pan, tap to zoom, swipe left/right to browse, swipe down to close.
export default function ImageLightbox({ photos, index, onChange, onClose, title }) {
  const stageRef = useRef(null);
  const [t, setT] = useState({ scale: 1, x: 0, y: 0 });
  const [busy, setBusy] = useState(false); // disables the transition while dragging / pinching
  const tRef = useRef(t);
  const pointers = useRef(new Map());
  const g = useRef({ startPt: null, startT: t, startDist: 0, startScale: 1, moved: false, pinched: false, startTime: 0 });
  const count = photos.length;

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // New photo -> reset zoom
  useEffect(() => {
    setT({ scale: 1, x: 0, y: 0 });
  }, [index]);

  // Warm up neighbouring photos so swiping feels instant
  useEffect(() => {
    [index - 1, index + 1].forEach((i) => {
      const p = photos[(i + count) % count];
      if (p) new Image().src = p.url;
    });
  }, [index, photos, count]);

  const clampT = (scale, x, y) => {
    const el = stageRef.current;
    if (!el || scale <= 1) return { scale: Math.max(1, scale), x: 0, y: 0 };
    const mx = ((scale - 1) * el.clientWidth) / 2;
    const my = ((scale - 1) * el.clientHeight) / 2;
    return { scale, x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  };

  // Zoom to `next` keeping the point (cx, cy) — relative to the stage centre — under the cursor/finger
  const zoomTo = (next, cx = 0, cy = 0) => {
    setT((prev) => {
      const s = Math.max(1, Math.min(MAX_SCALE, next));
      if (s === 1) return { scale: 1, x: 0, y: 0 };
      const ratio = s / prev.scale;
      return clampT(s, cx - (cx - prev.x) * ratio, cy - (cy - prev.y) * ratio);
    });
  };

  // Mouse wheel / trackpad zoom (needs a non-passive listener to block page scroll)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
      zoomTo(tRef.current.scale * factor, e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      g.current = { startPt: { x: e.clientX, y: e.clientY }, startT: tRef.current, startDist: 0, startScale: 1, moved: false, pinched: false, startTime: Date.now() };
    } else if (pointers.current.size === 2) {
      g.current.startDist = dist();
      g.current.startScale = tRef.current.scale;
      g.current.moved = true;
      g.current.pinched = true;
    }
    if (pointers.current.size === 2 || tRef.current.scale > 1) setBusy(true);
  }

  function onPointerMove(e) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const st = g.current;

    if (pointers.current.size === 2 && st.startDist > 0) {
      const s = Math.max(1, Math.min(MAX_SCALE, (st.startScale * dist()) / st.startDist));
      setT((prev) => clampT(s, prev.x, prev.y));
      return;
    }
    if (pointers.current.size === 1 && st.startPt) {
      const dx = e.clientX - st.startPt.x;
      const dy = e.clientY - st.startPt.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) st.moved = true;
      if (tRef.current.scale > 1 && st.moved) {
        setBusy(true);
        setT(clampT(tRef.current.scale, st.startT.x + dx, st.startT.y + dy));
      }
    }
  }

  function endPointer(e) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const st = g.current;

    // One finger of a pinch lifted: let the other keep panning from here
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      st.startPt = { ...p };
      st.startT = tRef.current;
      return;
    }
    if (pointers.current.size > 0) return;

    setBusy(false);
    if (!st.startPt) return;
    const dx = e.clientX - st.startPt.x;
    const dy = e.clientY - st.startPt.y;
    const wasZoomed = st.startT.scale > 1 || tRef.current.scale > 1;

    if (st.pinched) {
      if (tRef.current.scale < 1.05) setT({ scale: 1, x: 0, y: 0 });
    } else if (!st.moved && Date.now() - st.startTime < 400) {
      // Tap / click: toggle zoom at that point (only when it lands on the photo itself)
      if (e.target.tagName === "IMG") {
        if (tRef.current.scale > 1) zoomTo(1);
        else {
          const r = stageRef.current.getBoundingClientRect();
          zoomTo(TAP_ZOOM, e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
        }
      }
    } else if (!wasZoomed) {
      // Swipes at normal zoom
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && count > 1) onChange(dx < 0 ? 1 : -1);
      else if (dy > 110 && dy > Math.abs(dx) * 1.5) onClose();
    }
    st.startPt = null;
  }

  const zoomed = t.scale > 1;
  const photo = photos[index];

  return createPortal(
    <div className="fade-in fixed inset-0 z-[70] bg-black" role="dialog" aria-modal="true" aria-label="Photo viewer">
      {/* Stage */}
      <div
        ref={stageRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ touchAction: "none", cursor: zoomed ? "grab" : "zoom-in" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <div key={photo.url} className="hero-swap flex h-full w-full items-center justify-center">
          <img
            src={photo.url}
            alt={`${title} photo ${index + 1}`}
            draggable={false}
            className="max-h-full max-w-full select-none object-contain"
            style={{
              transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
              transition: busy ? "none" : "transform 0.2s ease-out",
              willChange: "transform",
            }}
          />
        </div>
      </div>

      {/* Top bar */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-4"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" }}
      >
        <div className="min-w-0 pt-1 text-white">
          <div className="truncate text-sm font-semibold">{title}</div>
          {count > 1 && <div className="text-xs text-white/70">{index + 1} / {count}</div>}
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          <RoundButton label="Zoom out" onClick={() => zoomTo(t.scale / 1.5)} className="hidden sm:flex" disabled={!zoomed}>
            <ZoomOut className="h-5 w-5" />
          </RoundButton>
          <RoundButton label="Zoom in" onClick={() => zoomTo(t.scale * 1.5)} className="hidden sm:flex" disabled={t.scale >= MAX_SCALE}>
            <ZoomIn className="h-5 w-5" />
          </RoundButton>
          <RoundButton label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </RoundButton>
        </div>
      </div>

      {/* Prev / next */}
      {count > 1 && (
        <>
          <RoundButton label="Previous photo" onClick={() => onChange(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 sm:left-4">
            <ChevronLeft className="h-6 w-6" />
          </RoundButton>
          <RoundButton label="Next photo" onClick={() => onChange(1)} className="absolute right-2 top-1/2 -translate-y-1/2 sm:right-4">
            <ChevronRight className="h-6 w-6" />
          </RoundButton>
        </>
      )}

      {/* Hint */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <span className="rounded-full bg-black/60 px-3 py-1.5 text-[11px] text-white/80 backdrop-blur-sm">
          {zoomed ? "Drag to move · tap to reset" : "Tap to zoom · pinch or scroll to zoom more"}
          {count > 1 && !zoomed ? " · swipe to browse" : ""}
        </span>
      </div>
    </div>,
    document.body
  );
}

function RoundButton({ children, label, onClick, className = "flex", disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`${className} pointer-events-auto h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors enabled:hover:bg-black/80 disabled:opacity-40`}
    >
      {children}
    </button>
  );
}
