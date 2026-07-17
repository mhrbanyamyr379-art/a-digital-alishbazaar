import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Archive, Inbox, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { timeAgo } from "@/lib/format";
import { StorageImage } from "@/components/StorageImage";
import { BottomNav } from "@/components/BottomNav";
import { BrandTopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { OnlineDot } from "@/components/Presence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatListPage,
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

  const { data, isLoading } = useQuery({
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
      const pMap = new Map((profs ?? []).map((p) => [p.id, p]));
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
      .channel("convs-" + user.id)
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

  return (
    <div className="min-h-screen bg-background pb-32">
      <BrandTopBar right={<LanguageSwitcher />} />
      <div className="px-4 pt-4">
        <h1 className="font-display text-xl font-black">{t("chat")}</h1>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchChats")}
            className="w-full rounded-full border border-border bg-card py-2 ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setTab("inbox")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              tab === "inbox" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            )}
          >
            <Inbox className="size-3.5" /> {t("inbox")}
          </button>
          <button
            onClick={() => setTab("archived")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              tab === "archived" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            )}
          >
            <Archive className="size-3.5" /> {t("archived")}
          </button>
        </div>
      </div>
      <main className="flex flex-col p-3">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-2 h-16 animate-pulse rounded-xl bg-secondary" />
          ))}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
              <MessageCircle className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              {tab === "archived" ? t("emptyArchived") : t("emptyChat")}
            </p>
          </div>
        )}
        {filtered.map((c) => (
          <Link
            key={c.id}
            to="/chat/$id"
            params={{ id: c.id }}
            className={cn(
              "flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary",
              c.unread > 0 && "bg-accent/5",
            )}
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-secondary">
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
                <p className={cn("truncate text-sm", c.unread > 0 ? "font-black" : "font-bold")}>
                  {c.other?.display_name ?? "—"}
                </p>
                {c.last_message_at && (
                  <span
                    className={cn(
                      "shrink-0 text-[10px]",
                      c.unread > 0 ? "font-bold text-accent" : "text-muted-foreground",
                    )}
                  >
                    {timeAgo(c.last_message_at, lang)}
                  </span>
                )}
              </div>
              {c.listingTitle && <p className="truncate text-[11px] text-accent">{c.listingTitle}</p>}
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "truncate text-xs",
                    c.unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {c.last_message ?? "…"}
                </p>
                {c.unread > 0 && (
                  <span className="flex size-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-black text-accent-foreground">
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
