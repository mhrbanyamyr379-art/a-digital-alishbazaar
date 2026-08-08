import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { timeAgo } from "@/lib/format";
import { BottomNav } from "@/components/BottomNav";
import { BrandTopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

function NotificationsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Notif[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notif-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        qc.invalidateQueries({ queryKey: ["unread-notifications", user.id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const invalidate = () => {
    if (!user) return;
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
    qc.invalidateQueries({ queryKey: ["unread-notifications", user.id] });
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    invalidate();
  };

  const markOneRead = async (n: Notif) => {
    if (!user || n.read_at) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    invalidate();
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <BrandTopBar right={<LanguageSwitcher />} />
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="font-display text-xl font-black">{t("notifications")}</h1>
        {data && data.some((n) => !n.read_at) && (
          <button onClick={markAllRead} className="text-xs font-semibold text-accent">
            {t("save")}
          </button>
        )}
      </div>
      <main className="flex flex-col gap-2 p-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />)}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm font-semibold text-destructive">
            {t("errorTitle")}
          </div>
        )}
        {!isLoading && !error && data && data.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
              <Bell className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">{t("notifications")}</p>
          </div>
        )}
        {data?.map((n) => {
          const inner = (
            <div
              className={`rounded-xl border p-3 ${n.read_at ? "border-border bg-card" : "border-accent/30 bg-accent/5"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold">{n.title}</p>
                <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.created_at, lang)}</span>
              </div>
              {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
            </div>
          );
          return n.link ? (
            <Link key={n.id} to={n.link} onClick={() => markOneRead(n)}>
              {inner}
            </Link>
          ) : (
            <button key={n.id} type="button" className="text-start" onClick={() => markOneRead(n)}>
              {inner}
            </button>
          );
        })}
      </main>
      <BottomNav />
    </div>
  );
}
