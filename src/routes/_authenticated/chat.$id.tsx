import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Send,
  Paperclip,
  MoreVertical,
  Copy,
  Trash2,
  Archive,
  ArchiveRestore,
  Ban,
  Flag,
  Check,
  CheckCheck,
  Loader2,
  X,
  ArrowLeft,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { formatPrice, timeAgo } from "@/lib/format";
import { uploadImage } from "@/lib/storage";
import { StorageImage } from "@/components/StorageImage";
import { ImageLightbox } from "@/components/ImageLightbox";
import { PresenceLabel, isOnline } from "@/components/Presence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  component: ChatThread,
});

interface Msg {
  id: string;
  sender_id: string;
  body: string | null;
  type: string;
  image_paths: string[] | null;
  attachment_listing_id: string | null;
  deleted_for: string[] | null;
  read_at: string | null;
  created_at: string;
}

interface OtherProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  last_seen: string | null;
}

interface ListingPreview {
  id: string;
  title: string;
  price: number;
  currency: string;
  status: string;
  image: string | null;
}

function sameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
}

function ChatThread() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null); // message id
  const [headerMenu, setHeaderMenu] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: conv } = useQuery({
    queryKey: ["conv", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const otherId = conv && user ? (conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id) : null;
  const iAmBuyer = conv && user ? conv.buyer_id === user.id : false;
  const archived = conv ? (iAmBuyer ? conv.archived_by_buyer : conv.archived_by_seller) : false;

  const { data: other } = useQuery({
    queryKey: ["conv-other", otherId],
    enabled: !!otherId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url,last_seen")
        .eq("id", otherId!)
        .maybeSingle();
      if (error) throw error;
      return data as OtherProfile | null;
    },
    refetchInterval: 30_000,
  });

  const { data: listing } = useQuery({
    queryKey: ["conv-listing", conv?.listing_id],
    enabled: !!conv?.listing_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,price,currency,status,listing_images(url,position)")
        .eq("id", conv!.listing_id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      type Img = { url: string; position: number };
      const imgs = ((data.listing_images ?? []) as Img[]).slice().sort((a, b) => a.position - b.position);
      return {
        id: data.id,
        title: data.title,
        price: Number(data.price),
        currency: data.currency,
        status: data.status,
        image: imgs[0]?.url ?? null,
      } as ListingPreview;
    },
  });

  const { data: blockedByMe } = useQuery({
    queryKey: ["block", user?.id, otherId],
    enabled: !!user && !!otherId,
    queryFn: async () => {
      const { data } = await supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", user!.id)
        .eq("blocked_id", otherId!)
        .maybeSingle();
      return !!data;
    },
  });

  const { data: blockedMe } = useQuery({
    queryKey: ["blocked-me", otherId, user?.id],
    enabled: !!user && !!otherId,
    queryFn: async () => {
      const { data } = await supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", otherId!)
        .eq("blocked_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,sender_id,body,type,image_paths,attachment_listing_id,deleted_for,read_at,created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Msg[];
    },
  });

  // Realtime: message inserts/updates
  useEffect(() => {
    const channel = supabase
      .channel("msgs-" + id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["messages", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  // Typing broadcast channel
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`typing-${id}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "typing" }, (payload) => {
      const p = payload.payload as { user_id: string };
      if (p?.user_id && p.user_id !== user.id) {
        setOtherTyping(true);
        if (otherTypingTimerRef.current) clearTimeout(otherTypingTimerRef.current);
        otherTypingTimerRef.current = setTimeout(() => setOtherTyping(false), 3000);
      }
    });
    ch.subscribe();
    typingChannelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      typingChannelRef.current = null;
      if (otherTypingTimerRef.current) clearTimeout(otherTypingTimerRef.current);
    };
  }, [id, user]);

  // Mark read on mount + when new messages arrive while visible
  useEffect(() => {
    if (!user || !messages) return;
    const hasUnreadFromOther = messages.some((m) => m.sender_id !== user.id && !m.read_at);
    if (hasUnreadFromOther) {
      (supabase.rpc as any)("mark_conversation_read", { _conv_id: id }).then(() => {
        qc.invalidateQueries({ queryKey: ["unread-total", user.id] });
        qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      });
    }
  }, [messages, id, user, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  const emitTyping = () => {
    if (!user || !typingChannelRef.current) return;
    if (typingTimerRef.current) return; // throttle
    typingChannelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: user.id } });
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null;
    }, 1500);
  };

  const canSend = !archived && !blockedByMe && !blockedMe;

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || !user || !canSend || sending) return;
    setSending(true);
    setText("");
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: id, sender_id: user.id, body, type: "text" });
    setSending(false);
    if (error) {
      toast.error(t("errorTitle"));
      setText(body);
      return;
    }
    qc.invalidateQueries({ queryKey: ["messages", id] });
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || !user || !canSend) return;
    const list = Array.from(files).slice(0, 4);
    setUploading(true);
    try {
      const paths: string[] = [];
      for (const f of list) {
        if (!f.type.startsWith("image/")) continue;
        const p = await uploadImage("listings", user.id, "chat", f);
        paths.push(p);
      }
      if (paths.length === 0) return;
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: id, sender_id: user.id, type: "image", image_paths: paths, body: null });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["messages", id] });
    } catch {
      toast.error(t("errorTitle"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const deleteForMe = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await (supabase.rpc as any)("delete_message_for_me", { _message_id: messageId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("messageDeleted"));
      qc.invalidateQueries({ queryKey: ["messages", id] });
    },
  });

  const toggleArchive = async () => {
    if (!conv || !user) return;
    setHeaderMenu(false);
    await (supabase.rpc as any)("set_conversation_archived", { _conv_id: id, _archived: !archived });
    qc.invalidateQueries({ queryKey: ["conv", id] });
    qc.invalidateQueries({ queryKey: ["conversations", user.id] });
    if (!archived) navigate({ to: "/chat" });
  };

  const doBlock = async () => {
    if (!user || !otherId) return;
    setConfirmBlock(false);
    setHeaderMenu(false);
    if (blockedByMe) {
      await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", otherId);
    } else {
      await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: otherId });
      toast.success(t("blocked"));
    }
    qc.invalidateQueries({ queryKey: ["block", user.id, otherId] });
  };

  const reportConv = async () => {
    if (!user || !otherId) return;
    setHeaderMenu(false);
    const reason = window.prompt(t("reportReason"));
    if (!reason?.trim()) return;
    await supabase.from("reports").insert({
      reporter_id: user.id,
      listing_id: conv?.listing_id ?? null,
      reason: reason.trim(),
      details: `User report: ${otherId}`,
    });
    toast.success(t("saved"));
  };

  const copy = async (m: Msg) => {
    if (m.body) {
      await navigator.clipboard.writeText(m.body);
      toast.success(t("copied"));
    }
    setMenuOpen(null);
  };

  const visible = useMemo(
    () => (messages ?? []).filter((m) => !(m.deleted_for ?? []).includes(user?.id ?? "")),
    [messages, user],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/chat" })}
          className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-secondary"
          aria-label={t("back")}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </button>
        <Link
          to="/seller/$id"
          params={{ id: otherId ?? "" }}
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-secondary">
            {other?.avatar_url ? (
              <StorageImage bucket="avatars" path={other.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-sm font-bold">
                {other?.display_name?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
            {isOnline(other?.last_seen) && (
              <span className="absolute bottom-0 end-0 size-2.5 rounded-full border-2 border-card bg-emerald-500" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{other?.display_name ?? "…"}</p>
            {otherTyping ? (
              <span className="text-[11px] font-semibold text-accent">{t("typing")}</span>
            ) : (
              <PresenceLabel lastSeen={other?.last_seen} />
            )}
          </div>
        </Link>
        <div className="relative">
          <button
            onClick={() => setHeaderMenu((v) => !v)}
            className="flex size-9 items-center justify-center rounded-full hover:bg-secondary"
            aria-label="menu"
          >
            <MoreVertical className="size-5" />
          </button>
          {headerMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setHeaderMenu(false)} />
              <div className="absolute end-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
                <button
                  onClick={toggleArchive}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary"
                >
                  {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                  {archived ? t("unarchive") : t("archive")}
                </button>
                <button
                  onClick={() => {
                    setHeaderMenu(false);
                    setConfirmBlock(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary"
                >
                  <Ban className="size-4" />
                  {blockedByMe ? t("unblock") : t("block")}
                </button>
                <button
                  onClick={reportConv}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-secondary"
                >
                  <Flag className="size-4" />
                  {t("report")}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Listing pinned preview */}
      {listing && (
        <Link
          to="/listing/$id"
          params={{ id: listing.id }}
          className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 shadow-sm transition-colors hover:bg-secondary"
        >
          <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
            <StorageImage bucket="listings" path={listing.image} alt="" className="size-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("aboutListing")}
            </p>
            <p className="truncate text-sm font-bold">{listing.title}</p>
            <p className="font-display text-sm font-black text-accent">
              {formatPrice(listing.price, listing.currency, lang)}
              {listing.status !== "active" && (
                <span className="ms-2 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                  {listing.status === "sold" ? t("sold") : t(listing.status as never)}
                </span>
              )}
            </p>
          </div>
        </Link>
      )}

      {/* Messages */}
      <main className="flex-1 space-y-1 overflow-y-auto p-3 pb-28">
        {visible.map((m, i) => {
          const mine = m.sender_id === user?.id;
          const prev = visible[i - 1];
          const showDay = !prev || !sameDay(prev.created_at, m.created_at);
          return (
            <div key={m.id}>
              {showDay && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString(
                      lang === "en" ? "en-US" : lang === "ps" ? "ps-AF" : "fa-AF",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </span>
                </div>
              )}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className="relative max-w-[78%]">
                  <button
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenuOpen(m.id);
                    }}
                    onClick={() => setMenuOpen((v) => (v === m.id ? null : m.id))}
                    className={cn(
                      "block w-full text-start",
                    )}
                  >
                    {m.type === "image" && m.image_paths && m.image_paths.length > 0 ? (
                      <div
                        className={cn(
                          "grid gap-1 overflow-hidden rounded-2xl",
                          m.image_paths.length === 1 ? "grid-cols-1" : "grid-cols-2",
                          mine ? "rounded-ee-sm" : "rounded-es-sm",
                        )}
                      >
                        {m.image_paths.map((p) => (
                          <div key={p} className="aspect-square overflow-hidden bg-muted">
                            <StorageImage bucket="listings" path={p} alt="" className="size-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
                          mine
                            ? "rounded-ee-sm bg-accent text-accent-foreground"
                            : "rounded-es-sm border border-border bg-card",
                        )}
                      >
                        {m.body}
                      </div>
                    )}
                  </button>
                  <div
                    className={cn(
                      "mt-0.5 flex items-center gap-1 px-1 text-[10px] text-muted-foreground",
                      mine ? "justify-end" : "justify-start",
                    )}
                  >
                    <span>
                      {new Date(m.created_at).toLocaleTimeString(
                        lang === "en" ? "en-US" : "fa-AF",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </span>
                    {mine && (
                      <span aria-label={m.read_at ? t("read") : t("sent")}>
                        {m.read_at ? (
                          <CheckCheck className="size-3 text-accent" />
                        ) : (
                          <Check className="size-3" />
                        )}
                      </span>
                    )}
                  </div>
                  {menuOpen === m.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                      <div
                        className={cn(
                          "absolute top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-popover shadow-xl",
                          mine ? "end-0" : "start-0",
                        )}
                      >
                        {m.body && (
                          <button
                            onClick={() => copy(m)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
                          >
                            <Copy className="size-4" /> {t("copy")}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setMenuOpen(null);
                            deleteForMe.mutate(m.id);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary"
                        >
                          <Trash2 className="size-4" /> {t("deleteForMe")}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-es-sm border border-border bg-card px-3 py-2">
              <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
              <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
              <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </main>

      {/* Composer */}
      {archived ? (
        <div className="fixed bottom-0 left-0 w-full border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground">
          {t("archived")} ·{" "}
          <button onClick={toggleArchive} className="font-bold text-accent">
            {t("unarchive")}
          </button>
        </div>
      ) : !canSend ? (
        <div className="fixed bottom-0 left-0 w-full border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground">
          {t("cannotSendBlocked")}
          {blockedByMe && (
            <>
              {" · "}
              <button onClick={doBlock} className="font-bold text-accent">
                {t("unblock")}
              </button>
            </>
          )}
        </div>
      ) : (
        <form
          onSubmit={send}
          className="fixed bottom-0 left-0 flex w-full items-end gap-2 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-muted"
            aria-label={t("attach")}
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <Paperclip className="size-5" />}
          </button>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              emitTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t("typeMessage")}
            rows={1}
            className="max-h-32 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform active:scale-95 disabled:opacity-50"
            aria-label={t("sendMessage")}
          >
            {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          </button>
        </form>
      )}

      {/* Block confirm */}
      {confirmBlock && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-black">
                {blockedByMe ? t("unblock") : t("block")}
              </h3>
              <button onClick={() => setConfirmBlock(false)} className="text-muted-foreground">
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {other?.display_name} · {t("confirmDelete")}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmBlock(false)}
                className="rounded-lg px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-secondary"
              >
                {t("cancel")}
              </button>
              <button
                onClick={doBlock}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground"
              >
                {blockedByMe ? t("unblock") : t("block")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
