import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Star,
  MapPin,
  Loader2,
  Share2,
  Flag,
  MessageCircle,
  LayoutGrid,
  List as ListIcon,
  Package,
  CheckCircle2,
  ShieldCheck,
  Clock,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { StorageImage } from "@/components/StorageImage";
import { toLocalDigits, timeAgo } from "@/lib/format";
import { provinceById } from "@/data/provinces";
import { CATEGORIES, categoryById } from "@/data/categories";
import { TopBar } from "@/components/TopBar";
import { ListingCard, ListingCardSkeleton, type ListingCardData } from "@/components/ListingCard";
import { useStartChat } from "@/hooks/useStartChat";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/seller/$id")({
  component: SellerPage,
});

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface SellerListing extends ListingCardData {
  status: string;
  category: string;
}

type SortKey = "newest" | "oldest" | "price_low" | "price_high";

function SellerPage() {
  const { id } = Route.useParams();
  const { t, lang, locName, dir } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { startChat, starting } = useStartChat();
  const isSelfSeller = user?.id === id;

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<SortKey>("newest");
  const [catFilter, setCatFilter] = useState<string>("all");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["seller", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url,bio,province,rating_avg,rating_count,is_banned,created_at,updated_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: listings, isLoading: listingsLoading, error: listingsError, refetch: refetchListings } = useQuery({
    queryKey: ["seller-listings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,price,currency,province,city,created_at,is_featured,status,category,listing_images(url,position)")
        .eq("seller_id", id)
        .in("status", ["active", "sold"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((l): SellerListing => {
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
          status: l.status,
          category: l.category,
        };
      });
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["seller-reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id,reviewer_id,rating,comment,created_at")
        .eq("seller_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
  });

  const activeListings = useMemo(() => (listings ?? []).filter((l) => l.status === "active"), [listings]);
  const soldListings = useMemo(() => (listings ?? []).filter((l) => l.status === "sold"), [listings]);

  const availableCategories = useMemo(() => {
    const set = new Set(activeListings.map((l) => l.category));
    return CATEGORIES.filter((c) => set.has(c.id));
  }, [activeListings]);

  const filteredSorted = useMemo(() => {
    let arr = activeListings.slice();
    if (catFilter !== "all") arr = arr.filter((l) => l.category === catFilter);
    switch (sort) {
      case "oldest":
        arr.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
        break;
      case "price_low":
        arr.sort((a, b) => a.price - b.price);
        break;
      case "price_high":
        arr.sort((a, b) => b.price - a.price);
        break;
      default:
        arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    return arr;
  }, [activeListings, catFilter, sort]);

  const submitReview = async () => {
    if (!user) return navigate({ to: "/auth" });
    if (user.id === id) {
      toast.error(t("cantReviewSelf"));
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("reviews")
      .upsert({ seller_id: id, reviewer_id: user.id, rating, comment }, { onConflict: "seller_id,reviewer_id" });
    setSaving(false);
    if (error) toast.error(t("errorTitle"));
    else {
      toast.success(t("reviewSubmitted"));
      setComment("");
      qc.invalidateQueries({ queryKey: ["seller-reviews", id] });
      qc.invalidateQueries({ queryKey: ["seller", id] });
    }
  };

  const shareProfile = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = profile?.display_name ?? "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* cancelled */
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast.success(t("saved"));
    }
  };

  const startChatWithSeller = () => {
    if (isSelfSeller) return;
    // Chats are listing-scoped; anchor to the seller's newest active listing when there is one.
    startChat({ sellerId: id, listingId: activeListings[0]?.id ?? null });
  };


  const reportSeller = () => {
    if (!user) return navigate({ to: "/auth" });
    toast.success(t("saved"));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="animate-pulse space-y-4 p-4">
          <div className="flex items-center gap-4">
            <div className="size-20 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-1/2 rounded bg-muted" />
              <div className="h-3 w-1/3 rounded bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-16 rounded-xl bg-muted" />
            <div className="h-16 rounded-xl bg-muted" />
            <div className="h-16 rounded-xl bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ListingCardSkeleton />
            <ListingCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <p className="py-24 text-center text-sm text-muted-foreground">{t("emptyListings")}</p>
      </div>
    );
  }

  const prov = provinceById(profile.province);
  const canReview = user && user.id !== id;
  const isSelf = user?.id === id;
  const memberSinceLabel = new Date(profile.created_at).toLocaleDateString(
    lang === "en" ? "en-US" : lang === "fa" ? "fa-AF" : "ps-AF",
    { year: "numeric", month: "long" },
  );

  return (
    <div className="min-h-screen bg-background pb-16">
      <TopBar title={profile.display_name} />

      {/* Header */}
      <div className="relative bg-gradient-to-b from-primary to-primary/85 px-4 pb-6 pt-5 text-primary-foreground">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="size-20 overflow-hidden rounded-full bg-white/10 ring-2 ring-white/25 shadow-lg">
              {profile.avatar_url ? (
                <StorageImage bucket="avatars" path={profile.avatar_url} alt={profile.display_name} className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-3xl font-black">
                  {profile.display_name?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-black leading-tight truncate">{profile.display_name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-primary-foreground/85">
              {profile.rating_count > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-accent text-accent" />
                  <span className="font-semibold">{toLocalDigits(profile.rating_avg.toFixed(1), lang)}</span>
                  <span className="opacity-75">({toLocalDigits(profile.rating_count, lang)})</span>
                </span>
              )}
              {prov && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {locName(prov)}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-primary-foreground/70">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {t("memberSince")} {memberSinceLabel}
              </span>
              {profile.updated_at && (
                <span className="opacity-90">
                  {t("lastActive")}: {timeAgo(profile.updated_at, lang)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact actions */}
        {!isSelf && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={startChatWithSeller}
              disabled={starting}
              className="flex flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-primary shadow-sm transition-transform active:scale-95 disabled:opacity-70"
            >
              {starting ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
              {t("chat")}
            </button>
            <button
              onClick={shareProfile}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 py-2.5 text-sm font-bold text-white backdrop-blur-md transition-colors hover:bg-white/25"
              aria-label={t("shareProfile")}
            >
              <Share2 className="size-4" />
              <span className="hidden sm:inline">{t("share")}</span>
            </button>
            <button
              onClick={reportSeller}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 py-2.5 text-sm font-bold text-white backdrop-blur-md transition-colors hover:bg-white/25"
              aria-label={t("reportSeller")}
            >
              <Flag className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* Trust cards */}
      <div className="-mt-4 px-3">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
          <TrustCard
            icon={<Star className="size-4 fill-accent text-accent" />}
            value={profile.rating_count > 0 ? toLocalDigits(profile.rating_avg.toFixed(1), lang) : "—"}
            label={t("averageRating")}
          />
          <TrustCard
            icon={<Package className="size-4 text-primary" />}
            value={toLocalDigits(activeListings.length, lang)}
            label={t("activeListings")}
          />
          {soldListings.length > 0 ? (
            <TrustCard
              icon={<CheckCircle2 className="size-4 text-green-600" />}
              value={toLocalDigits(soldListings.length, lang)}
              label={t("soldItems")}
            />
          ) : (
            <TrustCard
              icon={<MessageSquare className="size-4 text-primary" />}
              value={toLocalDigits(profile.rating_count, lang)}
              label={t("totalReviews")}
            />
          )}
        </div>
      </div>

      {/* About */}
      {profile.bio && (
        <section className="px-4 pt-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("aboutSeller")}</h2>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{profile.bio}</p>
          </div>
        </section>
      )}

      {/* Listings */}
      <section className="px-4 pt-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("listings")} · {toLocalDigits(activeListings.length, lang)}
          </h2>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
            <button
              onClick={() => setView("grid")}
              aria-label={t("gridView")}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-colors",
                view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label={t("listView")}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-colors",
                view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <ListIcon className="size-3.5" />
            </button>
          </div>
        </div>

        {activeListings.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium"
              dir={dir}
            >
              <option value="newest">{t("newest")}</option>
              <option value="oldest">{t("memberSince")}</option>
              <option value="price_low">{t("priceLow")}</option>
              <option value="price_high">{t("priceHigh")}</option>
            </select>
            {availableCategories.length > 1 && (
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium"
                dir={dir}
              >
                <option value="all">{t("allCategories")}</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locName(c)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {listingsLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2, 3].map((i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : listingsError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 py-12 text-center">
            <p className="text-sm text-muted-foreground">{t("errorTitle")}</p>
            <button
              onClick={() => refetchListings()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {t("retry")}
            </button>
          </div>
        ) : filteredSorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 py-12 text-center">
            <Package className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">{t("emptyListings")}</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredSorted.map((l, i) => (
              <ListingCard key={l.id} listing={l} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredSorted.map((l) => (
              <ListingRow key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {/* Sold history — kept visible so buyers can see the seller's track record */}
      {soldListings.length > 0 && (
        <section className="px-4 pt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("soldListings")} · {toLocalDigits(soldListings.length, lang)}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {soldListings.map((l, i) => (
              <ListingCard key={l.id} listing={l} index={i} />
            ))}
          </div>
        </section>
      )}


      {/* Reviews */}
      <section className="px-4 pt-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("reviews")} · {toLocalDigits(reviews?.length ?? 0, lang)}
        </h2>

        {canReview && (
          <div className="mb-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                  <Star className={cn("size-6 transition-colors", n <= rating ? "fill-accent text-accent" : "text-muted-foreground/40")} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("writeReview")}
              rows={2}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={submitReview}
              disabled={saving}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {t("submit")}
            </button>
          </div>
        )}

        {reviews && reviews.length > 0 ? (
          <div className="flex flex-col gap-2">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn("size-3.5", n <= r.rating ? "fill-accent text-accent" : "text-muted-foreground/30")}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{timeAgo(r.created_at, lang)}</span>
                </div>
                {r.comment && <p className="mt-1.5 text-sm leading-relaxed">{r.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 py-8 text-center">
            <Star className="mx-auto size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm font-semibold">{t("noReviewsYet")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("noReviewsHint")}</p>
          </div>
        )}
      </section>

      {/* Safety tips */}
      <section className="px-4 pt-6">
        <div className="rounded-2xl border border-border bg-accent/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="size-4 text-accent" />
            <h2 className="text-xs font-bold uppercase tracking-wider">{t("safetyTips")}</h2>
          </div>
          <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            <li className="flex gap-2"><span className="text-accent">•</span>{t("safetyMeet")}</li>
            <li className="flex gap-2"><span className="text-accent">•</span>{t("safetyInspect")}</li>
            <li className="flex gap-2"><span className="text-accent">•</span>{t("safetyAdvance")}</li>
            <li className="flex gap-2"><span className="text-accent">•</span>{t("safetyReport")}</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function TrustCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-center">
      <div className="flex items-center gap-1 text-base font-black leading-none">
        {icon}
        <span>{value}</span>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground line-clamp-1">{label}</span>
    </div>
  );
}

function ListingRow({ listing }: { listing: SellerListing }) {
  const { lang, locName, t } = useI18n();
  const prov = provinceById(listing.province);
  const cat = categoryById(listing.category);
  return (
    <a
      href={`/listing/${listing.id}`}
      className="group flex gap-3 overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-sm transition-all hover:border-accent/40 hover:shadow-md"
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
        <StorageImage bucket="listings" path={listing.image} alt={listing.title} className="size-full object-cover" />
        {listing.status === "sold" && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-black uppercase text-white">
            {t("sold")}
          </span>
        )}
        {listing.is_featured && listing.status !== "sold" && (
          <span className="absolute top-1 end-1 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground">★</span>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between py-1 min-w-0">
        <div>
          <h3 className="line-clamp-2 text-sm font-bold leading-snug">{listing.title}</h3>
          <p className="mt-0.5 font-display text-base font-black leading-none">
            {listing.currency} {new Intl.NumberFormat("en-US").format(listing.price)}
          </p>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span className="truncate">{cat && locName(cat)}</span>
          <span className="shrink-0 ps-1">{prov ? locName(prov) : listing.city}</span>
        </div>
      </div>
    </a>
  );
}
