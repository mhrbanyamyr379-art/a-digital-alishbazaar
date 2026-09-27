import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signActiveListingImage } from "@/lib/listing-images.functions";
import { signAvatarImage } from "@/lib/avatar-images.functions";
...
async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
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
      // Direct read access is owner-only; fall back to the server, which only
      // signs listing photos of active ads or photos used as a profile avatar.
      if (!url && bucket === "listings") {
        try {
          const res = await signActiveListingImage({ data: { path } });
          url = res?.url ?? null;
        } catch {
          url = null;
        }
      }
      if (!url && bucket === "avatars") {
        try {
          const res = await signAvatarImage({ data: { path } });
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
