import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, ChevronDown, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { CATEGORIES, CONDITIONS, categoryById } from "@/data/categories";
import { subcategoriesFor, subcategoryById } from "@/data/subcategories";
import { PROVINCES, provinceById } from "@/data/provinces";
import { ListingCard, ListingCardSkeleton, type ListingCardData } from "@/components/ListingCard";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SearchBar } from "@/components/SearchBar";
import { DiscoverySections, CategoryGrid } from "@/components/DiscoverySections";
import { useFavoriteIds, useToggleFavorite } from "@/hooks/useFavorites";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { StorageImage } from "@/components/StorageImage";
import { toLocalDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/logo.png.asset.json";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "").default(""),
  sub: fallback(z.string(), "").default(""),
  prov: fallback(z.string(), "").default(""),
  city: fallback(z.string(), "").default(""),
  cond: fallback(z.string(), "").default(""),
  days: fallback(z.number(), 0).default(0),
  rating: fallback(z.number(), 0).default(0),
  sort: fallback(z.string(), "newest").default("newest"),
  min: fallback(z.number(), 0).default(0),
  max: fallback(z.number(), 0).default(0),
});

type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  component: Home,
});

const PAGE = 24;
const COLS =
  "id,title,price,currency,province,city,created_at,is_featured,seller_id,listing_images(url,position)";

