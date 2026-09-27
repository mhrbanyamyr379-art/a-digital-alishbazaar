import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signActiveListingImage } from "@/lib/listing-images.functions";
import { cn } from "@/lib/utils";

const SIGNED_TTL_SECONDS = 3600;
const cache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string | null>>();

async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  // Avatars live in a public bucket (profile photos are shown to everyone);
  // serve them straight from the public URL, no signing needed.
  if (bucket === "avatars") {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  const key = `${bucket}/${path}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now + 30_000) return hit.url;
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_TTL_SECONDS)
    .then(async ({ data, error }) => {
      let url = error ? null : (data?.signedUrl ?? null);
      // Signed-out shoppers have no direct read access to the private listings
      // bucket; fall back to the server, which only signs photos of active ads.
      if (!url && bucket === "listings") {
        try {
          const res = await signActiveListingImage({ data: { path } });
          url = res?.url ?? null;
        } catch {
          url = null;
        }
      }
      inflight.delete(key);
      if (!url) return null;
      cache.set(key, { url, expires: now + SIGNED_TTL_SECONDS * 1000 });
      return url;
    })
    .catch(() => {
      inflight.delete(key);
      return null;
    });
  inflight.set(key, p);
  return p;
}


interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  bucket: "listings" | "avatars" | "chat-images";
  path?: string | null;
  fallbackClassName?: string;
}

export function StorageImage({ bucket, path, alt = "", className, fallbackClassName, ...rest }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setSrc(null);
    if (!path) {
      setFailed(true);
      return;
    }
    if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) {
      setSrc(path);
      return;
    }
    getSignedUrl(bucket, path).then((url) => {
      if (cancelled) return;
      if (!url) setFailed(true);
      else setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [bucket, path]);

  if (failed || !path) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-muted text-muted-foreground",
          className,
          fallbackClassName,
        )}
        aria-label={alt || "image unavailable"}
      >
        <ImageOff className="size-6 opacity-40" />
      </div>
    );
  }

  if (!src) {
    return <div className={cn("h-full w-full animate-pulse bg-muted", className)} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
