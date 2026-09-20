import { createFileRoute } from "@tanstack/react-router";

import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  head: () => ({
    meta: [
      { title: "FAQ — Alish" },
      {
        name: "description",
        content: "Answers to common questions about posting ads, messaging sellers, safety and account settings on Alish.",
      },
      { property: "og:title", content: "FAQ — Alish" },
      { property: "og:description", content: "Common questions about using Alish." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const ITEMS: { q: { fa: string; ps: string; en: string }; a: { fa: string; ps: string; en: string } }[] = [
  {
    q: {
      fa: "چگونه یک آگهی ثبت کنم؟",
      ps: "څنګه اعلان خپور کړم؟",
      en: "How do I post a listing?",
    },
    a: {
      fa: "روی دکمه «چیزی بفروشید» بزنید، عکس‌ها، عنوان، قیمت و موقعیت را وارد کنید و آگهی را ثبت کنید.",
      ps: "د «څه شی خرڅ کړئ» تڼۍ کېکاږئ، انځورونه، سرلیک، بیه او ځای دننه کړئ او اعلان خپور کړئ.",
      en: "Tap the “Sell something” button, add photos, a title, price and location, then publish your ad.",
    },
  },
  {
    q: {
      fa: "چرا آگهی من در انتظار تایید است؟",
      ps: "زما اعلان ولې د تصویب په تمه دی؟",
      en: "Why is my listing pending?",
    },
    a: {
      fa: "برخی آگهی‌ها پیش از نمایش عمومی توسط تیم نظارت بررسی می‌شوند.",
      ps: "ځینې اعلانونه د خپرېدو دمخه د څارنې ټیم لخوا کتل کیږي.",
      en: "Some listings are reviewed by our moderation team before they appear publicly.",
    },
  },
  {
    q: {
      fa: "چگونه با فروشنده تماس بگیرم؟",
      ps: "څنګه له پلورونکي سره اړیکه ونیسم؟",
      en: "How do I contact a seller?",
    },
    a: {
      fa: "از صفحه آگهی روی «ارسال پیام» بزنید تا گفتگو در بخش پیام‌ها آغاز شود.",
      ps: "د اعلان له پاڼې «پیغام لیږل» کېکاږئ ترڅو خبرې پیل شي.",
      en: "Open the listing and tap “Send message” to start a chat in your Messages tab.",
    },
  },
  {
    q: {
      fa: "شماره تماس من به چه کسانی نمایش داده می‌شود؟",
      ps: "زما شمېره چا ته ښکاري؟",
      en: "Who can see my phone number?",
    },
    a: {
      fa: "تنها کاربرانی که با آنها گفتگوی فعال دارید یا از طریق دکمه تماس در آگهی شما.",
      ps: "یوازې هغه کاروونکي چې ورسره فعالې خبرې لرئ، یا ستاسو د اعلان د زنګ تڼۍ له لارې.",
      en: "Only people you have an active conversation with, or through the call button on your listing.",
    },
  },
  {
    q: {
      fa: "چگونه حساب خود را حذف کنم؟",
      ps: "څنګه خپل حساب ړنګ کړم؟",
      en: "How do I delete my account?",
    },
    a: {
      fa: "از صفحه حساب، بخش «عملیات حساب»، گزینه «حذف حساب» را انتخاب و تایید کنید.",
      ps: "د حساب له پاڼې، د «د حساب کړنې» برخه کې «حساب ړنګول» وټاکئ او تایید یې کړئ.",
      en: "Open your Account page, go to “Account actions” and choose “Delete account”, then confirm.",
    },
  },
];

function FaqPage() {
  const { t, locName } = useI18n();
  return (
    <div className="min-h-screen bg-background pb-32">
      <TopBar title={t("faqTitle")} right={<LanguageSwitcher variant="onLight" />} />
      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        <div className="flex flex-col gap-3">
          {ITEMS.map((it) => (
            <details key={it.q.en} className="group rounded-2xl border border-border bg-card p-4">
              <summary className="cursor-pointer list-none break-words text-sm font-bold leading-snug marker:hidden">
                {locName(it.q)}
              </summary>
              <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">{locName(it.a)}</p>
            </details>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
