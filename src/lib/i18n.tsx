import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "fa" | "ps" | "en";

export const LANGS: { id: Lang; label: string; native: string; dir: "rtl" | "ltr" }[] = [
  { id: "fa", label: "Dari", native: "دری", dir: "rtl" },
  { id: "ps", label: "Pashto", native: "پښتو", dir: "rtl" },
  { id: "en", label: "English", native: "English", dir: "ltr" },
];

type Dict = Record<string, { fa: string; ps: string; en: string }>;

const T: Dict = {
  appName: { fa: "بازار افغان", ps: "افغان بازار", en: "Afghan Bazaar" },
  tagline: { fa: "بازار آنلاین افغانستان", ps: "د افغانستان آنلاین بازار", en: "Afghanistan's Marketplace" },
  search: { fa: "چه می‌جویید؟", ps: "څه لټوئ؟", en: "What are you looking for?" },
  allProvinces: { fa: "همه ولایات", ps: "ټول ولایات", en: "All provinces" },
  allCategories: { fa: "همه", ps: "ټول", en: "All" },
  home: { fa: "خانه", ps: "کور", en: "Home" },
  favorites: { fa: "پسندیده‌ها", ps: "خوښې", en: "Favorites" },
  chat: { fa: "پیام‌ها", ps: "چټ", en: "Chat" },
  profile: { fa: "پروفایل", ps: "پروفایل", en: "Profile" },
  notifications: { fa: "اطلاعات", ps: "خبرتیاوې", en: "Notifications" },
  sell: { fa: "فروش", ps: "خرڅول", en: "Sell" },
  sellSomething: { fa: "چیزی بفروشید", ps: "څه شی خرڅ کړئ", en: "Sell something" },
  signIn: { fa: "ورود", ps: "ننوتل", en: "Sign in" },
  signUp: { fa: "ثبت نام", ps: "نوم لیکنه", en: "Sign up" },
  signOut: { fa: "خروج", ps: "وتل", en: "Sign out" },
  email: { fa: "ایمیل", ps: "ایمیل", en: "Email" },
  password: { fa: "رمز عبور", ps: "پټ نوم", en: "Password" },
  displayName: { fa: "نام", ps: "نوم", en: "Name" },
  continueGoogle: { fa: "ادامه با گوگل", ps: "له ګوګل سره دوام", en: "Continue with Google" },
  newest: { fa: "جدیدترین", ps: "تازه", en: "Newest" },
  priceLow: { fa: "ارزان‌ترین", ps: "ارزانه", en: "Price: Low to High" },
  priceHigh: { fa: "گران‌ترین", ps: "ګران", en: "Price: High to Low" },
  filters: { fa: "فیلترها", ps: "فلټرونه", en: "Filters" },
  apply: { fa: "اعمال", ps: "پلي کول", en: "Apply" },
  reset: { fa: "بازنشانی", ps: "بیا تنظیم", en: "Reset" },
  minPrice: { fa: "حداقل قیمت", ps: "لږ تر لږه بیه", en: "Min price" },
  maxPrice: { fa: "حداکثر قیمت", ps: "اعظمي بیه", en: "Max price" },
  category: { fa: "دسته", ps: "کټګوري", en: "Category" },
  province: { fa: "ولایت", ps: "ولایت", en: "Province" },
  city: { fa: "شهر", ps: "ښار", en: "City" },
  condition: { fa: "وضعیت", ps: "حالت", en: "Condition" },
  negotiable: { fa: "قابل معامله", ps: "د معاملې وړ", en: "Negotiable" },
  title: { fa: "عنوان", ps: "سرلیک", en: "Title" },
  description: { fa: "توضیحات", ps: "تفصیل", en: "Description" },
  price: { fa: "قیمت", ps: "بیه", en: "Price" },
  photos: { fa: "عکس‌ها", ps: "انځورونه", en: "Photos" },
  addPhotos: { fa: "افزودن عکس", ps: "انځور زیاتول", en: "Add photos" },
  postListing: { fa: "ثبت آگهی", ps: "اعلان خپرول", en: "Post listing" },
  postedBy: { fa: "فروشنده", ps: "پلورونکی", en: "Seller" },
  message: { fa: "پیام", ps: "پیغام", en: "Message" },
  sendMessage: { fa: "ارسال پیام", ps: "پیغام لیږل", en: "Send message" },
  typeMessage: { fa: "پیام بنویسید...", ps: "پیغام ولیکئ...", en: "Type a message..." },
  call: { fa: "تماس", ps: "زنګ", en: "Call" },
  share: { fa: "اشتراک", ps: "شریکول", en: "Share" },
  report: { fa: "گزارش", ps: "راپور", en: "Report" },
  reportReason: { fa: "دلیل گزارش", ps: "د راپور دلیل", en: "Reason for report" },
  submit: { fa: "ارسال", ps: "لیږل", en: "Submit" },
  reviews: { fa: "نظرات", ps: "نظرونه", en: "Reviews" },
  writeReview: { fa: "نوشتن نظر", ps: "نظر ولیکئ", en: "Write a review" },
  rating: { fa: "امتیاز", ps: "درجه بندي", en: "Rating" },
  myListings: { fa: "آگهی‌های من", ps: "زما اعلانونه", en: "My listings" },
  recentlyViewed: { fa: "اخیراً دیده شده", ps: "پخوا لیدل شوي", en: "Recently viewed" },
  editProfile: { fa: "ویرایش پروفایل", ps: "پروفایل سمول", en: "Edit profile" },
  save: { fa: "ذخیره", ps: "ثبتول", en: "Save" },
  delete: { fa: "حذف", ps: "ړنګول", en: "Delete" },
  edit: { fa: "ویرایش", ps: "سمول", en: "Edit" },
  markSold: { fa: "فروخته شد", ps: "پلورل شوی", en: "Mark as sold" },
  active: { fa: "فعال", ps: "فعال", en: "Active" },
  sold: { fa: "فروخته شده", ps: "پلورل شوی", en: "Sold" },
  pending: { fa: "در انتظار", ps: "په تمه", en: "Pending" },
  emptyListings: { fa: "هیچ آگهی یافت نشد", ps: "هیڅ اعلان ونه موندل شو", en: "No listings found" },
  emptyFavorites: { fa: "هنوز موردی نشانه نکرده‌اید", ps: "تر اوسه مو څه نه دي خوښ کړي", en: "No saved items yet" },
  emptyChat: { fa: "هنوز گفتگویی ندارید", ps: "تر اوسه خبرې نشته", en: "No conversations yet" },
  loginRequired: { fa: "برای ادامه وارد شوید", ps: "د دوام لپاره ننوځئ", en: "Sign in to continue" },
  admin: { fa: "مدیریت", ps: "مدیریت", en: "Admin" },
  dashboard: { fa: "داشبورد", ps: "ډشبورډ", en: "Dashboard" },
  users: { fa: "کاربران", ps: "کاروونکي", en: "Users" },
  listings: { fa: "آگهی‌ها", ps: "اعلانونه", en: "Listings" },
  reports: { fa: "گزارش‌ها", ps: "راپورونه", en: "Reports" },
  approve: { fa: "تایید", ps: "تایید", en: "Approve" },
  reject: { fa: "رد", ps: "رد", en: "Reject" },
  ban: { fa: "مسدود", ps: "بندول", en: "Ban" },
  viewAll: { fa: "مشاهده همه", ps: "ټول وګورئ", en: "View all" },
  latest: { fa: "تازه‌ترین‌ها", ps: "تازه ترین", en: "Latest" },
  results: { fa: "نتیجه", ps: "پایلې", en: "results" },
  saved: { fa: "ذخیره شد", ps: "ثبت شو", en: "Saved" },
  bio: { fa: "بیوگرافی", ps: "پیژندنه", en: "Bio" },
  phone: { fa: "شماره تماس", ps: "د اړیکې شمیره", en: "Phone" },
  memberSince: { fa: "عضو از", ps: "غړی له", en: "Member since" },
  view: { fa: "بازدید", ps: "لید", en: "views" },
  loading: { fa: "بارگذاری...", ps: "بارول کیږي...", en: "Loading..." },
  errorTitle: { fa: "خطایی رخ داد", ps: "یوه ستونزه رامنځته شوه", en: "Something went wrong" },
  retry: { fa: "تلاش دوباره", ps: "بیا هڅه", en: "Try again" },
};

interface I18nCtx {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: (key: keyof typeof T) => string;
  locName: (obj: { en: string; fa: string; ps: string }) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fa");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("ab-lang")) as Lang | null;
    if (stored && LANGS.some((l) => l.id === stored)) setLangState(stored);
  }, []);

  const dir = LANGS.find((l) => l.id === lang)?.dir ?? "rtl";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("ab-lang", l);
  };

  const t = (key: keyof typeof T) => T[key]?.[lang] ?? String(key);
  const locName = (obj: { en: string; fa: string; ps: string }) => obj[lang];

  return <Ctx.Provider value={{ lang, dir, setLang, t, locName }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
