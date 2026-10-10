import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base text-ink-muted">
        <div className="text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    // Shared links like /vehicles?vehicleId=abc (or ?sharedId=abc) go to the public
    // view-only page instead of the login screen.
    const params = new URLSearchParams(location.search);
    const sharedId = params.get("vehicleId") || params.get("sharedId");
    if (sharedId) return <Navigate to={`/v/${encodeURIComponent(sharedId)}`} replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}
