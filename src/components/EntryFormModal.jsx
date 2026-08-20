import { useState } from "react";
import Modal from "./Modal";
import NumberField from "./NumberField";
import { useData } from "../context/DataContext";
import { EXPENSE_CATEGORIES } from "../lib/constants";

const today = () => new Date().toISOString().slice(0, 10);

export default function EntryFormModal({ onClose, entry }) {
  const { vehicles, addEntry, updateEntry, deleteEntry, activeVehicleId } = useData();
  const isEdit = Boolean(entry);

  const [vehicleId, setVehicleId] = useState(
    entry?.vehicleId ?? (activeVehicleId !== "all" ? activeVehicleId : vehicles[0]?.id ?? "")
  );
  const [category, setCategory] = useState(entry?.category ?? EXPENSE_CATEGORIES[0].id);
  const [amount, setAmount] = useState(entry?.amount ?? "");
  const [date, setDate] = useState(entry?.date ?? today());
  const [note, setNote] = useState(entry?.note ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!vehicleId) return setError("Add a vehicle first, then log expenses against it.");
    if (!amount || Number(amount) <= 0) return setError("Enter an amount greater than zero.");
    if (!date) return setError("Pick a date.");

    const payload = {
      vehicleId,
      type: "expense",
      category,
      amount: Number(amount),
      date,
      note: note.trim(),
    };

    if (isEdit) updateEntry(entry.id, payload);
    else addEntry(payload);
    onClose();
  }

  return (
    <Modal title={isEdit ? "Edit expense" : "Log an expense"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Vehicle">
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="input">
            {vehicles.length === 0 && <option value="">No vehicles yet</option>}
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₱)">
            <NumberField value={amount} onChange={setAmount} placeholder="0.00" />
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </Field>
        </div>

        <Field label="Note (optional)">
          <input
            type="text"
            maxLength={140}
            placeholder="What was this for?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
          />
        </Field>

        {error && <p className="text-sm" style={{ color: "var(--color-coral)" }}>{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold"
            style={{ backgroundColor: "var(--color-amber)", color: "#14171c" }}
          >
            {isEdit ? "Save changes" : "Add expense"}
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={() => { deleteEntry(entry.id); onClose(); }}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold"
              style={{ borderColor: "var(--color-coral)", color: "var(--color-coral)" }}
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
