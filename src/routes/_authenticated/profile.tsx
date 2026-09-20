import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
  MessageSquareWarning,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n, LANGS } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { uploadImage } from "@/lib/storage";
import { StorageImage } from "@/components/StorageImage";
import { toLocalDigits } from "@/lib/format";
import { PROVINCES } from "@/data/provinces";
import { BottomNav } from "@/components/BottomNav";
import { BrandTopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AvatarPicker } from "@/components/AvatarPicker";
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

function EditProfileDialog({ onClose }: { onClose: () => void }) {
  const { t, locName } = useI18n();
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [province, setProvince] = useState(profile?.province ?? "");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_my_phone" as never);
      if (!cancelled && typeof data === "string") setPhone(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatar_url = profile?.avatar_url ?? null;
      if (avatar) avatar_url = await uploadImage("avatars", user.id, "me", avatar);
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name, phone: phone || null, bio: bio || null, province: province || null, avatar_url })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(t("saved"));
      onClose();
    } catch {
      toast.error(t("errorTitle"));
    } finally {
      setSaving(false);
    }
  };

  const field = "w-full rounded-lg border border-border bg-background p-3 text-sm";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editProfile")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <AvatarPicker
            currentPath={profile?.avatar_url}
            file={avatar}
            onFile={setAvatar}
            uploading={saving}
            fallbackLetter={profile?.display_name?.[0]}
          />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("displayName")} className={field} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phone")} className={field} />
          <Select value={province} onValueChange={setProvince}>
            <SelectTrigger className={field}>
              <SelectValue placeholder={t("province")} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {PROVINCES.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {locName(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("bio")} rows={3} className={field} />
          <button
            onClick={save}
            disabled={saving}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent text-sm font-bold text-accent-foreground disabled:opacity-60"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {t("save")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
