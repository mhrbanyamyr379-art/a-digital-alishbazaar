import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpCircle, Send, ShieldCheck, MessageSquareWarning } from "lucide-react";

import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SettingsSection, SettingsLink, SettingsExternal } from "@/components/settings/SettingsUI";
import { useI18n } from "@/lib/i18n";
import { TELEGRAM_URL } from "@/routes/contact";

export const Route = createFileRoute("/help")({
  component: HelpPage,
  head: () => ({
    meta: [
      { title: "Help Center — Alish" },
      {
        name: "description",
        content: "Get help with buying, selling, messaging and account safety on Alish.",
      },
      { property: "og:title", content: "Help Center — Alish" },
      { property: "og:description", content: "Help with buying, selling and staying safe on Alish." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function HelpPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background pb-32">
      <TopBar title={t("helpCenter")} right={<LanguageSwitcher variant="onLight" />} />
      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        <SettingsSection>
          <SettingsLink to="/faq" icon={HelpCircle} label={t("faqTitle")} />
          <SettingsLink to="/contact" icon={Send} label={t("contactUs")} />
          <SettingsExternal href={TELEGRAM_URL} icon={MessageSquareWarning} label={t("reportProblem")} />
          <SettingsLink to="/privacy" icon={ShieldCheck} label={t("privacyPolicy")} />
        </SettingsSection>
        <p className="mt-5 break-words px-1 text-sm leading-relaxed text-muted-foreground">{t("telegramDesc")}</p>
        <Link to="/" className="mt-4 inline-block text-sm font-bold text-primary">
          {t("home")}
        </Link>
      </div>
      <BottomNav />
    </div>
  );
}
