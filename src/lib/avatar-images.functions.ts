import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Returns a short-lived signed URL for a profile photo, but only when that
 * exact object is referenced by its owner's profile and lives in that owner's
 * upload folder. A reference on someone else's profile is not authority.
 * This lets shoppers see seller avatars without giving broad read access
 * to the private `avatars` bucket.
 */
export const signAvatarImage = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    path: z.string().min(1).max(500).regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/[A-Za-z0-9_-][A-Za-z0-9._-]*)+$/,
    ),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error: lookupError } = await supabaseAdmin
      .from("profiles")
      .select("avatar_url")
      .eq("avatar_url", data.path)
      // Upload RLS reserves the first folder for this profile owner. Only
      // that owner's chosen avatar may authorize public signing of the file.
      .eq("id", data.path.split("/")[0])
      .limit(1);

    if (lookupError || !rows || rows.length === 0) return { url: null as string | null };

    const { data: signed } = await supabaseAdmin.storage
      .from("avatars")
      .createSignedUrl(data.path, 600);

    return { url: signed?.signedUrl ?? null };
  });
