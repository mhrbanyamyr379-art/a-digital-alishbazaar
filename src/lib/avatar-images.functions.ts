import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Returns a short-lived signed URL for a profile photo, but only when that
 * exact object is referenced as someone's avatar in the profiles table.
 * This lets shoppers see seller avatars without giving broad read access
 * to the private `avatars` bucket.
 */
export const signAvatarImage = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ path: z.string().min(1).max(500) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error: lookupError } = await supabaseAdmin
      .from("profiles")
      .select("avatar_url")
      .eq("avatar_url", data.path)
      .limit(1);

    if (lookupError || !rows || rows.length === 0) return { url: null as string | null };

    const { data: signed } = await supabaseAdmin.storage
      .from("avatars")
      .createSignedUrl(data.path, 3600);

    return { url: signed?.signedUrl ?? null };
  });
