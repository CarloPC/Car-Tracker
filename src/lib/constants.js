// Expense categories — money spent getting a car ready to sell.
// Buying and selling prices live on the vehicle itself, not here.
export const EXPENSE_CATEGORIES = [
  { id: "repairs", label: "Repairs", color: "#f2545b" },
  { id: "maintenance", label: "Maintenance", color: "#5b9df2" },
  { id: "parts_accessories", label: "Parts & Accessories", color: "#3bb0f2" },
  { id: "detailing", label: "Detailing / Cleaning", color: "#4fd1a5" },
  { id: "tires", label: "Tires", color: "#8b92a3" },
  { id: "registration", label: "Registration & Fees", color: "#9b8cf2" },
  { id: "insurance", label: "Insurance", color: "#e879b9" },
  { id: "transport", label: "Transport / Towing", color: "#f2d13b" },
  { id: "fuel", label: "Fuel", color: "#f2a93b" },
  { id: "fines", label: "Fines", color: "#f26b3b" },
  { id: "other_expense", label: "Others", color: "#565d6d" },
];

export function categoryLabel(id) {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function categoryColor(id) {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.color ?? "#8b92a3";
}

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export const CURRENCY = "PHP";

export function formatMoney(value, currency = CURRENCY) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
