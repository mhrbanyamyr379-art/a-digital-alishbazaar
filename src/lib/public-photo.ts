import { z } from "zod";

export const photoPathSchema = z.string().min(1).max(500).regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/[A-Za-z0-9_-][A-Za-z0-9._-]*)+$/,
);

export function publicPhotoUrl(bucket: "listings" | "avatars", path: string) {
  return `/api/public/photo?bucket=${bucket}&path=${encodeURIComponent(path)}`;
}