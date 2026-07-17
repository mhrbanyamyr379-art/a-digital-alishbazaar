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
