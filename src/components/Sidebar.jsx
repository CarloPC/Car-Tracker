import { NavLink, useNavigate } from "react-router-dom";
import { Receipt, BarChart3, Car, LogOut, Gauge } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard", icon: Gauge, end: true },
  { to: "/entries", label: "Expenses", icon: Receipt },
  { to: "/statistics", label: "Statistics", icon: BarChart3 },
  { to: "/vehicles", label: "Vehicles", icon: Car },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <img src="/pwa-192x192.png" alt="Sakyanan" className="h-9 w-9 rounded-lg object-contain" />
        <div>
          <div className="font-display text-base font-semibold leading-none">Sakyanan</div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-ink-muted">Buy &amp; sell car ledger</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-surface-2 text-ink" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-4 w-4" style={{ color: isActive ? "var(--color-amber)" : undefined }} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mx-3 mb-4 mt-2 rounded-xl border border-border bg-surface-2 px-4 py-3">
        <div className="truncate text-xs text-ink-muted">
          Signed in as <span className="text-ink">{user?.displayName || user?.email}</span>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </div>
    </aside>
  );
}
