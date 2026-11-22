import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { photoPathSchema, publicPhotoUrl } from "./public-photo";

/**
 * Returns a revalidated delivery URL for a profile photo, but only when that
 * exact object is referenced by its owner's profile and lives in that owner's
 * upload folder. A reference on someone else's profile is not authority.
 * This lets shoppers see seller avatars without giving broad read access
 * to the private `avatars` bucket.
 */
export const signAvatarImage = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ path: photoPathSchema }).parse(data))
  .handler(async ({ data }) => {
    const { authorizedPhotoClient } = await import("./public-photo.server");
    const allowed = await authorizedPhotoClient("avatars", data.path);
    return { url: allowed ? publicPhotoUrl("avatars", data.path) : null };
  });
