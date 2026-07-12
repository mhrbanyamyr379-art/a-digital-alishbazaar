import {
  Car,
  Home,
  Briefcase,
  Laptop,
  Smartphone,
  Wrench,
  Shirt,
  Sofa,
  Building2,
  GraduationCap,
  Sprout,
  PawPrint,
  Package,
  type LucideIcon,
} from "lucide-react";

export interface Category {
  id: string;
  en: string;
  fa: string;
  ps: string;
  icon: LucideIcon;
  conditions?: boolean; // whether item condition applies
}

export const CATEGORIES: Category[] = [
  { id: "cars", en: "Cars", fa: "موټر", ps: "موټر", icon: Car, conditions: true },
  { id: "property", en: "Property", fa: "املاک", ps: "کورونه", icon: Home },
  { id: "jobs", en: "Jobs", fa: "وظایف", ps: "دندې", icon: Briefcase },
  { id: "electronics", en: "Electronics", fa: "الکترونیک", ps: "تخنیک", icon: Laptop, conditions: true },
  { id: "mobiles", en: "Mobile Phones", fa: "موبایل", ps: "موبایل", icon: Smartphone, conditions: true },
  { id: "services", en: "Services", fa: "خدمات", ps: "خدمتونه", icon: Wrench },
  { id: "fashion", en: "Fashion", fa: "پوشاک", ps: "جامې", icon: Shirt, conditions: true },
  { id: "home", en: "Home & Garden", fa: "خانه و باغ", ps: "کور او باغ", icon: Sofa, conditions: true },
  { id: "business", en: "Business", fa: "تجارت", ps: "سوداګري", icon: Building2 },
  { id: "education", en: "Education", fa: "تحصیل", ps: "زده کړه", icon: GraduationCap },
  { id: "agriculture", en: "Agriculture", fa: "زراعت", ps: "کرنه", icon: Sprout, conditions: true },
  { id: "animals", en: "Animals", fa: "حیوانات", ps: "څاروي", icon: PawPrint },
  { id: "others", en: "Others", fa: "متفرقه", ps: "نور", icon: Package, conditions: true },
];

export const categoryById = (id?: string | null) => CATEGORIES.find((c) => c.id === id);

export const CONDITIONS = [
  { id: "new", en: "New", fa: "نو", ps: "نوی" },
  { id: "like_new", en: "Like New", fa: "مثل نو", ps: "لکه نوی" },
  { id: "good", en: "Good", fa: "خوب", ps: "ښه" },
  { id: "fair", en: "Fair", fa: "متوسط", ps: "منځنی" },
  { id: "used", en: "Used", fa: "استعمال شده", ps: "کارول شوی" },
];
