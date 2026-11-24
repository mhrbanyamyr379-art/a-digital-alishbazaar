import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { immediatePhotoSource } from "@/lib/public-photo";
import { useNetworkProfile } from "@/lib/network-profile";
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
  const key = `${bucket}/${path ?? ""}`;
  const [resolved, setResolved] = useState<{ key: string; url: string } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const triedOwner = useRef<string | null>(null);
  const currentKey = useRef(key);
  currentKey.current = key;
  const imageRef = useRef<HTMLImageElement | null>(null);
  const profile = useNetworkProfile();
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const src = resolved?.key === key ? resolved.url : immediatePhotoSource(bucket, path);

  useEffect(() => {
    if (profile !== "fast" || rest.loading === "eager" || !imageRef.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisibleKey(key);
        observer.disconnect();
      }
    }, { rootMargin: "0px" });
    observer.observe(imageRef.current);
    return () => observer.disconnect();
  }, [profile, key, rest.loading, src]);

  useEffect(() => {
    const reconnect = () => {
      if (failedKey !== key) return;
      triedOwner.current = null;
      setFailedKey(null);
      setRetry((n) => n + 1);
    };
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, [failedKey, key]);

  useEffect(() => () => {
    if (resolved?.url.startsWith("blob:")) URL.revokeObjectURL(resolved.url);
  }, [resolved]);

  const handleError = async () => {
    if (!navigator.onLine || bucket === "chat-images" || !path || triedOwner.current === key) return setFailedKey(key);
    triedOwner.current = key;
    // Owners can still preview drafts/unselected uploads with their own access.
    const { data: { session } } = await supabase.auth.getSession();
    if (currentKey.current !== key) return;
    if (session?.user.id !== path.split("/")[0]) return setFailedKey(key);
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (currentKey.current !== key) return;
    if (error || !data) return setFailedKey(key);
    setResolved({ key, url: URL.createObjectURL(data) });
  };

  useEffect(() => {
    if (bucket !== "chat-images" || !path || immediatePhotoSource(bucket, path)) return;
    let cancelled = false;
    getSignedUrl(bucket, path).then((url) => {
      if (cancelled) return;
      if (!url) setFailedKey(key);
      else setResolved({ key, url });
    });
    return () => { cancelled = true; };
  }, [bucket, path, key, retry]);

  if (failedKey === key || !path) {
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
      {...rest}
      key={retry}
      ref={imageRef}
      src={src}
      alt={alt}
      className={className}
      loading={rest.loading ?? (profile === "fast" && visibleKey === key ? "eager" : "lazy")}
      decoding={rest.decoding ?? "async"}
      onError={() => { void handleError(); }}
    />
  );
}
