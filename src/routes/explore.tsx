import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Share2, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { formatPrice, timeAgo } from "@/lib/format";
import { StorageImage } from "@/components/StorageImage";
import { BrandTopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "کشف | الیش — Explore Alish" },
      {
        name: "description",
        content:
          "جدیدترین آگهی‌های خرید و فروش در سراسر افغانستان را به صورت فید بی‌پایان کشف کنید — Discover the newest listings across Afghanistan in an endless feed.",
      },
      { property: "og:title", content: "کشف | الیش — Explore Alish" },
      {
        property: "og:description",
        content: "جدیدترین آگهی‌های خرید و فروش در سراسر افغانستان را کشف کنید.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explore,
});

const PAGE = 10;
const COLS =
  "id,title,description,price,currency,created_at,seller_id,listing_images(url,position)";

interface FeedComment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  authorName: string;
  authorAvatar: string | null;
}

interface FeedListing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  created_at: string;
  seller_id: string;
  images: string[];
  sellerName: string;
  sellerAvatar: string | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  shareCount: number;
  comments: FeedComment[];
}

async function fetchFeed(page: number, userId: string | null): Promise<{
  items: FeedListing[];
  nextPage: number | null;
}> {
  const from = page * PAGE;
  const to = from + PAGE - 1;
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("listings")
    .select(COLS)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;

  const rows = data ?? [];
  if (rows.length === 0) return { items: [], nextPage: null };

  const ids = rows.map((r) => r.id);
  const sellerIds = Array.from(new Set(rows.map((r) => r.seller_id as string)));

  const [profilesRes, likesRes, commentsRes, sharesRes] = await Promise.all([
    supabase.from("profiles").select("id,display_name,avatar_url").in("id", sellerIds),
    supabase.from("listing_likes").select("listing_id,user_id").in("listing_id", ids),
    supabase
      .from("listing_comments")
      .select("id,listing_id,user_id,body,created_at")
      .in("listing_id", ids)
      .order("created_at", { ascending: false }),
    supabase.from("listing_shares").select("listing_id").in("listing_id", ids),
  ]);

  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [
      p.id,
      { name: p.display_name, avatar: p.avatar_url },
    ]),
  );

  const likesByListing = new Map<string, { count: number; mine: boolean }>();
  for (const l of likesRes.data ?? []) {
    const cur = likesByListing.get(l.listing_id) ?? { count: 0, mine: false };
    cur.count += 1;
    if (userId && l.user_id === userId) cur.mine = true;
    likesByListing.set(l.listing_id, cur);
  }

  const shareCountByListing = new Map<string, number>();
  for (const s of sharesRes.data ?? []) {
    shareCountByListing.set(s.listing_id, (shareCountByListing.get(s.listing_id) ?? 0) + 1);
  }

  type CommentRow = NonNullable<typeof commentsRes.data>[number];
  const commentsByListing = new Map<string, CommentRow[]>();
  for (const c of commentsRes.data ?? []) {
    const arr = commentsByListing.get(c.listing_id) ?? [];
    arr.push(c);
    commentsByListing.set(c.listing_id, arr);
  }

  // Batch-load commenter profiles for the visible previews.
  const commenterIds = new Set<string>();
  for (const arr of commentsByListing.values()) {
    for (const c of arr.slice(0, 3)) commenterIds.add(c.user_id);
  }
  const missing = [...commenterIds].filter((id) => !profileMap.has(id));
  if (missing.length > 0) {
    const { data: extra } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url")
      .in("id", missing);
    for (const p of extra ?? []) {
      profileMap.set(p.id, { name: p.display_name, avatar: p.avatar_url });
    }
  }

  const items: FeedListing[] = rows.map((l) => {
    const imgs = ((l.listing_images ?? []) as { url: string; position: number }[])
      .sort((a, b) => a.position - b.position)
      .map((i) => i.url);
    const seller = profileMap.get(l.seller_id as string);
    const allComments = commentsByListing.get(l.id) ?? [];
    const preview = allComments
      .slice(0, 3)
      .reverse()
      .map((c) => ({
        id: c.id,
        user_id: c.user_id,
        body: c.body,
        created_at: c.created_at,
        authorName: profileMap.get(c.user_id)?.name ?? "—",
        authorAvatar: profileMap.get(c.user_id)?.avatar ?? null,
      }));
    const likes = likesByListing.get(l.id);
    return {
      id: l.id,
      title: l.title,
      description: l.description,
      price: Number(l.price),
      currency: l.currency,
      created_at: l.created_at,
      seller_id: l.seller_id as string,
      images: imgs,
      sellerName: seller?.name ?? "—",
      sellerAvatar: seller?.avatar ?? null,
      likeCount: likes?.count ?? 0,
      likedByMe: likes?.mine ?? false,
      commentCount: allComments.length,
      shareCount: shareCountByListing.get(l.id) ?? 0,
      comments: preview,
    };
  });

  const nextPage = rows.length === PAGE ? page + 1 : null;
  return { items, nextPage };
}

