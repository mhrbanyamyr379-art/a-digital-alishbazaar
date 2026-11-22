import { createFileRoute } from "@tanstack/react-router";
import { Send, LifeBuoy, Facebook, Instagram, Music2, ArrowUpLeft } from "lucide-react";

import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const TELEGRAM_URL = "https://t.me/AfghanBazaar365";

const socialLinks = [
  { name: "فیسبوک", englishName: "Facebook", icon: Facebook, url: "https://www.facebook.com/share/1EzzvXuBLT/?mibextid=wwXIfr" },
  { name: "انستاگرام", englishName: "Instagram", icon: Instagram, url: "https://www.instagram.com/alishbazaar?hvrq=Z2ozZThzOWt1dXl0&utm_source=qr" },
  { name: "تیک‌تاک", englishName: "TikTok", icon: Music2, url: "https://www.tiktok.com/@alishbazaar?_r=1&_t=ZS-9BbqpnI73dk" },
];

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact Alish — Official Social Channels" },
      {
        name: "description",
        content: "Connect with Alish on Telegram, Facebook, Instagram and TikTok, and get help with listings, messages and your account.",
      },
      { property: "og:title", content: "Contact Alish — Official Social Channels" },
      { property: "og:description", content: "Find Alish’s official Telegram, Facebook, Instagram and TikTok channels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ContactPage() {
  const { t, lang } = useI18n();
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

        <section className="mt-6" aria-label={lang === "en" ? "Alish social channels" : "شبکه‌های اجتماعی الیش"}>
          <h2 className="mb-3 font-display text-base font-bold">{lang === "en" ? "Alish on social media" : "الیش در شبکه‌های اجتماعی"}</h2>
          <div className="flex flex-col gap-3">
            {socialLinks.map(({ name, englishName, icon: Icon, url }) => (
              <Button key={englishName} asChild variant="outline" className="h-auto min-h-16 w-full justify-start gap-3 whitespace-normal rounded-lg bg-card px-4 py-3">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Icon aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1 text-start">
                    <span className="block font-bold">{lang === "en" ? englishName : name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground" dir="ltr">{englishName === "Facebook" ? "Alish" : "@alishbazaar"}</span>
                  </span>
                  <ArrowUpLeft aria-hidden="true" className="text-muted-foreground" />
                </a>
              </Button>
            ))}
          </div>
        </section>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <LifeBuoy className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <p className="min-w-0 break-words text-sm leading-relaxed text-muted-foreground">{t("telegramDesc")}</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
