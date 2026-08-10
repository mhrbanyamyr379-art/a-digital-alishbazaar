import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, ChevronLeft, ChevronRight, Flag, Loader2, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { StorageImage } from "@/components/StorageImage";
import { useI18n } from "@/lib/i18n";
import { adminErrorKey } from "@/hooks/useAdmin";
import { formatPrice, timeAgo, toLocalDigits } from "@/lib/format";
import { CATEGORIES } from "@/data/categories";
import { PROVINCES } from "@/data/provinces";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAGE = 20;

type Row = {
  id: string;
  title: string;
  price: number;
  currency: string;
  status: string;
  category: string;
  province: string;
  city: string | null;
  created_at: string;
  view_count: number;
  favorites_count: number;
  rejection_reason: string | null;
  seller_id: string;
  seller_name: string | null;
  seller_banned: boolean | null;
  report_count: number;
  image_url: string | null;
  total_count: number;
};

const STATUSES = ["pending", "active", "rejected", "suspended", "sold", "expired"] as const;

const statusLabel: Record<string, string> = {
  pending: "pending",
  active: "active",
  rejected: "rejected",
  suspended: "suspended",
  sold: "sold",
  expired: "expired",
};

export function AdminListings() {
  const { t, lang, locName } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [category, setCategory] = useState("");
  const [province, setProvince] = useState("");
  const [days, setDays] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const [reasonFor, setReasonFor] = useState<{ id: string; action: "rejected" | "suspended" } | null>(null);
  const [reason, setReason] = useState("");

  const listQuery = useQuery({
    queryKey: ["admin-listings", query, status, category, province, days, sort, page],
    queryFn: async (): Promise<Row[]> => {
      const since = days ? new Date(Date.now() - Number(days) * 864e5).toISOString() : null;
      const { data, error } = await supabase.rpc("admin_list_listings", {
        _search: query || null,
        _status: status || null,
        _category: category || null,
        _province: province || null,
        _since: since,
        _sort: sort,
        _limit: PAGE,
        _offset: page * PAGE,
      });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const mutate = useMutation({
    mutationFn: async (v: { id: string; status: string; reason?: string }) => {
      const { error } = await supabase.rpc("admin_set_listing_status", {
        _listing_id: v.id,
        _status: v.status,
        _reason: v.reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("actionDone"));
      qc.invalidateQueries({ queryKey: ["admin-listings"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(t(adminErrorKey(e))),
  });

  const total = listQuery.data?.[0]?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(Number(total) / PAGE));

  const submitReason = () => {
    if (!reasonFor) return;
    if (reason.trim().length < 3) return toast.error(t("reasonRequired"));
    mutate.mutate({ id: reasonFor.id, status: reasonFor.action, reason: reason.trim() });
    setReasonFor(null);
    setReason("");
  };

  const select = "min-w-0 rounded-lg border border-border bg-card px-2 py-2 text-xs";

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setQuery(search.trim());
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute inset-y-0 my-auto size-4 text-muted-foreground ltr:left-2 rtl:right-2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-card py-2 text-sm ltr:pl-8 ltr:pr-3 rtl:pr-8 rtl:pl-3"
          />
        </div>
        <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
          {t("search")}
        </button>
      </form>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <select className={select} value={status} onChange={(e) => { setPage(0); setStatus(e.target.value); }}>
          <option value="">{t("all")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(statusLabel[s] as never)}</option>
          ))}
        </select>
        <select className={select} value={category} onChange={(e) => { setPage(0); setCategory(e.target.value); }}>
          <option value="">{t("allCategories")}</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{locName(c)}</option>
          ))}
        </select>
        <select className={select} value={province} onChange={(e) => { setPage(0); setProvince(e.target.value); }}>
          <option value="">{t("allProvinces")}</option>
          {PROVINCES.map((p) => (
            <option key={p.id} value={p.id}>{locName(p)}</option>
          ))}
        </select>
        <select className={select} value={days} onChange={(e) => { setPage(0); setDays(e.target.value); }}>
          <option value="">{t("anyTime")}</option>
          <option value="1">{t("last24h")}</option>
          <option value="7">{t("last7d")}</option>
          <option value="30">{t("last30d")}</option>
        </select>
        <select className={select} value={sort} onChange={(e) => { setPage(0); setSort(e.target.value); }}>
          <option value="newest">{t("newest")}</option>
          <option value="oldest">{t("datePosted")}</option>
          <option value="reported">{t("reportsCount")}</option>
        </select>
      </div>

      {listQuery.isLoading && (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("loading")}</p>
      )}
      {listQuery.isError && (
        <ErrorBox message={t(adminErrorKey(listQuery.error))} onRetry={() => listQuery.refetch()} retry={t("retry")} />
      )}
      {listQuery.data?.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("noResults")}</p>
      )}

      <div className="flex flex-col gap-2">
        {listQuery.data?.map((l) => (
          <div key={l.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex gap-3">
              <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {l.image_url ? (
                  <StorageImage bucket="listings" path={l.image_url} className="size-16 object-cover" alt={l.title} />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link to="/listing/$id" params={{ id: l.id }} className="min-w-0 flex-1 truncate text-sm font-bold hover:underline">
                    {l.title}
                  </Link>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      l.status === "active" && "bg-primary/10 text-primary",
                      l.status === "pending" && "bg-accent/15 text-accent",
                      (l.status === "rejected" || l.status === "suspended") && "bg-destructive/10 text-destructive",
                      (l.status === "sold" || l.status === "expired") && "bg-secondary text-muted-foreground",
                    )}
                  >
                    {t(statusLabel[l.status] as never)}
                  </span>
                </div>
                <p className="text-xs font-semibold text-accent">{formatPrice(Number(l.price), l.currency, lang)}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  <Link to="/seller/$id" params={{ id: l.seller_id }} className="hover:underline">
                    {l.seller_name ?? "—"}
                  </Link>
                  {l.seller_banned ? ` · ${t("banned")}` : ""} · {timeAgo(l.created_at, lang)}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                  <span>{toLocalDigits(l.view_count, lang)} {t("view")}</span>
                  <span>· {toLocalDigits(l.favorites_count, lang)} {t("favoritesCount")}</span>
                  {Number(l.report_count) > 0 && (
                    <span className="flex items-center gap-0.5 font-bold text-destructive">
                      <Flag className="size-3" /> {toLocalDigits(l.report_count, lang)}
                    </span>
                  )}
                </p>
                {l.rejection_reason && (
                  <p className="mt-1 flex items-start gap-1 rounded-md bg-destructive/5 p-1.5 text-[11px] text-destructive">
                    <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                    {l.rejection_reason}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {l.status !== "active" && (
                <button
                  disabled={mutate.isPending}
                  onClick={() => mutate.mutate({ id: l.id, status: "active" })}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  {t("approve")}
                </button>
              )}
              {l.status !== "rejected" && (
                <button
                  disabled={mutate.isPending}
                  onClick={() => { setReason(""); setReasonFor({ id: l.id, action: "rejected" }); }}
                  className="rounded-md bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground disabled:opacity-50"
                >
                  {t("reject")}
                </button>
              )}
              {l.status !== "suspended" && (
                <button
                  disabled={mutate.isPending}
                  onClick={() => { setReason(""); setReasonFor({ id: l.id, action: "suspended" }); }}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-bold"
                >
                  {t("suspend")}
                </button>
              )}
              <Link
                to="/listing/$id"
                params={{ id: l.id }}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-bold"
              >
                {t("viewListing")}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Pager page={page} pages={pages} setPage={setPage} />

      <Dialog open={!!reasonFor} onOpenChange={(o) => !o && setReasonFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reasonFor?.action === "suspended" ? t("suspend") : t("reject")}</DialogTitle>
          </DialogHeader>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder={t("rejectionReason")}
            className="w-full rounded-lg border border-border bg-card p-2 text-sm"
          />
          <DialogFooter>
            <button onClick={() => setReasonFor(null)} className="rounded-md border border-border px-3 py-2 text-xs font-bold">
              {t("cancel")}
            </button>
            <button
              onClick={submitReason}
              disabled={mutate.isPending}
              className="flex items-center gap-1 rounded-md bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground disabled:opacity-50"
            >
              {mutate.isPending && <Loader2 className="size-3 animate-spin" />}
              {t("submit")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function Pager({ page, pages, setPage }: { page: number; pages: number; setPage: (n: number) => void }) {
  const { t, lang } = useI18n();
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <button
        disabled={page === 0}
        onClick={() => setPage(page - 1)}
        className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-40"
      >
        <ChevronLeft className="size-3 rtl:rotate-180" />
        {t("prev")}
      </button>
      <span className="text-xs text-muted-foreground">
        {t("page")} {toLocalDigits(page + 1, lang)} / {toLocalDigits(pages, lang)}
      </span>
      <button
        disabled={page + 1 >= pages}
        onClick={() => setPage(page + 1)}
        className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-40"
      >
        {t("loadMore")}
        <ChevronRight className="size-3 rtl:rotate-180" />
      </button>
    </div>
  );
}

export function ErrorBox({ message, onRetry, retry }: { message: string; onRetry: () => void; retry: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <AlertTriangle className="size-5 text-destructive" />
      <p className="text-sm font-semibold text-destructive">{message}</p>
      <button onClick={onRetry} className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-bold">
        {retry}
      </button>
    </div>
  );
}
