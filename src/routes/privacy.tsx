import { createFileRoute } from "@tanstack/react-router";

import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Alish" },
      { name: "description", content: "How Alish collects, uses and protects your personal data, including your phone number and messages." },
      { property: "og:title", content: "Privacy Policy — Alish" },
      { property: "og:description", content: "How Alish handles and protects your data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const SECTIONS: { h: { fa: string; ps: string; en: string }; p: { fa: string; ps: string; en: string } }[] = [
  {
    h: { fa: "اطلاعاتی که جمع‌آوری می‌کنیم", ps: "هغه معلومات چې راټولوو", en: "What we collect" },
    p: {
      fa: "نام، شماره تماس یا ایمیل، عکس پروفایل، آگهی‌ها و پیام‌های شما.",
      ps: "نوم، د اړیکې شمېره یا ایمیل، د پروفایل انځور، اعلانونه او پیغامونه.",
      en: "Your name, phone number or email, profile photo, listings and messages.",
    },
  },
  {
    h: { fa: "شماره تماس", ps: "د اړیکې شمېره", en: "Your phone number" },
    p: {
      fa: "شماره شما به‌صورت عمومی نمایش داده نمی‌شود و تنها برای کاربرانی که با آنها گفتگو دارید یا از طریق دکمه تماس در آگهی قابل دسترسی است.",
      ps: "ستاسو شمېره په عام ډول نه ښکاري او یوازې هغو کاروونکو ته چې ورسره خبرې کوئ یا د اعلان د زنګ تڼۍ له لارې لاسرسی لري.",
      en: "Your number is never shown publicly. It is available only to users you chat with, or through the call button on your listing.",
    },
  },
  {
    h: { fa: "استفاده از اطلاعات", ps: "د معلوماتو کارول", en: "How we use data" },
    p: {
      fa: "برای نمایش آگهی‌ها، ارسال اطلاعیه‌ها، جلوگیری از تقلب و بهبود خدمات.",
      ps: "د اعلانونو ښودلو، خبرتیاوو لېږلو، د درغلۍ مخنیوي او د خدمتونو ښه کولو لپاره.",
      en: "To show listings, deliver notifications, prevent fraud and improve the service.",
    },
  },
  {
    h: { fa: "حذف اطلاعات", ps: "د معلوماتو ړنګول", en: "Deleting your data" },
    p: {
      fa: "با حذف حساب، پروفایل، آگهی‌ها و پیام‌های شما به‌طور دائمی حذف می‌شوند.",
      ps: "د حساب په ړنګولو سره ستاسو پروفایل، اعلانونه او پیغامونه د تل لپاره ړنګېږي.",
      en: "Deleting your account permanently removes your profile, listings and messages.",
    },
  },
];

function PrivacyPage() {
  const { t, locName } = useI18n();
  return (
    <div className="min-h-screen bg-background pb-32">
      <TopBar title={t("privacyPolicy")} right={<LanguageSwitcher variant="onLight" />} />
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
