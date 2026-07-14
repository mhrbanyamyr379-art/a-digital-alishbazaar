import { Link } from "@tanstack/react-router";
import { Sparkles, Clock, Flame, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/data/categories";
import { ListingCard, ListingCardSkeleton, type ListingCardData } from "@/components/ListingCard";
import {
  useFeaturedListings,
  useRecentlyViewed,
} from "@/hooks/useDiscovery";
import { useAuth } from "@/lib/auth";
import { useFavoriteIds, useToggleFavorite } from "@/hooks/useFavorites";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function DiscoverySections({ onPickCategory }: { onPickCategory: (id: string) => void }) {
  const { t, locName } = useI18n();
  const { user } = useAuth();
  const featured = useFeaturedListings();
  const viewed = useRecentlyViewed();
  const { data: favIds } = useFavoriteIds();
  const toggleFav = useToggleFavorite();
  const navigate = useNavigate();

  const favorite = (id: string) =>
    user
      ? toggleFav.mutate({ id, isFav: !!favIds?.has(id) })
      : navigate({ to: "/auth" });

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Popular categories */}
      <section>
        <SectionHeader icon={<Flame className="size-4 text-accent" />} title={t("popularCategories")} />
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 pt-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onPickCategory(c.id)}
              className={cn(
                "flex w-24 flex-none flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-center transition-all",
                "hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-md",
              )}
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                <c.icon className="size-6" />
              </div>
              <span className="line-clamp-2 text-[11px] font-bold leading-tight">{locName(c)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured strip */}
      {(featured.isLoading || (featured.data?.length ?? 0) > 0) && (
        <section>
          <SectionHeader icon={<Sparkles className="size-4 text-accent" />} title={t("featuredListings")} />
          <HorizontalStrip
            loading={featured.isLoading}
            items={featured.data ?? []}
            favIds={favIds}
            onFav={favorite}
          />
        </section>
      )}

      {/* Recently viewed */}
      {user && (viewed.isLoading || (viewed.data?.length ?? 0) > 0) && (
        <section>
          <SectionHeader icon={<Clock className="size-4 text-accent" />} title={t("recentlyViewed")} />
          <HorizontalStrip
            loading={viewed.isLoading}
            items={viewed.data ?? []}
            favIds={favIds}
            onFav={favorite}
          />
        </section>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, href }: { icon: React.ReactNode; title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between px-4">
      <h2 className="flex items-center gap-2 font-display text-base font-black tracking-tight">
        {icon}
        {title}
      </h2>
      {href && (
        <Link to={href} className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
          <ChevronRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

function HorizontalStrip({
  loading,
  items,
  favIds,
  onFav,
}: {
  loading: boolean;
  items: ListingCardData[];
  favIds: Set<string> | undefined;
  onFav: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 pt-3">
      {loading &&
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-40 flex-none">
            <ListingCardSkeleton />
          </div>
        ))}
      {items.map((l, i) => (
        <div key={l.id} className="w-40 flex-none">
          <ListingCard
            listing={l}
            index={i}
            isFavorite={favIds?.has(l.id)}
            onToggleFavorite={() => onFav(l.id)}
          />
        </div>
      ))}
    </div>
  );
}
