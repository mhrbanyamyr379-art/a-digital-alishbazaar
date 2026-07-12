import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Heart, Share2, Flag, Phone, MessageCircle, Star, Eye, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { formatPrice, timeAgo, toLocalDigits } from "@/lib/format";
import { listingImg, avatarImg } from "@/lib/storage";
import { provinceById } from "@/data/provinces";
import { categoryById, CONDITIONS } from "@/data/categories";
import { TopBar } from "@/components/TopBar";
import { useFavoriteIds, useToggleFavorite } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/listing/$id")({
  component: ListingDetail,
});

async function fetchListing(id: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("*, listing_images(id,url,position)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: seller } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url,rating_avg,rating_count,phone")
    .eq("id", data.seller_id)
    .maybeSingle();
  return { ...data, seller };
}

function ListingDetail() {
  const { id } = Route.useParams();
  const { t, locName, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);

  const { data: l, isLoading, isError, refetch } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListing(id),
  });

  const { data: favIds } = useFavoriteIds();
  const toggleFav = useToggleFavorite();
  const isFav = favIds?.has(id);

  useEffect(() => {
    if (!l) return;
    supabase.rpc; // noop guard
    supabase.from("listings").update({ view_count: (l.view_count ?? 0) + 1 }).eq("id", id).then(() => {});
    if (user) {
      supabase
        .from("recently_viewed")
        .upsert({ user_id: user.id, listing_id: id, viewed_at: new Date().toISOString() }, { onConflict: "user_id,listing_id" })
        .then(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l?.id]);

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );

  if (isError || !l)
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="text-sm text-muted-foreground">{t("emptyListings")}</p>
          <button onClick={() => refetch()} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            {t("retry")}
          </button>
        </div>
      </div>
    );

  const imgs = ((l.listing_images ?? []) as { id: string; url: string; position: number }[]).sort(
    (a, b) => a.position - b.position,
  );
  const prov = provinceById(l.province);
  const cat = categoryById(l.category);
  const cond = CONDITIONS.find((c) => c.id === l.condition);
  const seller = l.seller as {
    id: string;
    display_name: string;
    avatar_url: string | null;
    rating_avg: number;
    rating_count: number;
    phone: string | null;
  } | null;

  const startChat = async () => {
    if (!user) return navigate({ to: "/auth" });
    if (user.id === l.seller_id) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", l.id)
      .eq("buyer_id", user.id)
      .eq("seller_id", l.seller_id)
      .maybeSingle();
    let convId = existing?.id;
    if (!convId) {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ listing_id: l.id, buyer_id: user.id, seller_id: l.seller_id })
        .select("id")
        .single();
      if (error) {
        toast.error(t("errorTitle"));
        return;
      }
      convId = data.id;
    }
    navigate({ to: "/chat/$id", params: { id: convId } });
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: l.title, url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(t("saved"));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar
        right={
          <div className="flex items-center gap-1">
            <button onClick={share} aria-label={t("share")} className="flex size-9 items-center justify-center rounded-full hover:bg-secondary">
              <Share2 className="size-5" />
            </button>
            <button
              onClick={() => (user ? toggleFav.mutate({ id, isFav: !!isFav }) : navigate({ to: "/auth" }))}
              aria-label={t("favorites")}
              className="flex size-9 items-center justify-center rounded-full hover:bg-secondary"
            >
              <Heart className={cn("size-5", isFav && "fill-accent text-accent")} />
            </button>
          </div>
        }
      />

      {/* Gallery */}
      <div className="relative aspect-square w-full bg-muted">
        {imgs.length > 0 ? (
          <img src={listingImg(imgs[active]?.url)} alt={l.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">{t("appName")}</div>
        )}
        {l.status !== "active" && (
          <span className="absolute end-3 top-3 rounded-md bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
            {l.status === "sold" ? t("sold") : t(l.status === "pending" ? "pending" : "active")}
          </span>
        )}
      </div>
      {imgs.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto p-3">
          {imgs.map((im, i) => (
            <button
              key={im.id}
              onClick={() => setActive(i)}
              className={cn(
                "size-16 flex-none overflow-hidden rounded-lg border-2",
                i === active ? "border-accent" : "border-transparent",
              )}
            >
              <img src={listingImg(im.url)} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="px-4 pt-3">
        <div className="font-display text-2xl font-black tracking-tight">
          {formatPrice(Number(l.price), l.currency, lang)}
          {l.negotiable && (
            <span className="ms-2 align-middle text-xs font-semibold text-accent">({t("negotiable")})</span>
          )}
        </div>
        <h1 className="mt-1 text-lg font-bold leading-snug">{l.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {prov ? locName(prov) : ""}{l.city ? ` · ${l.city}` : ""}
          </span>
          <span>{timeAgo(l.created_at, lang)}</span>
          <span className="flex items-center gap-1">
            <Eye className="size-3.5" />
            {toLocalDigits(l.view_count ?? 0, lang)} {t("view")}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {cat && (
            <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
              <cat.icon className="size-3.5" />
              {locName(cat)}
            </span>
          )}
          {cond && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{locName(cond)}</span>}
        </div>

        {l.description && (
          <div className="mt-5">
            <h2 className="mb-1.5 text-sm font-bold">{t("description")}</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{l.description}</p>
          </div>
        )}

        {/* Seller */}
        {seller && (
          <Link
            to="/seller/$id"
            params={{ id: seller.id }}
            className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="size-11 overflow-hidden rounded-full bg-secondary">
              {seller.avatar_url ? (
                <img src={avatarImg(seller.avatar_url)} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center font-bold">
                  {seller.display_name?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">{seller.display_name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="size-3.5 fill-accent text-accent" />
                {toLocalDigits(seller.rating_avg.toFixed(1), lang)} · {toLocalDigits(seller.rating_count, lang)} {t("reviews")}
              </p>
            </div>
            <span className="text-xs font-semibold text-accent">{t("postedBy")} →</span>
          </Link>
        )}

        <ReportDialog listingId={l.id} />
      </div>

      {/* Sticky contact */}
      {user?.id !== l.seller_id && (
        <div className="fixed bottom-0 left-0 z-40 flex w-full gap-3 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {seller && (
            <a
              href={`tel:${(l.profiles as { phone?: string })?.phone ?? ""}`}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-bold",
                !(l.profiles as { phone?: string })?.phone && "pointer-events-none opacity-50",
              )}
            >
              <Phone className="size-4" />
              {t("call")}
            </a>
          )}
          <button
            onClick={startChat}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent py-3 text-sm font-bold text-accent-foreground"
          >
            <MessageCircle className="size-4" />
            {t("message")}
          </button>
        </div>
      )}
    </div>
  );
}

function ReportDialog({ listingId }: { listingId: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  const submit = async () => {
    if (!user) return navigate({ to: "/auth" });
    const { error } = await supabase
      .from("reports")
      .insert({ reporter_id: user.id, listing_id: listingId, reason, details });
    if (error) toast.error(t("errorTitle"));
    else {
      toast.success(t("saved"));
      setOpen(false);
      setReason("");
      setDetails("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Flag className="size-3.5" />
        {t("report")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("report")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reportReason")}
            className="rounded-lg border border-border bg-background p-3 text-sm"
          />
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t("description")}
            rows={3}
            className="rounded-lg border border-border bg-background p-3 text-sm"
          />
          <button
            onClick={submit}
            disabled={!reason}
            className="rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {t("submit")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
