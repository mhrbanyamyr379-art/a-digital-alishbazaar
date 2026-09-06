import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { dbErrorKey } from "@/lib/db-errors";


/**
 * Opens (or creates exactly once) the conversation between the signed-in buyer
 * and a seller for a given listing, then navigates into the chat room.
 * Deduplication happens server-side in `get_or_create_conversation`, so double
 * taps or races can never produce two conversations.
 */
export function useStartChat() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [starting, setStarting] = useState(false);

  const startChat = async (opts: { sellerId: string; listingId?: string | null; next?: string }) => {
    if (starting) return;
    if (!user) {
      navigate({ to: "/auth", search: { next: opts.next ?? window.location.pathname } });
      return;
    }
    if (user.id === opts.sellerId) return;

    setStarting(true);
    try {
      const { data, error } = await supabase.rpc("get_or_create_conversation", {
        _listing_id: opts.listingId ?? null,
        _seller_id: opts.sellerId,
      } as never);
      const convId = data as unknown as string | null;
      if (error || !convId) throw error ?? new Error("no conversation");
      // Make the chat list show it immediately, before realtime catches up.
      await qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      navigate({ to: "/chat/$id", params: { id: convId } });
    } catch (err) {
      toast.error(t(dbErrorKey(err)));

    } finally {
      setStarting(false);
    }
  };

  return { startChat, starting };
}
