import { useI18n } from "@/lib/i18n";
import { timeAgo } from "@/lib/format";

export function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 90_000;
}

export function PresenceLabel({ lastSeen }: { lastSeen: string | null | undefined }) {
  const { t, lang } = useI18n();
  if (isOnline(lastSeen)) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1 text-[11px] font-semibold text-primary">
        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
        {t("online")}
      </span>
    );
  }
  if (!lastSeen) return null;
  return (
    <span className="truncate text-[11px] text-muted-foreground">
      {t("lastSeen")} {timeAgo(lastSeen, lang)}
    </span>
  );
}

export function OnlineDot({ lastSeen }: { lastSeen: string | null | undefined }) {
  if (!isOnline(lastSeen)) return null;
  return (
    <span className="absolute bottom-0 end-0 size-3 rounded-full border-2 border-card bg-primary" />
  );
}
