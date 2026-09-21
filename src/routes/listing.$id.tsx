import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Heart, Share2, Flag, Phone, MessageCircle, Star, Eye, MapPin, Loader2, Pencil, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { dbErrorKey } from "@/lib/db-errors";
import { formatPrice, timeAgo, toLocalDigits } from "@/lib/format";
import { StorageImage } from "@/components/StorageImage";
import { provinceById } from "@/data/provinces";
import { categoryById, CONDITIONS } from "@/data/categories";
import { subcategoryById } from "@/data/subcategories";
import { TopBar } from "@/components/TopBar";
import { useFavoriteIds, useToggleFavorite } from "@/hooks/useFavorites";
import { ListingCard } from "@/components/ListingCard";
import { useStartChat } from "@/hooks/useStartChat";
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

/** Columns any visitor may read. Seller contact numbers are signed-in only. */
const PUBLIC_LISTING_COLS =
  "id,seller_id,title,description,price,currency,negotiable,category,subcategory,custom_subcategory,condition,province,city,status,view_count,is_featured,created_at,updated_at,contact_method,tags,published_at,expires_at,favorites_count";

async function fetchListing(id: string) {
  const isAuthed = !!(await supabase.auth.getSession()).data.session;
  const cols = isAuthed
    ? `${PUBLIC_LISTING_COLS},contact_phone,contact_whatsapp, listing_images(id,url,position)`
    : `${PUBLIC_LISTING_COLS}, listing_images(id,url,position)`;
  const { data: row, error } = await supabase.from("listings").select(cols).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const data = row as unknown as Record<string, unknown> & { seller_id: string };
  const { data: seller } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url,rating_avg,rating_count")
    .eq("id", data.seller_id)
    .maybeSingle();
  let phone: string | null = null;
  if (isAuthed) {
    const { data: p } = await supabase.rpc("get_seller_phone", { _seller_id: data.seller_id } as never);
    phone = (p as unknown as string | null) ?? null;
  }
  return { ...data, seller: seller ? { ...(seller as { id: string; display_name: string; avatar_url: string | null; rating_avg: number; rating_count: number }), phone } : null };
}

