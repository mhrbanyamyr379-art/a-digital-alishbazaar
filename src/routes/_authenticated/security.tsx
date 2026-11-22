import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { KeyRound, Mail, Phone, ShieldCheck, Loader2, Eye, EyeOff, Info } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { formatPhoneIntl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SettingsSection, SettingsStatic } from "@/components/settings/SettingsUI";

export const Route = createFileRoute("/_authenticated/security")({
  component: SecurityPage,
  head: () => ({
    meta: [
      { title: "Account security — Alish" },
      { name: "description", content: "Review your Alish sign-in details and change your password." },
      { property: "og:title", content: "Account security — Alish" },
      { property: "og:description", content: "Manage your Alish sign-in details and password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

/** Digits "93XXXXXXXXX"; "" when empty, null when invalid. */
export function normalizeAfPhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0093")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) d = "93" + d.slice(1);
  if (d.length === 9 && d.startsWith("7")) d = "93" + d;
  return /^937\d{8}$/.test(d) ? d : null;
}

/** 0–4 strength score. */
export function passwordStrength(p: string): number {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return Math.max(1, s);
}

const field = "w-full rounded-lg border border-border bg-background p-3 text-base";

function PwField({ label, value, onChange, auto, error }: { label: string; value: string; onChange: (v: string) => void; auto: string; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          autoComplete={auto}
          onChange={(e) => onChange(e.target.value)}
          className={cn(field, "pe-11", error && "border-destructive")}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "پنهان کردن رمز" : "نمایش رمز"}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}

function SecurityPage() {
  const { t } = useI18n();
  const { user } = useAuth();

  const providers = (user?.app_metadata?.providers as string[] | undefined) ??
    (user?.app_metadata?.provider ? [user.app_metadata.provider as string] : []);
  const hasPassword = providers.includes("email");
  const isGoogleOnly = providers.includes("google") && !hasPassword;
  const methodLabel = providers
    .map((p) => (p === "google" ? "ورود با گوگل" : p === "email" ? "ورود با ایمیل" : p))
    .join("، ");

  // Phone
  const [phone, setPhone] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);

  useEffect(() => {
    supabase.rpc("get_my_phone" as never).then(({ data }) => {
      setPhone(typeof data === "string" && data ? data : null);
    });
  }, []);

  const savePhone = async () => {
    if (!user || phoneSaving) return;
    const n = normalizeAfPhone(phoneInput);
    if (!n) {
      setPhoneErr("شماره معتبر نیست. مثال: ‎+93 79 586 3251");
      return;
    }
    setPhoneErr("");
    setPhoneSaving(true);
    const { error } = await supabase.from("profiles").update({ phone: n }).eq("id", user.id);
    setPhoneSaving(false);
    if (error) {
      toast.error("ذخیرهٔ شماره ناموفق بود. دوباره تلاش کنید.");
      return;
    }
    setPhone(n);
    setEditing(false);
    toast.success("شماره تماس ذخیره شد.");
  };

  // Password
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const strength = passwordStrength(pw);
  const strengthLabel = ["", "ضعیف", "متوسط", "خوب", "قوی"][strength];
  const strengthColor = ["bg-muted", "bg-destructive", "bg-accent", "bg-primary", "bg-primary"][strength];

  const changePassword = async () => {
    if (busy.current) return;
    const e: Record<string, string> = {};
    if (!cur) e.cur = "رمز عبور فعلی را وارد کنید.";
    if (pw.length < 8) e.pw = "رمز عبور جدید باید حداقل ۸ حرف باشد.";
    else if (pw === cur) e.pw = "رمز جدید باید با رمز فعلی فرق داشته باشد.";
    if (!pw2) e.pw2 = "تکرار رمز عبور جدید را وارد کنید.";
    else if (pw !== pw2) e.pw2 = "رمز عبور جدید و تکرار آن یکسان نیستند.";
    setErrs(e);
    if (Object.keys(e).length) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("اتصال اینترنت برقرار نیست.");
      return;
    }
    busy.current = true;
    setSaving(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: user?.email ?? "", password: cur });
      if (authErr) {
        setErrs({ cur: "رمز عبور فعلی نادرست است." });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        toast.error(/weak|pwned/i.test(error.message) ? "این رمز عبور خیلی ساده یا افشا شده است. رمز دیگری انتخاب کنید." : "تغییر رمز عبور ناموفق بود. دوباره تلاش کنید.");
        return;
      }
      setCur(""); setPw(""); setPw2("");
      toast.success("رمز عبور با موفقیت تغییر کرد.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-44">
      <TopBar title={t("accountSecurity")} right={<LanguageSwitcher variant="onLight" />} />
      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        <SettingsSection title={t("accountTitle")}>
          <SettingsStatic icon={Mail} label={t("emailAddress")} value={user?.email ?? t("notSet")} />

          <div className="border-b border-border px-4 py-3">
            <div className="flex min-h-[28px] items-center gap-3">
              <Phone className="size-[18px] shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 text-sm font-semibold">{t("phone")}</span>
              {phone && !editing && (
                <span dir="ltr" className="text-xs text-muted-foreground">{formatPhoneIntl(phone)}</span>
              )}
              {!editing && (
                <button
                  type="button"
                  onClick={() => { setPhoneInput(phone ? formatPhoneIntl(phone) : "+93 "); setPhoneErr(""); setEditing(true); }}
                  className="min-h-9 rounded-lg border border-border px-3 text-xs font-bold text-primary"
                >
                  {phone ? "ویرایش" : "افزودن"}
                </button>
              )}
            </div>
            {editing && (
              <div className="mt-3 flex flex-col gap-2">
                <input
                  dir="ltr"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phoneInput}
                  placeholder="+93 79 586 3251"
                  onChange={(e) => setPhoneInput(e.target.value.replace(/[^\d+ ]/g, "").slice(0, 17))}
                  className={cn(field, "text-left", phoneErr && "border-destructive")}
                />
                {phoneErr && <p className="text-xs font-semibold text-destructive">{phoneErr}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={savePhone}
                    disabled={phoneSaving}
                    className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-accent-foreground disabled:opacity-60"
                  >
                    {phoneSaving && <Loader2 className="size-4 animate-spin" />}
                    {t("save")}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setPhoneErr(""); }}
                    className="min-h-11 rounded-lg border border-border px-4 text-sm font-bold"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            )}
          </div>

          <SettingsStatic icon={ShieldCheck} label={t("signedInWith")} value={methodLabel || t("notSet")} />
        </SettingsSection>

        <SettingsSection title={t("changePassword")}>
          {isGoogleOnly ? (
            <div className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <p>شما با گوگل وارد شده‌اید و رمز عبور ندارید.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="size-4 text-muted-foreground" />
                {t("changePassword")}
              </div>
              <PwField label="رمز عبور فعلی" value={cur} onChange={setCur} auto="current-password" error={errs.cur} />
              <div className="flex flex-col gap-2">
                <PwField label="رمز عبور جدید" value={pw} onChange={setPw} auto="new-password" error={errs.pw} />
                <div className="flex gap-1" aria-hidden>
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= strength ? strengthColor : "bg-muted")} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {pw ? `قوت رمز: ${strengthLabel}` : "حداقل ۸ حرف؛ ترکیب حروف بزرگ و کوچک، عدد و نماد قوی‌تر است."}
                </p>
              </div>
              <PwField label="تکرار رمز عبور جدید" value={pw2} onChange={setPw2} auto="new-password" error={errs.pw2} />
              <button
                onClick={changePassword}
                disabled={saving}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-accent-foreground disabled:opacity-60"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {t("save")}
              </button>
            </div>
          )}
        </SettingsSection>
      </div>
      <BottomNav />
    </div>
  );
}
