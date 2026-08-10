import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { adminErrorKey } from "@/hooks/useAdmin";
import { timeAgo } from "@/lib/format";
import { ErrorBox, Pager } from "./AdminListings";

const PAGE = 30;

type Row = {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  reason: string | null;
  created_at: string;
  admin_name: string | null;
  total_count: number;
};

export function AdminAudit() {
  const { t, lang } = useI18n();
  const [page, setPage] = useState(0);

  const q = useQuery({
    queryKey: ["admin-audit", page],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.rpc("admin_list_audit", { _limit: PAGE, _offset: page * PAGE });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const pages = Math.max(1, Math.ceil(Number(q.data?.[0]?.total_count ?? 0) / PAGE));

  return (
    <div className="flex flex-col gap-2">
      {q.isLoading && <p className="py-10 text-center text-sm text-muted-foreground">{t("loading")}</p>}
      {q.isError && <ErrorBox message={t(adminErrorKey(q.error))} onRetry={() => q.refetch()} retry={t("retry")} />}
      {q.data?.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{t("noResults")}</p>}
      {q.data?.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-3">
          <p className="text-sm font-bold">{r.action.replace(/_/g, " ")}</p>
          <p className="text-[11px] text-muted-foreground">
            {r.target_type} · {t("adminBy")} {r.admin_name ?? "—"} · {timeAgo(r.created_at, lang)}
          </p>
          {r.reason && <p className="mt-1 rounded-md bg-secondary p-1.5 text-[11px]">{r.reason}</p>}
        </div>
      ))}
      <Pager page={page} pages={pages} setPage={setPage} />
    </div>
  );
}
