import { useRef } from "react";
import { nativeShare } from "@/lib/share";
import { shareFallbackStore } from "@/lib/share-fallback";

export function useShare() {
  const busy = useRef(false);

  return async (data: ShareData, onSuccess?: () => void | Promise<unknown>) => {
    if (busy.current) return;
    busy.current = true;
    const completed = () => { void Promise.resolve().then(onSuccess).catch(() => {}); };
    try {
      const result = await nativeShare(data);
      if (result === "shared") completed();
      if (result === "failed" || result === "unsupported") shareFallbackStore.open(data, completed);
    } finally { busy.current = false; }
  };
}