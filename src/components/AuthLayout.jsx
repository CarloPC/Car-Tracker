export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4 py-10 text-ink">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3">
            <img src="/pwa-192x192.png" alt="Sakyanan" className="h-11 w-11 rounded-lg object-contain" />
          </div>
          <div className="font-display text-lg font-semibold leading-none">Sakyanan</div>
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