function ListingDetail() {
  const { id } = Route.useParams();
  const { t, locName, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startChat, starting } = useStartChat();
  const [active, setActive] = useState(0);
  const [savingStatus, setSavingStatus] = useState(false);
  const qc = useQueryClient();


  const { data: l, isLoading, isError, refetch } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListing(id),
  });

  /** Flip between active and sold. Guarded so a stale UI can never write the same status twice. */
  const setStatus = async (next: "active" | "sold") => {
    if (!user || savingStatus || !l || l.status === next) return;
    setSavingStatus(true);
    const { error } = await supabase
      .from("listings")
      .update({ status: next })
      .eq("id", id)
      .eq("seller_id", user.id)
      .neq("status", next);
    setSavingStatus(false);
    if (error) {
      toast.error(t(dbErrorKey(error)));
      return;
    }
    toast.success(t(next === "sold" ? "markSold" : "markActive"));
    await refetch();
    qc.invalidateQueries({ queryKey: ["my-listings", user.id] });
    qc.invalidateQueries({ queryKey: ["seller-listings", l.seller_id] });
  };


  const { data: favIds } = useFavoriteIds();
  const toggleFav = useToggleFavorite();
  const isFav = favIds?.has(id);

  useEffect(() => {
    if (!l) return;
    if (user) supabase.rpc("increment_listing_views", { _listing_id: id }).then(() => {});
    if (user) {
      supabase
        .from("recently_viewed")
        .upsert({ user_id: user.id, listing_id: id, viewed_at: new Date().toISOString() }, { onConflict: "user_id,listing_id" })
        .then(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l?.id]);

  const { data: related } = useQuery({
    queryKey: ["related", l?.id, l?.category, l?.subcategory, l?.province],
    enabled: !!l,
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("id,title,price,currency,province,city,subcategory,created_at,is_featured,listing_images(url,position)")
        .eq("status", "active")
        .eq("category", l!.category)
        .neq("id", l!.id)
        .order("province", { ascending: l!.province ? true : false })
        .limit(8);
      const rows = data ?? [];
      // Prioritize same-province results client-side
      rows.sort(
        (a, b) =>
          Number(b.subcategory === l!.subcategory) - Number(a.subcategory === l!.subcategory) ||
          Number(b.province === l!.province) - Number(a.province === l!.province),
      );
      return rows.slice(0, 6).map((r) => {
        const imgs = (r.listing_images ?? []) as { url: string; position: number }[];
        const first = imgs.sort((x, y) => x.position - y.position)[0];
        return {
          id: r.id,
          title: r.title,
          price: Number(r.price),
          currency: r.currency,
          province: r.province,
          city: r.city,
          created_at: r.created_at,
          is_featured: r.is_featured,
          image: first?.url ?? null,
        };
      });
    },
  });


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
          <p className="text-sm text-muted-foreground">{t(isError ? "errorTitle" : "notFoundRecord")}</p>
          {isError ? (
            <button onClick={() => refetch()} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
              {t("retry")}
            </button>
          ) : (
            <Link to="/" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
              {t("goHome")}
            </Link>
          )}
        </div>
      </div>
    );

  const imgs = ((l.listing_images ?? []) as { id: string; url: string; position: number }[]).sort(
    (a, b) => a.position - b.position,
  );
  const isSold = l.status === "sold";
  const isOwner = user?.id === l.seller_id;
  const prov = provinceById(l.province);
  const cat = categoryById(l.category);
  const sub = subcategoryById(l.category, l.subcategory);
  const cond = CONDITIONS.find((c) => c.id === l.condition);

  const seller = l.seller as {
    id: string;
    display_name: string;
    avatar_url: string | null;
    rating_avg: number;
    rating_count: number;
    phone: string | null;
  } | null;

  const listingPhone = (l.contact_phone as string | null) ?? seller?.phone ?? null;
  const listingWhatsapp =
    (l.contact_whatsapp as string | null) ?? (l.contact_phone as string | null) ?? seller?.phone ?? null;
  const phoneDigits = (listingPhone ?? "").replace(/[^\d+]/g, "");
  const waNumber = (listingWhatsapp ?? "").replace(/[^\d+]/g, "").replace(/^\+/, "").replace(/^0/, "93");
  const shareText = `${l.title} — ${window.location.origin}/listing/${l.id}`;


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
              onClick={() => toggleFav.toggle(id, !!isFav)}
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
          <StorageImage bucket="listings" path={imgs[active]?.url} alt={l.title} className="h-full w-full object-cover" />
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
              <StorageImage bucket="listings" path={im.url} alt="" className="size-full object-cover" />
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
          <span className="flex items-center gap-1">
            <Heart className="size-3.5" />
            {toLocalDigits(l.favorites_count ?? 0, lang)} {t("favoritesCount")}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {cat && (
            <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
              <cat.icon className="size-3.5" />
              {locName(cat)}
            </span>
          )}
          {sub && (
            <Link
              to="/"
              search={{ cat: l.category, sub: sub.id }}
              className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold"
            >
              {locName(sub)}
            </Link>
          )}
          {cond && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{locName(cond)}</span>}
          {(l.tags ?? []).map((tg: string) => (
            <span key={tg} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
              #{tg}
            </span>
          ))}
        </div>

        {isSold && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
            {isOwner ? t("soldByYou") : t("soldNotice")}
          </div>
        )}

        {isOwner && (
          <div className="mt-4 flex gap-2">
            <Link
              to="/edit/$id"
              params={{ id: l.id }}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-bold"
            >
              <Pencil className="size-4" />
              {t("edit")}
            </Link>
            {(l.status === "active" || isSold) && (
              <button
                type="button"
                onClick={() => setStatus(isSold ? "active" : "sold")}
                disabled={savingStatus}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-bold text-primary disabled:opacity-60"
              >
                {savingStatus ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {isSold ? t("markActive") : t("markSold")}
              </button>
            )}
          </div>
        )}


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
                <StorageImage bucket="avatars" path={seller.avatar_url} alt="" className="size-full object-cover" />
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

      {/* Related listings */}
      {related && related.length > 0 && (
        <div className="mt-8 px-4">
          <h2 className="mb-3 font-display text-base font-black tracking-tight">{t("relatedListings")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {related.map((r, i) => (
              <ListingCard key={r.id} listing={r} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Sticky contact — Chat stays available; sold listings say so first */}
      {!isOwner && (
        <div className="fixed bottom-0 left-0 z-40 w-full border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {isSold && (
            <p className="mb-2 rounded-md bg-destructive/10 px-2 py-1.5 text-center text-[11px] font-bold text-destructive">
              {t("soldNotice")}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => startChat({ sellerId: l.seller_id, listingId: l.id })}
              disabled={starting}
              className={cn(
                "flex flex-[2] items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-transform active:scale-[0.98] disabled:opacity-60",
                isSold ? "bg-secondary text-foreground" : "bg-accent text-accent-foreground",
              )}
            >
              {starting ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
              {t("chat")}
            </button>

            <ContactAction
              label={t("call")}
              icon={<Phone className="size-4" />}
              href={phoneDigits ? `tel:${phoneDigits}` : null}
              disabledMsg={t("noPhone")}
            />
            <ContactAction
              label={t("whatsapp")}
              icon={<WhatsAppIcon />}
              href={waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(shareText)}` : null}
              disabledMsg={t("noPhone")}
              external
            />
            <ContactAction
              label={t("telegram")}
              icon={<TelegramIcon />}
              href={
                phoneDigits
                  ? `https://t.me/${phoneDigits.startsWith("+") ? phoneDigits : `+${waNumber}`}`
                  : null
              }
              disabledMsg={t("noPhone")}
              external
            />
          </div>
        </div>
      )}

    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.16c-.24.68-1.4 1.3-1.94 1.35-.5.05-1.13.07-1.82-.11-.42-.11-.96-.29-1.65-.59-2.9-1.25-4.79-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.26-.29.57-.36.76-.36h.55c.17 0 .42-.07.65.5.24.58.81 2 .88 2.14.07.15.12.32.02.51-.1.19-.15.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.3-.12.58.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.45.29.14.46.12.63-.07.17-.19.72-.85.91-1.14.19-.29.38-.24.65-.14.26.09 1.68.79 1.97.94.29.14.48.22.55.34.07.12.07.7-.17 1.37Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M21.94 4.6 18.9 19.2c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.94.46l.33-4.77 8.68-7.84c.38-.34-.08-.53-.58-.19L6.99 13.1l-4.62-1.45c-1-.31-1.02-1 .21-1.48l18.06-6.96c.84-.31 1.57.19 1.3 1.39Z" />
    </svg>
  );
}

function ContactAction({
  label,
  icon,
  href,
  disabledMsg,
  external,
}: {
  label: string;
  icon: React.ReactNode;
  href: string | null;
  disabledMsg: string;
  external?: boolean;
}) {
  if (!href) {
    return (
      <button
        type="button"
        onClick={() => toast.info(disabledMsg)}
        aria-label={label}
        className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground opacity-60"
      >
        {icon}
      </button>
    );
  }
  return (
    <a
      href={href}
      aria-label={label}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border transition-colors hover:bg-secondary"
    >
      {icon}
    </a>
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
