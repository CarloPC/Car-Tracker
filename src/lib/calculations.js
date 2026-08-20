// All calculation helpers here work off vehicles + entries (expenses), where
// each vehicle carries its own purchasePrice / salePrice, and entries are
// running expenses logged against a vehicle while you own it.
import { categoryLabel } from "./constants";

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function isSold(vehicle) {
  return vehicle.salePrice !== undefined && vehicle.salePrice !== null && vehicle.salePrice !== "";
}

export function vehicleExpenseTotal(entries, vehicleId) {
  return entries.filter((e) => e.vehicleId === vehicleId).reduce((s, e) => s + num(e.amount), 0);
}

// Per-vehicle breakdown: what you paid, what you've spent on it, what you sold it for (if sold).
export function vehicleStats(vehicle, entries) {
  const purchasePrice = num(vehicle.purchasePrice);
  const expenses = vehicleExpenseTotal(entries, vehicle.id);
  const sold = isSold(vehicle);
  const salePrice = sold ? num(vehicle.salePrice) : null;
  const invested = purchasePrice + expenses;
  const profit = sold ? salePrice - invested : null;
  return { purchasePrice, expenses, invested, sold, salePrice, profit };
}

// Portfolio-wide roll-up across a set of vehicles (already scoped by the caller).
export function portfolioTotals(vehicles, entries) {
  let bought = 0;
  let expenses = 0;
  let sold = 0;
  let profit = 0;
  let soldCount = 0;
  let stockCount = 0;
  let invested = 0; // cost basis still tied up in unsold cars

  for (const v of vehicles) {
    const s = vehicleStats(v, entries);
    bought += s.purchasePrice;
    expenses += s.expenses;
    if (s.sold) {
      sold += s.salePrice;
      profit += s.profit;
      soldCount += 1;
    } else {
      invested += s.invested;
      stockCount += 1;
    }
  }

  return { bought, expenses, sold, profit, soldCount, stockCount, invested };
}

export function byCategory(entries) {
  const map = new Map();
  for (const e of entries) {
    map.set(e.category, (map.get(e.category) || 0) + num(e.amount));
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

// Buckets bought / sold / expense activity into calendar months for the last
// `months` months (inclusive of current). Bought/sold use the vehicle's
// purchaseDate/saleDate; expenses use the entry date.
export function monthlySeries(vehicles, entries, months = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      bought: 0,
      sold: 0,
      expense: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  for (const v of vehicles) {
    const boughtKey = v.purchaseDate?.slice(0, 7);
    const boughtBucket = byKey.get(boughtKey);
    if (boughtBucket) boughtBucket.bought += num(v.purchasePrice);

    if (isSold(v)) {
      const soldKey = (v.saleDate || v.purchaseDate)?.slice(0, 7);
      const soldBucket = byKey.get(soldKey);
      if (soldBucket) soldBucket.sold += num(v.salePrice);
    }
  }

  for (const e of entries) {
    const key = e.date?.slice(0, 7);
    const bucket = byKey.get(key);
    if (bucket) bucket.expense += num(e.amount);
  }

  return buckets.map((b) => ({ ...b, net: b.sold - b.bought - b.expense }));
}

// A unified, date-sorted feed mixing "bought", "sold", and expense events —
// used for the dashboard's recent activity list.
export function activityFeed(vehicles, entries, limit = 6) {
  const items = [];

  for (const v of vehicles) {
    if (v.purchaseDate) {
      items.push({
        id: `${v.id}-bought`,
        date: v.purchaseDate,
        kind: "bought",
        label: `Bought ${v.name}`,
        amount: num(v.purchasePrice),
        vehicleId: v.id,
      });
    }
    if (isSold(v) && v.saleDate) {
      items.push({
        id: `${v.id}-sold`,
        date: v.saleDate,
        kind: "sold",
        label: `Sold ${v.name}`,
        amount: num(v.salePrice),
        vehicleId: v.id,
      });
    }
  }

  for (const e of entries) {
    items.push({
      id: e.id,
      date: e.date,
      kind: "expense",
      label: e.note?.trim() || categoryLabel(e.category),
      amount: num(e.amount),
      vehicleId: e.vehicleId,
      category: e.category,
    });
  }

  return items.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
}

export function inRange(date, start, end) {
  if (!start && !end) return true;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

// 0..1 "health" score for the gauge — 0.5 is break-even, 1 is strongly profitable,
// 0 is heavily in the red. Based on realized profit vs. cost basis of sold cars.
export function profitScore({ sold, profit }) {
  if (sold === 0) return 0.5;
  const margin = profit / sold; // roughly -1..1 in normal cases
  return Math.min(1, Math.max(0, 0.5 + margin / 2));
}
