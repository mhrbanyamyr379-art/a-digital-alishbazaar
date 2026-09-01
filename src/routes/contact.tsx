import { createFileRoute } from "@tanstack/react-router";
import { Send, LifeBuoy } from "lucide-react";

import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

export const TELEGRAM_URL = "https://t.me/AfghanBazaar365";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact Afghan Bazaar — Support on Telegram" },
      {
        name: "description",
        content: "Contact the Afghan Bazaar support team on our official Telegram channel for help with listings, messages and your account.",
      },
      { property: "og:title", content: "Contact Afghan Bazaar — Support on Telegram" },
      { property: "og:description", content: "Reach Afghan Bazaar support on the official Telegram channel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ContactPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background pb-32">
      <TopBar title={t("contactUs")} right={<LanguageSwitcher variant="onLight" />} />
      <div className="mx-auto w-full max-w-2xl px-4 py-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Send className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="break-words font-display text-lg font-black">{t("telegramOfficial")}</h1>
              <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground">{t("telegramDesc")}</p>
            </div>
          </div>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground active:scale-[0.99]"
          >
            <Send className="size-4" />
            @AfghanBazaar365
          </a>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <LifeBuoy className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <p className="min-w-0 break-words text-sm leading-relaxed text-muted-foreground">{t("telegramDesc")}</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
