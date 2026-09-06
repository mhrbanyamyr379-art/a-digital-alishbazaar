import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Mail, Phone, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { authErrorKey } from "@/lib/auth-errors";

import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SettingsSection, SettingsStatic } from "@/components/settings/SettingsUI";

export const Route = createFileRoute("/_authenticated/security")({
  component: SecurityPage,
  head: () => ({
    meta: [
      { title: "Account security — Afghan Bazaar" },
      { name: "description", content: "Review your Afghan Bazaar sign-in details and change your password." },
      { property: "og:title", content: "Account security — Afghan Bazaar" },
      { property: "og:description", content: "Manage your Afghan Bazaar sign-in details and password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SecurityPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);

  const providers = (user?.app_metadata?.providers as string[] | undefined) ??
    (user?.app_metadata?.provider ? [user.app_metadata.provider as string] : []);

  const changePassword = async () => {
    if (pw.length < 6) {
      toast.error(t("passwordTooShort"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) {
      toast.error(t(authErrorKey(error)));
      return;
    }

    setPw("");
    toast.success(t("passwordUpdated"));
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <TopBar title={t("accountSecurity")} right={<LanguageSwitcher variant="onLight" />} />
      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        <SettingsSection title={t("accountTitle")}>
          <SettingsStatic icon={Mail} label={t("emailAddress")} value={user?.email ?? t("notSet")} />
          <SettingsStatic icon={Phone} label={t("phone")} value={user?.phone ? `+${user.phone}` : t("notSet")} />
          <SettingsStatic icon={ShieldCheck} label={t("signedInWith")} value={providers.join(", ") || t("notSet")} />
        </SettingsSection>

        <SettingsSection title={t("changePassword")}>
          <div className="flex flex-col gap-3 p-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="size-4 text-muted-foreground" />
              {t("newPassword")}
            </label>
            <input
              type="password"
              value={pw}
              autoComplete="new-password"
              onChange={(e) => setPw(e.target.value)}
              placeholder={t("newPassword")}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm"
            />
            <button
              onClick={changePassword}
              disabled={saving}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-accent-foreground disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {t("save")}
            </button>
          </div>
        </SettingsSection>
      </div>
      <BottomNav />
    </div>
  );
}
