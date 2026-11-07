import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import {
  BadgeCheck,
  Bell,
  Clock,
  Globe,
  HelpCircle,
  Heart,
  Info,
  KeyRound,
  Loader2,
  LogOut,
  MessageCircle,
  Moon,
  Package,
  Pencil,
  ScrollText,
  Send,
  Shield,
  ShieldCheck,
  Trash2,
  UserPen,
  Camera,
  MessageSquareWarning,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n, LANGS } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { uploadImage } from "@/lib/storage";
import { StorageImage } from "@/components/StorageImage";
import { toLocalDigits, formatPhoneIntl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PROVINCES } from "@/data/provinces";
import { BottomNav } from "@/components/BottomNav";
import { BrandTopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useUnreadTotal } from "@/hooks/useUnread";
import { APP_VERSION, TELEGRAM_LINK, TELEGRAM_HANDLE } from "@/lib/app-meta";
import {
  SettingsSection,
  SettingsLink,
  SettingsButton,
  SettingsExternal,
  SettingsStatic,
  CountBadge,
} from "@/components/settings/SettingsUI";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "My account — Alish" },
      { name: "description", content: "Manage your Alish account: profile, listings, favorites, notifications, language, theme and support." },
      { property: "og:title", content: "My account — Alish" },
      { property: "og:description", content: "Manage your Alish profile, listings and settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ProfilePage() {
  const { t, lang } = useI18n();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { unreadChats } = useUnreadTotal();

  const { data: counts } = useQuery({
    queryKey: ["account-counts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [listings, favs] = await Promise.all([
        supabase.from("listings").select("id,status,expires_at").eq("seller_id", user!.id),
        supabase.from("favorites").select("listing_id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      const rows = listings.data ?? [];
      const expired = (l: { status: string; expires_at: string | null }) =>
        l.status === "expired" || (l.status === "active" && !!l.expires_at && new Date(l.expires_at) < new Date());
      return {
        listings: rows.length,
        active: rows.filter((l) => l.status === "active" && !expired(l)).length,
        favorites: favs.count ?? 0,
      };
    },
  });

  const verified = !!(user?.email_confirmed_at || user?.phone_confirmed_at);
  const themeLabel = theme === "dark" ? t("themeDark") : theme === "system" ? t("themeSystem") : t("themeLight");
  const langLabel = LANGS.find((l) => l.id === lang)?.native ?? "";

  const cycleTheme = () => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");

  return (
    <div className="min-h-screen bg-background pb-32">
      <BrandTopBar right={<LanguageSwitcher />} />

      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        {/* Header card */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <div className="size-16 shrink-0 overflow-hidden rounded-full bg-secondary ring-2 ring-border">
              {profile?.avatar_url ? (
                <StorageImage bucket="avatars" path={profile.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-2xl font-black text-muted-foreground">
                  {profile?.display_name?.[0]?.toUpperCase() ?? "U"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <h1 className="truncate font-display text-lg font-black">{profile?.display_name ?? "—"}</h1>
                {verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label={t("verified")} />}
              </div>
              <p className="truncate text-xs text-muted-foreground">{user?.email ?? (user?.phone ? `+${user.phone}` : "")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("memberSince")}{" "}
                {profile ? toLocalDigits(new Date(profile.created_at).getFullYear(), lang) : ""}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground"
            >
              <Pencil className="size-3.5" />
              {t("editProfile")}
            </button>
            {user && (
              <Link
                to="/seller/$id"
                params={{ id: user.id }}
                className="flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold"
              >
                {t("viewProfile")}
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="flex min-h-10 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-bold text-accent-foreground"
              >
                <Shield className="size-3.5" />
                {t("admin")}
              </Link>
            )}
          </div>
        </div>

        {/* My account */}
        <SettingsSection title={t("myAccount")}>
          <SettingsButton icon={UserPen} label={t("editProfile")} onClick={() => setEditing(true)} />
          <SettingsLink to="/security" icon={KeyRound} label={t("accountSecurity")} />
          <SettingsLink to="/privacy" icon={ShieldCheck} label={t("privacyItem")} />
          <SettingsLink to="/notifications" icon={Bell} label={t("notifications")} />
        </SettingsSection>

        {/* My activity */}
        <SettingsSection title={t("myActivity")}>
          <SettingsLink
            to="/my-listings"
            icon={Package}
            label={t("myListings")}
            badge={<CountBadge count={counts?.listings ?? 0} />}
          />
          <SettingsLink
            to="/favorites"
            icon={Heart}
            label={t("favorites")}
            badge={<CountBadge count={counts?.favorites ?? 0} />}
          />
          <SettingsLink to="/recent" icon={Clock} label={t("recentlyViewed")} />
          <SettingsLink
            to="/chat"
            icon={MessageCircle}
            label={t("chat")}
            badge={<CountBadge count={unreadChats ?? 0} />}
          />
        </SettingsSection>

        {/* Listing management */}
        <SettingsSection title={t("listingManagement")}>
          <SettingsLink
            to="/my-listings"
            icon={Package}
            label={t("active")}
            badge={<CountBadge count={counts?.active ?? 0} />}
          />
          <SettingsLink to="/sell" icon={Pencil} label={t("postListing")} />
        </SettingsSection>

        {/* Help & support */}
        <SettingsSection title={t("helpSupport")}>
          <SettingsLink to="/help" icon={HelpCircle} label={t("helpCenter")} />
          <SettingsLink to="/contact" icon={Send} label={t("contactUs")} />
          <SettingsExternal href={TELEGRAM_LINK} icon={MessageSquareWarning} label={t("reportProblem")} />
          <SettingsLink to="/faq" icon={HelpCircle} label={t("faqTitle")} />
        </SettingsSection>

        {/* Official Telegram */}
        <SettingsSection>
          <SettingsExternal
            href={TELEGRAM_LINK}
            icon={Send}
            label={t("telegramOfficial")}
            value={`@${TELEGRAM_HANDLE}`}
          />
        </SettingsSection>

        {/* App & legal */}
        <SettingsSection title={t("appLegal")}>
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <Globe className="size-[18px] shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 break-words text-sm font-semibold">{t("languageItem")}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{langLabel}</span>
              <LanguageSwitcher variant="onLight" />
            </div>
          </div>
          <SettingsButton icon={Moon} label={t("appearance")} value={themeLabel} onClick={cycleTheme} />
          <SettingsLink to="/about" icon={Info} label={t("aboutApp")} />
          <SettingsLink to="/terms" icon={ScrollText} label={t("termsOfUse")} />
          <SettingsLink to="/privacy" icon={ShieldCheck} label={t("privacyPolicy")} />
          <SettingsStatic icon={Info} label={t("appVersion")} value={APP_VERSION} />
        </SettingsSection>

        {/* Account actions */}
        <SettingsSection title={t("accountActions")}>
          <SettingsButton
            icon={LogOut}
            label={t("signOut")}
            showChevron={false}
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
          />
        </SettingsSection>

        <div className="mt-4 overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/5">
          <SettingsButton
            icon={Trash2}
            label={t("deleteAccount")}
            danger
            showChevron={false}
            onClick={() => setConfirmDelete(true)}
          />
        </div>
      </div>

      {editing && <EditProfileDialog onClose={() => setEditing(false)} />}
      <DeleteAccountDialog open={confirmDelete} onOpenChange={setConfirmDelete} />
      <BottomNav />
    </div>
  );
}

function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const { deleteMyAccount } = await import("@/lib/account.functions");
      await deleteMyAccount();
      await signOut();
      toast.success(t("accountDeleted"));
      onOpenChange(false);
      navigate({ to: "/" });
    } catch {
      toast.error(t("actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">{t("deleteAccount")}</AlertDialogTitle>
          <AlertDialogDescription className="break-words">{t("deleteAccountBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground">{t("deleteAccountConfirmHint")}</label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="DELETE"
            className="w-full rounded-lg border border-border bg-background p-3 text-sm"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setText("")}>{t("cancel")}</AlertDialogCancel>
          <button
            disabled={text.trim().toUpperCase() !== "DELETE" || busy}
            onClick={run}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-destructive px-4 text-sm font-bold text-destructive-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {t("deleteAccount")}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const EDIT_L = {
  personal: { fa: "اطلاعات شخصی", ps: "شخصي معلومات", en: "Personal info" },
  contact: { fa: "اطلاعات تماس", ps: "د اړیکې معلومات", en: "Contact info" },
  address: { fa: "آدرس", ps: "پته", en: "Address" },
  changePhoto: { fa: "تغییر عکس", ps: "انځور بدل کړئ", en: "Change photo" },
  removePhoto: { fa: "حذف عکس انتخاب‌شده", ps: "ټاکل شوی انځور لرې کړئ", en: "Remove selected photo" },
  name: { fa: "نام", ps: "نوم", en: "Name" },
  phone: { fa: "شماره تماس", ps: "د اړیکې شمېره", en: "Phone number" },
  whatsapp: { fa: "شماره واتساپ", ps: "واټساپ شمېره", en: "WhatsApp number" },
  same: { fa: "همان شماره تماس", ps: "هماغه د اړیکې شمېره", en: "Same as phone number" },
  province: { fa: "ولایت", ps: "ولایت", en: "Province" },
  provincePh: { fa: "ولایت را انتخاب کنید", ps: "ولایت وټاکئ", en: "Choose province" },
  district: { fa: "ولسوالی / ناحیه", ps: "ولسوالي / ناحیه", en: "District" },
  village: { fa: "منطقه / قریه", ps: "سیمه / کلی", en: "Area / village" },
  villageHint: { fa: "نام منطقه، قریه یا محل زندگی‌تان را بنویسید", ps: "د سیمې، کلي یا استوګنځي نوم ولیکئ", en: "Write your area, village or neighbourhood" },
  bio: { fa: "درباره من", ps: "زما په اړه", en: "About me" },
  save: { fa: "ذخیره", ps: "خوندي کول", en: "Save" },
  cancel: { fa: "لغو", ps: "لغوه", en: "Cancel" },
  saved: { fa: "پروفایل با موفقیت ذخیره شد", ps: "پروفایل په بریالیتوب خوندي شو", en: "Profile saved" },
  saveErr: { fa: "ذخیره نشد. لطفاً دوباره تلاش کنید", ps: "خوندي نشو. بیا هڅه وکړئ", en: "Could not save. Please try again" },
  fixErr: { fa: "لطفاً خطاهای فرم را اصلاح کنید", ps: "مهرباني وکړئ تېروتنې سمې کړئ", en: "Please fix the errors" },
  nameReq: { fa: "نام نمی‌تواند خالی باشد", ps: "نوم باید خالي نه وي", en: "Name is required" },
  nameMin: { fa: "نام باید حداقل ۲ حرف باشد", ps: "نوم لږ تر لږه ۲ توري وي", en: "Name must be at least 2 characters" },
  phoneBad: { fa: "شماره معتبر نیست. مثال: ‎+93 78 654 4323", ps: "شمېره سمه نه ده. بېلګه: ‎+93 78 654 4323", en: "Invalid number. Example: +93 78 654 4323" },
} as const;

const NAME_MAX = 40;
const BIO_MAX = 150;
const TEXT_MAX = 60;

/** Normalize a typed phone to digits "93XXXXXXXXX"; returns "" when empty, null when invalid. */
function normalizeAfPhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0093")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) d = "93" + d.slice(1);
  if (d.length === 9 && d.startsWith("7")) d = "93" + d;
  return /^937\d{8}$/.test(d) ? d : null;
}

function EditProfileDialog({ onClose }: { onClose: () => void }) {
  const { lang, locName } = useI18n();
  const L = (k: keyof typeof EDIT_L) => EDIT_L[k][lang as "fa" | "ps" | "en"] ?? EDIT_L[k].fa;
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState((profile?.display_name ?? "").slice(0, NAME_MAX));
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameWa, setSameWa] = useState(false);
  const [bio, setBio] = useState((profile?.bio ?? "").slice(0, BIO_MAX));
  const [province, setProvince] = useState(profile?.province ?? "");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: ph }, { data: ex }] = await Promise.all([
        supabase.rpc("get_my_phone" as never),
        supabase.rpc("get_my_profile_extras" as never),
      ]);
      if (cancelled) return;
      const phoneStr = typeof ph === "string" ? formatPhoneIntl(ph) : "";
      setPhone(phoneStr);
      const row = Array.isArray(ex) ? (ex[0] as { whatsapp: string | null; district: string | null; village: string | null } | undefined) : undefined;
      if (row) {
        const wa = row.whatsapp ? formatPhoneIntl(row.whatsapp) : "";
        setWhatsapp(wa);
        setSameWa(!!wa && wa === phoneStr);
        setDistrict(row.district ?? "");
        setVillage(row.village ?? "");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!avatar) return setPreview(null);
    const url = URL.createObjectURL(avatar);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);

  const phoneInput = (v: string) => v.replace(/[^\d+ ]/g, "").slice(0, 17);
  const prettify = (v: string) => {
    const n = normalizeAfPhone(v);
    return n ? formatPhoneIntl(n) : v;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const n = name.trim();
    if (!n) e.name = L("nameReq");
    else if (n.length < 2) e.name = L("nameMin");
    if (normalizeAfPhone(phone) === null) e.phone = L("phoneBad");
    if (!sameWa && normalizeAfPhone(whatsapp) === null) e.whatsapp = L("phoneBad");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!user) return;
    if (!validate()) {
      toast.error(L("fixErr"));
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const ph = normalizeAfPhone(phone) || null;
      const wa = sameWa ? ph : normalizeAfPhone(whatsapp) || null;
      let avatar_url = profile?.avatar_url ?? null;
      if (avatar) avatar_url = await uploadImage("avatars", user.id, "me", avatar);
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: name.trim(),
          phone: ph,
          whatsapp: wa,
          bio: bio.trim() || null,
          province: province || null,
          district: district.trim() || null,
          village: village.trim() || null,
          avatar_url,
        })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(L("saved"));
      onClose();
    } catch {
      toast.error(L("saveErr"));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const field =
    "w-full min-h-12 rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40";
  const errCls = "border-destructive focus:ring-destructive/40";

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>{t_editTitle(lang)}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="flex flex-col gap-5">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="size-24 overflow-hidden rounded-full bg-secondary ring-2 ring-border">
                {preview ? (
                  <img src={preview} alt="" className="size-full object-cover" />
                ) : profile?.avatar_url ? (
                  <StorageImage bucket="avatars" path={profile.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-3xl font-black text-muted-foreground">
                    {profile?.display_name?.[0]?.toUpperCase() ?? "U"}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={saving}>
                  <Camera className="size-4" />
                  {L("changePhoto")}
                </Button>
                {avatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAvatar(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    {L("removePhoto")}
                  </Button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
              />
            </div>

            <EpCard title={L("personal")}>
              <div>
                <EpLabel htmlFor="ep-name" text={L("name")} count={`${toLocalDigits(name.length, lang)} / ${toLocalDigits(NAME_MAX, lang)}`} />
                <input
                  id="ep-name"
                  value={name}
                  maxLength={NAME_MAX}
                  onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                  className={cn(field, errors.name && errCls)}
                />
                <EpErr msg={errors.name} />
              </div>
              <div>
                <EpLabel htmlFor="ep-bio" text={L("bio")} count={`${toLocalDigits(bio.length, lang)} / ${toLocalDigits(BIO_MAX, lang)}`} />
                <textarea
                  id="ep-bio"
                  value={bio}
                  maxLength={BIO_MAX}
                  onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                  rows={3}
                  className={cn(field, "py-3")}
                />
              </div>
            </EpCard>

            <EpCard title={L("contact")}>
              <div>
                <EpLabel htmlFor="ep-phone" text={L("phone")} />
                <input
                  id="ep-phone"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  placeholder="+93 78 654 4323"
                  value={phone}
                  onChange={(e) => {
                    const v = phoneInput(e.target.value);
                    setPhone(v);
                    if (sameWa) setWhatsapp(v);
                  }}
                  onBlur={() => {
                    const v = prettify(phone);
                    setPhone(v);
                    if (sameWa) setWhatsapp(v);
                  }}
                  className={cn(field, "text-left", errors.phone && errCls)}
                />
                <EpErr msg={errors.phone} />
              </div>
              <div>
                <EpLabel htmlFor="ep-wa" text={L("whatsapp")} />
                <input
                  id="ep-wa"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  placeholder="+93 78 654 4323"
                  value={sameWa ? phone : whatsapp}
                  disabled={sameWa}
                  onChange={(e) => setWhatsapp(phoneInput(e.target.value))}
                  onBlur={() => setWhatsapp(prettify(whatsapp))}
                  className={cn(field, "text-left disabled:opacity-60", errors.whatsapp && errCls)}
                />
                <EpErr msg={errors.whatsapp} />
                <label className="mt-2 flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sameWa}
                    onChange={(e) => {
                      setSameWa(e.target.checked);
                      if (e.target.checked) setWhatsapp(phone);
                    }}
                    className="size-5 accent-[var(--color-primary)]"
                  />
                  {L("same")}
                </label>
              </div>
            </EpCard>

            <EpCard title={L("address")}>
              <div>
                <EpLabel htmlFor="ep-province" text={L("province")} />
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger id="ep-province" className={field}>
                    <SelectValue placeholder={L("provincePh")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {PROVINCES.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {locName(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <EpLabel htmlFor="ep-district" text={L("district")} />
                <input id="ep-district" value={district} maxLength={TEXT_MAX} onChange={(e) => setDistrict(e.target.value)} className={field} />
              </div>
              <div>
                <EpLabel htmlFor="ep-village" text={L("village")} />
                <input
                  id="ep-village"
                  value={village}
                  maxLength={TEXT_MAX}
                  placeholder={L("villageHint")}
                  onChange={(e) => setVillage(e.target.value)}
                  className={field}
                />
              </div>
            </EpCard>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-border bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <Button type="button" onClick={save} disabled={saving} className="min-h-12 font-bold">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {L("save")}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="min-h-12 font-bold">
            {L("cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function t_editTitle(lang: string) {
  return lang === "en" ? "Edit profile" : lang === "ps" ? "پروفایل سمول" : "ویرایش پروفایل";
}

function EpLabel({ htmlFor, text, count }: { htmlFor: string; text: string; count?: string }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="text-xs font-bold text-foreground">
        {text}
      </label>
      {count && (
        <span className="text-[11px] tabular-nums text-muted-foreground" dir="ltr">
          {count}
        </span>
      )}
    </div>
  );
}

function EpErr({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs font-semibold text-destructive">{msg}</p> : null;
}

function EpCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-xs font-bold text-muted-foreground">{title}</h3>
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">{children}</div>
    </section>
  );
}
