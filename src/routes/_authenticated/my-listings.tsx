import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Eye, Heart, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { StorageImage } from "@/components/StorageImage";
import { toLocalDigits, formatPrice } from "@/lib/format";
import { dbErrorKey } from "@/lib/db-errors";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/my-listings")({
  component: MyListingsPage,
  head: () => ({
    meta: [
      { title: "My listings — Afghan Bazaar" },
      { name: "description", content: "Manage your Afghan Bazaar ads: active, pending, sold, rejected and expired listings." },
      { property: "og:title", content: "My listings — Afghan Bazaar" },
      { property: "og:description", content: "Manage your Afghan Bazaar ads in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = {
  id: string;
  title: string;
  price: number;
  currency: string;
  status: string;
  view_count: number | null;
  favorites_count: number | null;
  created_at: string;
  expires_at: string | null;
  listing_images: { url: string; position: number }[];
};

type Filter = "all" | "active" | "pending" | "sold" | "rejected" | "expired";

export function useMyListings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id,title,price,currency,status,view_count,favorites_count,created_at,expires_at,listing_images(url,position)",
        )
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function isExpired(l: { status: string; expires_at: string | null }) {
  return l.status === "expired" || (l.status === "active" && !!l.expires_at && new Date(l.expires_at) < new Date());
}

function MyListingsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: listings, isLoading, error, refetch } = useMyListings();
  const [filter, setFilter] = useState<Filter>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = listings ?? [];
  const matches = (l: Row, f: Filter) => {
    if (f === "all") return true;
    if (f === "expired") return isExpired(l);
    if (f === "active") return l.status === "active" && !isExpired(l);
    if (f === "rejected") return l.status === "rejected" || l.status === "suspended";
    return l.status === f;
  };
  const visible = rows.filter((l) => matches(l, filter));

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: t("allTab") },
    { id: "active", label: t("active") },
    { id: "pending", label: t("pending") },
    { id: "sold", label: t("sold") },
    { id: "rejected", label: t("rejected") },
    { id: "expired", label: t("statusExpired") },
  ];

  /** Refresh every view that can show this listing after a write. */
  const invalidate = (id?: string) => {
    qc.invalidateQueries({ queryKey: ["my-listings", user?.id] });
    qc.invalidateQueries({ queryKey: ["listings"] });
    qc.invalidateQueries({ queryKey: ["favorites"] });
    if (id) qc.invalidateQueries({ queryKey: ["listing", id] });
  };

  const setStatus = async (id: string, status: "active" | "sold") => {
    const current = rows.find((l) => l.id === id);
    if (!current || current.status === status || busyId) return;
    setBusyId(id);
    const { error } = await supabase
      .from("listings")
      .update({ status })
      .eq("id", id)
      .eq("seller_id", user!.id)
      .neq("status", status);
    setBusyId(null);
    invalidate(id);
    if (error) toast.error(t(dbErrorKey(error)));
    else toast.success(t(status === "sold" ? "markSold" : "markActive"));
  };
  const renew = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    const { error } = await supabase
      .from("listings")
      .update({
        status: "active",
        published_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
      })
      .eq("id", id)
      .eq("seller_id", user!.id);
    setBusyId(null);
    invalidate(id);
    if (error) toast.error(t(dbErrorKey(error)));
    else toast.success(t("renewed"));
  };
  const remove = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    const { error } = await supabase.from("listings").delete().eq("id", id).eq("seller_id", user!.id);
    setBusyId(null);
    invalidate(id);
    if (error) toast.error(t(dbErrorKey(error)));
    else toast.success(t("deleted"));
  };


  const statusLabel = (l: Row) => {
    if (isExpired(l)) return t("statusExpired");
    return t(
      l.status === "sold"
        ? "sold"
        : l.status === "pending"
          ? "pending"
          : l.status === "draft"
            ? "draft"
            : l.status === "rejected"
              ? "rejected"
              : l.status === "suspended"
                ? "suspended"
                : "active",
    );
  };

  const firstImg = (imgs: { url: string; position: number }[]) =>
    (imgs ?? []).sort((a, b) => a.position - b.position)[0]?.url ?? null;

  return (
    <div className="min-h-screen bg-background pb-32">
      <TopBar title={t("myListings")} right={<LanguageSwitcher variant="onLight" />} />

      <div className="-mx-0 overflow-x-auto border-b border-border bg-card">
        <div className="flex w-max gap-1 px-3 py-2">
          {tabs.map((tab) => {
            const count = rows.filter((l) => matches(l, tab.id)).length;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
                  filter === tab.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                )}
              >
                {tab.label}
                <span className="font-mono">{toLocalDigits(count, lang)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 p-3">
        {visible.map((l) => {
          const expired = isExpired(l);
          return (
            <div key={l.id} className="rounded-xl border border-border bg-card p-2">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                <Link to="/listing/$id" params={{ id: l.id }} className="size-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {firstImg(l.listing_images) && (
                    <StorageImage bucket="listings" path={firstImg(l.listing_images)} alt="" className="size-full object-cover" />
                  )}
                </Link>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{l.title}</p>
                  <p className="text-sm font-black text-accent">{formatPrice(Number(l.price), l.currency, lang)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span
                      className={cn(
                        "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold",
                        expired
                          ? "bg-destructive/10 text-destructive"
                          : l.status === "active"
                            ? "bg-primary/10 text-primary"
                            : l.status === "draft"
                              ? "bg-accent/10 text-accent"
                              : "bg-muted text-muted-foreground",
                      )}
                    >
                      {statusLabel(l)}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                      <Eye className="size-3" />
                      {toLocalDigits(l.view_count ?? 0, lang)}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                      <Heart className="size-3" />
                      {toLocalDigits(l.favorites_count ?? 0, lang)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
                <Link
                  to="/edit/$id"
                  params={{ id: l.id }}
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold"
                >
                  <Pencil className="size-3.5" />
                  {t("edit")}
                </Link>
                {l.status === "active" && !expired && (
                  <button
                    onClick={() => setStatus(l.id, "sold")}
                    className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <Check className="size-3.5" />
                    {t("markSold")}
                  </button>
                )}
                {l.status === "sold" && !expired && (
                  <button
                    onClick={() => setStatus(l.id, "active")}
                    className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-primary"
                  >
                    <RefreshCw className="size-3.5" />
                    {t("markActive")}
                  </button>
                )}
                {(expired || l.status === "draft") && (
                  <button
                    onClick={() => renew(l.id)}
                    className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-primary"
                  >
                    <RefreshCw className="size-3.5" />
                    {l.status === "draft" ? t("publishNow") : t("renew")}
                  </button>
                )}

                <button
                  onClick={() => setDeleteId(l.id)}
                  className="ms-auto flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-secondary"
                >
                  <Trash2 className="size-3.5" />
                  {t("delete")}
                </button>
              </div>
            </div>
          );
        })}
        {listings && visible.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("emptyListings")}</p>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDeleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) remove(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BottomNav />
    </div>
  );
}
