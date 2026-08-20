import { Gauge } from "lucide-react";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4 py-10 text-ink">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg"
            style={{ background: "rgba(242,169,59,0.15)" }}
          >
            <Gauge className="h-6 w-6" style={{ color: "var(--color-amber)" }} />
          </div>
          <div className="font-display text-lg font-semibold leading-none">Mileway</div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-ink-muted">Buy &amp; sell car ledger</div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-2xl">
          <h1 className="font-display text-lg font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>

        {footer && <div className="mt-5 text-center text-sm text-ink-muted">{footer}</div>}
      </div>
    </div>
  );
}