async function fetchListings(params: SearchParams, page: number): Promise<{
  items: ListingCardData[];
  nextPage: number | null;
}> {
  const from = page * PAGE;
  const to = from + PAGE - 1;
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("listings")
    .select(COLS)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  if (params.q) {
    const term = params.q.replace(/[%,]/g, " ").trim();
    if (term) {
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }
  }
  if (params.cat) query = query.eq("category", params.cat);
  if (params.sub) query = query.eq("subcategory", params.sub);
  if (params.prov) query = query.eq("province", params.prov);
  if (params.city) query = query.eq("city", params.city);
  if (params.cond) query = query.eq("condition", params.cond);
  if (params.min > 0) query = query.gte("price", params.min);
  if (params.max > 0) query = query.lte("price", params.max);
  if (params.days > 0) {
    const since = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", since);
  }

  if (params.sort === "price_low") query = query.order("price", { ascending: true });
  else if (params.sort === "price_high") query = query.order("price", { ascending: false });
  else if (params.sort === "views")
    query = query.order("view_count", { ascending: false }).order("created_at", { ascending: false });
  else
    query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });

  query = query.range(from, to);

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []).map((l) => {
    const imgs = (l.listing_images ?? []) as { url: string; position: number }[];
    const first = imgs.sort((a, b) => a.position - b.position)[0];
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
      seller_id: l.seller_id as string,
    };
  });

  // Optional seller-rating filter (client-side over each page since there is no FK to profiles).
  if (params.rating > 0 && rows.length > 0) {
    const sellerIds = Array.from(new Set(rows.map((r) => r.seller_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("id,rating_avg")
      .in("id", sellerIds);
    const allowed = new Set((profs ?? []).filter((p) => Number(p.rating_avg) >= params.rating).map((p) => p.id));
    rows = rows.filter((r) => allowed.has(r.seller_id));
  }

  // strip seller_id from the card DTO
  const items: ListingCardData[] = rows.map(({ seller_id: _s, ...rest }) => rest);
  const nextPage = (data?.length ?? 0) === PAGE ? page + 1 : null;
  return { items, nextPage };
}

function Home() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const { t, locName, lang } = useI18n();
  const { user, profile } = useAuth();
  const [qInput, setQInput] = useState(search.q);
  const { add: recordSearch } = useRecentSearches();

  useEffect(() => {
    setQInput(search.q);
  }, [search.q]);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["listings", search],
    queryFn: ({ pageParam }) => fetchListings(search, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
  });

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const totalCount = items.length;

  const { data: favIds } = useFavoriteIds();
  const toggleFav = useToggleFavorite();

  const setParam = (patch: Partial<SearchParams>) =>
    navigate({ search: (prev: SearchParams) => ({ ...prev, ...patch }) });

  const activeProv = provinceById(search.prov);
  const hasAnyFilter =
    !!search.q ||
    !!search.cat ||
    !!search.sub ||
    !!search.prov ||
    !!search.city ||
    !!search.cond ||
    search.days > 0 ||
    search.rating > 0 ||
    search.min > 0 ||
    search.max > 0 ||
    search.sort !== "newest";

  // Infinite scroll sentinel
  const loadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const el = loadRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) fetchNextPage();
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between gap-4 px-4 pt-3">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logoAsset.url}
              alt={t("appName")}
              className="size-8 rounded-sm object-cover"
            />
            <h1 className="font-display text-lg font-black tracking-tight">{t("appName")}</h1>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {user ? (
              <Link to="/profile" className="size-8 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20">
                {profile?.avatar_url ? (
                  <StorageImage bucket="avatars" path={profile.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-xs font-bold">
                    {profile?.display_name?.[0]?.toUpperCase() ?? "U"}
                  </span>
                )}
              </Link>
            ) : (
              <Link
                to="/auth"
                className="rounded-md border border-white/20 px-3 py-1 text-xs font-semibold"
              >
                {t("signIn")}
              </Link>
            )}
          </div>
        </div>

        {/* Search + province */}
        <div className="flex flex-col gap-2 px-4 pb-4 pt-3">
          <SearchBar
            value={qInput}
            onChange={setQInput}
            onSubmit={(v) => {
              if (v) recordSearch(v);
              setParam({ q: v });
            }}
          />

          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            <ProvinceSelect value={search.prov} onChange={(prov) => setParam({ prov, city: "" })} />
            {PROVINCES.slice(0, 6).map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  setParam({ prov: search.prov === p.id ? "" : p.id, city: "" })
                }
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  search.prov === p.id
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-white/10 bg-white/10 text-primary-foreground hover:bg-white/20",
                )}
              >
                {locName(p)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Category grid — shown only when browsing without filters */}
      {!hasAnyFilter && (
        <CategoryGrid onPickCategory={(id) => setParam({ cat: id, sub: "" })} />
      )}

      {/* Category chips */}
      <nav className="no-scrollbar sticky top-[calc(3.25rem+5.5rem)] z-40 flex items-center gap-2 overflow-x-auto border-b border-border bg-card px-4 py-3">
        <button
          onClick={() => setParam({ cat: "", sub: "" })}
          className={cn(
            "flex-none rounded-full px-4 py-1.5 text-xs font-bold transition-colors",
            !search.cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
          )}
        >
          {t("allCategories")}
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setParam({ cat: search.cat === c.id ? "" : c.id, sub: "" })}
            className={cn(
              "flex flex-none items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-colors",
              search.cat === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            )}
          >
            <c.icon className="size-3.5" />
            {locName(c)}
          </button>
        ))}
      </nav>

      {/* Subcategory chips — only when a main category is selected */}
      {subcategoriesFor(search.cat).length > 0 && (
        <nav className="no-scrollbar flex items-center gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2.5">
          <button
            onClick={() => setParam({ sub: "" })}
            className={cn(
              "flex-none rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              !search.sub ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground",
            )}
          >
            {t("allSubcategories")}
          </button>
          {subcategoriesFor(search.cat).map((s) => (
            <button
              key={s.id}
              onClick={() => setParam({ sub: search.sub === s.id ? "" : s.id })}
              className={cn(
                "flex-none whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                search.sub === s.id
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              {locName(s)}
            </button>
          ))}
        </nav>
      )}

      {/* Discovery — shown only when browsing without filters */}
      {!hasAnyFilter && <DiscoverySections />}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {data ? `${toLocalDigits(totalCount, lang)}${hasNextPage ? "+" : ""} ${t("results")}` : t("latest")}
          {activeProv ? ` · ${locName(activeProv)}` : ""}
        </p>
        <FiltersSheet search={search} onApply={setParam} />
      </div>

      {/* Active filter chips */}
      {hasAnyFilter && (
        <ActiveFilterChips
          search={search}
          onRemove={(patch) => setParam(patch)}
          onClear={() =>
            setParam({
              q: "",
              cat: "",
              sub: "",
              prov: "",
              city: "",
              cond: "",
              days: 0,
              rating: 0,
              min: 0,
              max: 0,
              sort: "newest",
            })
          }
        />
      )}

      {/* Grid */}
      <main className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4">
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)}

        {isError && (
          <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("errorTitle")}</p>
            <button
              onClick={() => refetch()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {t("retry")}
            </button>
          </div>
        )}

        {data && items.length === 0 && !isLoading && (
          <div className="col-span-full flex flex-col items-center gap-2 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
              <Search className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">{t("emptyListings")}</p>
          </div>
        )}

        {items.map((l, i) => (
          <ListingCard
            key={l.id}
            listing={l}
            index={i}
            isFavorite={favIds?.has(l.id)}
            onToggleFavorite={(id) => toggleFav.toggle(id, !!favIds?.has(id))}

          />
        ))}

        {isFetchingNextPage &&
          Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={"n" + i} />)}
      </main>

      {/* Infinite-scroll sentinel + manual fallback */}
      {hasNextPage && (
        <div ref={loadRef} className="flex justify-center pb-8 pt-2">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground disabled:opacity-50"
          >
            {isFetchingNextPage ? t("loading") : t("loadMore")}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function ActiveFilterChips({
  search,
  onRemove,
  onClear,
}: {
  search: SearchParams;
  onRemove: (patch: Partial<SearchParams>) => void;
  onClear: () => void;
}) {
  const { t, locName, lang } = useI18n();
  const chips: { key: string; label: string; clear: Partial<SearchParams> }[] = [];
  if (search.q) chips.push({ key: "q", label: `"${search.q}"`, clear: { q: "" } });
  if (search.cat) {
    const c = categoryById(search.cat);
    if (c) chips.push({ key: "cat", label: locName(c), clear: { cat: "", sub: "" } });
  }
  if (search.sub) {
    const sc = subcategoryById(search.cat, search.sub);
    if (sc) chips.push({ key: "sub", label: locName(sc), clear: { sub: "" } });
  }
  if (search.prov) {
    const p = provinceById(search.prov);
    if (p) chips.push({ key: "prov", label: locName(p), clear: { prov: "", city: "" } });
  }
  if (search.city) chips.push({ key: "city", label: search.city, clear: { city: "" } });
  if (search.cond) {
    const c = CONDITIONS.find((x) => x.id === search.cond);
    if (c) chips.push({ key: "cond", label: locName(c), clear: { cond: "" } });
  }
  if (search.days > 0) {
    const lbl = search.days === 1 ? t("last24h") : search.days === 7 ? t("last7d") : t("last30d");
    chips.push({ key: "days", label: lbl, clear: { days: 0 } });
  }
  if (search.rating > 0) {
    chips.push({ key: "rating", label: `★ ${toLocalDigits(search.rating, lang)}+`, clear: { rating: 0 } });
  }
  if (search.min > 0 || search.max > 0) {
    const lbl = `${toLocalDigits(search.min || 0, lang)} – ${
      search.max > 0 ? toLocalDigits(search.max, lang) : "∞"
    }`;
    chips.push({ key: "price", label: lbl, clear: { min: 0, max: 0 } });
  }
  if (chips.length === 0) return null;
  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 pt-3">
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={() => onRemove(c.clear)}
          className="flex flex-none items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-foreground"
        >
          {c.label}
          <X className="size-3" />
        </button>
      ))}
      <button
        onClick={onClear}
        className="flex-none whitespace-nowrap px-2 text-xs font-bold text-muted-foreground hover:text-foreground"
      >
        {t("clearAll")}
      </button>
    </div>
  );
}

function ProvinceSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t, locName } = useI18n();
  const [open, setOpen] = useState(false);
  const prov = provinceById(value);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-primary-foreground">
        {prov ? locName(prov) : t("allProvinces")}
        <ChevronDown className="size-3 opacity-60" />
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("province")}</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-2 pt-4">
          <button
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={cn(
              "rounded-lg border p-3 text-start text-sm font-medium",
              !value ? "border-accent bg-accent/10" : "border-border",
            )}
          >
            {t("allProvinces")}
          </button>
          {PROVINCES.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onChange(p.id);
                setOpen(false);
              }}
              className={cn(
                "rounded-lg border p-3 text-start text-sm font-medium",
                value === p.id ? "border-accent bg-accent/10" : "border-border",
              )}
            >
              {locName(p)}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FiltersSheet({
  search,
  onApply,
}: {
  search: SearchParams;
  onApply: (patch: Partial<SearchParams>) => void;
}) {
  const { t, locName } = useI18n();
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState(search.sort);
  const [min, setMin] = useState(search.min || "");
  const [max, setMax] = useState(search.max || "");
  const [cond, setCond] = useState(search.cond);
  const [days, setDays] = useState(search.days);
  const [rating, setRating] = useState(search.rating);
  const [city, setCity] = useState(search.city);

  useEffect(() => {
    if (!open) return;
    setSort(search.sort);
    setMin(search.min || "");
    setMax(search.max || "");
    setCond(search.cond);
    setDays(search.days);
    setRating(search.rating);
    setCity(search.city);
  }, [open, search]);

  const sorts = [
    { id: "newest", label: t("newest") },
    { id: "price_low", label: t("priceLow") },
    { id: "price_high", label: t("priceHigh") },
    { id: "views", label: t("mostViewed") },
  ];

  const dateOptions = [
    { id: 0, label: t("anyTime") },
    { id: 1, label: t("last24h") },
    { id: 7, label: t("last7d") },
    { id: 30, label: t("last30d") },
  ];

  const ratingOptions = [0, 3, 4, 4.5];
  const cityOptions = provinceById(search.prov)?.cities ?? [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">
        <SlidersHorizontal className="size-3.5" />
        {t("filters")}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("filters")}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-5 pt-4">
          <FilterGroup label={t("sortBy")}>
            <div className="grid grid-cols-2 gap-2">
              {sorts.map((s) => (
                <Chip key={s.id} active={sort === s.id} onClick={() => setSort(s.id)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label={t("price")}>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                inputMode="numeric"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                className="w-full rounded-lg border border-border bg-card p-3 text-sm"
                placeholder={t("minPrice")}
              />
              <input
                type="number"
                inputMode="numeric"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className="w-full rounded-lg border border-border bg-card p-3 text-sm"
                placeholder={t("maxPrice")}
              />
            </div>
          </FilterGroup>

          <FilterGroup label={t("condition")}>
            <div className="flex flex-wrap gap-2">
              <Chip active={!cond} onClick={() => setCond("")}>
                {t("anyCondition")}
              </Chip>
              {CONDITIONS.map((c) => (
                <Chip key={c.id} active={cond === c.id} onClick={() => setCond(c.id)}>
                  {locName(c)}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          {cityOptions.length > 0 && (
            <FilterGroup label={t("city")}>
              <div className="flex flex-wrap gap-2">
                <Chip active={!city} onClick={() => setCity("")}>
                  {t("cityAll")}
                </Chip>
                {cityOptions.map((c) => (
                  <Chip key={c} active={city === c} onClick={() => setCity(c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </FilterGroup>
          )}

          <FilterGroup label={t("datePosted")}>
            <div className="flex flex-wrap gap-2">
              {dateOptions.map((d) => (
                <Chip key={d.id} active={days === d.id} onClick={() => setDays(d.id)}>
                  {d.label}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label={t("minRating")}>
            <div className="flex flex-wrap gap-2">
              {ratingOptions.map((r) => (
                <Chip key={r} active={rating === r} onClick={() => setRating(r)}>
                  {r === 0 ? t("anyRating") : `★ ${r}+`}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          <div className="sticky bottom-0 -mx-6 flex gap-3 border-t border-border bg-background px-6 py-3">
            <button
              onClick={() => {
                setSort("newest");
                setMin("");
                setMax("");
                setCond("");
                setDays(0);
                setRating(0);
                setCity("");
                onApply({
                  sort: "newest",
                  min: 0,
                  max: 0,
                  cond: "",
                  days: 0,
                  rating: 0,
                  city: "",
                });
                setOpen(false);
              }}
              className="flex-1 rounded-lg border border-border py-3 text-sm font-semibold"
            >
              {t("reset")}
            </button>
            <button
              onClick={() => {
                onApply({
                  sort,
                  min: Number(min) || 0,
                  max: Number(max) || 0,
                  cond,
                  days,
                  rating,
                  city,
                });
                setOpen(false);
              }}
              className="flex-1 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground"
            >
              {t("apply")}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card text-foreground",
      )}
    >
      {children}
    </button>
  );
}
