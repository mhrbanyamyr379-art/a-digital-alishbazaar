import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useUnreadTotal() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["unread-total", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const { data, error } = await supabase
        .from("conversations")
        .select("buyer_id,seller_id,buyer_unread,seller_unread,archived_by_buyer,archived_by_seller")
        .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`);
      if (error) throw error;
      let unreadChats = 0;
      let unreadMsgs = 0;
      for (const c of data ?? []) {
        const isBuyer = c.buyer_id === uid;
        const archived = isBuyer ? c.archived_by_buyer : c.archived_by_seller;
        if (archived) continue;
        const u = isBuyer ? c.buyer_unread : c.seller_unread;
        if (u > 0) {
          unreadChats++;
          unreadMsgs += u;
        }
      }
      return { unreadChats, unreadMsgs };
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("unread-" + user.id)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        () => qc.invalidateQueries({ queryKey: ["unread-total", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  return q.data ?? { unreadChats: 0, unreadMsgs: 0 };
}

/** Count of unread notification rows for the signed-in user, kept live. */
export function useUnreadNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["unread-notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("notif-count-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["unread-notifications", user.id] });
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  return q.data ?? 0;
}
