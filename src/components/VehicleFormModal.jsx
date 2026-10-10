import { useState } from "react";
import Modal from "./Modal";
import NumberField from "./NumberField";
import { useData } from "../context/DataContext";
import { ProfitPreview } from "./SellingPrice";

const SWATCHES = ["#f2a93b", "#4fd1a5", "#5b9df2", "#f2545b", "#9b8cf2", "#e879b9"];
const today = () => new Date().toISOString().slice(0, 10);

export default function VehicleFormModal({ onClose, vehicle }) {
  const { addVehicle, updateVehicle, deleteVehicle, entries } = useData();
  const isEdit = Boolean(vehicle);

  const [name, setName] = useState(vehicle?.name ?? "");
  const [make, setMake] = useState(vehicle?.make ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [year, setYear] = useState(vehicle?.year ?? "");
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [odometer, setOdometer] = useState(vehicle?.odometer ?? "");
  const [color, setColor] = useState(vehicle?.color ?? SWATCHES[0]);
  const [transmission, setTransmission] = useState(vehicle?.transmission ?? "");
  const [fuelType, setFuelType] = useState(vehicle?.fuelType ?? "");
  const [bodyColor, setBodyColor] = useState(vehicle?.bodyColor ?? "");
  const [description, setDescription] = useState(vehicle?.description ?? "");

  const [purchasePrice, setPurchasePrice] = useState(vehicle?.purchasePrice ?? "");
  const [purchaseDate, setPurchaseDate] = useState(vehicle?.purchaseDate ?? today());
  const [sellingPrice, setSellingPrice] = useState(vehicle?.sellingPrice ?? "");
  const [salePrice, setSalePrice] = useState(vehicle?.salePrice ?? "");
  const [saleDate, setSaleDate] = useState(vehicle?.saleDate ?? "");

  const [error, setError] = useState("");

  const invested =
    Number(purchasePrice || 0) + (vehicle ? entries.filter((e) => e.vehicleId === vehicle.id).reduce((t, e) => t + (Number(e.amount) || 0), 0) : 0);
  const usageCount = vehicle ? entries.filter((e) => e.vehicleId === vehicle.id).length : 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Give the vehicle a name, like “Toyota Vios ’18” or “Family Van”.");
    if (!purchasePrice || Number(purchasePrice) <= 0) return setError("Enter how much you bought this car for.");
    if (salePrice !== "" && Number(salePrice) < 0) return setError("Sale price can't be negative.");

    const payload = {
      name: name.trim(),
      make: make.trim(),
      model: model.trim(),
      year: year === "" ? undefined : Number(year),
      plate: plate.trim(),
      odometer: odometer === "" ? 0 : Number(odometer),
      color,
      transmission,
      fuelType,
      bodyColor: bodyColor.trim(),
      description: description.trim(),
      purchasePrice: Number(purchasePrice),
      purchaseDate: purchaseDate || today(),
      sellingPrice: sellingPrice === "" ? null : Number(sellingPrice),
      salePrice: salePrice === "" ? null : Number(salePrice),
      saleDate: salePrice === "" ? null : (saleDate || today()),
    };

    if (isEdit) updateVehicle(vehicle.id, payload);
    else addVehicle(payload);
    onClose();
  }

  return (
    <Modal title={isEdit ? "Edit vehicle" : "Add a vehicle"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Toyota Vios ’18" className="input" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Make">
            <input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota" className="input" />
          </Field>
          <Field label="Model">
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Vios" className="input" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Year">
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2018" className="input" />
          </Field>
          <Field label="Plate">
            <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="ABC-1234" className="input" />
          </Field>
        </div>

        <Field label="Odometer">
          <NumberField value={odometer} onChange={setOdometer} placeholder="38,250" allowDecimal={false} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Transmission">
            <select value={transmission} onChange={(e) => setTransmission(e.target.value)} className="input">
              <option value="">—</option>
              {["Automatic", "Manual", "CVT", "Semi-automatic"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Fuel type">
            <select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className="input">
              <option value="">—</option>
              {["Gasoline", "Diesel", "Hybrid", "Electric", "LPG"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Color (shown to buyers)">
          <input value={bodyColor} onChange={(e) => setBodyColor(e.target.value)} placeholder="Pearl White" className="input" />
        </Field>

        <Field label="Description / notes (shown to buyers)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Well maintained, complete papers, first owner…"
            className="input resize-none"
          />
        </Field>

        <div className="rounded-xl border border-border bg-surface-2 p-3.5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Purchase</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bought for (₱)">
              <NumberField value={purchasePrice} onChange={setPurchasePrice} placeholder="300,000" />
            </Field>
            <Field label="Purchase date">
              <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="input" />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-3.5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Selling price <span className="normal-case text-ink-faint">(asking / target — not sold yet)</span>
          </div>
          <NumberField value={sellingPrice} onChange={setSellingPrice} placeholder="400,000" />
          <ProfitPreview sellingPrice={sellingPrice} invested={invested} />
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-3.5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Sale <span className="normal-case text-ink-faint">(leave blank if still in stock)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sold for (₱)">
              <NumberField value={salePrice} onChange={setSalePrice} placeholder="Not sold yet" />
            </Field>
            <Field label="Sale date">
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                disabled={salePrice === ""}
                className="input disabled:opacity-50"
              />
            </Field>
          </div>
        </div>

        <Field label="Color tag">
          <div className="flex gap-2">
            {SWATCHES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Choose ${c}`}
                className="h-8 w-8 rounded-full transition-transform"
                style={{
                  backgroundColor: c,
                  outline: color === c ? "2px solid var(--color-ink)" : "none",
                  outlineOffset: "2px",
                  transform: color === c ? "scale(1.05)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </Field>

        {error && <p className="text-sm" style={{ color: "var(--color-coral)" }}>{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold"
            style={{ backgroundColor: "var(--color-amber)", color: "#14171c" }}
          >
            {isEdit ? "Save changes" : "Add vehicle"}
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={() => {
                if (usageCount > 0 && !confirm(`This vehicle has ${usageCount} logged expenses. Delete it and all of them?`)) return;
                deleteVehicle(vehicle.id);
                onClose();
              }}
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
