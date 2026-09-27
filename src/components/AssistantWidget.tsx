import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouterState } from "@tanstack/react-router";
import { RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import assistantAvatar from "@/assets/assistant-avatar.png.asset.json";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool";
import { useI18n } from "@/lib/i18n";

const KEY = "alish-assistant-messages";

const TXT = {
  title: { fa: "دستیار هوشمند الیش", ps: "د الیش هوښیار مرستیال", en: "Alish Assistant" },
  hello: {
    fa: "سلام! من دستیار هوشمند الیش هستم. در جستجوی کالا، نوشتن آگهی، قیمت‌گذاری یا امنیت معامله کمکتان می‌کنم.",
    ps: "سلام! زه د الیش هوښیار مرستیال یم. د شیانو په لټون، اعلان لیکلو، بیه ټاکلو او خوندي معاملې کې مرسته کوم.",
    en: "Hi! I'm the Alish assistant. I can help you find items, write ads, set prices and trade safely.",
  },
  placeholder: { fa: "سوال خود را بنویسید…", ps: "خپله پوښتنه ولیکئ…", en: "Ask anything…" },
  thinking: { fa: "در حال فکر کردن…", ps: "فکر کوي…", en: "Thinking…" },
  searching: { fa: "جستجوی آگهی‌ها", ps: "د اعلانونو لټون", en: "Searching listings" },
  clear: { fa: "گفتگوی جدید", ps: "نوې خبرې", en: "New chat" },
  err: { fa: "خطا در پاسخ. دوباره تلاش کنید.", ps: "ځواب کې ستونزه. بیا هڅه وکړئ.", en: "Something went wrong. Please try again." },
  busy: { fa: "درخواست‌ها زیاد است، کمی بعد تلاش کنید.", ps: "ډېرې غوښتنې، لږ وروسته هڅه وکړئ.", en: "Too many requests, try again shortly." },
  s1: { fa: "موتر کرولا در کابل می‌خواهم", ps: "په کابل کې کرولا موټر غواړم", en: "Find a Corolla in Kabul" },
  s2: { fa: "چطور آگهی ثبت کنم؟", ps: "څنګه اعلان ثبت کړم؟", en: "How do I post an ad?" },
  s3: { fa: "نکات امنیتی خرید", ps: "د پېرلو خوندیتوب لارښوونې", en: "Safe buying tips" },
} as const;

export function AssistantWidget() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hidden = path.startsWith("/chat/") || path.startsWith("/auth") || path.startsWith("/admin");
  const [open, setOpen] = useState(false);
  if (hidden) return null;
  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Alish Assistant"
          onClick={() => setOpen(true)}
          className="fixed bottom-36 end-4 z-50 size-12 overflow-hidden rounded-full shadow-xl ring-2 ring-background transition-transform active:scale-95"
        >
          <img src={assistantAvatar.url} alt="" className="size-full" />
        </button>
      )}
      {open && <AssistantPanel onClose={() => setOpen(false)} />}
    </>
  );
}

function AssistantPanel({ onClose }: { onClose: () => void }) {
  const { lang, dir } = useI18n();
  const tx = (k: keyof typeof TXT) => TXT[k][lang];
  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  const initial = useMemo<UIMessage[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      return [];
    }
  }, []);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/assistant", body: () => ({ lang: langRef.current }) }),
    [],
  );

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: "alish-assistant",
    messages: initial,
    transport,
    onError: (e) => {
      const m = String(e?.message ?? "");
      toast.error(m.includes("429") ? tx("busy") : tx("err"));
    },
  });

  useEffect(() => {
    if (status === "ready" || status === "error") {
      try {
        localStorage.setItem(KEY, JSON.stringify(messages));
      } catch {
        /* ignore */
      }
      taRef.current?.focus();
    }
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";
  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text: text.trim() });
    setInput("");
  };
  const last = messages[messages.length - 1];
  const waiting =
    status === "submitted" ||
    (status === "streaming" && !last?.parts.some((p) => p.type === "text" && p.text));

  return (
    <div
      dir={dir}
      className="fixed inset-x-2 bottom-2 top-16 z-[60] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:end-4 sm:bottom-4 sm:top-auto sm:h-[600px] sm:w-[400px]"
    >
      <div className="flex items-center gap-3 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
        <img
          src={assistantAvatar.url}
          alt=""
          className="size-9 shrink-0 rounded-full bg-primary-foreground/15"
        />
        <div className="flex-1 font-display text-sm font-black">{tx("title")}</div>
        <button
          type="button"
          aria-label={tx("clear")}
          title={tx("clear")}
          onClick={() => {
            stop();
            setMessages([]);
            localStorage.removeItem(KEY);
          }}
          className="rounded-full p-2 hover:bg-primary-foreground/15"
        >
          <RotateCcw className="size-4" />
        </button>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-2 hover:bg-primary-foreground/15">
          <X className="size-5" />
        </button>
      </div>

      <Conversation className="flex-1">
        <ConversationContent className="gap-4 p-4">
          <Message from="assistant">
            <MessageContent>
              <MessageResponse>{tx("hello")}</MessageResponse>
            </MessageContent>
          </Message>
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {(["s1", "s2", "s3"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => send(tx(k))}
                  className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-bold text-foreground hover:bg-accent/20"
                >
                  {tx(k)}
                </button>
              ))}
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent
                className={
                  m.role === "user"
                    ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"
                    : undefined
                }
              >
                {m.parts.map((p, i) => {
                  if (p.type === "text")
                    return m.role === "user" ? (
                      <p key={i} className="whitespace-pre-wrap">{p.text}</p>
                    ) : (
                      <MessageResponse key={i}>{p.text}</MessageResponse>
                    );
                  if (p.type.startsWith("tool-")) {
                    const tp = p as { state: "input-streaming" | "input-available" | "output-available" | "output-error"; type: `tool-${string}` };
                    return (
                      <Tool key={i} defaultOpen={false}>
                        <ToolHeader type={tp.type} state={tp.state} title={tx("searching")} />
                        <ToolContent />
                      </Tool>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {waiting && <Shimmer className="text-sm">{tx("thinking")}</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-2">
        <PromptInput onSubmit={(msg) => send(msg.text ?? "")}>
          <PromptInputTextarea
            ref={taRef}
            autoFocus
            value={input}
            placeholder={tx("placeholder")}
            onChange={(e) => setInput(e.target.value)}
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