function Explore() {
  const { t, lang } = useI18n();
  const { user } = useAuth();

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["explore-feed", user?.id ?? "guest"],
      queryFn: ({ pageParam }) => fetchFeed(pageParam, user?.id ?? null),
      initialPageParam: 0,
      getNextPageParam: (last) => last.nextPage,
    });

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) fetchNextPage();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="min-h-screen bg-background pb-32">
      <BrandTopBar right={<LanguageSwitcher />} />

      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-3 py-4">
        <h1 className="font-display text-lg font-black">{t("explore")}</h1>

        {isLoading && (
          <>
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 animate-pulse rounded-full bg-muted" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                    <div className="h-2 w-1/5 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
              </div>
            ))}
          </>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm font-bold">{t("errorTitle")}</p>
            <button
              onClick={() => refetch()}
              className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
            >
              {t("retry")}
            </button>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-display text-base font-black">{t("emptyExplore")}</p>
            <p className="text-xs text-muted-foreground">{t("emptyExploreHint")}</p>
            <Link
              to="/sell"
              className="mt-2 rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-foreground"
            >
              {t("sellSomething")}
            </Link>
          </div>
        )}

        {items.map((listing) => (
          <ExploreCard key={listing.id} listing={listing} lang={lang} />
        ))}

        {hasNextPage && (
          <div ref={sentinelRef} className="flex justify-center py-2">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="rounded-full border border-border bg-card px-5 py-2 text-sm font-bold text-muted-foreground"
            >
              {isFetchingNextPage ? t("loading") : t("loadMore")}
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function ExploreCard({ listing, lang }: { listing: FeedListing; lang: "fa" | "ps" | "en" }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [expanded, setExpanded] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [commentInput, setCommentInput] = useState("");
  const [sending, setSending] = useState(false);
  const [liking, setLiking] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["explore-feed"] });

  const onCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    setPhotoIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  };

  const toggleLike = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (liking) return;
    setLiking(true);
    try {
      if (listing.likedByMe) {
        await supabase
          .from("listing_likes")
          .delete()
          .eq("listing_id", listing.id)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("listing_likes")
          .insert({ listing_id: listing.id, user_id: user.id });
      }
      refresh();
    } finally {
      setLiking(false);
    }
  };

  const submitComment = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    const body = commentInput.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from("listing_comments")
        .insert({ listing_id: listing.id, user_id: user.id, body });
      if (!error) {
        setCommentInput("");
        toast.success(t("commentPosted"));
        refresh();
      }
    } finally {
      setSending(false);
    }
  };

  const deleteComment = async (id: string) => {
    await supabase.from("listing_comments").delete().eq("id", id);
    refresh();
  };

  const share = async () => {
    const url = `${window.location.origin}/listing/${listing.id}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: listing.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t("linkCopied"));
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t("linkCopied"));
      } catch {
        /* clipboard blocked */
      }
    }
    await supabase
      .from("listing_shares")
      .insert({ listing_id: listing.id, user_id: user?.id ?? null });
    refresh();
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Header: seller */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <Link
          to="/seller/$id"
          params={{ id: listing.seller_id }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div className="size-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
            <StorageImage
              bucket="avatars"
              path={listing.sellerAvatar}
              alt={listing.sellerName}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold">{listing.sellerName}</span>
            <span className="text-[11px] text-muted-foreground">
              {timeAgo(listing.created_at, lang)}
            </span>
          </div>
        </Link>
      </div>

      {/* Description above photos */}
      {listing.description && (
        <div className="px-4 pt-2">
          <p
            className={cn(
              "whitespace-pre-line text-sm leading-relaxed text-foreground/90",
              !expanded && "line-clamp-3",
            )}
          >
            {listing.description}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-0.5 text-xs font-bold text-primary"
          >
            {expanded ? t("showLess") : t("more")}
          </button>
        </div>
      )}

      {/* Photo carousel */}
      {listing.images.length > 0 && (
        <div className="relative mt-3">
          <div
            ref={carouselRef}
            onScroll={onCarouselScroll}
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          >
            {listing.images.map((img, i) => (
              <Link
                key={i}
                to="/listing/$id"
                params={{ id: listing.id }}
                className="aspect-[4/3] w-full shrink-0 snap-center overflow-hidden bg-muted"
              >
                <StorageImage
                  bucket="listings"
                  path={img}
                  alt={listing.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </Link>
            ))}
          </div>
          {listing.images.length > 1 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {listing.images.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-1.5 rounded-full bg-white/50 transition-colors",
                    i === photoIndex && "bg-white",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Title + price */}
      <Link to="/listing/$id" params={{ id: listing.id }} className="flex flex-col gap-1 px-4 pt-3">
        <h2 className="line-clamp-1 text-sm font-bold">{listing.title}</h2>
        <span className="font-display text-base font-black text-primary">
          {formatPrice(listing.price, listing.currency, lang)}
        </span>
      </Link>

      {/* Action row */}
      <div className="mt-2 flex items-center justify-around border-t border-border px-2 py-1">
        <button
          type="button"
          onClick={toggleLike}
          disabled={liking}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-colors",
            listing.likedByMe ? "text-accent" : "text-muted-foreground hover:bg-secondary",
          )}
        >
          <Heart className={cn("size-4", listing.likedByMe && "fill-accent")} />
          {listing.likeCount} {t("like")}
        </button>
        <button
          type="button"
          onClick={() => commentInputRef.current?.focus()}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary"
        >
          <MessageCircle className="size-4" />
          {listing.commentCount} {t("comment")}
        </button>
        <button
          type="button"
          onClick={share}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Share2 className="size-4" />
          {listing.shareCount} {t("share")}
        </button>
      </div>

      {/* Comment input */}
      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        <input
          ref={commentInputRef}
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitComment();
          }}
          placeholder={t("writeComment")}
          maxLength={1000}
          className="min-h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <button
          type="button"
          onClick={submitComment}
          disabled={sending || !commentInput.trim()}
          aria-label={t("submit")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
        >
          <Send className="size-4 rtl:-scale-x-100" />
        </button>
      </div>

      {/* Comments */}
      {listing.comments.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
          {listing.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <div className="size-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                <StorageImage
                  bucket="avatars"
                  path={c.authorAvatar}
                  alt={c.authorName}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-xs font-bold">{c.authorName}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {timeAgo(c.created_at, lang)}
                  </span>
                </div>
                <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/90">
                  {c.body}
                </p>
              </div>
              {user?.id === c.user_id && (
                <button
                  type="button"
                  onClick={() => deleteComment(c.id)}
                  aria-label={t("delete")}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
