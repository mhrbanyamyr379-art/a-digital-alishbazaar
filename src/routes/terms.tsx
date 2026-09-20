import { createFileRoute } from "@tanstack/react-router";

import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Use — Alish" },
      { name: "description", content: "The rules for using Alish: acceptable listings, user conduct, and account responsibilities." },
      { property: "og:title", content: "Terms of Use — Alish" },
      { property: "og:description", content: "Rules for buying, selling and messaging on Alish." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const SECTIONS: { h: { fa: string; ps: string; en: string }; p: { fa: string; ps: string; en: string } }[] = [
  {
    h: { fa: "استفاده از خدمات", ps: "د خدمتونو کارول", en: "Using the service" },
    p: {
      fa: "با استفاده از الیش می‌پذیرید که اطلاعات درست ارائه دهید و تنها اقلام مجاز را آگهی کنید.",
      ps: "د الیش په کارولو سره منئ چې سم معلومات ورکړئ او یوازې اجازه لرونکي توکي اعلان کړئ.",
      en: "By using Alish you agree to provide accurate information and to list only permitted items.",
    },
  },
  {
    h: { fa: "محتوای آگهی", ps: "د اعلان محتوا", en: "Listing content" },
    p: {
      fa: "آگهی‌های غیرقانونی، فریب‌آمیز یا توهین‌آمیز حذف و حساب مربوطه ممکن است مسدود شود.",
      ps: "غیرقانوني، دروغجن یا سپکاوونکي اعلانونه ړنګېږي او حساب یې کېدای شي بند شي.",
      en: "Illegal, misleading or abusive listings are removed and the account may be suspended.",
    },
  },
  {
    h: { fa: "معاملات بین کاربران", ps: "د کاروونکو ترمنځ معاملې", en: "Transactions between users" },
    p: {
      fa: "الیش طرف معامله نیست؛ پیش از پرداخت، کالا و فروشنده را به‌دقت بررسی کنید.",
      ps: "الیش د معاملې اړخ نه دی؛ د پیسو له ورکړې مخکې توکی او پلورونکی وګورئ.",
      en: "Alish is not a party to any deal. Always inspect the item and seller before paying.",
    },
  },
  {
    h: { fa: "حساب کاربری", ps: "کارن حساب", en: "Your account" },
    p: {
      fa: "شما مسئول حفظ امنیت حساب خود هستید و می‌توانید هر زمان آن را حذف کنید.",
      ps: "تاسو د خپل حساب د خوندیتوب مسولیت لرئ او هر وخت یې ړنګولی شئ.",
      en: "You are responsible for keeping your account secure and may delete it at any time.",
    },
  },
];

function TermsPage() {
  const { t, locName } = useI18n();
  return (
    <div className="min-h-screen bg-background pb-32">
      <TopBar title={t("termsOfUse")} right={<LanguageSwitcher variant="onLight" />} />
      <div className="mx-auto w-full max-w-2xl px-4 py-5">
        <div className="flex flex-col gap-3">
          {SECTIONS.map((s) => (
            <section key={s.h.en} className="rounded-2xl border border-border bg-card p-4">
              <h2 className="break-words text-sm font-bold">{locName(s.h)}</h2>
              <p className="mt-1.5 break-words text-sm leading-relaxed text-muted-foreground">{locName(s.p)}</p>
            </section>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
