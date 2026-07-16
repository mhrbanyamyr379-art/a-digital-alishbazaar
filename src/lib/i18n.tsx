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
  // Listing system upgrade
  next: { fa: "بعدی", ps: "بل", en: "Next" },
  back: { fa: "قبلی", ps: "شاته", en: "Back" },
  step: { fa: "مرحله", ps: "پړاو", en: "Step" },
  of: { fa: "از", ps: "له", en: "of" },
  saveDraft: { fa: "ذخیره پیش‌نویس", ps: "مسوده ثبتول", en: "Save draft" },
  publishNow: { fa: "انتشار آگهی", ps: "خپرول", en: "Publish" },
  draft: { fa: "پیش‌نویس", ps: "مسوده", en: "Draft" },
  expired: { fa: "منقضی شده", ps: "پای ته رسیدلی", en: "Expired" },
  rejected: { fa: "رد شده", ps: "رد شوی", en: "Rejected" },
  renew: { fa: "تمدید", ps: "نوی کول", en: "Renew" },
  renewed: { fa: "تمدید شد", ps: "نوی شو", en: "Renewed" },
  markActive: { fa: "فعال‌سازی", ps: "فعالول", en: "Reactivate" },
  publishedOn: { fa: "تاریخ انتشار", ps: "د خپرېدو نېټه", en: "Published" },
  expiresOn: { fa: "انقضا", ps: "پای", en: "Expires" },
  statistics: { fa: "آمار", ps: "شمیرې", en: "Statistics" },
  favoritesCount: { fa: "پسندها", ps: "خوښې", en: "Saves" },
  relatedListings: { fa: "آگهی‌های مشابه", ps: "ورته اعلانونه", en: "Related listings" },
  contactMethod: { fa: "روش تماس", ps: "د اړیکې لاره", en: "Contact method" },
  callOnly: { fa: "فقط تماس", ps: "یوازې زنګ", en: "Call only" },
  chatOnly: { fa: "فقط پیام", ps: "یوازې پیغام", en: "Chat only" },
  both: { fa: "تماس و پیام", ps: "زنګ او پیغام", en: "Call & chat" },
  tags: { fa: "برچسب‌ها", ps: "ټګونه", en: "Tags" },
  addTag: { fa: "افزودن برچسب", ps: "ټګ زیاتول", en: "Add tag" },
  tagsHint: { fa: "کلمات کلیدی برای جستجوی بهتر", ps: "د ښه لټون لپاره کلیدي کلمې", en: "Keywords to help buyers find you" },
  optional: { fa: "اختیاری", ps: "اختیاري", en: "optional" },
  basicInfo: { fa: "اطلاعات اصلی", ps: "بنسټیز معلومات", en: "Basic info" },
  detailsStep: { fa: "جزئیات", ps: "توضیحات", en: "Details" },
  locationStep: { fa: "موقعیت و تماس", ps: "موقعیت او اړیکه", en: "Location & contact" },
  photosStep: { fa: "عکس‌ها", ps: "انځورونه", en: "Photos" },
  reviewStep: { fa: "بازبینی", ps: "کتنه", en: "Review" },
  requiredField: { fa: "این فیلد الزامی است", ps: "دا برخه اړینه ده", en: "This field is required" },
  titleTooShort: { fa: "عنوان باید حداقل ۵ حرف باشد", ps: "سرلیک باید لږ تر لږه ۵ توري وي", en: "Title must be at least 5 characters" },
  priceInvalid: { fa: "قیمت معتبر وارد کنید", ps: "سمه بیه دننه کړئ", en: "Enter a valid price" },
  imageRequired: { fa: "حداقل یک عکس اضافه کنید", ps: "لږ تر لږه یو انځور زیات کړئ", en: "Add at least one photo" },
  draftSaved: { fa: "پیش‌نویس ذخیره شد", ps: "مسوده ثبت شوه", en: "Draft saved" },
  listingUpdated: { fa: "آگهی به‌روزرسانی شد", ps: "اعلان تازه شو", en: "Listing updated" },
  listingPublished: { fa: "آگهی منتشر شد", ps: "اعلان خپور شو", en: "Listing published" },
  confirmDelete: { fa: "آیا مطمئن هستید؟", ps: "ایا ډاډه یاست؟", en: "Are you sure?" },
  confirmDeleteBody: { fa: "این آگهی برای همیشه حذف می‌شود", ps: "دا اعلان به د تل لپاره ړنګ شي", en: "This listing will be permanently deleted." },
  cancel: { fa: "لغو", ps: "لغوه", en: "Cancel" },
  coverPhoto: { fa: "عکس اصلی", ps: "اصلي انځور", en: "Cover" },
  sortImagesHint: { fa: "برای مرتب‌سازی بکشید؛ اولی عکس اصلی است", ps: "د ترتیب لپاره ویې کاږئ", en: "Drag to reorder · first is the cover" },
  compressing: { fa: "در حال آماده‌سازی...", ps: "چمتو کیږي...", en: "Optimizing..." },
  all: { fa: "همه", ps: "ټول", en: "All" },
  // Search & discovery
  recentSearches: { fa: "جستجوهای اخیر", ps: "وروستي لټونونه", en: "Recent searches" },
  popularSearches: { fa: "پرطرفدار", ps: "مشهور لټونونه", en: "Popular" },
  popularCategories: { fa: "دسته‌های محبوب", ps: "مشهورې کټګورۍ", en: "Popular categories" },
  featuredListings: { fa: "آگهی‌های ویژه", ps: "ځانګړي اعلانونه", en: "Featured" },
  discover: { fa: "کشف کنید", ps: "کشف کړئ", en: "Discover" },
  clear: { fa: "پاک کردن", ps: "پاکول", en: "Clear" },
  loadMore: { fa: "بیشتر", ps: "نور", en: "Load more" },
  anyCondition: { fa: "هر وضعیت", ps: "هر حالت", en: "Any condition" },
  datePosted: { fa: "تاریخ ثبت", ps: "د خپرېدو نېټه", en: "Date posted" },
  anyTime: { fa: "هر زمان", ps: "هر وخت", en: "Anytime" },
  last24h: { fa: "۲۴ ساعت گذشته", ps: "تېر ۲۴ ساعته", en: "Last 24 hours" },
  last7d: { fa: "۷ روز گذشته", ps: "تېره ۷ ورځې", en: "Last 7 days" },
  last30d: { fa: "۳۰ روز گذشته", ps: "تېره ۳۰ ورځې", en: "Last 30 days" },
  minRating: { fa: "حداقل امتیاز فروشنده", ps: "د پلورونکي لږ درجه", en: "Min seller rating" },
  anyRating: { fa: "هر امتیاز", ps: "هر درجه", en: "Any rating" },
  cityAll: { fa: "همه شهرها", ps: "ټول ښارونه", en: "All cities" },
  sortBy: { fa: "مرتب‌سازی", ps: "ترتیب", en: "Sort" },
  mostViewed: { fa: "پربازدیدترین", ps: "ډېر لیدل شوي", en: "Most viewed" },
  activeFilters: { fa: "فیلترهای فعال", ps: "فعال فلټرونه", en: "Active filters" },
  clearAll: { fa: "پاک‌کردن همه", ps: "ټول پاک کړه", en: "Clear all" },
  // Seller profile upgrade
  aboutSeller: { fa: "درباره فروشنده", ps: "د پلورونکي په اړه", en: "About seller" },
  trustInfo: { fa: "اعتبار فروشنده", ps: "د پلورونکي باور", en: "Trust & reputation" },
  activeListings: { fa: "آگهی‌های فعال", ps: "فعال اعلانونه", en: "Active listings" },
  soldItems: { fa: "فروخته شده", ps: "پلورل شوي", en: "Sold" },
  totalReviews: { fa: "مجموع نظرات", ps: "ټول نظرونه", en: "Total reviews" },
  averageRating: { fa: "میانگین امتیاز", ps: "منځنی درجه", en: "Average rating" },
  lastActive: { fa: "آخرین بازدید", ps: "وروستی لید", en: "Last active" },
  gridView: { fa: "نمای شبکه‌ای", ps: "جدولي لید", en: "Grid" },
  listView: { fa: "نمای لیستی", ps: "لیست لید", en: "List" },
  noReviewsYet: { fa: "هنوز نظری ثبت نشده", ps: "تر اوسه نظر نشته", en: "No reviews yet" },
  noReviewsHint: { fa: "اولین نفری باشید که نظر می‌دهد", ps: "لومړی وئ چې نظر ورکوي", en: "Be the first to leave a review" },
  safetyTips: { fa: "نکات ایمنی", ps: "د خوندیتوب لارښوونې", en: "Safety tips" },
  safetyMeet: { fa: "همیشه در مکان عمومی ملاقات کنید", ps: "تل په عامه ځای کې وګورئ", en: "Always meet in public places" },
  safetyInspect: { fa: "قبل از پرداخت، کالا را بررسی کنید", ps: "له تادیې مخکې توکی وګورئ", en: "Inspect the item before you pay" },
  safetyAdvance: { fa: "هرگز پول را از قبل ارسال نکنید", ps: "هېڅکله مخکې پیسې مه لیږئ", en: "Never send money in advance" },
  safetyReport: { fa: "موارد مشکوک را گزارش دهید", ps: "شکمن قضیې راپور کړئ", en: "Report suspicious users" },
  shareProfile: { fa: "اشتراک پروفایل", ps: "پروفایل شریکول", en: "Share profile" },
  reportSeller: { fa: "گزارش فروشنده", ps: "د پلورونکي راپور", en: "Report seller" },
  contactSeller: { fa: "تماس با فروشنده", ps: "له پلورونکي سره اړیکه", en: "Contact seller" },
  reviewSubmitted: { fa: "نظر شما ثبت شد", ps: "ستاسو نظر ثبت شو", en: "Review submitted" },
  cantReviewSelf: { fa: "نمی‌توانید به خودتان امتیاز بدهید", ps: "خپل ځان ته درجه نه ورکوئ", en: "You can't review yourself" },
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
