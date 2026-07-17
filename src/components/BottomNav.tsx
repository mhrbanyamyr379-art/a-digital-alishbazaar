import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Bell, MessageCircle, User, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useUnreadTotal } from "@/hooks/useUnread";
import { useAuth } from "@/lib/auth";

export function BottomNav() {
  const { t } = useI18n();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { unreadChats } = useUnreadTotal();

  const items = [
    { to: "/", icon: Home, label: t("home"), badge: 0 },
    { to: "/notifications", icon: Bell, label: t("notifications"), badge: 0 },
    { to: "/chat", icon: MessageCircle, label: t("chat"), badge: user ? unreadChats : 0 },
    { to: "/profile", icon: User, label: t("profile"), badge: 0 },
  ] as const;

  return (
    <>
      <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2">
        <Link
          to="/sell"
          className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-display text-sm font-black text-accent-foreground shadow-2xl shadow-accent/40 ring-4 ring-background transition-transform active:scale-95"
        >
          <Plus className="size-5" />
          {t("sellSomething")}
        </Link>
      </div>
      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-border bg-card px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map((it, i) => {
          const active = it.to === "/" ? path === "/" : path.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-1",
                active ? "text-primary" : "text-muted-foreground",
                i === 1 && "me-8",
                i === 2 && "ms-8",
              )}
            >
              <span className="relative">
                <it.icon className={cn("size-5", active && "stroke-[2.5]")} />
                {it.badge > 0 && (
                  <span className="absolute -end-2 -top-1.5 flex min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-black leading-none text-accent-foreground ring-2 ring-card">
                    {it.badge > 99 ? "99+" : it.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-bold">{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
