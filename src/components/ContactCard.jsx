import { Phone } from "lucide-react";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, CONTACT_FB_NAME, CONTACT_FB_URL } from "../lib/constants";

// "Contact us" card shown to buyers. On a phone, tapping the number opens the
// dialer with it already typed in — one more tap to call.
export default function ContactCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/50 p-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">Contact us</div>
      <p className="mb-4 text-sm text-ink-muted">Interested in this unit? Get in touch with the seller.</p>

      <a
        href={`tel:${CONTACT_PHONE_TEL}`}
        className="flex items-center gap-3 rounded-xl px-4 py-3.5 transition-transform active:scale-[0.98]"
        style={{ backgroundColor: "var(--color-amber)", color: "#14171c" }}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(20,23,28,0.12)" }}>
          <Phone className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-wider opacity-70">Tap to call</span>
          <span className="block font-display text-lg font-bold leading-tight">{CONTACT_PHONE_DISPLAY}</span>
        </span>
      </a>

      <a
        href={CONTACT_FB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2.5 flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:border-ink-faint"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(91,157,242,0.15)" }}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" style={{ color: "var(--color-blue)" }} aria-hidden="true">
            <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.7V21h2.8z" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Message on Facebook</span>
          <span className="block truncate text-sm font-semibold">{CONTACT_FB_NAME}</span>
        </span>
      </a>
    </div>
  );
}
