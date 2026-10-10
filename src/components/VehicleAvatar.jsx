import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import { getCoverPhotoUrl, getPhotoUrl } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// Remember covers between renders/navigation so avatars don't flash on every visit
const coverCache = new Map(); // vehicleId -> url | null

// Round-cornered profile picture for a vehicle: its first uploaded photo,
// or the colored gauge icon if it has no photos yet.
// `refreshKey` — change it to re-check the cover (e.g. after photos were added/removed).
export default function VehicleAvatar({ vehicle, refreshKey = 0, size = 48, onClick }) {
  const { user } = useAuth();
  const [url, setUrl] = useState(coverCache.get(vehicle.id) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // A photo the user explicitly chose as profile wins over "first uploaded"
    if (vehicle.coverPath) {
      const u = getPhotoUrl(vehicle.coverPath);
      coverCache.set(vehicle.id, u);
      setUrl(u);
      setFailed(false);
      return;
    }
    let cancelled = false;
    getCoverPhotoUrl(user.uid, vehicle.id)
      .then((u) => {
        coverCache.set(vehicle.id, u);
        if (!cancelled) { setUrl(u); setFailed(false); }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user.uid, vehicle.id, vehicle.coverPath, refreshKey]);

  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      title={onClick ? "View photos" : undefined}
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl"
      style={{
        width: size,
        height: size,
        backgroundColor: `${vehicle.color}22`,
        boxShadow: `0 0 0 2px ${vehicle.color}`,
      }}
    >
      {url && !failed ? (
        <img
          src={url}
          alt={vehicle.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Gauge style={{ color: vehicle.color, width: size * 0.45, height: size * 0.45 }} />
      )}
    </Tag>
  );
}
