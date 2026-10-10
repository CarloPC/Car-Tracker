import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import NumberField from "./NumberField";
import { formatMoney } from "../lib/constants";

// Interactive price tester for buyers — Cash or Swap.
// - Cash: tweak the price and see the total (and how far it is from the listed price).
// - Swap: enter what your own car is worth and see the cash to top up (or cash back).
// Uses only the public asking price.
export default function PriceCalculator({ listedPrice }) {
  const base = Number(listedPrice) > 0 ? Number(listedPrice) : 0;
  const [mode, setMode] = useState("cash");
  const [price, setPrice] = useState(base ? String(base) : "");
  const [tradeIn, setTradeIn] = useState("");

  useEffect(() => {
    setPrice(base ? String(base) : "");
  }, [base]);

  const p = Number(price) || 0;
  const t = Number(tradeIn) || 0;
  const diff = base ? p - base : 0;
  const topUp = p - t; // >0: buyer adds cash, <0: buyer gets cash back

  const setByPct = (pct) => base && setPrice(String(Math.round(base * (1 + pct / 100))));

  return (
    <div className="rounded-2xl border border-border bg-surface-2/50 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        <Calculator className="h-3.5 w-3.5" /> Price calculator
      </div>

      {/* Cash / Swap toggle */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-base/60 p-1 text-xs font-semibold">
        {[["cash", "Cash"], ["swap", "Swap"]].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className="rounded-md py-2 transition-colors"
            style={mode === id ? { backgroundColor: "var(--color-amber)", color: "#14171c" } : { color: "var(--color-ink-muted)" }}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-ink-muted">Vehicle price (₱)</label>
      <NumberField value={price} onChange={setPrice} placeholder="Enter a price" />
      {base > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[[-10, "−10%"], [-5, "−5%"], [0, "Listed"], [5, "+5%"]].map(([pct, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setByPct(pct)}
              className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-ink-faint hover:text-ink"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === "cash" ? (
        <div className="mt-4 rounded-xl bg-base/60 p-4 text-center">
          <div className="text-[11px] uppercase tracking-wider text-ink-muted">Total cash price</div>
          <div className="font-display text-2xl font-semibold" style={{ color: "var(--color-amber)" }}>{formatMoney(p)}</div>
          {base > 0 && diff !== 0 && (
            <div className="mt-1 font-mono text-xs" style={{ color: diff < 0 ? "var(--color-teal)" : "var(--color-coral)" }}>
              {diff < 0 ? "−" : "+"}{formatMoney(Math.abs(diff))} vs listed price
            </div>
          )}
        </div>
      ) : (
        <>
          <label className="mb-1.5 mt-4 block text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            Your car's trade-in value (₱)
          </label>
          <NumberField value={tradeIn} onChange={setTradeIn} placeholder="e.g. 250,000" />

          <div className="mt-4 rounded-xl bg-base/60 p-4 text-center">
            {p > 0 && t > 0 && topUp === 0 ? (
              <>
                <div className="text-[11px] uppercase tracking-wider text-ink-muted">Even swap</div>
                <div className="font-display text-2xl font-semibold" style={{ color: "var(--color-teal)" }}>No cash needed</div>
              </>
            ) : (
              <>
                <div className="text-[11px] uppercase tracking-wider text-ink-muted">
                  {t > 0 && topUp < 0 ? "Cash you'd receive" : "Cash to add on top"}
                </div>
                <div
                  className="font-display text-2xl font-semibold"
                  style={{ color: t > 0 && topUp < 0 ? "var(--color-teal)" : "var(--color-amber)" }}
                >
                  {formatMoney(Math.abs(t > 0 ? topUp : p))}
                </div>
              </>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-[11px]">
              <div>
                <dt className="text-ink-muted">Vehicle price</dt>
                <dd className="font-mono">{formatMoney(p)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Your trade-in</dt>
                <dd className="font-mono">−{formatMoney(t)}</dd>
              </div>
            </dl>
          </div>
        </>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">
        Estimate only. Final price and swap terms are set by the seller.
      </p>
    </div>
  );
}
