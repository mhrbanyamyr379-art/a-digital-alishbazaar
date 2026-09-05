import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, Phone as PhoneIcon, Mail } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { normalizePhone, phoneAuthErrorKey } from "@/lib/phone";
import { authErrorKey } from "@/lib/auth-errors";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import logoAsset from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const n =
      typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined;
    return n ? { next: n } : {};
  },
  component: AuthPage,
});


function AuthPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const goNext = () => {
    if (next) window.location.href = next;
    else navigate({ to: "/" });
  };
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);


  // --- Phone OTP state ---
  const [channel, setChannel] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown > 0]);

  const sendOtp = async (resend = false) => {
    const e164 = normalizePhone(phone);
    if (!e164) {
      toast.error(t("errInvalidPhone"));
      return;
    }
    if (resend && cooldown > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (error) throw error;
      setSentTo(e164);
      setOtp("");
      setCooldown(60);
      toast.success(`${t("codeSentTo")} ${e164}`);
    } catch (err) {
      toast.error(t(phoneAuthErrorKey(err)));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentTo) return;
    const token = otp.replace(/\D/g, "");
    if (token.length < 4) {
      toast.error(t("errInvalidOtp"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: sentTo, token, type: "sms" });
      if (error) throw error;
      goNext();
    } catch (err) {
      toast.error(t(phoneAuthErrorKey(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) goNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: next ? `${window.location.origin}${next}` : window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;

        // Supabase hides "already registered" behind a fake user with no identities.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          toast.error(t("errEmailExists"));
          setMode("in");
          return;
        }

        if (data.session) {
          // Confirmation not required — the user is signed in already.
          toast.success(t("signInSuccess"));
          goNext();
          return;
        }

        // Confirmation required: no session yet, so do NOT claim they are in.
        setPendingEmail(email);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.session) throw new Error("no session");
        goNext();
      }
    } catch (err) {
      const key = authErrorKey(err);
      if (key === "errEmailNotConfirmed") setPendingEmail(email);
      toast.error(t(key));
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    if (!pendingEmail) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: {
          emailRedirectTo: next ? `${window.location.origin}${next}` : window.location.origin,
        },
      });
      if (error) throw error;
      toast.success(t("emailResent"));
    } catch (err) {
      toast.error(t(authErrorKey(err)));
    } finally {
      setLoading(false);
    }
  };


  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: next ? `${window.location.origin}${next}` : window.location.origin,
    });
    if (result.error) {
      toast.error(t("errorTitle"));
      return;
    }
    if (result.redirected) return;
    goNext();
  };

  return (
    <div className="flex min-h-screen flex-col bg-primary text-primary-foreground">
      <div className="flex items-center justify-between p-4">
        <Link to="/" className="flex items-center gap-2">
          <img
            src={logoAsset.url}
            alt={t("appName")}
            className="size-8 rounded-sm object-cover"
          />
          <span className="font-display text-lg font-black">{t("appName")}</span>
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="flex flex-1 flex-col justify-center px-6">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-display text-3xl font-black">{mode === "in" ? t("signIn") : t("signUp")}</h1>
          <p className="mt-1 text-sm text-primary-foreground/70">{t("tagline")}</p>

          <div className="mt-8 rounded-2xl bg-card p-5 text-card-foreground shadow-xl">
            <button
              onClick={google}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              <GoogleIcon />
              {t("continueGoogle")}
            </button>

            <div className="my-4 h-px bg-border" />


            <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors ${
                  channel === "email" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Mail className="size-3.5" />
                {t("emailTab")}
              </button>
              <button
                type="button"
                onClick={() => setChannel("phone")}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors ${
                  channel === "phone" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <PhoneIcon className="size-3.5" />
                {t("phoneTab")}
              </button>
            </div>

            {channel === "email" ? (
              <>
                <form onSubmit={submit} className="flex flex-col gap-3">
                  {mode === "up" && (
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("displayName")}
                      className="rounded-lg border border-border bg-background p-3 text-sm"
                      required
                    />
                  )}
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("email")}
                    className="rounded-lg border border-border bg-background p-3 text-sm"
                    required
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("password")}
                    minLength={6}
                    className="rounded-lg border border-border bg-background p-3 text-sm"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 rounded-lg bg-accent py-3 text-sm font-bold text-accent-foreground disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                    {mode === "in" ? t("signIn") : t("signUp")}
                  </button>
                </form>

                <button
                  onClick={() => setMode(mode === "in" ? "up" : "in")}
                  className="mt-4 w-full text-center text-xs font-medium text-muted-foreground"
                >
                  {mode === "in" ? `${t("signUp")} →` : `${t("signIn")} →`}
                </button>
              </>
            ) : !sentTo ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendOtp(false);
                }}
                className="flex flex-col gap-3"
              >
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("phoneNumber")}
                  className="rounded-lg border border-border bg-background p-3 text-start text-sm"
                  required
                />
                <p dir="ltr" className="text-start text-[11px] text-muted-foreground">
                  {t("phoneHint")}
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-lg bg-accent py-3 text-sm font-bold text-accent-foreground disabled:opacity-60"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <PhoneIcon className="size-4" />}
                  {t("sendCode")}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  {t("codeSentTo")} <span dir="ltr" className="font-semibold text-foreground">{sentTo}</span>
                </p>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  maxLength={8}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder={t("enterCode")}
                  className="rounded-lg border border-border bg-background p-3 text-center text-lg font-bold tracking-[0.4em]"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-lg bg-accent py-3 text-sm font-bold text-accent-foreground disabled:opacity-60"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                  {t("verifyCode")}
                </button>
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSentTo(null);
                      setOtp("");
                    }}
                    className="font-medium text-muted-foreground"
                  >
                    {t("changeNumber")}
                  </button>
                  <button
                    type="button"
                    disabled={cooldown > 0 || loading}
                    onClick={() => void sendOtp(true)}
                    className="font-semibold text-primary disabled:text-muted-foreground"
                  >
                    {cooldown > 0 ? `${t("resendIn")} ${cooldown}${t("seconds")}` : t("resendCode")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
