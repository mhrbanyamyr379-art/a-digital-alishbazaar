import { z } from "zod";

export const photoPathSchema = z.string().min(1).max(500).regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/[A-Za-z0-9_-][A-Za-z0-9._-]*)+$/,
);

export function publicPhotoUrl(bucket: "listings" | "avatars", path: string) {
  return `/api/public/photo?bucket=${bucket}&path=${encodeURIComponent(path)}`;
}

/** Public photos have a usable source on the first render, before effects run. */
export function immediatePhotoSource(bucket: "listings" | "avatars" | "chat-images", path?: string | null): string | null {
  if (!path) return null;
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  return bucket === "chat-images" ? null : publicPhotoUrl(bucket, path);
}