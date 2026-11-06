// Link-visit tracking.
//
// Every successful open of a public page (/stock/:ownerId or /v/:id) is saved as one doc at
//   linkVisits/{ownerId}/visits/{autoId}
// Guests can only CREATE these docs (rules validate the shape). Only the owner can read/delete them.
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

const DEDUPE_MINUTES = 30; // same tab + same page within this window = one visit (stops refresh spam / StrictMode double-run)
const MAX_VISITS_SHOWN = 500;

// ---- Device ---------------------------------------------------------------

export function parseUserAgent(ua = "") {
  let deviceType = "desktop";
  if (/bot|crawl|spider|facebookexternalhit|preview/i.test(ua)) deviceType = "bot";
  else if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) deviceType = "tablet";
  else if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) deviceType = "mobile";
  // iPadOS pretends to be a Mac, but has a touchscreen
  if (deviceType === "desktop" && /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1) deviceType = "tablet";

  let os = "Unknown";
  if (/Android/i.test(ua)) os = `Android ${(ua.match(/Android\s([\d.]+)/i) || [])[1] || ""}`.trim();
  else if (/iPhone|iPad|iPod/i.test(ua)) os = `iOS ${((ua.match(/OS\s([\d_]+)/i) || [])[1] || "").replace(/_/g, ".")}`.trim();
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  // In-app browsers first: a link opened from Messenger/Facebook is a very different click than Chrome
  let browser = "Unknown";
  if (/MessengerLite|Orca-Android|MessengerForiOS/i.test(ua)) browser = "Messenger app";
  else if (/FBAN|FBAV|FB_IAB/i.test(ua)) browser = "Facebook app";
  else if (/Instagram/i.test(ua)) browser = "Instagram app";
  else if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) browser = "TikTok app";
  else if (/\bLine\//i.test(ua)) browser = "LINE app";
  else if (/Viber/i.test(ua)) browser = "Viber app";
  else if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox";
  else if (/Chrome|CriOS/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";

  // Android model string, e.g. "SM-A546E"
  const model = (ua.match(/Android[\d.\s]*;\s*([^;)]+?)(?:\sBuild|[;)])/i) || [])[1]?.trim() || "";

  return { deviceType, os, browser, model };
}

// Anonymous per-browser id, so repeat visitors can be told apart from new ones
function getVisitorId() {
  try {
    let id = localStorage.getItem("sk_vid");
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("sk_vid", id);
    }
    return id;
  } catch {
    return "";
  }
}

// ---- Location (free IP lookup, no API key) ---------------------------------

async function fetchJson(url, ms = 3500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const EMPTY_GEO = { ip: "", country: "", countryCode: "", region: "", city: "", isp: "", timezone: "", lat: null, lng: null };

async function lookupLocation() {
  // Cached for the tab session so we don't burn the free-tier quota on every page open
  try {
    const cached = sessionStorage.getItem("sk_geo2");
    if (cached) return JSON.parse(cached);
  } catch { /* ignore */ }

  let geo = null;
  try {
    const d = await fetchJson("https://ipwho.is/");
    if (d?.success !== false && d?.ip) {
      geo = {
        ip: d.ip || "",
        country: d.country || "",
        countryCode: d.country_code || "",
        region: d.region || "",
        city: d.city || "",
        isp: d.connection?.isp || "",
        timezone: d.timezone?.id || "",
        lat: typeof d.latitude === "number" ? d.latitude : null,
        lng: typeof d.longitude === "number" ? d.longitude : null,
      };
    }
  } catch { /* fall back below */ }

  if (!geo) {
    try {
      const d = await fetchJson("https://ipapi.co/json/");
      if (d?.ip && !d.error) {
        geo = {
          ip: d.ip || "",
          country: d.country_name || "",
          countryCode: d.country_code || "",
          region: d.region || "",
          city: d.city || "",
          isp: d.org || "",
          timezone: d.timezone || "",
          lat: typeof d.latitude === "number" ? d.latitude : null,
          lng: typeof d.longitude === "number" ? d.longitude : null,
        };
      }
    } catch { /* give up, still log the device data */ }
  }

  geo = geo || EMPTY_GEO;
  try {
    if (geo.ip) sessionStorage.setItem("sk_geo2", JSON.stringify(geo));
  } catch { /* ignore */ }
  return geo;
}

// ---- Logging (guest-side) ---------------------------------------------------

const clip = (v, n) => String(v ?? "").slice(0, n);

/**
 * Record one visit. Never throws and never blocks the page: tracking must not break sharing.
 * page: "garage" | "vehicle"; targetId: ownerId (garage) or vehicleId (vehicle).
 */
export async function logVisit({ ownerId, page, targetId, label = "", viewerUid = null }) {
  if (!ownerId || !page || !targetId) return;

  // De-dupe (also covers React StrictMode running effects twice in dev)
  const key = `sk_visit:${page}:${targetId}`;
  try {
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last < DEDUPE_MINUTES * 60 * 1000) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch { /* storage blocked: just log */ }

  try {
    const ua = navigator.userAgent || "";
    const geo = await lookupLocation();
    const hasCoords = Number.isFinite(geo.lat) && Number.isFinite(geo.lng);
    let referrer = "";
    try {
      referrer = document.referrer ? new URL(document.referrer).hostname : "";
    } catch { /* ignore */ }

    const ref = await addDoc(collection(db, "linkVisits", ownerId, "visits"), {
      ownerId,
      page,
      targetId: clip(targetId, 128),
      label: clip(label, 120),
      createdAt: serverTimestamp(),
      visitorId: getVisitorId(),
      isOwner: !!viewerUid && viewerUid === ownerId,
      ...parseUserAgent(ua),
      userAgent: clip(ua, 400),
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      language: clip(navigator.language, 20),
      referrer: clip(referrer, 100),
      ip: clip(geo.ip, 64),
      country: clip(geo.country, 80),
      countryCode: clip(geo.countryCode, 4),
      region: clip(geo.region, 80),
      city: clip(geo.city, 80),
      isp: clip(geo.isp, 120),
      timezone: clip(geo.timezone, 60),
      ...(hasCoords ? { lat: geo.lat, lng: geo.lng } : {}),
      locationSource: hasCoords ? "ip" : "none",
    });

    offerPreciseLocation(ref); // may show the opt-in banner, or silently upgrade if already allowed
  } catch (e) {
    console.warn("Visit tracking failed", e);
  }
}

// ---- Precise location (visitor opts in through the browser's own location prompt) ----
// IP lookups only reveal where the visitor's carrier/ISP routes traffic, which can be a different
// city entirely. The browser Geolocation API (GPS / Wi-Fi) is the only accurate source, and it
// always needs the visitor's permission.

let pendingRef = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(pendingRef));

