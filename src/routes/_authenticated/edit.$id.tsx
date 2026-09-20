import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { ListingForm, type ListingFormInitial } from "@/components/ListingForm";

export const Route = createFileRoute("/_authenticated/edit/$id")({
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["edit-listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*, listing_images(url,position)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );

  if (isError || !data || (user && data.seller_id !== user.id)) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title={t("edit")} />
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="text-sm text-muted-foreground">{t("emptyListings")}</p>
          <button onClick={() => navigate({ to: "/profile" })} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            {t("back")}
          </button>
        </div>
      </div>
    );
  }

  const imgs = ((data.listing_images ?? []) as { url: string; position: number }[]).sort(
    (a, b) => a.position - b.position,
  );

  const initial: ListingFormInitial = {
    id: data.id,
    title: data.title,
    description: data.description ?? "",
    price: String(data.price ?? ""),
    currency: data.currency,
    negotiable: data.negotiable,
    category: data.category,
    subcategory: data.subcategory ?? "",
    custom_subcategory: data.custom_subcategory ?? "",
    condition: data.condition ?? "",
    province: data.province,
    city: data.city ?? "",
    contact_method: (data.contact_method as "call" | "chat" | "both") ?? "both",
    tags: data.tags ?? [],
    status: data.status,
    images: imgs.map((im) => ({ url: im.url })),
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <TopBar title={t("edit")} />
      <ListingForm mode="edit" initial={initial} />
    </div>
  );
}
