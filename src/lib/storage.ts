import { supabase } from "@/integrations/supabase/client";

const MAX_DIM = 1600;
const QUALITY = 0.82;

// Client-side compress/resize to keep uploads fast on Afghan mobile networks.
async function compress(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > MAX_DIM || height > MAX_DIM) {
      const scale = MAX_DIM / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", QUALITY),
    );
  } catch {
    return file;
  }
}

// Uploads a file and returns the stored object path (folder must start with userId for RLS).
export async function uploadImage(bucket: string, userId: string, folder: string, file: File): Promise<string> {
  const blob = await compress(file);
  const ext = "jpg";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    cacheControl: "3600",
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

// Uploads a private chat image into the `chat-images` bucket under
// `<conversation_id>/<uploader_uid>/<uuid>.jpg`, matching the storage RLS policies
// that restrict reads/writes to the two conversation participants.
export async function uploadChatImage(conversationId: string, userId: string, file: File): Promise<string> {
  const blob = await compress(file);
  const path = `${conversationId}/${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("chat-images").upload(path, blob, {
    cacheControl: "3600",
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

// Resolves a stored path to a displayable URL. Works with public buckets.
export function imageUrl(bucket: string, path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export const listingImg = (path?: string | null) => imageUrl("listings", path);
export const avatarImg = (path?: string | null) => imageUrl("avatars", path);
