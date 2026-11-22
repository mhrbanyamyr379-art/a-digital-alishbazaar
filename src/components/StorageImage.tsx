import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { publicPhotoUrl } from "@/lib/public-photo";
import { cn } from "@/lib/utils";

const SIGNED_TTL_SECONDS = 600;
const cache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string | null>>();
async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  const key = `${bucket}/${path}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now + 30_000) return hit.url;
  const existing = inflight.get(key);
  if (existing) return existing;
  // Signed URL caching is reserved for chat attachments, not public photos.
  const direct = async (): Promise<string | null> => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_TTL_SECONDS);
    return error ? null : (data?.signedUrl ?? null);
  };
  const p = direct()
    .then((url) => {
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
    let objectUrl: string | null = null;
    const controller = new AbortController();
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
    const load = async () => {
      if (bucket === "chat-images") return getSignedUrl(bucket, path);
      // Every new display checks current public visibility. Never cache a
      // storage token or fall back to signed URLs when public access is denied.
      const response = await fetch(publicPhotoUrl(bucket, path), {
        cache: "no-store", signal: controller.signal,
      });
      let image: Blob | null = response.ok ? await response.blob() : null;
      if (!response.ok && response.status === 404) {
        // Preserve owners' previews of drafts/unselected uploads using their
        // authenticated storage permissions, not privileged public signing.
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user.id === path.split("/")[0]) {
          const { data, error } = await supabase.storage.from(bucket).download(path);
          if (!error) image = data;
        }
      }
      if (!image || cancelled) return null;
      objectUrl = URL.createObjectURL(image);
      return objectUrl;
    };
    load().then((url) => {
      if (cancelled) return;
      if (!url) setFailed(true);
      else setSrc(url);
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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

  // Lazy + async by default; callers pass loading="eager" (and optionally
  // fetchPriority="high") for above-the-fold images, which overrides these.
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
