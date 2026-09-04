import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Heart, MessageCircle, Package, Star, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/BottomNav";
import { BrandTopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Notifications — Afghan Bazaar" },
      { name: "description", content: "Messages, saved-listing alerts and listing updates from your Afghan Bazaar account." },
      { property: "og:title", content: "Notifications — Afghan Bazaar" },
      { property: "og:description", content: "Messages and listing updates from your Afghan Bazaar account." },
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
    <div className="min-h-screen bg-background pb-32">
      <BrandTopBar right={<LanguageSwitcher />} />

      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h1 className="font-display text-xl font-black">{t("notifications")}</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-bold text-accent">
            <CheckCheck className="size-4" />
            {t("markAllRead")}
          </button>
        )}
      </div>

      <div className="flex gap-2 px-4 pt-3">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              tab === tb.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            )}
          >
            {tb.label}
            {tb.id === "unread" && unreadCount > 0 ? ` · ${unreadCount}` : ""}
          </button>
        ))}
      </div>

      <main className="flex flex-col gap-2 p-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />)}

        {error && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
            <AlertTriangle className="size-5 text-destructive" />
            <p className="text-sm font-semibold text-destructive">{t("errorTitle")}</p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-foreground disabled:opacity-60"
            >
              {t("retry")}
            </button>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
              <Bell className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">{t("emptyNotifications")}</p>
          </div>
        )}

        {items.map((n) => {
          const Icon = typeIcon(n.type);
          return (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3",
                n.read_at ? "border-border bg-card" : "border-accent/30 bg-accent/5",
              )}
            >
              <button type="button" onClick={() => open(n)} className="flex min-w-0 flex-1 items-start gap-3 text-start">
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                    n.read_at ? "bg-secondary text-muted-foreground" : "bg-accent/15 text-accent",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-bold">{n.title}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.created_at, lang)}</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-accent">{typeLabel(n.type, t)}</span>
                  {n.body && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.body}</span>}
                </span>
              </button>
              <button
                type="button"
                aria-label={t("dismiss")}
                onClick={() => dismiss(n)}
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}

        {!error && data && data.length >= limit && (
          <button
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="mx-auto mt-2 rounded-lg border border-border px-4 py-2 text-xs font-bold"
          >
            {t("loadMore")}
          </button>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
