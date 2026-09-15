import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { StorageImage } from "@/components/StorageImage";
import { formatPrice } from "@/lib/format";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/_authenticated/recent")({
  component: RecentPage,
  head: () => ({
    meta: [
      { title: "Recently viewed — Afghan Bazaar" },
      { name: "description", content: "The Afghan Bazaar listings you looked at recently, ready to revisit." },
      { property: "og:title", content: "Recently viewed — Afghan Bazaar" },
      { property: "og:description", content: "Listings you recently viewed on Afghan Bazaar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function RecentPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();

  const { data: recent, isLoading, error, refetch } = useQuery({
    queryKey: ["recent", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rv, error: rvErr } = await supabase
        .from("recently_viewed")
        .select("listing_id,viewed_at")
        .eq("user_id", user!.id)
        .order("viewed_at", { ascending: false })
        .limit(30);
      if (rvErr) throw rvErr;
      const ids = (rv ?? []).map((r) => r.listing_id);
      if (!ids.length) return [];
      const { data, error: lErr } = await supabase
        .from("listings")
        .select("id,title,price,currency,status,listing_images(url,position)")
        .in("id", ids);
      if (lErr) throw lErr;
      // Keep the most-recently-viewed order; `in()` returns rows unordered.
      const byId = new Map((data ?? []).map((l) => [l.id, l]));
      return ids.map((id) => byId.get(id)).filter(Boolean) as NonNullable<typeof data>;
    },
  });

  const firstImg = (imgs: { url: string; position: number }[]) =>
    (imgs ?? []).sort((a, b) => a.position - b.position)[0]?.url ?? null;

  return (
    <div className="min-h-screen bg-background pb-32">
      <TopBar title={t("recentlyViewed")} right={<LanguageSwitcher variant="onLight" />} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 p-3">
        {recent?.map((l) => (
          <Link
            key={l.id}
            to="/listing/$id"
            params={{ id: l.id }}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border bg-card p-2"
          >
            <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
              {firstImg(l.listing_images) && (
                <StorageImage bucket="listings" path={firstImg(l.listing_images)} alt="" className="size-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{l.title}</p>
              <p className="text-sm font-black text-accent">{formatPrice(Number(l.price), l.currency, lang)}</p>
            </div>
          </Link>
        ))}
        {recent && recent.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("emptyListings")}</p>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
