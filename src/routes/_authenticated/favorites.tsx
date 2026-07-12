import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";

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
    image: first?.url ?? null,
  };
}

function FavoritesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: favIds } = useFavoriteIds();
  const toggleFav = useToggleFavorite();

  const { data, isLoading } = useQuery({
    queryKey: ["favorite-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: favs } = await supabase.from("favorites").select("listing_id").eq("user_id", user!.id);
      const ids = (favs ?? []).map((f) => f.listing_id);
      if (ids.length === 0) return [];
      const { data: rows, error } = await supabase
        .from("listings")
        .select("id,title,price,currency,province,city,created_at,is_featured,listing_images(url,position)")
        .in("id", ids);
      if (error) throw error;
      return (rows ?? []).map(mapRow);
    },
  });

  return (
    <div className="min-h-screen bg-background pb-32">
      <BrandTopBar right={<LanguageSwitcher />} />
      <div className="px-4 pt-4">
        <h1 className="font-display text-xl font-black">{t("favorites")}</h1>
      </div>
      <main className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)}
        {data && data.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
              <Heart className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">{t("emptyFavorites")}</p>
          </div>
        )}
        {data?.map((l, i) => (
          <ListingCard
            key={l.id}
            listing={l}
            index={i}
            isFavorite={favIds?.has(l.id)}
            onToggleFavorite={(id) => toggleFav.mutate({ id, isFav: !!favIds?.has(id) })}
          />
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
