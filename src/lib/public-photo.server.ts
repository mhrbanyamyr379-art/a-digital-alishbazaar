import { photoPathSchema } from "./public-photo";

/** Privileged file reads must first prove the upload owner authorized public display. */
export async function authorizedPhotoClient(bucket: "listings" | "avatars", path: string) {
  photoPathSchema.parse(path);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const owner = path.split("/")[0]!;
  const lookup = bucket === "listings"
    ? await supabaseAdmin.from("listing_images")
      .select("url, listings!inner(status, seller_id)")
      .eq("url", path).eq("listings.status", "active")
      .eq("listings.seller_id", owner).limit(1)
    : await supabaseAdmin.from("profiles").select("avatar_url")
      .eq("avatar_url", path).eq("id", owner).eq("is_banned", false).limit(1);
  return lookup.error || !lookup.data?.length ? null : supabaseAdmin;
}

export async function servePublicPhoto(request: Request): Promise<Response> {
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
    "CDN-Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  const unavailable = () => new Response("Photo unavailable", { status: 404, headers });
  try {
    const url = new URL(request.url);
    const bucket = url.searchParams.get("bucket");
    const path = photoPathSchema.safeParse(url.searchParams.get("path"));
    if ((bucket !== "listings" && bucket !== "avatars") || !path.success) return unavailable();
    // Re-query current visibility on EVERY request, including saved URLs.
    const client = await authorizedPhotoClient(bucket, path.data);
    if (!client) return unavailable();
    const { data: image, error } = await client.storage.from(bucket).download(path.data);
    if (error || !image) return unavailable();
    // No redirect or signed storage URL escapes this handler.
    return new Response(image, {
      headers: { ...headers, "Content-Type": image.type || "application/octet-stream" },
    });
  } catch {
    return unavailable();
  }
}