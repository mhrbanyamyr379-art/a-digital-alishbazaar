import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, SlidersHorizontal, ChevronDown, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { CATEGORIES } from "@/data/categories";
import { PROVINCES, provinceById } from "@/data/provinces";
import { ListingCard, ListingCardSkeleton, type ListingCardData } from "@/components/ListingCard";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useFavoriteIds, useToggleFavorite } from "@/hooks/useFavorites";
import { avatarImg } from "@/lib/storage";
import { toLocalDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
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
  prov: fallback(z.string(), "").default(""),
  sort: fallback(z.string(), "newest").default("newest"),
  min: fallback(z.number(), 0).default(0),
  max: fallback(z.number(), 0).default(0),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  component: Home,
});

async function fetchListings(params: {
  q: string;
  cat: string;
  prov: string;
  sort: string;
  min: number;
  max: number;
}): Promise<ListingCardData[]> {
  let query = supabase
    .from("listings")
    .select("id,title,price,currency,province,city,created_at,is_featured,listing_images(url,position)")
    .eq("status", "active");

  if (params.q) query = query.ilike("title", `%${params.q}%`);
  if (params.cat) query = query.eq("category", params.cat);
  if (params.prov) query = query.eq("province", params.prov);
  if (params.min > 0) query = query.gte("price", params.min);
  if (params.max > 0) query = query.lte("price", params.max);

  if (params.sort === "price_low") query = query.order("price", { ascending: true });
  else if (params.sort === "price_high") query = query.order("price", { ascending: false });
  else query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });

  const { data, error } = await query.limit(60);
  if (error) throw error;

  return (data ?? []).map((l) => {
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
    };
  });
}

function Home() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const { t, locName, lang } = useI18n();
  const { user, profile } = useAuth();
  const [qInput, setQInput] = useState(search.q);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["listings", search],
    queryFn: () => fetchListings(search),
  });

  const { data: favIds } = useFavoriteIds();
  const toggleFav = useToggleFavorite();

  const setParam = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });

  const activeProv = provinceById(search.prov);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between gap-4 px-4 pt-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-sm bg-accent font-display text-lg font-black text-accent-foreground">
              A
            </div>
            <h1 className="font-display text-lg font-black tracking-tight">{t("appName")}</h1>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {user ? (
              <Link to="/profile" className="size-8 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20">
                {profile?.avatar_url ? (
                  <img src={avatarImg(profile.avatar_url)} alt="" className="size-full object-cover" />
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setParam({ q: qInput });
            }}
            className="relative flex items-center"
          >
            <Search className="absolute start-3 size-5 text-muted-foreground" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder={t("search")}
              className="w-full rounded-lg bg-card py-3 pe-10 ps-10 text-sm font-medium text-foreground ring-2 ring-transparent transition-all focus:outline-none focus:ring-accent/50"
            />
            {qInput && (
              <button
                type="button"
                onClick={() => {
                  setQInput("");
                  setParam({ q: "" });
                }}
                className="absolute end-3 text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </form>

          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            <ProvinceSelect value={search.prov} onChange={(prov) => setParam({ prov })} />
            {PROVINCES.slice(0, 6).map((p) => (
              <button
                key={p.id}
                onClick={() => setParam({ prov: search.prov === p.id ? "" : p.id })}
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

      {/* Category chips */}
      <nav className="no-scrollbar sticky top-[calc(3.25rem+5.5rem)] z-40 flex items-center gap-2 overflow-x-auto border-b border-border bg-card px-4 py-3">
        <button
          onClick={() => setParam({ cat: "" })}
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
            onClick={() => setParam({ cat: search.cat === c.id ? "" : c.id })}
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

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {data ? `${toLocalDigits(data.length, lang)} ${t("results")}` : t("latest")}
          {activeProv ? ` · ${locName(activeProv)}` : ""}
        </p>
        <FiltersSheet search={search} onApply={setParam} />
      </div>

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

        {data && data.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
              <Search className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">{t("emptyListings")}</p>
          </div>
        )}

        {data?.map((l, i) => (
          <ListingCard
            key={l.id}
            listing={l}
            index={i}
            isFavorite={favIds?.has(l.id)}
            onToggleFavorite={
              user
                ? (id) => toggleFav.mutate({ id, isFav: !!favIds?.has(id) })
                : () => navigate({ to: "/auth" })
            }
          />
        ))}
      </main>

      <BottomNav />
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
  search: { sort: string; min: number; max: number };
  onApply: (patch: { sort?: string; min?: number; max?: number }) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState(search.sort);
  const [min, setMin] = useState(search.min || "");
  const [max, setMax] = useState(search.max || "");

  const sorts = [
    { id: "newest", label: t("newest") },
    { id: "price_low", label: t("priceLow") },
    { id: "price_high", label: t("priceHigh") },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">
        <SlidersHorizontal className="size-3.5" />
        {t("filters")}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("filters")}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-5 pt-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("newest")}
            </p>
            <div className="flex flex-col gap-2">
              {sorts.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={cn(
                    "rounded-lg border p-3 text-start text-sm font-medium",
                    sort === s.id ? "border-accent bg-accent/10" : "border-border",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("minPrice")}
              </p>
              <input
                type="number"
                inputMode="numeric"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                className="w-full rounded-lg border border-border bg-card p-3 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("maxPrice")}
              </p>
              <input
                type="number"
                inputMode="numeric"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className="w-full rounded-lg border border-border bg-card p-3 text-sm"
                placeholder="∞"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSort("newest");
                setMin("");
                setMax("");
                onApply({ sort: "newest", min: 0, max: 0 });
                setOpen(false);
              }}
              className="flex-1 rounded-lg border border-border py-3 text-sm font-semibold"
            >
              {t("reset")}
            </button>
            <button
              onClick={() => {
                onApply({ sort, min: Number(min) || 0, max: Number(max) || 0 });
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
