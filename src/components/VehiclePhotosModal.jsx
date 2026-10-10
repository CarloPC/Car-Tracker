import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Upload, Trash2, ImageOff, Loader2, Star } from "lucide-react";
import { uploadCarPhoto, listCarPhotos, deleteCarPhoto } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";

export default function VehiclePhotosModal({ vehicle: vehicleProp, onClose }) {
  const { user } = useAuth();
  const { vehicles, updateVehicle } = useData();
  // Use the live vehicle so the "profile" state updates right after saving
  const vehicle = vehicles.find((v) => v.id === vehicleProp.id) || vehicleProp;
  const [settingCover, setSettingCover] = useState(false);
  const fileInputRef = useRef(null);

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dragging, setDragging] = useState(false);

  // Load photos on open
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listCarPhotos(user.uid, vehicle.id)
      .then((list) => { if (!cancelled) { setPhotos(list); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [user.uid, vehicle.id]);

  // Keep activeIndex in bounds when photos change
  useEffect(() => {
    if (photos.length === 0) { setActiveIndex(0); return; }
    setActiveIndex((i) => Math.min(i, photos.length - 1));
  }, [photos.length]);

  function prev() {
    setActiveIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
  }
  function next() {
    setActiveIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
  }

  // Keyboard navigation
  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") { if (lightbox) setLightbox(false); else onClose(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []).filter(
      (f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(f.name)
    );
    if (!files.length) return;
    setError("");
    setUploading(true);
    setProgress({ done: 0, total: files.length });

    const results = new Array(files.length);
    const failed = [];
    let nextIdx = 0;
    let done = 0;

    // Upload 3 at a time; one failure doesn't cancel the rest
    async function worker() {
      while (nextIdx < files.length) {
        const i = nextIdx++;
        try {
          results[i] = await uploadCarPhoto(user.uid, vehicle.id, files[i]);
        } catch (err) {
          failed.push(`${files[i].name}: ${err.message}`);
        }
        done++;
        setProgress({ done, total: files.length });
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));

    const uploaded = results.filter(Boolean);
    if (uploaded.length) {
      setPhotos((prev) => {
        setActiveIndex(prev.length); // jump to first new photo
        return [...prev, ...uploaded];
      });
    }
    if (failed.length) {
      setError(`${failed.length} of ${files.length} failed. ${failed[0]}`);
    }
    setUploading(false);
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-selecting same files
    uploadFiles(files);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    uploadFiles(e.dataTransfer?.files);
  }

  async function handleDelete() {
    const photo = photos[activeIndex];
    if (!photo) return;
    if (!confirm("Delete this photo?")) return;
    try {
      await deleteCarPhoto(photo.path);
      if (vehicle.coverPath === photo.path) await updateVehicle(vehicle.id, { coverPath: null });
      setPhotos((prev) => prev.filter((_, i) => i !== activeIndex));
    } catch (e) {
      setError("Delete failed: " + e.message);
    }
  }

  const currentPhoto = photos[activeIndex];
  // Profile = chosen photo, otherwise the first one uploaded
  const profilePath = photos.some((p) => p.path === vehicle.coverPath) ? vehicle.coverPath : photos[0]?.path;
  const isProfile = currentPhoto && currentPhoto.path === profilePath;

  async function handleSetProfile() {
    if (!currentPhoto || isProfile) return;
    setError("");
    setSettingCover(true);
    try {
      await updateVehicle(vehicle.id, { coverPath: currentPhoto.path });
    } catch (e) {
      setError("Couldn't set profile picture: " + e.message);
    } finally {
      setSettingCover(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <button aria-label="Close" onClick={onClose} className="absolute inset-0" />

        {/* Panel */}
        <div
          className="relative z-10 flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface shadow-2xl"
          style={{ maxHeight: "90vh", outline: dragging ? "2px dashed var(--color-amber)" : "none" }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
          onDrop={handleDrop}
        >
          {dragging && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/60 text-sm font-semibold text-white">
              Drop photos to upload
            </div>
          )}
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold">{vehicle.name}</h2>
              <p className="text-xs text-ink-muted">
                {loading ? "Loading…" : `${photos.length} photo${photos.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "var(--color-amber)", color: "#14171c" }}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {uploading ? `Uploading ${progress.done}/${progress.total}` : "Upload"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFiles}
              />
              <button onClick={onClose} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col items-center justify-center flex-1 overflow-hidden p-4 gap-4" style={{ minHeight: 0 }}>
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-16 text-ink-muted">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm">Loading photos…</span>
              </div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-ink-muted">
                <ImageOff className="h-10 w-10 opacity-30" />
                <p className="text-sm">No photos yet</p>
                <p className="text-xs opacity-70">Select many at once, or drag &amp; drop on desktop</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 rounded-lg px-4 py-2 text-sm font-semibold"
                  style={{ backgroundColor: "var(--color-amber)", color: "#14171c" }}
                >
                  Upload photos
                </button>
              </div>
            ) : (
              <>
                {/* Main image */}
                <div className="relative w-full overflow-hidden rounded-xl bg-surface-2" style={{ aspectRatio: "16/9" }}>
                  <img
                    src={currentPhoto.url}
                    alt={`Photo ${activeIndex + 1}`}
                    className="h-full w-full cursor-zoom-in object-cover transition-all"
                    onClick={() => setLightbox(true)}
                  />

                  {/* Prev / Next buttons */}
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={prev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={next}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  {/* Counter badge */}
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {activeIndex + 1} / {photos.length}
                  </span>

                  {/* Delete button */}
                  <button
                    onClick={handleDelete}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-red-500/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {/* Set as profile button (below delete) */}
                  <button
                    onClick={handleSetProfile}
                    disabled={isProfile || settingCover}
                    className="absolute right-2 top-12 flex h-8 items-center gap-1.5 rounded-full bg-black/50 px-2.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors enabled:hover:bg-black/70 disabled:cursor-default"
                    style={isProfile ? { color: "var(--color-amber)" } : undefined}
                  >
                    {settingCover ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Star className="h-3.5 w-3.5" fill={isProfile ? "currentColor" : "none"} />
                    )}
                    {isProfile ? "Profile" : "Set as profile"}
                  </button>
                </div>

                {/* Thumbnail strip */}
                {photos.length > 1 && (
                  <div className="flex w-full gap-2 overflow-x-auto pb-1">
                    {photos.map((p, i) => (
                      <button
                        key={p.path}
                        onClick={() => setActiveIndex(i)}
                        className="relative shrink-0 overflow-hidden rounded-lg transition-all"
                        style={{
                          width: 64,
                          height: 48,
                          outline: i === activeIndex ? "2px solid var(--color-amber)" : "2px solid transparent",
                          outlineOffset: "2px",
                          opacity: i === activeIndex ? 1 : 0.6,
                        }}
                      >
                        <img src={p.url} alt={`Thumb ${i + 1}`} className="h-full w-full object-cover" />
                        {p.path === profilePath && (
                          <Star className="absolute left-1 top-1 h-3 w-3" fill="var(--color-amber)" style={{ color: "var(--color-amber)" }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {error && (
              <p className="w-full rounded-lg bg-red-500/10 px-3 py-2 text-xs" style={{ color: "var(--color-coral)" }}>
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && currentPhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={currentPhoto.url}
            alt="Full size"
            className="max-h-full max-w-full rounded-xl object-contain cursor-zoom-out"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}