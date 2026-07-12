import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus, X, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES, CONDITIONS, categoryById } from "@/data/categories";
import { PROVINCES, provinceById } from "@/data/provinces";
import { uploadImage } from "@/lib/storage";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/sell")({
  component: SellPage,
});

const MAX_IMAGES = 8;

function SellPage() {
  const { t, locName, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("AFN");
  const [negotiable, setNegotiable] = useState(false);
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const cat = categoryById(category);
  const prov = provinceById(province);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list).slice(0, MAX_IMAGES - files.length);
    setFiles((f) => [...f, ...incoming]);
    setPreviews((p) => [...p, ...incoming.map((f) => URL.createObjectURL(f))]);
  };

  const removeFile = (i: number) => {
    setFiles((f) => f.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title || !price || !category || !province) {
      toast.error(t("errorTitle"));
      return;
    }
    setSaving(true);
    try {
      const { data: listing, error } = await supabase
        .from("listings")
        .insert({
          seller_id: user.id,
          title,
          description,
          price: Number(price),
          currency,
          negotiable,
          category,
          condition: condition || null,
          province,
          city: city || null,
          status: "active",
        })
        .select("id")
        .single();
      if (error) throw error;

      if (files.length > 0) {
        const paths = await Promise.all(files.map((f) => uploadImage("listings", user.id, listing.id, f)));
        const { error: imgErr } = await supabase
          .from("listing_images")
          .insert(paths.map((url, i) => ({ listing_id: listing.id, url, position: i })));
        if (imgErr) throw imgErr;
      }

      toast.success(t("saved"));
      navigate({ to: "/listing/$id", params: { id: listing.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorTitle"));
    } finally {
      setSaving(false);
    }
  };

  const field = "w-full rounded-lg border border-border bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

  return (
    <div className="min-h-screen bg-background pb-8">
      <TopBar title={t("sellSomething")} />
      <form onSubmit={submit} className="flex flex-col gap-5 p-4">
        {/* Photos */}
        <div>
          <label className="mb-2 block text-sm font-bold">{t("photos")}</label>
          <div className="grid grid-cols-4 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                <img src={src} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute end-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {files.length < MAX_IMAGES && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground">
                <ImagePlus className="size-5" />
                <span className="text-[10px]">{t("addPhotos")}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
              </label>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-bold">{t("title")}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} maxLength={120} required />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-bold">{t("category")}</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-semibold",
                  category === c.id ? "border-accent bg-accent/10" : "border-border",
                )}
              >
                <c.icon className="size-5" />
                {locName(c)}
              </button>
            ))}
          </div>
        </div>

        {cat?.conditions && (
          <div>
            <label className="mb-1.5 block text-sm font-bold">{t("condition")}</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCondition(c.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold",
                    condition === c.id ? "border-accent bg-accent/10" : "border-border",
                  )}
                >
                  {locName(c)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="mb-1.5 block text-sm font-bold">{t("price")}</label>
            <input
              type="number"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={field}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold">{t("price")}</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className={field}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AFN">AFN ؋</SelectItem>
                <SelectItem value="USD">USD $</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm font-bold">{t("negotiable")}</span>
          <input type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} className="size-5 accent-accent" />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1.5 block text-sm font-bold">{t("province")}</label>
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
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold">{t("city")}</label>
            <Select value={city} onValueChange={setCity} disabled={!prov}>
              <SelectTrigger className={field}>
                <SelectValue placeholder={t("city")} />
              </SelectTrigger>
              <SelectContent>
                {prov?.cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-bold">{t("description")}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={2000}
            className={field}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent py-3.5 font-display text-sm font-black text-accent-foreground disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {t("postListing")}
        </button>
      </form>
    </div>
  );
}
