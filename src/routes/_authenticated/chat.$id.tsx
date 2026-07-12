import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  component: ChatThread,
});

interface Msg {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

function ChatThread() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [other, setOther] = useState<string>("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,sender_id,body,created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Msg[];
    },
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("conversations")
      .select("buyer_id,seller_id")
      .eq("id", id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return;
        const otherId = data.buyer_id === user.id ? data.seller_id : data.buyer_id;
        const { data: p } = await supabase.from("profiles").select("display_name").eq("id", otherId).maybeSingle();
        setOther(p?.display_name ?? "");
      });
  }, [id, user]);

  useEffect(() => {
    const channel = supabase
      .channel("msgs-" + id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["messages", id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({ conversation_id: id, sender_id: user.id, body });
    if (!error) {
      await supabase.from("conversations").update({ last_message: body, last_message_at: new Date().toISOString() }).eq("id", id);
      qc.invalidateQueries({ queryKey: ["messages", id] });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar title={other || t("chat")} />
      <main className="flex-1 space-y-2 overflow-y-auto p-4 pb-24">
        {messages?.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                  mine ? "rounded-ee-sm bg-accent text-accent-foreground" : "rounded-es-sm bg-card border border-border",
                )}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </main>
      <form
        onSubmit={send}
        className="fixed bottom-0 left-0 flex w-full gap-2 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("typeMessage")}
          className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="submit"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
        >
          <Send className="size-5" />
        </button>
      </form>
    </div>
  );
}
