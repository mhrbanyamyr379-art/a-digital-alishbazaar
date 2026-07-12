import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatPrice, timeAgo } from "@/lib/format";
import { listingImg } from "@/lib/storage";
import { provinceById } from "@/data/provinces";
import { cn } from "@/lib/utils";

export interface ListingCardData {
  id: string;
  title: string;
  price: number;
  currency: string;
  province: string;
  city: string | null;
  created_at: string;
  image?: string | null;
  is_featured?: boolean;
}

export function ListingCard({
  listing,
  index = 0,
  isFavorite,
  onToggleFavorite,
}: {
  listing: ListingCardData;
  index?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}) {
  const { lang, locName, t } = useI18n();
  const prov = provinceById(listing.province);
  const img = listingImg(listing.image);

  return (
    <Link
      to="/listing/$id"
      params={{ id: listing.id }}
      className="animate-listing group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {img ? (
          <img
            src={img}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            {t("appName")}
          </div>
        )}
        {listing.is_featured && (
          <span className="absolute top-2 end-2 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
            ★
          </span>
        )}
        {onToggleFavorite && (
          <button
            type="button"
            aria-label={t("favorites")}
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(listing.id);
            }}
            className="absolute top-2 start-2 flex size-8 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-black/40"
          >
            <Heart className={cn("size-4", isFavorite && "fill-accent text-accent")} />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="font-display text-base font-black leading-none tracking-tight">
          {formatPrice(listing.price, listing.currency, lang)}
        </div>
        <h3 className="line-clamp-2 text-xs font-bold leading-snug">{listing.title}</h3>
        <div className="mt-auto flex items-center justify-between border-t border-border pt-2 text-[10px] font-mono text-muted-foreground">
          <span className="truncate">{prov ? locName(prov) : listing.city}</span>
          <span className="shrink-0 ps-1">{timeAgo(listing.created_at, lang)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="mt-2 flex justify-between border-t border-border pt-2">
          <div className="h-2 w-10 animate-pulse rounded bg-muted" />
          <div className="h-2 w-8 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
