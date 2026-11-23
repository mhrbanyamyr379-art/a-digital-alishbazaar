import { supabase } from "@/integrations/supabase/client";

const MAX_DIM = 1600;
const QUALITY = 0.82;

// Client-side compress/resize to keep uploads fast on Afghan mobile networks.
// WebP is ~40-60% smaller than JPEG; browsers that can't encode it fall back to JPEG.
async function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, QUALITY));
}

async function compress(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  const original = { blob: file as Blob, ext: "jpg", type: file.type || "image/jpeg" };
  if (!file.type.startsWith("image/")) return original;
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
    if (!ctx) return original;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const webp = await toBlob(canvas, "image/webp");
    if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp", type: "image/webp" };
    const jpeg = await toBlob(canvas, "image/jpeg");
    return jpeg ? { blob: jpeg, ext: "jpg", type: "image/jpeg" } : original;
  } catch {
    return original;
  }
}

// Uploads a file and returns the stored object path (folder must start with userId for RLS).
export async function uploadImage(bucket: string, userId: string, folder: string, file: File): Promise<string> {
  const { blob, ext, type } = await compress(file);
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    cacheControl: "3600",
    contentType: type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

// Uploads a private chat image into the `chat-images` bucket under
// `<conversation_id>/<uploader_uid>/<uuid>.jpg`, matching the storage RLS policies
// that restrict reads/writes to the two conversation participants.
export async function uploadChatImage(conversationId: string, userId: string, file: File): Promise<string> {
  const { blob, ext, type } = await compress(file);
  const path = `${conversationId}/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("chat-images").upload(path, blob, {
    cacheControl: "3600",
    contentType: type,
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
