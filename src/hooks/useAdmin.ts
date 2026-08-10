import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Maps a Postgres/Supabase error to a safe, translatable message key.
 * Raw database errors are only surfaced in dev logs, never to the user.
 */
export function adminErrorKey(err: unknown): "notAuthorized" | "notFoundRecord" | "sessionExpired" | "networkError" | "actionFailed" {
  if (import.meta.env.DEV) console.error("[admin]", err);
  const e = err as { code?: string; message?: string; status?: number } | null;
  const msg = (e?.message ?? "").toLowerCase();
  if (e?.code === "42501" || msg.includes("not authorized") || msg.includes("permission denied")) return "notAuthorized";
  if (e?.code === "P0002" || msg.includes("not found")) return "notFoundRecord";
  if (e?.status === 401 || msg.includes("jwt") || msg.includes("token is expired")) return "sessionExpired";
  if (msg.includes("failed to fetch") || msg.includes("network")) return "networkError";
  return "actionFailed";
}

export type AdminStats = {
  total_users: number;
  active_users: number;
  new_users: number;
  banned_users: number;
  total_listings: number;
  active_listings: number;
  pending_listings: number;
  sold_listings: number;
  rejected_listings: number;
  suspended_listings: number;
  new_listings: number;
  reported_listings: number;
  open_reports: number;
  reviewing_reports: number;
  moderation_queue: number;
};

export function useAdminStats(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-stats"],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<AdminStats> => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw error;
      return data as unknown as AdminStats;
    },
  });
}

/** True when the signed-in user is an admin or moderator (server-verified). */
export function useIsModerator() {
  const { user, isAdmin, loading } = useAuth();
  return { isModerator: !!user && isAdmin, loading: loading };
}
