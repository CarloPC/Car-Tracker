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
  // Projected ("if I sell at...") numbers for unsold cars with a selling price set
  const sellingPrice = !sold && num(vehicle.sellingPrice) > 0 ? num(vehicle.sellingPrice) : null;
  const projectedProfit = sellingPrice !== null ? sellingPrice - invested : null;
  return { purchasePrice, expenses, invested, sold, salePrice, profit, sellingPrice, projectedProfit };
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
  let projectedRevenue = 0; // selling prices set on unsold cars
  let projectedProfit = 0;
  let projectedCount = 0;

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
      if (s.sellingPrice !== null) {
        projectedRevenue += s.sellingPrice;
        projectedProfit += s.projectedProfit;
        projectedCount += 1;
      }
    }
  }

  return { bought, expenses, sold, profit, soldCount, stockCount, invested, projectedRevenue, projectedProfit, projectedCount };
}

// ---------------------------------------------------------------------------
// Cash-recycling ("Net Capital") mode
//
// The classic total (bought + expenses) assumes every purchase is paid from
// fresh money. In a buy-and-sell business, proceeds from a sale are used to
// buy the next car, so the *own money* you actually need is smaller.
//
// We replay every cash movement in date order against a running cash balance
// that starts at 0:
//   purchase / expense  -> balance goes down
//   sale                -> balance goes up
// The deepest the balance ever dips below zero is the peak capital you had to
// put in yourself. Example: buy A (300k + 30k expenses) -> -330k; sell A for
// 400k -> +70k; buy B for 400k -> -330k. Peak capital = 330k, not 730k.
// ---------------------------------------------------------------------------
export const CAPITAL_MODES = {
  CUMULATIVE: "cumulative",
  RECYCLING: "recycling",
};

export function capitalFlow(vehicles, entries) {
  const ids = new Set(vehicles.map((v) => v.id));
  const soldDate = new Map();
  for (const v of vehicles) {
    if (isSold(v)) soldDate.set(v.id, v.saleDate || "9999-12-31"); // undated sale: assume latest, so it never funds anything earlier
  }

  const events = [];
  const outflow = (vehicleId, date, amount) => {
    if (amount <= 0) return;
    // rank 0: costs of a car that is sold the same day (must precede its own sale)
    // rank 2: any other cost (comes after same-day sale proceeds, so proceeds can fund it)
    const rank = soldDate.get(vehicleId) === date ? 0 : 2;
    events.push({ date, rank, delta: -amount });
  };

  for (const v of vehicles) {
    outflow(v.id, v.purchaseDate || "", num(v.purchasePrice));
    if (soldDate.has(v.id)) {
      events.push({ date: soldDate.get(v.id), rank: 1, delta: num(v.salePrice) });
    }
  }
  for (const e of entries) {
    if (!ids.has(e.vehicleId)) continue;
    outflow(e.vehicleId, e.date || "", num(e.amount));
  }

  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.rank - b.rank));

  let balance = 0;
  let peak = 0;
  let cumulative = 0;
  for (const ev of events) {
    balance += ev.delta;
    if (ev.delta < 0) cumulative -= ev.delta;
    if (-balance > peak) peak = -balance;
  }

  return {
    peakCapital: peak, // own money needed at the worst moment
    cumulative, // old-style total: every purchase + expense stacked up
    recycled: Math.max(0, cumulative - peak), // spending that was funded by earlier sales
    outstanding: Math.max(0, -balance), // own money still out right now
    surplus: Math.max(0, balance), // cash on hand beyond what you put in
  };
}

// The figure shown as "total spent / capital" for the chosen mode.
export function capitalTotal(vehicles, entries, mode) {
  const f = capitalFlow(vehicles, entries);
  return mode === CAPITAL_MODES.RECYCLING ? f.peakCapital : f.cumulative;
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
