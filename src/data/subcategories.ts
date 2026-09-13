/**
 * Hierarchical taxonomy: every main category in `src/data/categories.ts`
 * has an ordered list of subcategories. `other` ("سایر") always exists last
 * so a seller is never blocked from posting.
 *
 * This file is the single source of truth for labels. The database mirrors
 * only the (category, subcategory) slug pairs (table `public.subcategories`)
 * so listings can be validated by a foreign key.
 */

export interface Subcategory {
  id: string;
  en: string;
  fa: string;
  ps: string;
}

const OTHER: Subcategory = { id: "other", en: "Other", fa: "سایر", ps: "نور" };

export const SUBCATEGORIES: Record<string, Subcategory[]> = {
  cars: [
    { id: "sedans", en: "Cars & Sedans", fa: "موترهای سواری", ps: "سپورتي موټرې" },
    { id: "suv", en: "SUVs", fa: "موترهای شاسی‌بلند", ps: "لوړ شاسي موټرې" },
    { id: "trucks", en: "Trucks & Cargo", fa: "موترهای باربری", ps: "باربري موټرې" },
    { id: "buses", en: "Buses & Vans", fa: "موترهای مسافربری", ps: "مسافربري موټرې" },
    { id: "motorcycles", en: "Motorcycles", fa: "موترسایکل", ps: "موټرسایکل" },
    { id: "rickshaw", en: "Three-wheelers", fa: "سه‌چرخه", ps: "درې‌ټایره" },
    { id: "car_parts", en: "Car Parts", fa: "پرزه‌جات موتر", ps: "د موټر پرزې" },
    { id: "tires_rims", en: "Tires & Rims", fa: "تایر و رینگ", ps: "ټایر او رېنګ" },
    { id: "car_accessories", en: "Car Accessories", fa: "لوازم و تجهیزات موتر", ps: "د موټر لوازم" },
    { id: "car_repair", en: "Car Repair Services", fa: "خدمات ترمیم موتر", ps: "د موټر ترمیم خدمتونه" },
    { id: "car_rental", en: "Car Rental", fa: "کرایه موتر", ps: "د موټر کرایه" },
    OTHER,
  ],
  property: [
    { id: "house", en: "Houses", fa: "خانه", ps: "کور" },
    { id: "apartment", en: "Apartments", fa: "آپارتمان", ps: "اپارتمان" },
    { id: "land", en: "Land", fa: "زمین", ps: "ځمکه" },
    { id: "shop", en: "Shops", fa: "دوکان", ps: "دوکان" },
    { id: "office", en: "Offices", fa: "دفتر", ps: "دفتر" },
    { id: "garden", en: "Gardens", fa: "باغ", ps: "باغ" },
    { id: "farm", en: "Farms", fa: "فارم", ps: "فارم" },
    { id: "warehouse", en: "Warehouses", fa: "گدام", ps: "ګدام" },
    { id: "commercial", en: "Commercial Buildings", fa: "تعمیرات تجارتی", ps: "سوداګریز ودانۍ" },
    { id: "house_rent", en: "House for Rent", fa: "کرایه خانه", ps: "د کور کرایه" },
    { id: "shop_rent", en: "Shop for Rent", fa: "کرایه دوکان", ps: "د دوکان کرایه" },
    { id: "property_sale", en: "Property for Sale", fa: "فروش ملک", ps: "د ملکیت پلورل" },
    OTHER,
  ],
  jobs: [
    { id: "office_jobs", en: "Office Jobs", fa: "کارهای اداری", ps: "اداري دندې" },
    { id: "sales", en: "Sales", fa: "فروشندگی", ps: "پلورنه" },
    { id: "construction", en: "Construction Jobs", fa: "کارهای ساختمانی", ps: "ساختماني دندې" },
    { id: "driving", en: "Driving", fa: "رانندگی", ps: "موټر چلول" },
    { id: "technical", en: "Technical Services", fa: "خدمات فنی", ps: "تخنیکي خدمتونه" },
    { id: "restaurant", en: "Restaurant Jobs", fa: "کارهای رستورانت", ps: "د رستورانت دندې" },
    { id: "retail", en: "Shop Jobs", fa: "کارهای فروشگاه", ps: "د پلورنځي دندې" },
    { id: "online", en: "Online Jobs", fa: "کارهای آنلاین", ps: "آنلاین دندې" },
    { id: "part_time", en: "Part-time", fa: "کارهای نیمه‌وقت", ps: "نیم وخت دندې" },
    { id: "full_time", en: "Full-time", fa: "کارهای تمام‌وقت", ps: "بشپړ وخت دندې" },
    { id: "internship", en: "Internship", fa: "کارآموزی", ps: "کارآموزي" },
    OTHER,
  ],
  electronics: [
    { id: "tv", en: "TVs", fa: "تلویزیون", ps: "تلویزیون" },
    { id: "computers", en: "Computers", fa: "کمپیوتر", ps: "کمپیوټر" },
    { id: "laptops", en: "Laptops", fa: "لپ‌تاپ", ps: "لپ‌ټاپ" },
    { id: "printers", en: "Printers", fa: "پرینتر", ps: "پرنټر" },
    { id: "cameras", en: "Cameras", fa: "کمره", ps: "کمره" },
    { id: "audio", en: "Audio Devices", fa: "وسایل صوتی", ps: "غږیز وسایل" },
    { id: "appliances", en: "Electric Appliances", fa: "لوازم برقی", ps: "بریښنایي لوازم" },
    { id: "networking", en: "Network & Internet", fa: "لوازم شبکه و اینترنت", ps: "شبکه او انټرنټ" },
    { id: "gaming", en: "Gaming Gear", fa: "تجهیزات گیمینگ", ps: "ګیمینګ توکي" },
    { id: "components", en: "Electronic Components", fa: "قطعات الکترونیکی", ps: "بریښنایي پرزې" },
    OTHER,
  ],
  mobiles: [
    { id: "phones", en: "Mobile Phones", fa: "موبایل", ps: "موبایل" },
    { id: "tablets", en: "Tablets", fa: "تبلت", ps: "ټابلېټ" },
    { id: "smartwatch", en: "Smart Watches", fa: "ساعت هوشمند", ps: "سمارټ ساعت" },
    { id: "accessories", en: "Mobile Accessories", fa: "لوازم جانبی موبایل", ps: "د موبایل لوازم" },
    { id: "chargers", en: "Chargers & Cables", fa: "شارژر و کابل", ps: "چارجر او کیبل" },
    { id: "headphones", en: "Headphones", fa: "هدفون و هندزفری", ps: "هډفون او هینډزفري" },
    { id: "phone_parts", en: "Phone Parts", fa: "قطعات موبایل", ps: "د موبایل پرزې" },
    { id: "phone_repair", en: "Phone Repair", fa: "تعمیرات موبایل", ps: "د موبایل ترمیم" },
    { id: "sim_services", en: "SIM & Telecom Services", fa: "سیم‌کارت و خدمات ارتباطی", ps: "سیم‌کارت او مخابراتي خدمتونه" },
    OTHER,
  ],
  services: [
    { id: "phone_repair", en: "Mobile Repair", fa: "تعمیرات موبایل", ps: "د موبایل ترمیم" },
    { id: "computer_repair", en: "Computer Repair", fa: "تعمیرات کمپیوتر", ps: "د کمپیوټر ترمیم" },
    { id: "electrical", en: "Electrical Work", fa: "برق‌کاری", ps: "بریښنا کاري" },
    { id: "plumbing", en: "Plumbing", fa: "لوله‌کشی", ps: "پایپ کاري" },
    { id: "carpentry", en: "Carpentry", fa: "نجاری", ps: "نجاري" },
    { id: "painting", en: "Painting", fa: "رنگ‌کاری و نقاشی", ps: "رنګ کاري" },
    { id: "construction", en: "Construction Services", fa: "خدمات ساختمانی", ps: "ساختماني خدمتونه" },
    { id: "cleaning", en: "Cleaning", fa: "نظافت", ps: "پاکوالی" },
    { id: "tailoring", en: "Tailoring", fa: "خیاطی", ps: "خیاطي" },
    { id: "beauty", en: "Barber & Beauty", fa: "آرایشگری", ps: "سلماني او ښکلا" },
    { id: "photography", en: "Photo & Video", fa: "عکاسی و فیلم‌برداری", ps: "عکاسي او فلمبرداري" },
    { id: "graphic_design", en: "Graphic Design", fa: "طراحی گرافیک", ps: "ګرافیک ډیزاین" },
    { id: "translation", en: "Translation", fa: "ترجمه", ps: "ژباړه" },
    { id: "transport", en: "Transport", fa: "حمل‌ونقل", ps: "ترانسپورت" },
    { id: "internet_services", en: "Internet Services", fa: "خدمات اینترنتی", ps: "انټرنټ خدمتونه" },
    { id: "tutoring", en: "Private Tutoring", fa: "آموزش خصوصی", ps: "خصوصي زده‌کړه" },
    { id: "printing", en: "Printing Services", fa: "خدمات چاپ", ps: "د چاپ خدمتونه" },
    { id: "technical", en: "Technical Services", fa: "خدمات فنی", ps: "تخنیکي خدمتونه" },
    OTHER,
  ],
  fashion: [
    { id: "mens", en: "Men's Clothing", fa: "لباس مردانه", ps: "نارینه جامې" },
    { id: "womens", en: "Women's Clothing", fa: "لباس زنانه", ps: "ښځینه جامې" },
    { id: "kids", en: "Kids' Clothing", fa: "لباس کودک", ps: "ماشومانو جامې" },
    { id: "shoes", en: "Shoes", fa: "کفش", ps: "بوټان" },
    { id: "bags", en: "Bags", fa: "کیف", ps: "بکسونه" },
    { id: "watches", en: "Watches", fa: "ساعت", ps: "ساعتونه" },
    { id: "jewelry", en: "Jewelry", fa: "زیورات", ps: "ګاڼې" },
    { id: "cosmetics", en: "Cosmetics", fa: "لوازم آرایشی", ps: "د ښکلا توکي" },
    { id: "traditional", en: "Traditional Clothing", fa: "لباس سنتی", ps: "دودیزې جامې" },
    OTHER,
  ],
  home: [
    { id: "furniture", en: "Furniture", fa: "مبلمان", ps: "فرنیچر" },
    { id: "tables_chairs", en: "Tables & Chairs", fa: "میز و چوکی", ps: "میز او څوکۍ" },
    { id: "beds", en: "Beds & Mattresses", fa: "تخت و تشک", ps: "کټ او دوشک" },
    { id: "kitchen", en: "Kitchenware", fa: "لوازم آشپزخانه", ps: "د پخلنځي لوازم" },
    { id: "decor", en: "Decor", fa: "وسایل تزئینی", ps: "ښایسته توکي" },
    { id: "carpets", en: "Carpets & Rugs", fa: "فرش و قالین", ps: "قالین او فرش" },
    { id: "curtains", en: "Curtains", fa: "پرده", ps: "پردې" },
    { id: "home_appliances", en: "Home Appliances", fa: "لوازم خانگی", ps: "کورني وسایل" },
    { id: "bedding", en: "Bedding", fa: "وسایل خواب", ps: "د خوب توکي" },
    OTHER,
  ],
  business: [
    { id: "shops", en: "Shops", fa: "فروشگاه", ps: "پلورنځي" },
    { id: "shop_equipment", en: "Shop Equipment", fa: "تجهیزات فروشگاهی", ps: "د پلورنځي تجهیزات" },
    { id: "machinery", en: "Machinery", fa: "ماشین‌آلات", ps: "ماشین آلات" },
    { id: "office_equipment", en: "Office Equipment", fa: "تجهیزات اداری", ps: "اداري تجهیزات" },
    { id: "raw_materials", en: "Raw Materials", fa: "مواد اولیه", ps: "خام مواد" },
    { id: "wholesale", en: "Wholesale", fa: "عمده‌فروشی", ps: "ټوکي پلورل" },
    { id: "opportunity", en: "Business Opportunity", fa: "فرصت تجاری", ps: "سوداګریز فرصت" },
    { id: "partnership", en: "Partnership", fa: "شراکت", ps: "شراکت" },
    OTHER,
  ],
  education: [
    { id: "books", en: "Books", fa: "کتاب", ps: "کتابونه" },
    { id: "stationery", en: "Stationery", fa: "لوازم‌التحریر", ps: "قرطاسیه" },
    { id: "courses", en: "Courses & Training", fa: "کورس و آموزش", ps: "کورسونه او روزنه" },
    { id: "language", en: "Language Learning", fa: "آموزش زبان", ps: "د ژبې زده‌کړه" },
    { id: "tutoring", en: "Private Tutoring", fa: "آموزش خصوصی", ps: "خصوصي زده‌کړه" },
    { id: "edu_services", en: "Educational Services", fa: "خدمات آموزشی", ps: "زده‌کړیز خدمتونه" },
    { id: "university", en: "University & Higher Education", fa: "دانشگاه و تحصیلات عالی", ps: "پوهنتون او لوړې زده‌کړې" },
    OTHER,
  ],
  agriculture: [
    { id: "farm_land", en: "Farm Land", fa: "زمین زراعتی", ps: "کرنیزه ځمکه" },
    { id: "crops", en: "Crops & Produce", fa: "محصولات زراعتی", ps: "کرنیز محصولات" },
    { id: "seeds", en: "Seeds", fa: "تخم و بذر", ps: "تخم او بزر" },
    { id: "fertilizer", en: "Fertilizer & Supplies", fa: "کود و مواد زراعتی", ps: "سرې او کرنیز مواد" },
    { id: "farm_machinery", en: "Farm Machinery", fa: "ماشین‌آلات زراعتی", ps: "کرنیز ماشین آلات" },
    { id: "farm_tools", en: "Farm Tools", fa: "ابزار زراعتی", ps: "کرنیز وسایل" },
    { id: "irrigation", en: "Irrigation", fa: "آبیاری", ps: "اوبه لګونه" },
    { id: "plants", en: "Flowers & Plants", fa: "گل و نباتات", ps: "ګلان او نباتات" },
    OTHER,
  ],
  animals: [
    { id: "pets", en: "Pets", fa: "حیوانات خانگی", ps: "کورني څاروي" },
    { id: "birds", en: "Poultry & Birds", fa: "مرغ و پرندگان", ps: "چرګان او مرغان" },
    { id: "cows", en: "Cows", fa: "گاو", ps: "غوا" },
    { id: "sheep", en: "Sheep", fa: "گوسفند", ps: "پسه" },
    { id: "goats", en: "Goats", fa: "بز", ps: "وزه" },
    { id: "horses", en: "Horses", fa: "اسب", ps: "آس" },
    { id: "livestock", en: "Farm Animals", fa: "حیوانات زراعتی", ps: "کرنیز څاروي" },
    { id: "animal_feed", en: "Animal Feed", fa: "خوراک حیوانات", ps: "د څارویو خواړه" },
    { id: "animal_supplies", en: "Animal Supplies", fa: "لوازم حیوانات", ps: "د څارویو لوازم" },
    { id: "vet", en: "Veterinary Services", fa: "خدمات دامپزشکی", ps: "ویټرنري خدمتونه" },
    OTHER,
  ],
  others: [
    { id: "personal", en: "Personal Items", fa: "وسایل شخصی", ps: "شخصي توکي" },
    { id: "gifts", en: "Gifts", fa: "هدایا", ps: "ډالۍ" },
    { id: "second_hand", en: "Second-hand Items", fa: "اشیای دست‌دوم", ps: "دوهم لاس توکي" },
    { id: "collectibles", en: "Collectibles", fa: "کلکسیونی", ps: "کلکسیوني توکي" },
    { id: "travel", en: "Travel Gear", fa: "لوازم سفر", ps: "د سفر توکي" },
    { id: "sports", en: "Sports Gear", fa: "لوازم ورزشی", ps: "سپورتي توکي" },
    OTHER,
  ],
};

export const subcategoriesFor = (categoryId?: string | null): Subcategory[] =>
  (categoryId && SUBCATEGORIES[categoryId]) || [];

export const subcategoryById = (
  categoryId?: string | null,
  subId?: string | null,
): Subcategory | undefined =>
  subId ? subcategoriesFor(categoryId).find((s) => s.id === subId) : undefined;

export const isValidSubcategory = (categoryId?: string | null, subId?: string | null) =>
  !!subcategoryById(categoryId, subId);
