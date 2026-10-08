import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Bell, Check, CheckCheck, Heart, MessageCircle, Package, Star, X, AlertTriangle, BadgeCheck, ShieldCheck, ShoppingBag, Handshake, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/BottomNav";
import { BrandTopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Notifications — Alish" },
      { name: "description", content: "Messages, saved-listing alerts and listing updates from your Alish account." },
      { property: "og:title", content: "Notifications — Alish" },
      { property: "og:description", content: "Messages and listing updates from your Alish account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const PAGE_SIZE = 30;

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
  listing_id: string | null;
  conversation_id: string | null;
  actor_id: string | null;
}

/** Human label per notification type, translated. */
function typeLabel(type: string, t: (k: string) => string) {
  switch (type) {
    case "message":
      return t("notifMessage");
    case "favorite":
      return t("notifFavorite");
    case "review":
      return t("notifReview");
    case "listing_active":
      return t("notifApproved");
    case "listing_rejected":
      return t("notifRejected");
    case "listing_sold":
      return t("notifSold");
    case "listing_expired":
      return t("notifExpired");
    case "listing_expiring":
      return t("notifExpiring");
    case "listing_renewed":
      return t("notifRenewed");
    default:
      return t("notifAccount");
  }
}

function typeIcon(type: string) {
  if (type === "message") return MessageCircle;
  if (type === "favorite") return Heart;
  if (type === "review") return Star;
  if (type === "listing_sold") return BadgeCheck;
  if (type === "listing_rejected") return AlertTriangle;
  if (type === "listing_expired" || type === "listing_expiring") return Clock;
  if (type === "listing_renewed") return RefreshCw;
  if (type === "offer" || type === "purchase_offer") return Handshake;
  if (type === "purchase" || type === "order") return ShoppingBag;
  if (type === "security" || type.startsWith("security_")) return ShieldCheck;
  if (type.startsWith("listing_")) return Package;
  return Bell;
}

function NotificationsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | "unread" | "read">("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["notifications", user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,type,title,body,link,read_at,created_at,listing_id,conversation_id,actor_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Notif[];
    },
  });

  // Single realtime subscription for this page, torn down on unmount. The badge
  // hook owns its own channel with a distinct name, so there is no duplicate.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notif-page-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
          qc.invalidateQueries({ queryKey: ["unread-notifications", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const invalidate = () => {
    if (!user) return;
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
    qc.invalidateQueries({ queryKey: ["unread-notifications", user.id] });
  };

  const items = useMemo(() => {
    const all = data ?? [];
    if (tab === "unread") return all.filter((n) => !n.read_at);
    if (tab === "read") return all.filter((n) => !!n.read_at);
    return all;
  }, [data, tab]);

  const unreadCount = (data ?? []).filter((n) => !n.read_at).length;

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (error) {
      if (import.meta.env.DEV) console.error("[notifications] markAllRead", error);
      toast.error(t("errorTitle"));
      return;
    }
    invalidate();
  };

  const markOneRead = async (n: Notif) => {
    if (!user || n.read_at) return;
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    if (error) {
      if (import.meta.env.DEV) console.error("[notifications] markOneRead", error);
      return;
    }
    invalidate();
  };

  const dismiss = async (n: Notif) => {
    if (!user) return;
    const { error } = await supabase.from("notifications").delete().eq("id", n.id);
    if (error) {
      if (import.meta.env.DEV) console.error("[notifications] dismiss", error);
      toast.error(t("errorTitle"));
      return;
    }
    invalidate();
  };

  /** Route to the right destination using structured references, with a link fallback. */
  const open = async (n: Notif) => {
    await markOneRead(n);
    if (n.conversation_id) {
      navigate({ to: "/chat/$id", params: { id: n.conversation_id } });
      return;
    }
    if (n.listing_id) {
      navigate({ to: "/listing/$id", params: { id: n.listing_id } });
      return;
    }
    if (n.type === "review" && n.link?.startsWith("/seller/")) {
      navigate({ to: "/seller/$id", params: { id: n.link.replace("/seller/", "") } });
      return;
    }
    const legacy = n.link ?? "";
    if (legacy.startsWith("/chat/")) {
      navigate({ to: "/chat/$id", params: { id: legacy.replace("/chat/", "") } });
    } else if (legacy.startsWith("/listing/")) {
      navigate({ to: "/listing/$id", params: { id: legacy.replace("/listing/", "") } });
    }
  };

  const tabs = [
    { id: "all" as const, label: t("tabAll") },
    { id: "unread" as const, label: t("tabUnread") },
    { id: "read" as const, label: t("tabRead") },
  ];

  return (
    <div className="min-h-screen bg-background pb-48">
      <BrandTopBar right={<LanguageSwitcher />} />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-2 px-4 pt-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pt-8">
        <h1 className="min-w-0 break-words font-display text-2xl font-extrabold leading-tight">{t("notifications")}</h1>
        {unreadCount > 0 && (
          <Button variant="ghost" onClick={markAllRead} className="min-h-11 shrink-0 px-2 text-xs font-semibold text-accent hover:bg-accent/10 hover:text-accent">
            <CheckCheck aria-hidden="true" />
            {t("markAllRead")}
          </Button>
        )}
      </div>

      <div role="group" aria-label={t("notifications")} className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-2 px-4 pb-4 pt-5 sm:flex sm:px-6">
        {tabs.map((tb) => (
          <Button
            variant="ghost"
            key={tb.id}
            onClick={() => setTab(tb.id)}
            aria-pressed={tab === tb.id}
            className={cn(
              "h-auto min-h-11 min-w-0 gap-1 rounded-full border px-2 py-2 text-xs font-semibold sm:px-5 sm:text-sm",
              tab === tb.id ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "border-border/60 bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <span className="min-w-0 whitespace-normal leading-5">{tb.label}</span>
            {tb.id === "unread" && unreadCount > 0 && <span className="shrink-0 text-[11px] tabular-nums">· {unreadCount}</span>}
          </Button>
        ))}
      </div>

      <main aria-busy={isLoading} className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pb-6 pt-1 sm:px-6">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} aria-hidden="true" className="flex min-h-28 gap-3 rounded-lg border border-border/60 bg-card p-4 motion-safe:animate-pulse">
            <div className="size-11 shrink-0 rounded-lg bg-secondary" />
            <div className="flex min-w-0 flex-1 flex-col gap-3 py-1">
              <div className="h-3 w-2/3 rounded bg-secondary" />
              <div className="h-3 w-full rounded bg-secondary" />
              <div className="h-2 w-1/3 rounded bg-secondary" />
            </div>
          </div>
        ))}

        {error && (
          <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="size-5 text-destructive" />
            <p className="text-sm font-semibold text-destructive">{t("errorTitle")}</p>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="min-h-11 gap-2 text-sm"
            >
              <RefreshCw aria-hidden="true" className={isFetching ? "motion-safe:animate-spin" : ""} />
              {t("retry")}
            </Button>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div role="status" className="flex min-h-80 flex-col items-center justify-center gap-5 px-4 py-16 text-center sm:min-h-96">
            <div className="flex size-20 items-center justify-center rounded-full border border-primary/10 bg-secondary/70 ring-8 ring-secondary/30">
              <Bell aria-hidden="true" className="size-8 text-primary/70" strokeWidth={1.5} />
            </div>
            <p className="max-w-xs text-base font-semibold leading-relaxed text-muted-foreground">{t("emptyNotifications")}</p>
          </div>
        )}

        {items.map((n) => {
          const Icon = typeIcon(n.type);
          return (
            <div
              key={n.id}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-start overflow-hidden rounded-lg border border-s-[3px] transition-colors motion-reduce:transition-none",
                n.read_at ? "border-border/70 border-s-border bg-card" : "border-accent/20 border-s-accent bg-accent/5",
              )}
            >
              <Button variant="ghost" type="button" onClick={() => open(n)} className="h-auto min-h-28 min-w-0 items-start justify-start gap-3 whitespace-normal rounded-none py-4 pe-0 ps-3 text-start hover:bg-secondary/40 hover:text-foreground sm:gap-4 sm:ps-4">
                <span
                  className={cn(
                    "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-lg",
                    n.read_at ? "bg-secondary/70 text-muted-foreground" : "bg-primary/10 text-primary",
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span dir="auto" className={cn("block break-words text-sm leading-6", n.read_at ? "font-semibold text-foreground/80" : "font-bold text-foreground")}>{n.title}</span>
                  {n.body && <span dir="auto" className="mt-1 block break-words text-sm font-normal leading-6 text-muted-foreground">{n.body}</span>}
                  <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-5">
                    <span className={cn("font-semibold", n.read_at ? "text-muted-foreground" : "text-primary")}>{typeLabel(n.type, t)}</span>
                    <span aria-hidden="true" className="text-muted-foreground">·</span>
                    <time dateTime={n.created_at} className="font-normal text-muted-foreground">{timeAgo(n.created_at, lang)}</time>
                  </span>
                </span>
              </Button>
              <div className="flex w-11 shrink-0 flex-col items-center gap-2 pt-1 sm:w-12">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label={t("dismiss")}
                title={t("dismiss")}
                onClick={() => dismiss(n)}
                className="size-11 rounded-none text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
              {n.read_at ? <Check aria-label={t("tabRead")} className="size-3.5 text-muted-foreground" /> : <span role="img" aria-label={t("tabUnread")} className="size-2 rounded-full bg-accent" />}
              </div>
            </div>
          );
        })}

        {!error && data && data.length >= limit && (
          <Button
            variant="outline"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="mx-auto mt-3 min-h-11 px-6 text-sm font-semibold"
          >
            {t("loadMore")}
          </Button>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
