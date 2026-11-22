import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { photoPathSchema, publicPhotoUrl } from "./public-photo";

/**
 * Returns a revalidated delivery URL for a listing photo, but only when that
 * exact object is referenced by an image of a currently active listing and
 * lives in that listing seller's upload folder. A reference alone is not authority.
 * This lets signed-out shoppers see ad photos without giving the anonymous
 * role blanket read access to the private `listings` bucket.
 */
export const signActiveListingImage = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ path: photoPathSchema }).parse(data))
  .handler(async ({ data }) => {
    const { authorizedPhotoClient } = await import("./public-photo.server");
    const allowed = await authorizedPhotoClient("listings", data.path);
    return { url: allowed ? publicPhotoUrl("listings", data.path) : null };
  });
