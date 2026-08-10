import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { adminErrorKey } from "@/hooks/useAdmin";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ErrorBox, Pager } from "./AdminListings";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PAGE = 20;

type Report = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  admin_notes: string | null;
  listing_id: string | null;
  listing_title: string | null;
  listing_status: string | null;
  reported_user_id: string | null;
  reported_user_name: string | null;
  reporter_id: string;
  reporter_name: string | null;
  total_count: number;
};

const STATUS_KEYS: Record<string, "open" | "underReview" | "resolved" | "dismissed"> = {
  open: "open",
  reviewing: "underReview",
  resolved: "resolved",
  dismissed: "dismissed",
};

export function AdminReports() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("open");
  const [type, setType] = useState("");
  const [page, setPage] = useState(0);
  const [noteFor, setNoteFor] = useState<{ id: string; status: string } | null>(null);
  const [note, setNote] = useState("");

  const listQuery = useQuery({
    queryKey: ["admin-reports", query, status, type, page],
    queryFn: async (): Promise<Report[]> => {
      const { data, error } = await supabase.rpc("admin_list_reports", {
        _search: query || undefined,
        _status: status || undefined,
        _type: type || undefined,
        _limit: PAGE,
        _offset: page * PAGE,
      });
      if (error) throw error;
      return (data ?? []) as unknown as Report[];
    },
  });

  const mutate = useMutation({
    mutationFn: async (v: { id: string; status: string; note?: string }) => {
      const { error } = await supabase.rpc("admin_update_report", {
        _report_id: v.id,
        _status: v.status,
        _note: v.note ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("actionDone"));
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(t(adminErrorKey(e))),
  });

  const total = listQuery.data?.[0]?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(Number(total) / PAGE));
  const select = "min-w-0 rounded-lg border border-border bg-card px-2 py-2 text-xs";

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => { e.preventDefault(); setPage(0); setQuery(search.trim()); }}
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

      <div className="grid grid-cols-2 gap-2">
        <select className={select} value={status} onChange={(e) => { setPage(0); setStatus(e.target.value); }}>
          <option value="">{t("all")}</option>
          {Object.entries(STATUS_KEYS).map(([k, v]) => (
            <option key={k} value={k}>{t(v)}</option>
          ))}
        </select>
        <select className={select} value={type} onChange={(e) => { setPage(0); setType(e.target.value); }}>
          <option value="">{t("all")}</option>
          <option value="listing">{t("listingReport")}</option>
          <option value="user">{t("userReport")}</option>
        </select>
      </div>

      {listQuery.isLoading && <p className="py-10 text-center text-sm text-muted-foreground">{t("loading")}</p>}
      {listQuery.isError && (
        <ErrorBox message={t(adminErrorKey(listQuery.error))} onRetry={() => listQuery.refetch()} retry={t("retry")} />
      )}
      {listQuery.data?.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{t("noResults")}</p>}

      <div className="flex flex-col gap-2">
        {listQuery.data?.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold">{r.reason}</p>
                {r.details && <p className="mt-0.5 break-words text-xs text-muted-foreground">{r.details}</p>}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  r.status === "open" && "bg-destructive/10 text-destructive",
                  r.status === "reviewing" && "bg-accent/15 text-accent",
                  (r.status === "resolved" || r.status === "dismissed") && "bg-secondary text-muted-foreground",
                )}
              >
                {t(STATUS_KEYS[r.status] ?? "open")}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
              <span>{r.listing_id ? t("listingReport") : t("userReport")}</span>
              <span>· {timeAgo(r.created_at, lang)}</span>
              <span>· {t("reporter")}: {r.reporter_name ?? "—"}</span>
            </div>

            {r.listing_id && (
              <Link
                to="/listing/$id"
                params={{ id: r.listing_id }}
                className="mt-1 block truncate text-xs font-semibold text-primary hover:underline"
              >
                {r.listing_title ?? t("notFoundRecord")}
              </Link>
            )}
            {r.reported_user_id && (
              <Link
                to="/seller/$id"
                params={{ id: r.reported_user_id }}
                className="mt-1 block truncate text-xs font-semibold text-primary hover:underline"
              >
                {r.reported_user_name ?? t("notFoundRecord")}
              </Link>
            )}
            {r.admin_notes && (
              <p className="mt-1.5 rounded-md bg-secondary p-1.5 text-[11px]">{t("moderationNote")}: {r.admin_notes}</p>
            )}

            <div className="mt-2 flex flex-wrap gap-2">
              {r.status === "open" && (
                <button
                  disabled={mutate.isPending}
                  onClick={() => mutate.mutate({ id: r.id, status: "reviewing" })}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                >
                  {t("underReview")}
                </button>
              )}
              {r.status !== "resolved" && (
                <button
                  disabled={mutate.isPending}
                  onClick={() => { setNote(""); setNoteFor({ id: r.id, status: "resolved" }); }}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  {t("resolved")}
                </button>
              )}
              {r.status !== "dismissed" && (
                <button
                  disabled={mutate.isPending}
                  onClick={() => { setNote(""); setNoteFor({ id: r.id, status: "dismissed" }); }}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                >
                  {t("dismissed")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Pager page={page} pages={pages} setPage={setPage} />

      <Dialog open={!!noteFor} onOpenChange={(o) => !o && setNoteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("moderationNote")}</DialogTitle>
          </DialogHeader>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder={t("moderationNote")}
            className="w-full rounded-lg border border-border bg-card p-2 text-sm"
          />
          <DialogFooter>
            <button onClick={() => setNoteFor(null)} className="rounded-md border border-border px-3 py-2 text-xs font-bold">
              {t("cancel")}
            </button>
            <button
              disabled={mutate.isPending}
              onClick={() => {
                if (!noteFor) return;
                mutate.mutate({ id: noteFor.id, status: noteFor.status, note: note.trim() || undefined });
                setNoteFor(null);
              }}
              className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
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
