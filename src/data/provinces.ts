// All 34 provinces of Afghanistan with trilingual names and major cities/districts.
export interface Province {
  id: string;
  en: string;
  fa: string; // Dari
  ps: string; // Pashto
  cities: string[];
}

export const PROVINCES: Province[] = [
  { id: "kabul", en: "Kabul", fa: "کابل", ps: "کابل", cities: ["Kabul City", "Paghman", "Bagrami", "Deh Sabz"] },
  { id: "herat", en: "Herat", fa: "هرات", ps: "هرات", cities: ["Herat City", "Guzara", "Injil", "Karukh"] },
  { id: "balkh", en: "Balkh", fa: "بلخ", ps: "بلخ", cities: ["Mazar-i-Sharif", "Balkh", "Dehdadi", "Nahri Shahi"] },
  { id: "kandahar", en: "Kandahar", fa: "قندهار", ps: "کندهار", cities: ["Kandahar City", "Spin Boldak", "Arghandab"] },
  { id: "nangarhar", en: "Nangarhar", fa: "ننگرهار", ps: "ننګرهار", cities: ["Jalalabad", "Behsud", "Surkh Rod"] },
  { id: "kunduz", en: "Kunduz", fa: "کندز", ps: "کندز", cities: ["Kunduz City", "Imam Sahib", "Khanabad"] },
  { id: "badakhshan", en: "Badakhshan", fa: "بدخشان", ps: "بدخشان", cities: ["Fayzabad", "Baharak", "Jurm"] },
  { id: "baghlan", en: "Baghlan", fa: "بغلان", ps: "بغلان", cities: ["Puli Khumri", "Baghlan", "Nahrin"] },
  { id: "takhar", en: "Takhar", fa: "تخار", ps: "تخار", cities: ["Taloqan", "Rustaq", "Farkhar"] },
  { id: "helmand", en: "Helmand", fa: "هلمند", ps: "هلمند", cities: ["Lashkargah", "Gereshk", "Sangin"] },
  { id: "ghazni", en: "Ghazni", fa: "غزنی", ps: "غزني", cities: ["Ghazni City", "Andar", "Jaghori"] },
  { id: "faryab", en: "Faryab", fa: "فاریاب", ps: "فارياب", cities: ["Maymana", "Andkhoy", "Dawlatabad"] },
  { id: "farah", en: "Farah", fa: "فراه", ps: "فراه", cities: ["Farah City", "Bala Buluk", "Anar Dara"] },
  { id: "jawzjan", en: "Jawzjan", fa: "جوزجان", ps: "جوزجان", cities: ["Sheberghan", "Aqcha", "Khamyab"] },
  { id: "kunar", en: "Kunar", fa: "کنر", ps: "کونړ", cities: ["Asadabad", "Narang", "Chapa Dara"] },
  { id: "khost", en: "Khost", fa: "خوست", ps: "خوست", cities: ["Khost City", "Sabari", "Tani"] },
  { id: "paktia", en: "Paktia", fa: "پکتیا", ps: "پکتيا", cities: ["Gardez", "Zurmat", "Ahmadabad"] },
  { id: "paktika", en: "Paktika", fa: "پکتیکا", ps: "پکتيکا", cities: ["Sharana", "Urgun", "Barmal"] },
  { id: "logar", en: "Logar", fa: "لوگر", ps: "لوګر", cities: ["Pul-i-Alam", "Baraki Barak", "Mohammad Agha"] },
  { id: "wardak", en: "Maidan Wardak", fa: "میدان وردک", ps: "ميدان وردګ", cities: ["Maidan Shar", "Sayed Abad", "Jalrez"] },
  { id: "parwan", en: "Parwan", fa: "پروان", ps: "پروان", cities: ["Charikar", "Bagram", "Jabal Saraj"] },
  { id: "kapisa", en: "Kapisa", fa: "کاپیسا", ps: "کاپيسا", cities: ["Mahmud-i-Raqi", "Nijrab", "Tagab"] },
  { id: "laghman", en: "Laghman", fa: "لغمان", ps: "لغمان", cities: ["Mihtarlam", "Qarghayi", "Alingar"] },
  { id: "ghor", en: "Ghor", fa: "غور", ps: "غور", cities: ["Chaghcharan", "Shahrak", "Tulak"] },
  { id: "bamyan", en: "Bamyan", fa: "بامیان", ps: "باميان", cities: ["Bamyan City", "Yakawlang", "Panjab"] },
  { id: "daykundi", en: "Daykundi", fa: "دایکندی", ps: "دايکندي", cities: ["Nili", "Shahristan", "Kajran"] },
  { id: "samangan", en: "Samangan", fa: "سمنگان", ps: "سمنګان", cities: ["Aybak", "Dara-i-Suf", "Feroz Nakhchir"] },
  { id: "sar-e-pol", en: "Sar-e Pol", fa: "سرپل", ps: "سرپل", cities: ["Sar-e Pol City", "Sangcharak", "Kohistanat"] },
  { id: "badghis", en: "Badghis", fa: "بادغیس", ps: "بادغيس", cities: ["Qala-i-Naw", "Bala Murghab", "Muqur"] },
  { id: "nuristan", en: "Nuristan", fa: "نورستان", ps: "نورستان", cities: ["Parun", "Waygal", "Kamdesh"] },
  { id: "nimroz", en: "Nimroz", fa: "نیمروز", ps: "نيمروز", cities: ["Zaranj", "Khash Rod", "Chakhansur"] },
  { id: "zabul", en: "Zabul", fa: "زابل", ps: "زابل", cities: ["Qalat", "Shahjoy", "Tarnak wa Jaldak"] },
  { id: "uruzgan", en: "Uruzgan", fa: "ارزگان", ps: "ارزګان", cities: ["Tarinkot", "Deh Rawood", "Chora"] },
  { id: "panjshir", en: "Panjshir", fa: "پنجشیر", ps: "پنجشير", cities: ["Bazarak", "Rukha", "Anaba"] },
];

export const provinceById = (id?: string | null) => PROVINCES.find((p) => p.id === id);
