import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Gauge, Loader2, LinkIcon } from "lucide-react";
import { fetchPublicVehicle } from "../lib/sharing";
import { useAuth } from "../context/AuthContext";
import VehicleDetailsModal from "../components/VehicleDetailsModal";

// Public, no-login view of one shared vehicle at /v/:id. Guests get a read-only
// gallery + the interactive price calculator, and never see costs or edit controls.
export default function PublicVehicle() {
  const { id } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchPublicVehicle(id)
      .then((v) => !cancelled && setState(v ? { status: "ready", vehicle: v } : { status: "missing" }))
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [id]);

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
          <Loader2 className="h-4 w-4 animate-spin" /> Loading vehicle…
        </div>
      )}

      {(state.status === "missing" || state.status === "error") && (
        <div className="mx-auto max-w-sm px-6 py-24 text-center">
          <LinkIcon className="mx-auto mb-3 h-8 w-8 text-ink-faint" />
          <h1 className="font-display text-lg font-semibold">
            {state.status === "missing" ? "This link isn't available" : "Couldn't load this vehicle"}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {state.status === "missing"
              ? "The owner may have stopped sharing it, or the link is incorrect."
              : "Please check your connection and try again."}
          </p>
        </div>
      )}

      {state.status === "ready" && (
        <VehicleDetailsModal vehicle={state.vehicle} photos={state.vehicle.photos} isPublicView />
      )}
    </div>
  );
}
