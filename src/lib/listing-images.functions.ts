import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Returns a short-lived signed URL for a listing photo, but only when that
 * exact object is referenced by an image of a currently active listing and
 * lives in that listing seller's upload folder. A reference alone is not authority.
 * This lets signed-out shoppers see ad photos without giving the anonymous
 * role blanket read access to the private `listings` bucket.
 */
export const signActiveListingImage = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    path: z.string().min(1).max(500).regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/[A-Za-z0-9_-][A-Za-z0-9._-]*)+$/,
    ),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error: lookupError } = await supabaseAdmin
      .from("listing_images")
      .select("url, listings!inner(status, seller_id)")
      .eq("url", data.path)
      .eq("listings.status", "active")
      // Upload RLS binds the first folder to the uploader's ID. Bind the
      // listing to that same seller, even if a forged reference already exists.
      .eq("listings.seller_id", data.path.split("/")[0])
      .limit(1);

    if (lookupError || !rows || rows.length === 0) return { url: null as string | null };

    const { data: signed } = await supabaseAdmin.storage
      .from("listings")
      .createSignedUrl(data.path, 600);

    return { url: signed?.signedUrl ?? null };
  });
