import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET = "car-photos";

/**
 * Shrink big phone photos before upload (faster, avoids size limits).
 * Falls back to the original file if the browser can't decode it.
 */
async function compressImage(file, maxSize = 1920, quality = 0.85) {
  try {
    if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) { bitmap.close?.(); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return blob;
  } catch {
    return file;
  }
}

function uniqueId() {
  return (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
}

/**
 * Upload one File to Supabase Storage.
 * Path: {userId}/{vehicleId}/{timestamp}-{uuid}.{ext}  (unique even for bulk uploads)
 * Returns { url, path, name }.
 */
export async function uploadCarPhoto(userId, vehicleId, file) {
  const body = await compressImage(file);
  const isJpeg = body !== file;
  const rawExt = (file.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ext = isJpeg ? "jpg" : rawExt || "jpg";
  const name = `${Date.now()}-${uniqueId()}.${ext}`;
  const path = `${userId}/${vehicleId}/${name}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    cacheControl: "3600",
    upsert: false,
    contentType: isJpeg ? "image/jpeg" : file.type || undefined,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path, name };
}

/**
 * List all photos for a vehicle.
 * Returns array of { url, path, name } objects.
 */
export async function listCarPhotos(userId, vehicleId) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(`${userId}/${vehicleId}`, { limit: 1000, sortBy: { column: "created_at", order: "asc" } });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  return data.filter((f) => f.name && f.name !== ".emptyFolderPlaceholder").map((f) => {
    const path = `${userId}/${vehicleId}/${f.name}`;
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: urlData.publicUrl, path, name: f.name };
  });
}

/**
 * Delete a single photo by its storage path.
 */
export async function deleteCarPhoto(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

/**
 * Cover photo = the first photo uploaded for the vehicle (oldest).
 * Returns a public URL string, or null if the vehicle has no photos.
 */
export async function getCoverPhotoUrl(userId, vehicleId) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(`${userId}/${vehicleId}`, { limit: 5, sortBy: { column: "created_at", order: "asc" } });
  if (error) throw error;
  const first = (data || []).find((f) => f.name && f.name !== ".emptyFolderPlaceholder");
  if (!first) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(`${userId}/${vehicleId}/${first.name}`).data.publicUrl;
}
