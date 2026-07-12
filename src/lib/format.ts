import type { Lang } from "./i18n";

const EASTERN = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toLocalDigits(input: string | number, lang: Lang): string {
  const s = String(input);
  if (lang === "en") return s;
  return s.replace(/\d/g, (d) => EASTERN[Number(d)]);
}

export function formatPrice(price: number, currency: string, lang: Lang): string {
  const grouped = new Intl.NumberFormat("en-US").format(price);
  return `${currency} ${toLocalDigits(grouped, lang)}`;
}

export function timeAgo(dateStr: string, lang: Lang): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  const L = {
    now: { fa: "همین حالا", ps: "همدا اوس", en: "just now" },
    min: { fa: "دقیقه پیش", ps: "دقیقې مخکې", en: "min ago" },
    hr: { fa: "ساعت پیش", ps: "ساعت مخکې", en: "h ago" },
    day: { fa: "روز پیش", ps: "ورځې مخکې", en: "d ago" },
  };
  if (min < 1) return L.now[lang];
  if (hr < 1) return `${toLocalDigits(min, lang)} ${L.min[lang]}`;
  if (day < 1) return `${toLocalDigits(hr, lang)} ${L.hr[lang]}`;
  if (day < 30) return `${toLocalDigits(day, lang)} ${L.day[lang]}`;
  return new Date(dateStr).toLocaleDateString(lang === "en" ? "en-US" : "fa-AF");
}
