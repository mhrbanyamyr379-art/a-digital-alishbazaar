import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Search, ShieldCheck, Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { adminErrorKey } from "@/hooks/useAdmin";
import { timeAgo, toLocalDigits } from "@/lib/format";
import { ErrorBox, Pager } from "./AdminListings";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PAGE = 20;

type UserRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  province: string | null;
  created_at: string;
  last_seen: string | null;
  is_banned: boolean;
  banned_reason: string | null;
  rating_avg: number;
  rating_count: number;
  listing_count: number;
  active_count: number;
  sold_count: number;
  report_count: number;
  is_admin: boolean;
  total_count: number;
};

export function AdminUsers() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [banFor, setBanFor] = useState<UserRow | null>(null);
  const [reason, setReason] = useState("");

  const listQuery = useQuery({
    queryKey: ["admin-users", query, status, page],
    queryFn: async (): Promise<UserRow[]> => {
      const { data, error } = await supabase.rpc("admin_list_users", {
        _search: query || undefined,
        _status: status || undefined,
        _limit: PAGE,
        _offset: page * PAGE,
      });
      if (error) throw error;
      return (data ?? []) as unknown as UserRow[];
    },
  });

  const mutate = useMutation({
    mutationFn: async (v: { id: string; banned: boolean; reason?: string }) => {
      const { error } = await supabase.rpc("admin_set_user_banned", {
        _user_id: v.id,
        _banned: v.banned,
        _reason: v.reason ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("actionDone"));
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(t(adminErrorKey(e))),
  });

  const total = listQuery.data?.[0]?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(Number(total) / PAGE));

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
        <select
          className="rounded-lg border border-border bg-card px-2 py-2 text-xs"
          value={status}
          onChange={(e) => { setPage(0); setStatus(e.target.value); }}
        >
          <option value="">{t("all")}</option>
          <option value="active">{t("active")}</option>
          <option value="banned">{t("banned")}</option>
        </select>
      </form>

      {listQuery.isLoading && <p className="py-10 text-center text-sm text-muted-foreground">{t("loading")}</p>}
      {listQuery.isError && (
        <ErrorBox message={t(adminErrorKey(listQuery.error))} onRetry={() => listQuery.refetch()} retry={t("retry")} />
      )}
      {listQuery.data?.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{t("noResults")}</p>}

      <div className="flex flex-col gap-2">
        {listQuery.data?.map((u) => (
          <div key={u.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <Link to="/seller/$id" params={{ id: u.id }} className="min-w-0 truncate text-sm font-bold hover:underline">
                {u.display_name}
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                {u.is_admin && (
                  <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    <ShieldCheck className="size-3" /> {t("staff")}
                  </span>
                )}
                <span
                  className={
                    u.is_banned
                      ? "rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive"
                      : "rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                  }
                >
                  {u.is_banned ? t("banned") : t("active")}
                </span>
              </div>
            </div>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              <span>{t("memberSince")}: {new Date(u.created_at).toLocaleDateString(lang === "en" ? "en-US" : "fa-AF")}</span>
              {u.last_seen && <span>· {t("lastActive")}: {timeAgo(u.last_seen, lang)}</span>}
              <span>· {t("listings")}: {toLocalDigits(u.listing_count, lang)}</span>
              <span>· {t("soldItems")}: {toLocalDigits(u.sold_count, lang)}</span>
              <span className="flex items-center gap-0.5">
                · <Star className="size-3 text-accent" />
                {toLocalDigits(Number(u.rating_avg).toFixed(1), lang)} ({toLocalDigits(u.rating_count, lang)})
              </span>
              <span className={Number(u.report_count) > 0 ? "font-bold text-destructive" : ""}>
                · {t("reportsCount")}: {toLocalDigits(u.report_count, lang)}
              </span>
            </div>
            {u.banned_reason && (
              <p className="mt-1 rounded-md bg-destructive/5 p-1.5 text-[11px] text-destructive">{u.banned_reason}</p>
            )}

            <div className="mt-2 flex flex-wrap gap-2">
              <Link to="/seller/$id" params={{ id: u.id }} className="rounded-md border border-border px-3 py-1.5 text-xs font-bold">
                {t("viewProfile")}
              </Link>
              {!u.is_admin &&
                (u.is_banned ? (
                  <button
                    disabled={mutate.isPending}
                    onClick={() => mutate.mutate({ id: u.id, banned: false })}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                  >
                    {t("restore")}
                  </button>
                ) : (
                  <button
                    disabled={mutate.isPending}
                    onClick={() => { setReason(""); setBanFor(u); }}
                    className="rounded-md bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground disabled:opacity-50"
                  >
                    {t("suspend")}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <Pager page={page} pages={pages} setPage={setPage} />

      <Dialog open={!!banFor} onOpenChange={(o) => !o && setBanFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("suspend")} — {banFor?.display_name}</DialogTitle>
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
            <button onClick={() => setBanFor(null)} className="rounded-md border border-border px-3 py-2 text-xs font-bold">
              {t("cancel")}
            </button>
            <button
              disabled={mutate.isPending}
              onClick={() => {
                if (!banFor) return;
                if (reason.trim().length < 3) return toast.error(t("reasonRequired"));
                mutate.mutate({ id: banFor.id, banned: true, reason: reason.trim() });
                setBanFor(null);
              }}
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
