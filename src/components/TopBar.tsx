import { Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { ReactNode } from "react";

export function TopBar({ title, right }: { title?: string; right?: ReactNode }) {
  const router = useRouter();
  const { dir } = useI18n();
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;
  return (
    <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-border bg-card px-3 py-3">
      <button
        onClick={() => router.history.back()}
        aria-label="Back"
        className="flex size-9 items-center justify-center rounded-full hover:bg-secondary"
      >
        <Back className="size-5" />
      </button>
      {title && <h1 className="flex-1 truncate font-display text-base font-bold">{title}</h1>}
      {right}
    </header>
  );
}

export function BrandTopBar({ right }: { right?: ReactNode }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
      <Link to="/" className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-sm bg-accent font-display text-sm font-black text-accent-foreground">
          A
        </div>
        <span className="font-display text-base font-black">{t("appName")}</span>
      </Link>
      {right}
    </header>
  );
}
