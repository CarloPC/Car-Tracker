import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET = "car-photos";

/**
 * Upload one File to Supabase Storage.
 * Path: {userId}/{vehicleId}/{timestamp}-{filename}
 * Returns the public URL string.
 */
export async function uploadCarPhoto(userId, vehicleId, file) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${vehicleId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/**
 * List all photos for a vehicle.
 * Returns array of { url, path, name } objects.
 */
export async function listCarPhotos(userId, vehicleId) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(`${userId}/${vehicleId}`, { sortBy: { column: "created_at", order: "asc" } });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  return data.map((f) => {
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