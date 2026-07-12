import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export function useFavoriteIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("listing_id").eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.listing_id));
    },
  });
}

export function useToggleFavorite() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async ({ id, isFav }: { id: string; isFav: boolean }) => {
      if (!user) throw new Error("auth");
      if (isFav) {
        const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("favorites").insert({ user_id: user.id, listing_id: id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: (e: Error) => {
      if (e.message === "auth") toast.error(t("loginRequired"));
      else toast.error(t("errorTitle"));
    },
  });
}
