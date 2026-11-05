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

/** "93795863251" / "+93795863251" / "0795863251" → "+93 79 586 3251" (always Latin digits, render LTR). */
export function formatPhoneIntl(raw: string | null | undefined): string {
  if (!raw) return "";
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0093")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) d = "93" + d.slice(1);
  if (d.length === 11 && d.startsWith("93")) {
    return `+93 ${d.slice(2, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }
  return d ? `+${d}` : "";
}

/** Solar Hijri date like «۱۲ خرداد ۱۴۰۵». */
export function formatSolarDate(dateStr: string, lang: Lang): string {
  const locale = lang === "en" ? "en-US-u-ca-persian" : lang === "ps" ? "ps-AF-u-ca-persian" : "fa-IR-u-ca-persian";
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(dateStr));
  } catch {
    return new Date(dateStr).toLocaleDateString();
  }
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
