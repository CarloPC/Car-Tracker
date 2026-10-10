// Public sharing helpers.
//
// Shared vehicles are published as a *sanitized snapshot* in the top-level
// Firestore collection `publicVehicles/{vehicleId}`. It only holds what a buyer
// should see (specs, photos, availability, asking price) — never purchase price,
// expenses, sale price, profit, or plate number. The private data under
// users/{uid}/... is never exposed to guests.
import { useEffect, useRef, useState } from "react";
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { listCarPhotos } from "./supabase";
import { isSold } from "./calculations";

export function shareUrl(vehicleId) {
  return `${window.location.origin}/v/${vehicleId}`;
}

// One link that lists every car (bulk share)
export function garageUrl(ownerId) {
  return `${window.location.origin}/stock/${ownerId}`;
}

// Fields that are safe to show to the public
export function publicFieldsOf(v) {
  const sold = isSold(v);
  return {
    name: v.name ?? "",
    make: v.make ?? "",
    model: v.model ?? "",
    year: v.year ?? null,
    odometer: Number(v.odometer) || 0,
    color: v.color ?? "#f2a93b",
    bodyColor: v.bodyColor ?? "",
    transmission: v.transmission ?? "",
    fuelType: v.fuelType ?? "",
    description: v.description ?? "",
    sellingPrice: !sold && Number(v.sellingPrice) > 0 ? Number(v.sellingPrice) : null,
    status: sold ? "sold" : "available",
  };
}

// Put the chosen profile photo first, so the gallery opens on it
export function orderPhotos(photos, coverPath) {
  const list = [...photos];
  const i = list.findIndex((p) => p.path === coverPath);
  if (i > 0) list.unshift(list.splice(i, 1)[0]);
  return list;
}

// `bulk` = this vehicle also appears on the owner's all-stock link
export async function publishVehicle(uid, vehicle, bulk = false) {
  const photos = orderPhotos(await listCarPhotos(uid, vehicle.id), vehicle.coverPath);
  await setDoc(doc(db, "publicVehicles", vehicle.id), {
    ...publicFieldsOf(vehicle),
    ownerId: uid,
    bulk,
    photos: photos.map((p) => p.url),
    updatedAt: serverTimestamp(),
  });
}

export async function unpublishVehicle(vehicleId) {
  await deleteDoc(doc(db, "publicVehicles", vehicleId));
}

// Works for signed-out guests (needs the Firestore rule that allows public reads)
export async function fetchPublicVehicle(vehicleId) {
  const snap = await getDoc(doc(db, "publicVehicles", vehicleId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { id: snap.id, ...d, photos: (d.photos || []).map((url) => ({ url })) };
}

// ---- Bulk share: one link, all cars ----------------------------------------

// Live "is my stock link on?" state for the owner
export function useBulkShare(uid) {
  const [state, setState] = useState({ enabled: false, ready: false });
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, "publicGarages", uid),
      (snap) => setState({ enabled: snap.exists(), ready: true }),
      () => setState({ enabled: false, ready: true })
    );
  }, [uid]);
  return state;
}

export async function enableBulkShare(uid, vehicles) {
  // Publish every car first, then switch the link on
  for (let i = 0; i < vehicles.length; i += 4) {
    await Promise.all(vehicles.slice(i, i + 4).map((v) => publishVehicle(uid, v, true)));
  }
  await setDoc(doc(db, "publicGarages", uid), { ownerId: uid, updatedAt: serverTimestamp() });
}

export async function disableBulkShare(uid, vehicles) {
  await deleteDoc(doc(db, "publicGarages", uid)); // link dies immediately
  await Promise.all(
    vehicles.map((v) =>
      // cars that were also shared individually keep working at /v/<id>
      (v.shared ? publishVehicle(uid, v, false) : unpublishVehicle(v.id)).catch(() => {})
    )
  );
}

// Guest-side: all cars on an owner's stock link (null if the link is off)
export async function fetchPublicGarage(ownerId) {
  const garage = await getDoc(doc(db, "publicGarages", ownerId));
  if (!garage.exists()) return null;
  const snap = await getDocs(
    query(collection(db, "publicVehicles"), where("ownerId", "==", ownerId), where("bulk", "==", true))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, photos: (data.photos || []).map((url) => ({ url })) };
  });
}

// Clipboard with a fallback for older / non-secure browsers. Returns true on success.
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Keeps public snapshots fresh: when a published vehicle (shared, or any vehicle while
// bulk sharing is on) is edited, gets new photos, or a new vehicle is added, re-publish it.
// `photoTouch` = { vehicleId, version } — which vehicle's photos last changed.
export function useSharedVehicleSync(uid, vehicles, photoTouch, bulkEnabled, ready) {
  const seen = useRef(new Map());
  const knownIds = useRef(new Set());
  const baseline = useRef({ done: false, bulk: false });
  const timers = useRef(new Map());

  useEffect(() => {
    if (!uid || !ready) return;
    const rebaseline = !baseline.current.done || baseline.current.bulk !== bulkEnabled;

    vehicles.forEach((v) => {
      const isNew = !knownIds.current.has(v.id);
      if (!(v.shared || bulkEnabled)) {
        seen.current.delete(v.id);
        return;
      }
      const touched = photoTouch.vehicleId === v.id ? photoTouch.version : 0;
      const sig = JSON.stringify([publicFieldsOf(v), v.coverPath ?? null, touched]);
      const prev = seen.current.get(v.id);
      seen.current.set(v.id, sig);

      if (rebaseline) return; // first load, or bulk was just toggled (that action already published)
      const needsPublish = prev === undefined ? isNew && bulkEnabled : prev !== sig;
      if (!needsPublish) return;
      clearTimeout(timers.current.get(v.id));
      timers.current.set(
        v.id,
        setTimeout(() => publishVehicle(uid, v, bulkEnabled).catch((e) => console.error("Share sync failed", e)), 800)
      );
    });

    vehicles.forEach((v) => knownIds.current.add(v.id));
    baseline.current = { done: true, bulk: bulkEnabled };
  }, [uid, vehicles, photoTouch, bulkEnabled, ready]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);
}
