import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Package, Flag, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { toLocalDigits, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { t, lang } = useI18n();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"listings" | "reports" | "users">("listings");

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin,
    queryFn: async () => {
      const [l, r, u] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return { listings: l.count ?? 0, reports: r.count ?? 0, users: u.count ?? 0 };
    },
  });

  const { data: listings } = useQuery({
    queryKey: ["admin-listings"],
    enabled: isAdmin && tab === "listings",
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("id,title,price,currency,status,seller_id").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["admin-reports"],
    enabled: isAdmin && tab === "reports",
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const setListingStatus = async (id: string, status: "active" | "rejected") => {
    await supabase.from("listings").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-listings"] });
    toast.success(t("saved"));
  };
  const resolveReport = async (id: string) => {
    await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  if (!isAdmin)
    return (
      <div className="min-h-screen bg-background">
        <TopBar title={t("admin")} />
        <p className="py-24 text-center text-sm text-muted-foreground">{t("loginRequired")}</p>
      </div>
    );

  const cards = [
    { icon: Package, label: t("listings"), value: stats?.listings },
    { icon: Flag, label: t("reports"), value: stats?.reports },
    { icon: UsersIcon, label: t("users"), value: stats?.users },
  ];

  return (
    <div className="min-h-screen bg-background pb-10">
      <TopBar title={t("dashboard")} />
      <div className="grid grid-cols-3 gap-3 p-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <c.icon className="mx-auto mb-1 size-5 text-accent" />
            <p className="font-display text-lg font-black">{toLocalDigits(c.value ?? 0, lang)}</p>
            <p className="text-[10px] text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex border-b border-border px-4">
        {(["listings", "reports", "users"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={cn(
              "flex-1 py-3 text-sm font-bold",
              tab === tb ? "border-b-2 border-accent text-accent" : "text-muted-foreground",
            )}
          >
            {t(tb)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 p-3">
        {tab === "listings" &&
          listings?.map((l) => (
            <div key={l.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{l.title}</p>
                <p className="text-xs text-accent">{formatPrice(Number(l.price), l.currency, lang)} · {t(l.status === "active" ? "active" : l.status === "sold" ? "sold" : "pending")}</p>
              </div>
              {l.status !== "active" ? (
                <button onClick={() => setListingStatus(l.id, "active")} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                  {t("approve")}
                </button>
              ) : (
                <button onClick={() => setListingStatus(l.id, "rejected")} className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">
                  {t("reject")}
                </button>
              )}
            </div>
          ))}
        {tab === "reports" &&
          reports?.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{r.reason}</p>
                  {r.details && <p className="text-xs text-muted-foreground">{r.details}</p>}
                  <span className="text-[10px] text-muted-foreground">{r.status}</span>
                </div>
                {r.status === "open" && (
                  <button onClick={() => resolveReport(r.id)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                    {t("approve")}
                  </button>
                )}
              </div>
            </div>
          ))}
        {tab === "users" && (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("users")}: {toLocalDigits(stats?.users ?? 0, lang)}</p>
        )}
      </div>
    </div>
  );
}
