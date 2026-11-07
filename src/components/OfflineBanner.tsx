import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { WifiOff, Wifi } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Slim top banner shown while the device is offline, plus a brief "back online" note. */
export function OfflineBanner() {
  const { t } = useI18n();
  const pathname = useLocation({ select: (l) => l.pathname });
  const [online, setOnline] = useState(true);
  const [justBack, setJustBack] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOffline = () => {
      setOnline(false);
      setJustBack(false);
    };
    const goOnline = () => {
      setOnline(true);
      setJustBack(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setJustBack(false), 3000);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Chat threads already show their own offline indicator.
  if (/^\/chat\/[^/]+/.test(pathname)) return null;
  if (online && !justBack) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 px-4 pb-1.5 pt-[calc(env(safe-area-inset-top)+0.375rem)] text-xs font-bold shadow-md",
        online ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground",
      )}
    >
      {online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
      <span>{online ? t("backOnline") : t("offlineBanner")}</span>
    </div>
  );
}
