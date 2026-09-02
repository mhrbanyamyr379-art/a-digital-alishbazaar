import { createFileRoute } from "@tanstack/react-router";

import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { APP_VERSION } from "@/lib/app-meta";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About Afghan Bazaar — Afghanistan's Marketplace" },
      {
        name: "description",
        content: "Learn about Afghan Bazaar, the online marketplace for buying and selling across all 34 provinces of Afghanistan in Dari, Pashto and English.",
      },
      { property: "og:title", content: "About Afghan Bazaar" },
      { property: "og:description", content: "Afghanistan's marketplace in Dari, Pashto and English." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AboutPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background pb-32">
      <TopBar title={t("aboutApp")} right={<LanguageSwitcher variant="onLight" />} />
      <div className="mx-auto w-full max-w-2xl px-4 py-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent font-display text-lg font-black text-accent-foreground">
              A
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-black">{t("appName")}</h1>
              <p className="truncate text-xs text-muted-foreground">{t("tagline")}</p>
            </div>
          </div>
          <p className="mt-4 break-words text-sm leading-relaxed text-muted-foreground">{t("aboutBody")}</p>
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            {t("appVersion")} {APP_VERSION}
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