// LocationPrompt subscribes to know when there's a fresh visit it can ask about
export function subscribePendingVisit(fn) {
  listeners.add(fn);
  fn(pendingRef);
  return () => listeners.delete(fn);
}

export function dismissPreciseLocation() {
  try {
    sessionStorage.setItem("sk_loc_dismissed", "1");
  } catch { /* ignore */ }
  pendingRef = null;
  emit();
}

async function offerPreciseLocation(ref) {
  if (!navigator.geolocation) return;
  let state = "prompt";
  try {
    state = (await navigator.permissions?.query({ name: "geolocation" }))?.state || "prompt";
  } catch { /* some browsers (older Safari) don't support this: treat as "prompt" */ }

  if (state === "denied") return;
  if (state === "granted") {
    // They already allowed it for this site, so no banner needed
    shareExactLocation(ref).catch(() => {});
    return;
  }
  try {
    if (sessionStorage.getItem("sk_loc_dismissed")) return;
  } catch { /* ignore */ }
  pendingRef = ref;
  emit();
}

// GPS coordinates -> readable place names (free, key-less, built for browser use)
async function reverseGeocode(lat, lng) {
  try {
    const d = await fetchJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    return {
      city: d.locality || d.city || "",
      region: d.principalSubdivision || "",
      country: d.countryName || "",
      countryCode: d.countryCode || "",
    };
  } catch {
    return null;
  }
}

// Asks the browser for the real position and upgrades the visit record with it.
// Rejects with the browser's error (code 1 = denied, 2 = unavailable, 3 = timed out).
export function shareExactLocation(ref) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(Object.assign(new Error("unsupported"), { code: 2 }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude, accuracy } = pos.coords;
          const place = await reverseGeocode(latitude, longitude);
          await updateDoc(ref, {
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy),
            locationSource: "gps",
            // The IP-based names described the carrier, not the visitor: replace them
            city: clip(place?.city, 80),
            region: clip(place?.region, 80),
            country: clip(place?.country, 80),
            countryCode: clip(place?.countryCode, 4),
          });
          pendingRef = null;
          emit();
          resolve(true);
        } catch (e) {
          reject(e);
        }
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

// ---- Admin-side -------------------------------------------------------------

// Live list of the signed-in owner's visits, newest first
export function useLinkVisits(uid) {
  const [state, setState] = useState({ visits: [], loading: true, error: null });

  useEffect(() => {
    if (!uid) return;
    setState({ visits: [], loading: true, error: null });
    const q = query(collection(db, "linkVisits", uid, "visits"), orderBy("createdAt", "desc"), limit(MAX_VISITS_SHOWN));
    return onSnapshot(
      q,
      (snap) =>
        setState({
          visits: snap.docs.map((d) => {
            const data = d.data({ serverTimestamps: "estimate" });
            return { id: d.id, ...data, date: data.createdAt?.toDate?.() ?? null };
          }),
          loading: false,
          error: null,
        }),
      (error) => setState({ visits: [], loading: false, error })
    );
  }, [uid]);

  return state;
}

export async function deleteVisit(uid, visitId) {
  await deleteDoc(doc(db, "linkVisits", uid, "visits", visitId));
}

export async function clearAllVisits(uid) {
  const col = collection(db, "linkVisits", uid, "visits");
  // Firestore batches max out at 500 writes
  for (;;) {
    const snap = await getDocs(query(col, limit(400)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}