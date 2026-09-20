import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, AlertTriangle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ListingCard, ListingCardSkeleton, type ListingCardData } from "@/components/ListingCard";
import { BottomNav } from "@/components/BottomNav";
import { BrandTopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useFavoriteIds, useToggleFavorite } from "@/hooks/useFavorites";

export const Route = createFileRoute("/_authenticated/favorites")({
  component: FavoritesPage,
  head: () => ({
    meta: [
      { title: "Saved listings — Alish" },
      { name: "description", content: "Your saved listings on Alish: revisit the ads you bookmarked across Afghanistan." },
      { property: "og:title", content: "Saved listings — Alish" },
      { property: "og:description", content: "Your saved listings on Alish." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function mapRow(l: {
  id: string;
  title: string;
  price: number;
  currency: string;
  province: string;
  city: string | null;
  created_at: string;
  is_featured: boolean;
  status?: string | null;
  listing_images: { url: string; position: number }[];
}): ListingCardData {
  const first = (l.listing_images ?? []).sort((a, b) => a.position - b.position)[0];
  return {
    id: l.id,
    title: l.title,
    price: Number(l.price),
    currency: l.currency,
    province: l.province,
    city: l.city,
    created_at: l.created_at,
    is_featured: l.is_featured,
    status: l.status ?? null,
    image: first?.url ?? null,
  };
}

function FavoritesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: favIds } = useFavoriteIds();
  const toggleFav = useToggleFavorite();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["favorite-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: favs, error: favErr } = await supabase
        .from("favorites")
        .select("listing_id,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (favErr) throw favErr;

      const ids = (favs ?? []).map((f) => f.listing_id);
      if (ids.length === 0) return { listings: [] as ListingCardData[], unavailable: 0 };

      const { data: rows, error: rowErr } = await supabase
        .from("listings")
        .select("id,title,price,currency,province,city,created_at,is_featured,status,listing_images(url,position)")
        .in("id", ids);
      if (rowErr) throw rowErr;

      // Keep the user's saved order; anything the user can no longer read
      // (deleted, rejected, hidden) is reported instead of rendered broken.
      const byId = new Map((rows ?? []).map((r) => [r.id, mapRow(r)]));
      const listings = ids.map((id) => byId.get(id)).filter((l): l is ListingCardData => !!l);
      return { listings, unavailable: ids.length - listings.length };
    },
  });

  return (
    <div className="min-h-screen bg-background pb-32">
      <BrandTopBar right={<LanguageSwitcher />} />
      <div className="px-4 pt-4">
        <h1 className="font-display text-xl font-black">{t("favorites")}</h1>
      </div>

      {error && (
        <div className="m-3 flex flex-col items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
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

      {!error && (data?.unavailable ?? 0) > 0 && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-border bg-secondary p-3 text-xs text-muted-foreground">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{t("listingUnavailable")}</span>
        </div>
      )}

      <main className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)}
        {!error && data && data.listings.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
              <Heart className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">{t("emptyFavorites")}</p>
          </div>
        )}
        {data?.listings.map((l, i) => (
          <ListingCard
            key={l.id}
            listing={l}
            index={i}
            isFavorite={favIds?.has(l.id)}
            onToggleFavorite={(id) => toggleFav.toggle(id, !!favIds?.has(id))}
          />
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
