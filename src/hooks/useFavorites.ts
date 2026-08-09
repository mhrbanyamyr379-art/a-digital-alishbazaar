import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const favKey = (uid?: string) => ["favorites", uid] as const;

/** Set of listing ids the signed-in user has saved. One query for the whole app. */
export function useFavoriteIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: favKey(user?.id),
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("listing_id").eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.listing_id));
    },
  });
}

/**
 * Optimistic favorite toggle. Guests are sent to /auth instead of hitting the
 * database. Inserts ignore duplicates so rapid double taps can never create a
 * second row (the table also has a unique (user_id, listing_id) constraint).
 */
export function useToggleFavorite() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useI18n();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async ({ id, isFav }: { id: string; isFav: boolean }) => {
      if (!user) throw new Error("auth");
      if (isFav) {
        const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .upsert({ user_id: user.id, listing_id: id }, { onConflict: "user_id,listing_id", ignoreDuplicates: true });
        if (error) throw error;
      }
    },
    onMutate: async ({ id, isFav }) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey: favKey(user.id) });
      const previous = qc.getQueryData<Set<string>>(favKey(user.id));
      const next = new Set(previous ?? []);
      if (isFav) next.delete(id);
      else next.add(id);
      qc.setQueryData(favKey(user.id), next);
      return { previous };
    },
    onError: (e: Error, _vars, ctx) => {
      if (user && ctx?.previous) qc.setQueryData(favKey(user.id), ctx.previous);
      if (e.message === "auth") {
        toast.error(t("loginRequired"));
        navigate({ to: "/auth" });
      } else {
        if (import.meta.env.DEV) console.error("[favorites]", e);
        toast.error(t("errorTitle"));
      }
    },
    onSettled: () => {
      if (!user) return;
      qc.invalidateQueries({ queryKey: favKey(user.id) });
      qc.invalidateQueries({ queryKey: ["favorite-listings", user.id] });
    },
  });

  /** Safe entry point for UI: handles the guest case without a failed request. */
  const toggle = (id: string, isFav: boolean) => {
    if (!user) {
      toast.error(t("loginRequired"));
      navigate({ to: "/auth" });
      return;
    }
    mutation.mutate({ id, isFav });
  };

  return Object.assign(mutation, { toggle });
}
