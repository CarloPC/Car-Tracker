import { useEffect, useState } from "react";
import { Check, Loader2, Tag } from "lucide-react";
import NumberField from "./NumberField";
import { useData } from "../context/DataContext";
import { formatMoney } from "../lib/constants";

// Live "if I sell at X" breakdown. Used inline on the card and inside the edit form.
export function ProfitPreview({ sellingPrice, invested }) {
  const price = Number(sellingPrice);
  if (!sellingPrice || !Number.isFinite(price) || price <= 0) return null;
  const profit = price - invested;
  const margin = invested > 0 ? (profit / invested) * 100 : 0;
  const color = profit >= 0 ? "var(--color-teal)" : "var(--color-coral)";

  return (
    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
      <Stat label="Revenue" value={formatMoney(price)} />
      <Stat label="Total cost" value={formatMoney(invested)} />
      <Stat
        label={profit >= 0 ? "Net profit" : "Net loss"}
        value={`${profit >= 0 ? "+" : "−"}${formatMoney(Math.abs(profit))}`}
        sub={`${margin >= 0 ? "+" : "−"}${Math.abs(margin).toFixed(1)}%`}
        color={color}
        strong
      />
    </div>
  );
}

function Stat({ label, value, sub, color, strong }) {
  return (
    <div className="min-w-0 rounded-lg bg-surface-2 px-1.5 py-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</div>
      <div
        className={`truncate font-mono text-xs ${strong ? "font-semibold" : ""}`}
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      {sub && <div className="font-mono text-[10px]" style={{ color }}>{sub}</div>}
    </div>
  );
}

// Inline editor on a vehicle card: type a price, profit updates instantly,
// and it auto-saves shortly after you stop typing.
export function SellingPriceEditor({ vehicle, invested }) {
  const { updateVehicle } = useData();
  const saved = vehicle.sellingPrice == null ? "" : String(vehicle.sellingPrice);
  const [draft, setDraft] = useState(saved);
  const [focused, setFocused] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error

  // Pick up remote changes when the user isn't typing
  useEffect(() => {
    if (!focused) setDraft(saved);
  }, [saved, focused]);

  // Debounced auto-save
  useEffect(() => {
    if (draft === saved) return;
    setStatus("saving");
    const t = setTimeout(async () => {
      try {
        const n = Number(draft);
        await updateVehicle(vehicle.id, { sellingPrice: draft === "" || !Number.isFinite(n) ? null : n });
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, saved]);

  useEffect(() => {
    if (status !== "saved") return;
    const t = setTimeout(() => setStatus("idle"), 1500);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface-2/40 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          <Tag className="h-3 w-3" /> Selling price
        </span>
        <span className="flex h-4 items-center text-[10px]" style={{ color: status === "error" ? "var(--color-coral)" : "var(--color-ink-muted)" }}>
          {status === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
          {status === "saved" && <Check className="h-3 w-3" style={{ color: "var(--color-teal)" }} />}
          {status === "error" && "Couldn't save"}
        </span>
      </div>
      <div onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
        <NumberField value={draft} onChange={setDraft} placeholder="Enter asking price (₱)" />
      </div>
      <ProfitPreview sellingPrice={draft} invested={invested} />
    </div>
  );
}
