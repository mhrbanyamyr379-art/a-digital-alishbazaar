import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Returns a short-lived signed URL for a listing photo, but only when that
 * exact object is referenced by an image of a currently active listing.
 * This lets signed-out shoppers see ad photos without giving the anonymous
 * role blanket read access to the private `listings` bucket.
 */
export const signActiveListingImage = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ path: z.string().min(1).max(500) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error: lookupError } = await supabaseAdmin
      .from("listing_images")
      .select("url, listings!inner(status)")
      .eq("url", data.path)
      .eq("listings.status", "active")
      .limit(1);

    if (lookupError || !rows || rows.length === 0) return { url: null as string | null };

    const { data: signed } = await supabaseAdmin.storage
      .from("listings")
      .createSignedUrl(data.path, 3600);

    return { url: signed?.signedUrl ?? null };
  });
