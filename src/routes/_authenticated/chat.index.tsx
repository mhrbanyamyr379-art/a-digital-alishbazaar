import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Archive, Inbox, Search, X, Image as ImageIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { timeAgo } from "@/lib/format";
import { StorageImage } from "@/components/StorageImage";
import { BottomNav } from "@/components/BottomNav";
import { BrandTopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { OnlineDot, PresenceLabel } from "@/components/Presence";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatListPage,
  head: () => ({
    meta: [
      { title: "Messages — Alish" },
      { name: "description", content: "Your buying and selling conversations on Alish." },
      { property: "og:title", content: "Messages — Alish" },
      { property: "og:description", content: "Your buying and selling conversations on Alish." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

interface Conv {
  id: string;
  buyer_id: string;
  seller_id: string;
  last_message: string | null;
  last_message_at: string | null;
  listing_id: string | null;
  buyer_unread: number;
  seller_unread: number;
  archived_by_buyer: boolean;
  archived_by_seller: boolean;
  other: { id: string; display_name: string; avatar_url: string | null; last_seen: string | null } | null;
  listingTitle: string | null;
  unread: number;
  archived: boolean;
}

function ChatListPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"inbox" | "archived">("inbox");
  const [q, setQ] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const { data: convs, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;

      const otherIds = [...new Set((convs ?? []).map((c) => (c.buyer_id === uid ? c.seller_id : c.buyer_id)))];
      const listingIds = [
        ...new Set((convs ?? []).map((c) => c.listing_id).filter(Boolean)),
      ] as string[];

      const [{ data: profs }, { data: lists }] = await Promise.all([
        otherIds.length
          ? supabase.from("profiles").select("id,display_name,avatar_url,last_seen").in("id", otherIds)
          : Promise.resolve({ data: [] as { id: string; display_name: string; avatar_url: string | null; last_seen: string | null }[] }),
        listingIds.length
          ? supabase.from("listings").select("id,title").in("id", listingIds)
          : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      ]);
      const pMap = new Map(
        (profs ?? [])
          .filter((p) => p.id != null)
          .map((p) => [p.id as string, { ...p, id: p.id as string, display_name: p.display_name ?? "" }]),
      );
      const lMap = new Map((lists ?? []).map((l) => [l.id, l.title]));

      return (convs ?? []).map((c: Record<string, unknown>): Conv => {
        const buyer_id = c.buyer_id as string;
        const seller_id = c.seller_id as string;
        const isBuyer = buyer_id === uid;
        const otherId = isBuyer ? seller_id : buyer_id;
        return {
          id: c.id as string,
          buyer_id,
          seller_id,
          last_message: (c.last_message as string) ?? null,
          last_message_at: (c.last_message_at as string) ?? null,
          listing_id: (c.listing_id as string) ?? null,
          buyer_unread: (c.buyer_unread as number) ?? 0,
          seller_unread: (c.seller_unread as number) ?? 0,
          archived_by_buyer: (c.archived_by_buyer as boolean) ?? false,
          archived_by_seller: (c.archived_by_seller as boolean) ?? false,
          other: pMap.get(otherId) ?? null,
          listingTitle: c.listing_id ? (lMap.get(c.listing_id as string) ?? null) : null,
          unread: isBuyer ? ((c.buyer_unread as number) ?? 0) : ((c.seller_unread as number) ?? 0),
          archived: isBuyer ? !!c.archived_by_buyer : !!c.archived_by_seller,
        };
      });
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`convs-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const filtered = useMemo(() => {
    const list = (data ?? []).filter((c) => (tab === "archived" ? c.archived : !c.archived));
    if (!q.trim()) return list;
    const needle = q.trim().toLowerCase();
    return list.filter(
      (c) =>
        (c.other?.display_name ?? "").toLowerCase().includes(needle) ||
        (c.listingTitle ?? "").toLowerCase().includes(needle) ||
        (c.last_message ?? "").toLowerCase().includes(needle),
    );
  }, [data, tab, q]);

  const inboxCount = (data ?? []).filter((c) => !c.archived).length;
  const archivedCount = (data ?? []).filter((c) => c.archived).length;

  return (
    <div className="min-h-screen bg-background pb-36">
      <BrandTopBar right={<LanguageSwitcher />} />
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-4 pb-4 pt-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-black text-foreground">{t("chat")}</h1>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                {tab === "inbox" ? `${inboxCount} ${t("inbox")}` : `${archivedCount} ${t("archived")}`}
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <MessageCircle className="size-5" />
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchChats")}
            className="h-12 w-full rounded-lg border border-border bg-background ps-11 pe-11 text-sm font-medium outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
          />
            {q && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setQ("")}
                aria-label={t("clear")}
                className="absolute end-1.5 top-1/2 size-9 -translate-y-1/2 rounded-full text-muted-foreground"
              >
                <X className="size-4" />
              </Button>
            )}
        </div>
          <div className="mt-3 grid grid-cols-2 rounded-lg bg-secondary p-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setTab("inbox")}
            className={cn(
              "h-10 rounded-md text-xs font-black shadow-none",
              tab === "inbox" ? "bg-card text-foreground shadow-sm hover:bg-card" : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            <Inbox className="size-4" />
            <span>{t("inbox")}</span>
            {inboxCount > 0 && <span className="text-[10px] text-muted-foreground">{inboxCount}</span>}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setTab("archived")}
            className={cn(
              "h-10 rounded-md text-xs font-black shadow-none",
              tab === "archived" ? "bg-card text-foreground shadow-sm hover:bg-card" : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            <Archive className="size-4" />
            <span>{t("archived")}</span>
            {archivedCount > 0 && <span className="text-[10px] text-muted-foreground">{archivedCount}</span>}
          </Button>
          </div>
        </div>
      </section>
      <main className="mx-auto flex w-full max-w-3xl flex-col px-3 py-3 sm:px-5">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-2 flex h-[76px] items-center gap-3 rounded-lg border border-border/60 bg-card px-3">
              <div className="size-12 shrink-0 animate-pulse rounded-full bg-secondary" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-2/5 animate-pulse rounded bg-secondary" />
                <div className="h-2.5 w-4/5 animate-pulse rounded bg-secondary" />
              </div>
            </div>
          ))}
        {error && !isLoading && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <p className="text-sm text-muted-foreground">{t("errorTitle")}</p>
            <Button
              onClick={() => refetch()}
              className="h-11 px-5 font-bold"
            >
              {t("retry")}
            </Button>
          </div>
        )}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex min-h-[42vh] flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex size-20 items-center justify-center rounded-full border border-border bg-card shadow-sm">
              {q ? <Search className="size-8 text-muted-foreground" /> : tab === "archived" ? <Archive className="size-8 text-muted-foreground" /> : <MessageCircle className="size-8 text-muted-foreground" />}
            </div>
            <p className="max-w-xs text-sm font-bold text-foreground">
              {q ? t("notFoundRecord") : tab === "archived" ? t("emptyArchived") : t("emptyChat")}
            </p>
          </div>
        )}
        {filtered.map((c) => (
          <Link
            key={c.id}
            to="/chat/$id"
            params={{ id: c.id }}
            className={cn(
              "group mb-1 flex min-h-[76px] items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              c.unread > 0 && "border-accent/20 bg-card shadow-sm",
            )}
          >
            <div className="relative size-13 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
              {c.other?.avatar_url ? (
                <StorageImage bucket="avatars" path={c.other.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center font-bold">
                  {c.other?.display_name?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
              <OnlineDot lastSeen={c.other?.last_seen} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className={cn("truncate text-sm text-foreground", c.unread > 0 ? "font-black" : "font-bold")}>
                  {c.other?.display_name ?? "—"}
                </p>
                {c.last_message_at && (
                  <span
                    className={cn(
                      "shrink-0 text-[11px] tabular-nums",
                      c.unread > 0 ? "font-bold text-accent" : "text-muted-foreground",
                    )}
                  >
                    {timeAgo(c.last_message_at, lang)}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                <PresenceLabel lastSeen={c.other?.last_seen} />
                {c.listingTitle && (
                  <>
                    <span className="text-[10px] text-border">•</span>
                    <p className="truncate text-[11px] font-semibold text-accent">{c.listingTitle}</p>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs",
                    c.unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {!c.last_message && <ImageIcon className="size-3 shrink-0" />}
                  <span className="truncate">{c.last_message ?? t("imageMessage")}</span>
                </p>
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-black text-accent-foreground shadow-sm">
                    {c.unread > 99 ? "99+" : c.unread}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
