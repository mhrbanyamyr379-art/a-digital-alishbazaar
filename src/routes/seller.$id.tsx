import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Star, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { StorageImage } from "@/components/StorageImage";
import { toLocalDigits } from "@/lib/format";
import { provinceById } from "@/data/provinces";
import { TopBar } from "@/components/TopBar";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
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

function SellerPage() {
  const { id } = Route.useParams();
  const { t, lang, locName } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

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

  const { data: listings } = useQuery({
    queryKey: ["seller-listings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,price,currency,province,city,created_at,is_featured,listing_images(url,position)")
        .eq("seller_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((l): ListingCardData => {
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
      });
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["seller-reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("seller_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
  });

  const submitReview = async () => {
    if (!user) return navigate({ to: "/auth" });
    setSaving(true);
    const { error } = await supabase
      .from("reviews")
      .upsert({ seller_id: id, reviewer_id: user.id, rating, comment }, { onConflict: "seller_id,reviewer_id" });
    setSaving(false);
    if (error) toast.error(t("errorTitle"));
    else {
      toast.success(t("saved"));
      setComment("");
      qc.invalidateQueries({ queryKey: ["seller-reviews", id] });
      qc.invalidateQueries({ queryKey: ["seller", id] });
    }
  };

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );

  if (!profile)
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <p className="py-24 text-center text-sm text-muted-foreground">{t("emptyListings")}</p>
      </div>
    );

  const prov = provinceById(profile.province);
  const canReview = user && user.id !== id;

  return (
    <div className="min-h-screen bg-background pb-12">
      <TopBar title={profile.display_name} />

      <div className="bg-primary px-4 pb-6 pt-4 text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="size-16 overflow-hidden rounded-full bg-white/10 ring-2 ring-white/20">
            {profile.avatar_url ? (
              <StorageImage bucket="avatars" path={profile.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-2xl font-black">
                {profile.display_name?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl font-black">{profile.display_name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-primary-foreground/80">
              <span className="flex items-center gap-1">
                <Star className="size-4 fill-accent text-accent" />
                {toLocalDigits(profile.rating_avg.toFixed(1), lang)} ({toLocalDigits(profile.rating_count, lang)})
              </span>
              {prov && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {locName(prov)}
                </span>
              )}
            </div>
          </div>
        </div>
        {profile.bio && <p className="mt-3 text-sm text-primary-foreground/80">{profile.bio}</p>}
      </div>

      {/* Listings */}
      <div className="px-4 pt-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {t("listings")} ({toLocalDigits(listings?.length ?? 0, lang)})
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3">
        {listings?.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}
      </div>

      {/* Reviews */}
      <div className="px-4 pt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("reviews")}</h2>

        {canReview && (
          <div className="mb-4 rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}>
                  <Star className={cn("size-6", n <= rating ? "fill-accent text-accent" : "text-muted-foreground")} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("writeReview")}
              rows={2}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm"
            />
            <button
              onClick={submitReview}
              disabled={saving}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {t("submit")}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 pb-6">
          {reviews?.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={cn("size-3.5", n <= r.rating ? "fill-accent text-accent" : "text-muted-foreground")} />
                ))}
              </div>
              {r.comment && <p className="mt-1.5 text-sm">{r.comment}</p>}
            </div>
          ))}
          {reviews && reviews.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("reviews")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
