import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ImagePlus, RotateCcw, SendHorizontal, X } from "lucide-react";
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
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTools,
  usePromptInputAttachments,
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
  attach: { fa: "افزودن عکس", ps: "انځور زیات کړئ", en: "Add photo" },
  imgOnly: { fa: "فقط عکس قابل ارسال است (حداکثر ۳ عکس، هر کدام تا ۱۰ مگابایت).", ps: "یوازې انځور (تر ۳ پورې، هر یو تر ۱۰ MB).", en: "Photos only (up to 3, 10 MB each)." },
  signIn: { fa: "برای استفاده از دستیار هوشمند، لطفاً وارد حساب خود شوید.", ps: "د هوښیار مرستیال لپاره، مهرباني وکړئ خپل حساب ته ننوځئ.", en: "Please sign in to use the smart assistant." },
  imgBad: { fa: "این عکس قابل خواندن نیست. عکس دیگری انتخاب کنید.", ps: "دا انځور نه لوستل کېږي. بل انځور وټاکئ.", en: "This photo can't be read. Please choose another." },
  photoQ: { fa: "این عکس را بررسی کن.", ps: "دا انځور وګوره.", en: "Please look at this photo." },
  s1: { fa: "موتر کرولا در کابل می‌خواهم", ps: "په کابل کې کرولا موټر غواړم", en: "Find a Corolla in Kabul" },
  s2: { fa: "چطور آگهی ثبت کنم؟", ps: "څنګه اعلان ثبت کړم؟", en: "How do I post an ad?" },
  s3: { fa: "نکات امنیتی خرید", ps: "د پېرلو خوندیتوب لارښوونې", en: "Safe buying tips" },
  s4: { fa: "قیمت مناسب برای فروش موبایلم چقدر است؟", ps: "زما د موبایل مناسبه بیه څومره ده؟", en: "What's a fair price for my phone?" },
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
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
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
    () => new DefaultChatTransport({
        api: "/api/assistant",
        body: () => ({ lang: langRef.current }),
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const tok = data.session?.access_token;
          return tok ? { Authorization: `Bearer ${tok}` } : {};
        },
      }),
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
        // Storage full (photos): keep the text history only.
        try {
          localStorage.setItem(KEY, JSON.stringify(stripFiles(messages)));
        } catch {
          /* ignore */
        }
      }
      taRef.current?.focus();
    }
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";
  const send = async (text: string, files: { url: string; mediaType: string; filename?: string }[] = []) => {
    if ((!text.trim() && !files.length) || busy) return;
    if (!authUser) {
      toast.error(tx("signIn"));
      navigate({ to: "/auth", search: { next: window.location.pathname } });
      return;
    }
    let parts: { type: "file"; url: string; mediaType: string; filename?: string }[] = [];
    try {
      parts = await Promise.all(files.map(async (f) => ({ type: "file" as const, mediaType: "image/jpeg", filename: f.filename, url: await shrink(f.url) })));
    } catch {
      toast.error(tx("imgBad"));
      return;
    }
    setInput("");
    sendMessage({ text: text.trim() || tx("photoQ"), files: parts });
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
              {(["s1", "s2", "s3", "s4"] as const).map((k) => (
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
                  if (p.type === "file" && p.mediaType?.startsWith("image/"))
                    return <img key={i} src={p.url} alt="" className="max-h-56 w-full max-w-60 rounded-lg object-cover" />;
                  if (p.type === "text")
                    return m.role === "user" ? (
                      <p key={i} dir="auto" className="whitespace-pre-wrap break-words text-start">{p.text}</p>
                    ) : (
                      <div key={i} dir="auto" className="break-words text-start leading-7 [&_a]:font-bold [&_a]:text-primary [&_a]:underline">
                        <MessageResponse>{p.text}</MessageResponse>
                      </div>
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
        <PromptInput
          accept="image/*"
          multiple
          maxFiles={3}
          maxFileSize={10 * 1024 * 1024}
          onError={() => toast.error(tx("imgOnly"))}
          onSubmit={(msg) => send(msg.text ?? "", msg.files ?? [])}
          className="[&_[data-slot=input-group]]:rounded-3xl"
        >
          <PromptInputHeader className="empty:hidden p-0">
            <AttachmentPreviews />
          </PromptInputHeader>
          <PromptInputTextarea
            ref={taRef}
            autoFocus
            value={input}
            placeholder={tx("placeholder")}
            onChange={(e) => setInput(e.target.value)}
          />
          <PromptInputFooter className="justify-between">
            <PromptInputTools>
              <AttachButton label={tx("attach")} />
            </PromptInputTools>
            <SubmitButton status={status} onStop={stop} busy={busy} hasText={!!input.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}


type ChatStatus = "submitted" | "streaming" | "ready" | "error";

function AttachButton({ label }: { label: string }) {
  const a = usePromptInputAttachments();
  return (
    <PromptInputButton aria-label={label} title={label} onClick={() => a.openFileDialog()} className="rounded-full text-primary">
      <ImagePlus className="size-5" />
    </PromptInputButton>
  );
}

function AttachmentPreviews() {
  const a = usePromptInputAttachments();
  if (!a.files.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto px-3 pt-3">
      {a.files.map((f) => (
        <div key={f.id} className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border">
          <img src={f.url} alt="" className="size-full object-cover" />
          <button
            type="button"
            aria-label="Remove"
            onClick={() => a.remove(f.id)}
            className="absolute end-0.5 top-0.5 rounded-full bg-background/90 p-0.5 text-foreground shadow"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function SubmitButton({ status, onStop, busy, hasText }: { status: ChatStatus; onStop: () => void; busy: boolean; hasText: boolean }) {
  const a = usePromptInputAttachments();
  const empty = !hasText && a.files.length === 0;
  return (
    <PromptInputSubmit
      status={status}
      onStop={onStop}
      disabled={!busy && empty}
      className="size-10 rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-90 disabled:opacity-40"
    >
      {busy ? undefined : <SendHorizontal className="size-5 rtl:-scale-x-100" />}
    </PromptInputSubmit>
  );
}

// Resize a picked photo to a small JPEG data URL so it uploads fast on mobile networks.
async function shrink(src: string, max = 1024): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * scale));
  c.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}

function stripFiles(msgs: UIMessage[]): UIMessage[] {
  return msgs.map((m) => ({
    ...m,
    parts: m.parts.map((p) => (p.type === "file" ? { type: "text" as const, text: "🖼️" } : p)),
  }));
}
