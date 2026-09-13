import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ImagePlus,
  X,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Phone,
  MessageCircle,
  Tag as TagIcon,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { dbErrorKey } from "@/lib/db-errors";

import { CATEGORIES, CONDITIONS, categoryById } from "@/data/categories";
import { subcategoriesFor, subcategoryById } from "@/data/subcategories";
import { PROVINCES, provinceById } from "@/data/provinces";
import { uploadImage } from "@/lib/storage";
import { StorageImage } from "@/components/StorageImage";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MAX_IMAGES = 10;
const STEPS = ["basicInfo", "detailsStep", "photosStep", "locationStep", "reviewStep"] as const;

type ContactMethod = "call" | "chat" | "both";

interface ImgItem {
  key: string;
  existing: boolean;
  url?: string; // stored path (existing)
  file?: File; // new file
  preview: string;
}

export interface ListingFormInitial {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  negotiable: boolean;
  category: string;
  subcategory: string;
  condition: string;
  province: string;
  city: string;
  contact_method: ContactMethod;
  tags: string[];
  status: string;
  images: { url: string }[];
}

export function ListingForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: ListingFormInitial;
}) {
  const { t, locName, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stepIdx, setStepIdx] = useState(0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "AFN");
  const [negotiable, setNegotiable] = useState(initial?.negotiable ?? false);
  const [category, setCategory] = useState(initial?.category ?? "");
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? "");
  const [condition, setCondition] = useState(initial?.condition ?? "");
  const [province, setProvince] = useState(initial?.province ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [contactMethod, setContactMethod] = useState<ContactMethod>(initial?.contact_method ?? "both");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [images, setImages] = useState<ImgItem[]>(
    (initial?.images ?? []).map((im, i) => ({
      key: `ex-${i}-${im.url}`,
      existing: true,
      url: im.url,
      preview: "",
    })),
  );
  const [saving, setSaving] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const cat = categoryById(category);
  const subs = subcategoriesFor(category);
  const prov = provinceById(province);
  const errors = validate();

  function validate() {
    const e: Record<string, string> = {};
    if (title.trim().length < 5) e.title = t("titleTooShort");
    if (!category) e.category = t("requiredField");
    else if (subs.length > 0 && !subcategoryById(category, subcategory))
      e.subcategory = t("requiredField");
    if (!price || Number(price) <= 0 || Number.isNaN(Number(price))) e.price = t("priceInvalid");
    if (!province) e.province = t("requiredField");
    if (images.length === 0) e.images = t("imageRequired");
    return e;
  }

  const stepValid = (idx: number) => {
    if (idx === 0) return !errors.title && !errors.category && !errors.subcategory;
    if (idx === 1) return !errors.price;
    if (idx === 2) return !errors.images;
    if (idx === 3) return !errors.province;
    return true;
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const room = MAX_IMAGES - images.length;
    const incoming = Array.from(list).slice(0, room).map((f, i) => ({
      key: `new-${Date.now()}-${i}`,
      existing: false,
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...incoming]);
  };

  const removeImage = (key: string) => setImages((p) => p.filter((im) => im.key !== key));

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
  };

  const addTag = () => {
    const v = tagInput.trim().replace(/,/g, "");
    if (v && tags.length < 10 && !tags.includes(v)) setTags((p) => [...p, v]);
    setTagInput("");
  };

  const persist = async (status: "draft" | "active") => {
    if (!user) return;
    const errs = validate();
    if (status === "active" && Object.keys(errs).length > 0) {
      toast.error(Object.values(errs)[0]);
      // jump to first invalid step
      for (let i = 0; i < STEPS.length; i++) if (!stepValid(i)) return setStepIdx(i);
      return;
    }
    if (status === "draft" && title.trim().length < 1) {
      toast.error(t("requiredField"));
      return setStepIdx(0);
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const expiresIso = new Date(Date.now() + 30 * 864e5).toISOString();
      const base = {
        title: title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        currency,
        negotiable,
        category,
        subcategory: subcategory || null,
        condition: condition || null,
        province,
        city: city || null,
        contact_method: contactMethod,
        tags,
        status,
      };

      let listingId = initial?.id;

      if (mode === "create") {
        const { data, error } = await supabase
          .from("listings")
          .insert({
            ...base,
            seller_id: user.id,
            published_at: status === "active" ? nowIso : null,
            expires_at: status === "active" ? expiresIso : null,
          })
          .select("id")
          .single();
        if (error) throw error;
        listingId = data.id;
      } else {
        const patch =
          status === "active" && initial?.status !== "active"
            ? { ...base, published_at: nowIso, expires_at: expiresIso }
            : base;
        const { error } = await supabase.from("listings").update(patch).eq("id", listingId!);
        if (error) throw error;
      }

      // Upload any new images, then rewrite ordering
      const orderedPaths: string[] = [];
      for (const im of images) {
        if (im.existing && im.url) orderedPaths.push(im.url);
        else if (im.file) orderedPaths.push(await uploadImage("listings", user.id, listingId!, im.file));
      }
      // Replace image rows to reflect current order/set
      await supabase.from("listing_images").delete().eq("listing_id", listingId!);
      if (orderedPaths.length > 0) {
        const { error: imgErr } = await supabase
          .from("listing_images")
          .insert(orderedPaths.map((url, i) => ({ listing_id: listingId!, url, position: i })));
        if (imgErr) throw imgErr;
      }

      toast.success(status === "draft" ? t("draftSaved") : mode === "edit" ? t("listingUpdated") : t("listingPublished"));
      navigate({ to: "/listing/$id", params: { id: listingId! } });
    } catch (err) {
      toast.error(t(dbErrorKey(err)));
    } finally {
      setSaving(false);
    }
  };

  const field =
    "w-full rounded-lg border border-border bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

  const currentStep = STEPS[stepIdx];

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Progress */}
      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>
            {t("step")} {stepIdx + 1} {t("of")} {STEPS.length}
          </span>
          <span className="text-accent">{t(currentStep)}</span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= stepIdx ? "bg-accent" : "bg-muted")}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: Basic */}
      {currentStep === "basicInfo" && (
        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-bold">{t("title")}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} maxLength={120} />
            {title.length > 0 && errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold">{t("category")}</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategory(c.id);
                    setSubcategory("");
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-semibold transition-colors",
                    category === c.id ? "border-accent bg-accent/10" : "border-border",
                  )}
                >
                  <c.icon className="size-5" />
                  {locName(c)}
                </button>
              ))}
            </div>
            {errors.category && <p className="mt-1 text-xs text-destructive">{errors.category}</p>}
          </div>

          {subs.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-bold">{t("subcategory")}</label>
              <div className="flex flex-wrap gap-2">
                {subs.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSubcategory(s.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      subcategory === s.id ? "border-accent bg-accent/10" : "border-border",
                    )}
                  >
                    {locName(s)}
                  </button>
                ))}
              </div>
              {errors.subcategory && !subcategory && (
                <p className="mt-1 text-xs text-destructive">{errors.subcategory}</p>
              )}
            </div>
          )}
          {!category && (
            <p className="text-xs text-muted-foreground">{t("selectCategoryFirst")}</p>
          )}
          {cat?.conditions && (
            <div>
              <label className="mb-1.5 block text-sm font-bold">
                {t("condition")} <span className="text-muted-foreground">({t("optional")})</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCondition(condition === c.id ? "" : c.id)}
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
        </div>
      )}

      {/* STEP 2: Details */}
      {currentStep === "detailsStep" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="mb-1.5 block text-sm font-bold">{t("price")}</label>
              <input
                type="number"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={field}
              />
              {errors.price && price !== "" && <p className="mt-1 text-xs text-destructive">{errors.price}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold">&nbsp;</label>
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
            <input
              type="checkbox"
              checked={negotiable}
              onChange={(e) => setNegotiable(e.target.checked)}
              className="size-5 accent-accent"
            />
          </label>

          <div>
            <label className="mb-1.5 block text-sm font-bold">
              {t("description")} <span className="text-muted-foreground">({t("optional")})</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={2000}
              className={field}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold">
              {t("tags")} <span className="text-muted-foreground">({t("optional")})</span>
            </label>
            <p className="mb-2 text-xs text-muted-foreground">{t("tagsHint")}</p>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder={t("addTag")}
                className={field}
                maxLength={24}
              />
              <button
                type="button"
                onClick={addTag}
                className="shrink-0 rounded-lg border border-border px-4 text-sm font-bold"
              >
                +
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tg) => (
                  <span
                    key={tg}
                    className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold"
                  >
                    <TagIcon className="size-3" />
                    {tg}
                    <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== tg))}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Photos */}
      {currentStep === "photosStep" && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-bold">{t("photos")}</label>
            <p className="text-xs text-muted-foreground">{t("sortImagesHint")}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {images.map((im, i) => (
              <div
                key={im.key}
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex.current !== null) moveImage(dragIndex.current, i);
                  dragIndex.current = null;
                }}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-lg border",
                  i === 0 ? "border-accent" : "border-border",
                )}
              >
                {im.existing ? (
                  <StorageImage bucket="listings" path={im.url} alt="" className="size-full object-cover" />
                ) : (
                  <img src={im.preview} alt="" className="size-full object-cover" />
                )}
                {i === 0 && (
                  <span className="absolute bottom-1 start-1 rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground">
                    {t("coverPhoto")}
                  </span>
                )}
                <span className="absolute start-1 top-1 flex size-5 items-center justify-center rounded bg-black/40 text-white">
                  <GripVertical className="size-3" />
                </span>
                <button
                  type="button"
                  onClick={() => removeImage(im.key)}
                  className="absolute end-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <X className="size-3" />
                </button>
                <div className="absolute bottom-1 end-1 flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveImage(i, i - 1)}
                    disabled={i === 0}
                    className="flex size-5 items-center justify-center rounded bg-black/50 text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(i, i + 1)}
                    disabled={i === images.length - 1}
                    className="flex size-5 items-center justify-center rounded bg-black/50 text-white disabled:opacity-30"
                  >
                    <ChevronRight className="size-3" />
                  </button>
                </div>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground">
                <ImagePlus className="size-5" />
                <span className="text-[10px]">{t("addPhotos")}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {images.length}/{MAX_IMAGES}
          </p>
        </div>
      )}

      {/* STEP 4: Location & contact */}
      {currentStep === "locationStep" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1.5 block text-sm font-bold">{t("province")}</label>
              <Select value={province} onValueChange={(v) => { setProvince(v); setCity(""); }}>
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
              <label className="mb-1.5 block text-sm font-bold">
                {t("city")} <span className="text-muted-foreground">({t("optional")})</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("city")}
                list="city-suggestions"
                autoComplete="off"
                maxLength={60}
                className={field}
              />
              <datalist id="city-suggestions">
                {prov?.cities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {!!prov?.cities.length && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {prov.cities.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                        city === c
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-accent/50",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold">{t("contactMethod")}</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "both", label: t("both"), icon: null },
                { id: "call", label: t("callOnly"), icon: Phone },
                { id: "chat", label: t("chatOnly"), icon: MessageCircle },
              ] as const).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setContactMethod(o.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-semibold",
                    contactMethod === o.id ? "border-accent bg-accent/10" : "border-border",
                  )}
                >
                  {o.icon && <o.icon className="size-4" />}
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Review */}
      {currentStep === "reviewStep" && (
        <div className="flex flex-col gap-3">
          {images[0] && (
            images[0].existing ? (
              <StorageImage bucket="listings" path={images[0].url} alt="" className="aspect-video w-full rounded-xl object-cover" />
            ) : (
              <img src={images[0].preview} alt="" className="aspect-video w-full rounded-xl object-cover" />
            )
          )}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="font-display text-xl font-black">{formatPrice(Number(price) || 0, currency, lang)}</div>
            <h3 className="mt-1 font-bold">{title || "—"}</h3>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>{cat ? locName(cat) : "—"}{condition ? ` · ${locName(CONDITIONS.find((c) => c.id === condition)!)}` : ""}</p>
              <p>{prov ? locName(prov) : "—"}{city ? ` · ${city}` : ""}</p>
              <p>{t("contactMethod")}: {t(contactMethod === "both" ? "both" : contactMethod === "call" ? "callOnly" : "chatOnly")}</p>
              <p>{images.length} {t("photos")}</p>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tg) => (
                  <span key={tg} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                    {tg}
                  </span>
                ))}
              </div>
            )}
          </div>
          {Object.keys(errors).length > 0 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              {Object.values(errors).map((e, i) => (
                <p key={i}>• {e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nav buttons */}
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex gap-2">
          {stepIdx > 0 && (
            <button
              type="button"
              onClick={() => setStepIdx((i) => i - 1)}
              className="flex items-center justify-center gap-1 rounded-lg border border-border px-4 py-3 text-sm font-bold"
            >
              <ChevronLeft className="size-4" />
              {t("back")}
            </button>
          )}
          {stepIdx < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => (stepValid(stepIdx) ? setStepIdx((i) => i + 1) : toast.error(t("requiredField")))}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary py-3 font-display text-sm font-black text-primary-foreground"
            >
              {t("next")}
              <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => persist("active")}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent py-3 font-display text-sm font-black text-accent-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {mode === "edit" ? t("save") : t("publishNow")}
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => persist("draft")}
          className="rounded-lg border border-border py-2.5 text-sm font-bold text-muted-foreground disabled:opacity-60"
        >
          {t("saveDraft")}
        </button>
      </div>
    </div>
  );
}
