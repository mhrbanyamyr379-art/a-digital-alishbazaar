import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function SettingsSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      {title && (
        <h2 className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
      )}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">{children}</div>
    </section>
  );
}

function RowInner({
  icon: Icon,
  label,
  value,
  badge,
  danger,
  showChevron = true,
}: {
  icon: LucideIcon;
  label: string;
  value?: ReactNode;
  badge?: ReactNode;
  danger?: boolean;
  showChevron?: boolean;
}) {
  const { dir } = useI18n();
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  return (
    <div className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-start">
      <Icon className={cn("size-[18px] shrink-0", danger ? "text-destructive" : "text-muted-foreground")} />
      <span
        className={cn(
          "min-w-0 flex-1 break-words text-sm font-semibold leading-snug",
          danger && "text-destructive",
        )}
      >
        {label}
      </span>
      {badge}
      {value && <span className="shrink-0 text-xs text-muted-foreground">{value}</span>}
      {showChevron && <Chevron className="size-4 shrink-0 text-muted-foreground/60" />}
    </div>
  );
}

export function SettingsLink({
  to,
  params,
  ...rest
}: {
  to: string;
  params?: Record<string, string>;
  icon: LucideIcon;
  label: string;
  value?: ReactNode;
  badge?: ReactNode;
  danger?: boolean;
}) {
  return (
    <Link
      to={to}
      params={params as never}
      className="block border-b border-border last:border-0 transition-colors active:bg-secondary"
    >
      <RowInner {...rest} />
    </Link>
  );
}

export function SettingsExternal({
  href,
  ...rest
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block border-b border-border last:border-0 transition-colors active:bg-secondary"
    >
      <RowInner {...rest} />
    </a>
  );
}

export function SettingsButton({
  onClick,
  ...rest
}: {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  value?: ReactNode;
  badge?: ReactNode;
  danger?: boolean;
  showChevron?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full border-b border-border last:border-0 transition-colors active:bg-secondary"
    >
      <RowInner {...rest} />
    </button>
  );
}

export function SettingsStatic({
  ...rest
}: {
  icon: LucideIcon;
  label: string;
  value?: ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-0">
      <RowInner {...rest} showChevron={false} />
    </div>
  );
}

export function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] font-bold text-foreground">
      {count}
    </span>
  );
}
