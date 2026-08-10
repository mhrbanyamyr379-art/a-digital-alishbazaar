import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ClipboardList, Flag, Package, ScrollText, Users as UsersIcon } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { toLocalDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAdminStats, adminErrorKey } from "@/hooks/useAdmin";
import { AdminListings, ErrorBox } from "@/components/admin/AdminListings";
import { AdminReports } from "@/components/admin/AdminReports";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminAudit } from "@/components/admin/AdminAudit";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type Tab = "listings" | "reports" | "users" | "audit";

function AdminPage() {
  const { t, lang } = useI18n();
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("listings");
  const stats = useAdminStats(isAdmin);

  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <TopBar title={t("adminPanel")} />
        <p className="py-24 text-center text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );

  if (!isAdmin)
    return (
      <div className="min-h-screen bg-background">
        <TopBar title={t("adminPanel")} />
        <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-2 px-6 text-center">
          <AlertTriangle className="size-8 text-destructive" />
          <p className="text-sm font-bold">{t("accessDenied")}</p>
        </div>
      </div>
    );

  const s = stats.data;
  const cards = [
    { icon: UsersIcon, label: t("totalUsers"), value: s?.total_users },
    { icon: UsersIcon, label: t("activeUsers"), value: s?.active_users },
    { icon: UsersIcon, label: t("newUsers"), value: s?.new_users },
    { icon: Package, label: t("totalListings"), value: s?.total_listings },
    { icon: Package, label: t("activeListings"), value: s?.active_listings },
    { icon: ClipboardList, label: t("pendingListings"), value: s?.pending_listings },
    { icon: Package, label: t("soldListings"), value: s?.sold_listings },
    { icon: Package, label: t("suspendedListings"), value: s?.suspended_listings },
    { icon: Package, label: t("newListings"), value: s?.new_listings },
    { icon: Flag, label: t("reportedListings"), value: s?.reported_listings },
    { icon: Flag, label: t("openReports"), value: s?.open_reports },
    { icon: ClipboardList, label: t("moderationQueue"), value: s?.moderation_queue },
  ];

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: "listings", label: t("listings"), icon: Package },
    { id: "reports", label: t("reports"), icon: Flag },
    { id: "users", label: t("users"), icon: UsersIcon },
    { id: "audit", label: t("auditLog"), icon: ScrollText },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-16">
      <TopBar title={t("adminPanel")} />

      <div className="mx-auto w-full max-w-5xl px-3 py-3">
        {stats.isError ? (
          <ErrorBox message={t(adminErrorKey(stats.error))} onRetry={() => stats.refetch()} retry={t("retry")} />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-card p-3 text-center">
                <c.icon className="mx-auto mb-1 size-4 text-accent" />
                <p className="font-display text-lg font-black">
                  {stats.isLoading ? "…" : toLocalDigits(c.value ?? 0, lang)}
                </p>
                <p className="text-[10px] leading-tight text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex overflow-x-auto border-b border-border">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={cn(
                "flex flex-1 min-w-[90px] items-center justify-center gap-1 whitespace-nowrap py-3 text-xs font-bold",
                tab === tb.id ? "border-b-2 border-accent text-accent" : "text-muted-foreground",
              )}
            >
              <tb.icon className="size-3.5" />
              {tb.label}
            </button>
          ))}
        </div>

        <div className="pt-3">
          {tab === "listings" && <AdminListings />}
          {tab === "reports" && <AdminReports />}
          {tab === "users" && <AdminUsers />}
          {tab === "audit" && <AdminAudit />}
        </div>

        <p className="pt-6 text-center text-[11px] text-muted-foreground">{t("categoriesManaged")}</p>
      </div>
    </div>
  );
}
