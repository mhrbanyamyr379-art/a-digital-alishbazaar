import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { MessageCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { timeAgo } from "@/lib/format";
import { avatarImg } from "@/lib/storage";
import { BottomNav } from "@/components/BottomNav";
import { BrandTopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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
  other: { display_name: string; avatar_url: string | null } | null;
  listingTitle: string | null;
}

function ChatListPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: convs, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;

      const otherIds = [...new Set((convs ?? []).map((c) => (c.buyer_id === user!.id ? c.seller_id : c.buyer_id)))];
      const listingIds = [...new Set((convs ?? []).map((c) => c.listing_id).filter(Boolean))] as string[];
      const [{ data: profs }, { data: lists }] = await Promise.all([
        otherIds.length ? supabase.from("profiles").select("id,display_name,avatar_url").in("id", otherIds) : Promise.resolve({ data: [] }),
        listingIds.length ? supabase.from("listings").select("id,title").in("id", listingIds) : Promise.resolve({ data: [] }),
      ]);
      const pMap = new Map((profs ?? []).map((p) => [p.id, p]));
      const lMap = new Map((lists ?? []).map((l) => [l.id, l.title]));

      return (convs ?? []).map((c): Conv => {
        const otherId = c.buyer_id === user!.id ? c.seller_id : c.buyer_id;
        return {
          ...c,
          other: pMap.get(otherId) ?? null,
          listingTitle: c.listing_id ? (lMap.get(c.listing_id) ?? null) : null,
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
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  return (
    <div className="min-h-screen bg-background pb-32">
      <BrandTopBar right={<LanguageSwitcher />} />
      <div className="px-4 pt-4">
        <h1 className="font-display text-xl font-black">{t("chat")}</h1>
      </div>
      <main className="flex flex-col p-3">
        {isLoading && Array.from({ length: 5 }).map((_, i) => <div key={i} className="mb-2 h-16 animate-pulse rounded-xl bg-secondary" />)}
        {data && data.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
              <MessageCircle className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">{t("emptyChat")}</p>
          </div>
        )}
        {data?.map((c) => (
          <Link
            key={c.id}
            to="/chat/$id"
            params={{ id: c.id }}
            className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary"
          >
            <div className="size-12 shrink-0 overflow-hidden rounded-full bg-secondary">
              {c.other?.avatar_url ? (
                <img src={avatarImg(c.other.avatar_url)} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center font-bold">
                  {c.other?.display_name?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold">{c.other?.display_name ?? "—"}</p>
                {c.last_message_at && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.last_message_at, lang)}</span>
                )}
              </div>
              {c.listingTitle && <p className="truncate text-[11px] text-accent">{c.listingTitle}</p>}
              <p className="truncate text-xs text-muted-foreground">{c.last_message ?? "…"}</p>
            </div>
          </Link>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
