import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LogOut, Pencil, Shield, Clock, Package, Loader2, Trash2, Check, Eye, Heart, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { uploadImage } from "@/lib/storage";
import { StorageImage } from "@/components/StorageImage";
import { toLocalDigits, formatPrice } from "@/lib/format";
import { PROVINCES } from "@/data/provinces";
import { BottomNav } from "@/components/BottomNav";
import { BrandTopBar } from "@/components/TopBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AvatarPicker } from "@/components/AvatarPicker";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
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
});

function ProfilePage() {
  const { t, lang, locName } = useI18n();
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"listings" | "recent">("listings");
  const [editing, setEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: myListings } = useQuery({
    queryKey: ["my-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,price,currency,status,view_count,favorites_count,created_at,expires_at,listing_images(url,position)")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent", user?.id],
    enabled: !!user && tab === "recent",
    queryFn: async () => {
      const { data: rv } = await supabase
        .from("recently_viewed")
        .select("listing_id,viewed_at")
        .eq("user_id", user!.id)
        .order("viewed_at", { ascending: false })
        .limit(30);
      const ids = (rv ?? []).map((r) => r.listing_id);
      if (!ids.length) return [];
      const { data } = await supabase
        .from("listings")
        .select("id,title,price,currency,listing_images(url,position)")
        .in("id", ids);
      return data ?? [];
    },
  });

  const setStatus = async (id: string, status: "active" | "sold") => {
    await supabase.from("listings").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-listings", user?.id] });
    toast.success(t("saved"));
  };
  const renew = async (id: string) => {
    await supabase
      .from("listings")
      .update({
        status: "active",
        published_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
      })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-listings", user?.id] });
    toast.success(t("renewed"));
  };
  const remove = async (id: string) => {
    await supabase.from("listings").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-listings", user?.id] });
    toast.success(t("saved"));
  };

  const isExpired = (l: { status: string; expires_at: string | null }) =>
    l.status === "expired" || (l.status === "active" && !!l.expires_at && new Date(l.expires_at) < new Date());

  const statusLabel = (l: { status: string; expires_at: string | null }) => {
    if (isExpired(l)) return t("expired");
    return t(
      l.status === "sold"
        ? "sold"
        : l.status === "pending"
          ? "pending"
          : l.status === "draft"
            ? "draft"
            : l.status === "rejected"
              ? "rejected"
              : "active",
    );
  };

  const firstImg = (imgs: { url: string; position: number }[]) =>
    (imgs ?? []).sort((a, b) => a.position - b.position)[0]?.url ?? null;

  return (
    <div className="min-h-screen bg-background pb-32">
      <BrandTopBar right={<LanguageSwitcher />} />

      <div className="bg-primary px-4 pb-6 pt-4 text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="size-16 overflow-hidden rounded-full bg-white/10 ring-2 ring-white/20">
            {profile?.avatar_url ? (
              <StorageImage bucket="avatars" path={profile.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-2xl font-black">
                {profile?.display_name?.[0]?.toUpperCase() ?? "U"}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl font-black">{profile?.display_name}</h1>
            <p className="text-xs text-primary-foreground/70">
              {t("memberSince")} {profile ? new Date(profile.created_at).getFullYear() : ""}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
          >
            <Pencil className="size-3.5" />
            {t("editProfile")}
          </button>
          {user && (
            <Link
              to="/seller/$id"
              params={{ id: user.id }}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
            >
              {t("reviews")}
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground">
              <Shield className="size-3.5" />
              {t("admin")}
            </Link>
          )}
          <button
            onClick={async () => {
              await qc.cancelQueries();
              qc.clear();
              await signOut();
              navigate({ to: "/" });
            }}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
          >
            <LogOut className="size-3.5" />
            {t("signOut")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("listings")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-bold",
            tab === "listings" ? "border-b-2 border-accent text-accent" : "text-muted-foreground",
          )}
        >
          <Package className="size-4" />
          {t("myListings")}
        </button>
        <button
          onClick={() => setTab("recent")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-bold",
            tab === "recent" ? "border-b-2 border-accent text-accent" : "text-muted-foreground",
          )}
        >
          <Clock className="size-4" />
          {t("recentlyViewed")}
        </button>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {tab === "listings" &&
          myListings?.map((l) => {
            const expired = isExpired(l);
            return (
              <div key={l.id} className="rounded-xl border border-border bg-card p-2">
                <div className="flex items-center gap-3">
                  <Link to="/listing/$id" params={{ id: l.id }} className="size-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {firstImg(l.listing_images) && (
                      <StorageImage bucket="listings" path={firstImg(l.listing_images)} alt="" className="size-full object-cover" />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{l.title}</p>
                    <p className="text-sm font-black text-accent">{formatPrice(Number(l.price), l.currency, lang)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span
                        className={cn(
                          "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold",
                          expired
                            ? "bg-destructive/10 text-destructive"
                            : l.status === "active"
                              ? "bg-primary/10 text-primary"
                              : l.status === "draft"
                                ? "bg-accent/10 text-accent"
                                : "bg-muted text-muted-foreground",
                        )}
                      >
                        {statusLabel(l)}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                        <Eye className="size-3" />
                        {toLocalDigits(l.view_count ?? 0, lang)}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                        <Heart className="size-3" />
                        {toLocalDigits(l.favorites_count ?? 0, lang)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
                  <Link
                    to="/edit/$id"
                    params={{ id: l.id }}
                    className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <Pencil className="size-3.5" />
                    {t("edit")}
                  </Link>
                  {l.status === "active" && !expired && (
                    <button
                      onClick={() => setStatus(l.id, "sold")}
                      className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold"
                    >
                      <Check className="size-3.5" />
                      {t("markSold")}
                    </button>
                  )}
                  {(expired || l.status === "sold" || l.status === "draft") && (
                    <button
                      onClick={() => renew(l.id)}
                      className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-primary"
                    >
                      <RefreshCw className="size-3.5" />
                      {l.status === "draft" ? t("publishNow") : t("renew")}
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteId(l.id)}
                    className="ms-auto flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-secondary"
                  >
                    <Trash2 className="size-3.5" />
                    {t("delete")}
                  </button>
                </div>
              </div>
            );
          })}
        {tab === "listings" && myListings && myListings.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("emptyListings")}</p>
        )}

        {tab === "recent" &&
          recent?.map((l) => (
            <Link key={l.id} to="/listing/$id" params={{ id: l.id }} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2">
              <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {firstImg(l.listing_images) && (
                  <StorageImage bucket="listings" path={firstImg(l.listing_images)} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{l.title}</p>
                <p className="text-sm font-black text-accent">{formatPrice(Number(l.price), l.currency, lang)}</p>
              </div>
            </Link>
          ))}
        {tab === "recent" && recent && recent.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("recentlyViewed")}</p>
        )}
      </div>

      {editing && <EditProfileDialog onClose={() => setEditing(false)} onSaved={refreshProfile} />}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDeleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) remove(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BottomNav />

    </div>
  );
}

function EditProfileDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const { t, locName } = useI18n();
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [province, setProvince] = useState(profile?.province ?? "");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

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
      await onSaved();
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
            className="flex items-center justify-center gap-2 rounded-lg bg-accent py-3 text-sm font-bold text-accent-foreground disabled:opacity-60"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {t("save")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
