import { NavLink } from "react-router-dom";
import { Gauge, Receipt, BarChart3, Car } from "lucide-react";

const links = [
  { to: "/", label: "Home", icon: Gauge, end: true },
  { to: "/entries", label: "Expenses", icon: Receipt },
  { to: "/statistics", label: "Stats", icon: BarChart3 },
  { to: "/vehicles", label: "Vehicles", icon: Car },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium"
        >
          {({ isActive }) => (
            <>
              <Icon
                className="h-5 w-5"
                style={{ color: isActive ? "var(--color-amber)" : "var(--color-ink-muted)" }}
              />
              <span style={{ color: isActive ? "var(--color-ink)" : "var(--color-ink-muted)" }}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}