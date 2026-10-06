import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  CornerUpLeft,
  Pencil,
  AlertCircle,
  WifiOff,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { uploadChatImage } from "@/lib/storage";
import { StorageImage } from "@/components/StorageImage";
import { ImageLightbox } from "@/components/ImageLightbox";
import { PresenceLabel, isOnline } from "@/components/Presence";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  component: ChatThread,
  head: () => ({
    meta: [
      { title: "Conversation — Alish" },
      { name: "description", content: "A private marketplace conversation on Alish." },
      { property: "og:title", content: "Conversation — Alish" },
      { property: "og:description", content: "A private marketplace conversation on Alish." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
}

interface Pending {
  tempId: string;
  body: string | null;
  files: File[];
  previews: string[];
  replyToId: string | null;
  status: "sending" | "failed";
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

const MAX_IMAGES = 4;
const MAX_BYTES = 10 * 1024 * 1024;

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const set = () => setOnline(navigator.onLine);
    set();
    window.addEventListener("online", set);
    window.addEventListener("offline", set);
    return () => {
      window.removeEventListener("online", set);
      window.removeEventListener("offline", set);
    };
  }, []);
  return online;
}

function ChatThread() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const online = useOnline();

  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editing, setEditing] = useState<Msg | null>(null);
  const [uploading, setUploading] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [headerMenu, setHeaderMenu] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [lightbox, setLightbox] = useState<{ paths: string[]; index: number } | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: conv,
    isLoading: convLoading,
    isError: convError,
    refetch: refetchConv,
  } = useQuery({
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
      const { data } = await supabase.rpc("am_i_blocked_by", { _other_id: otherId! });
      return !!data;
    },
  });

  const {
    data: messages,
    isLoading: msgsLoading,
    isError: msgsError,
    refetch: refetchMsgs,
  } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id,sender_id,body,type,image_paths,attachment_listing_id,deleted_for,read_at,created_at,reply_to_id,edited_at,deleted_at",
        )
        .eq("conversation_id", id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (error) throw error;
      return data as unknown as Msg[];
    },
  });

  // Realtime message inserts / updates for this conversation only.
  useEffect(() => {
    const channel = supabase
      .channel(`msgs-${id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", id] });
          qc.invalidateQueries({ queryKey: ["conv", id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  // Refresh after tab/mobile reconnect so nothing is missed while backgrounded.
  useEffect(() => {
    const resync = () => {
      if (document.visibilityState === "visible") {
        qc.invalidateQueries({ queryKey: ["messages", id] });
        qc.invalidateQueries({ queryKey: ["conv", id] });
      }
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("online", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("online", resync);
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

  // Mark read whenever unread messages from the other side are on screen.
  useEffect(() => {
    if (!user || !messages) return;
    const hasUnreadFromOther = messages.some((m) => m.sender_id !== user.id && !m.read_at);
    if (!hasUnreadFromOther) return;
    (supabase.rpc as unknown as (fn: string, args: unknown) => Promise<unknown>)("mark_conversation_read", {
      _conv_id: id,
    })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["unread-total", user.id] });
        qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      })
      .catch(() => {});
  }, [messages, id, user, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, otherTyping]);

  // Revoke object URLs of finished optimistic messages.
  useEffect(
    () => () => {
      pending.forEach((p) => p.previews.forEach((u) => URL.revokeObjectURL(u)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const emitTyping = () => {
    if (!user || !typingChannelRef.current) return;
    if (typingTimerRef.current) return; // throttle
    typingChannelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: user.id } });
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null;
    }, 1500);
  };

  const canSend = !archived && !blockedByMe && !blockedMe && online;

  const deliver = useCallback(
    async (p: Pending) => {
      if (!user) return;
      try {
        let paths: string[] = [];
        if (p.files.length > 0) {
          setUploading(true);
          for (const f of p.files) {
            const path = await uploadChatImage(id, user.id, f);
            paths.push(path);
          }
          setUploading(false);
        }
        const { error } = await supabase.from("messages").insert({
          conversation_id: id,
          sender_id: user.id,
          body: p.body,
          type: paths.length > 0 ? "image" : "text",
          image_paths: paths,
          reply_to_id: p.replyToId,
        });
        if (error) throw error;
        p.previews.forEach((u) => URL.revokeObjectURL(u));
        setPending((cur) => cur.filter((x) => x.tempId !== p.tempId));
        paths = [];
        qc.invalidateQueries({ queryKey: ["messages", id] });
        qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      } catch (err) {
        setUploading(false);
        setPending((cur) => cur.map((x) => (x.tempId === p.tempId ? { ...x, status: "failed" } : x)));
        const msg = err instanceof Error ? err.message : "";
        toast.error(msg === "blocked" ? t("cannotSendBlocked") : t("failedToSend"));

      }
    },
    [id, qc, t, user],
  );

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!user) return;

    if (editing) {
      if (!body) return;
      setText("");
      const target = editing;
      setEditing(null);
      const { error } = await (
        supabase.rpc as unknown as (fn: string, args: unknown) => Promise<{ error: unknown }>
      )("edit_message", { _message_id: target.id, _body: body });
      if (error) toast.error(t("errorTitle"));
      qc.invalidateQueries({ queryKey: ["messages", id] });
      return;
    }

    if (!body || !canSend) return;
    const p: Pending = {
      tempId: crypto.randomUUID(),
      body,
      files: [],
      previews: [],
      replyToId: replyTo?.id ?? null,
      status: "sending",
    };
    setText("");
    setReplyTo(null);
    setPending((cur) => [...cur, p]);
    void deliver(p);
  };

  const onFiles = (files: FileList | null) => {
    if (!files || !user || !canSend) return;
    const all = Array.from(files).slice(0, MAX_IMAGES);
    const list = all.filter((f) => f.type.startsWith("image/") && f.size <= MAX_BYTES);
    if (fileRef.current) fileRef.current.value = "";
    if (list.length === 0) {
      toast.error(all.length ? `${t("photo")} ≤ 10 MB` : t("errorTitle"));
      return;
    }
    const p: Pending = {
      tempId: crypto.randomUUID(),
      body: null,
      files: list,
      previews: list.map((f) => URL.createObjectURL(f)),
      replyToId: replyTo?.id ?? null,
      status: "sending",
    };
    setReplyTo(null);
    setPending((cur) => [...cur, p]);
    void deliver(p);
  };

  const retry = (p: Pending) => {
    setPending((cur) => cur.map((x) => (x.tempId === p.tempId ? { ...x, status: "sending" } : x)));
    void deliver({ ...p, status: "sending" });
  };

  const discard = (p: Pending) => {
    p.previews.forEach((u) => URL.revokeObjectURL(u));
    setPending((cur) => cur.filter((x) => x.tempId !== p.tempId));
  };

  const rpcMutation = (fn: string) =>
    useMutation({
      mutationFn: async (args: Record<string, unknown>) => {
        const { error } = await (
          supabase.rpc as unknown as (n: string, a: unknown) => Promise<{ error: unknown }>
        )(fn, args);
        if (error) throw error;
      },
      onSuccess: () => {
        toast.success(t("messageDeleted"));
        qc.invalidateQueries({ queryKey: ["messages", id] });
        if (user) qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      },
      onError: () => toast.error(t("errorTitle")),
    });

  const deleteForMe = rpcMutation("delete_message_for_me");
  const deleteForAll = rpcMutation("delete_message_for_everyone");

  const toggleArchive = async () => {
    if (!conv || !user) return;
    setHeaderMenu(false);
    await (supabase.rpc as unknown as (n: string, a: unknown) => Promise<unknown>)(
      "set_conversation_archived",
      { _conv_id: id, _archived: !archived },
    );
    qc.invalidateQueries({ queryKey: ["conv", id] });
    qc.invalidateQueries({ queryKey: ["conversations", user.id] });
    qc.invalidateQueries({ queryKey: ["unread-total", user.id] });
    if (!archived) navigate({ to: "/chat", replace: true });
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
  const byId = useMemo(() => new Map((messages ?? []).map((m) => [m.id, m])), [messages]);

  const dateLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yest = new Date();
    yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return t("today");
    if (d.toDateString() === yest.toDateString()) return t("yesterday");
    return d.toLocaleDateString(lang === "en" ? "en-US" : lang === "ps" ? "ps-AF" : "fa-AF", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  const timeLabel = (iso: string) =>
    new Date(iso).toLocaleTimeString(lang === "en" ? "en-US" : "fa-AF", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const quoted = (mid: string | null) => {
    if (!mid) return null;
    const q = byId.get(mid);
    if (!q) return null;
    return (
      <div className="mb-1 truncate rounded-lg border-s-2 border-accent/60 bg-black/5 px-2 py-1 text-[11px] opacity-80 dark:bg-white/10">
        {q.deleted_at ? t("messageRemoved") : (q.body ?? t("imageMessage"))}
      </div>
    );
  };

  if (convLoading || msgsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-16 animate-pulse border-b border-border bg-card" />
        <div className="mx-auto max-w-4xl space-y-4 p-4 pt-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn("h-12 w-2/3 animate-pulse rounded-2xl bg-secondary", i % 2 ? "ms-auto" : "")}
            />
          ))}
        </div>
      </div>
    );
  }

  if (convError || msgsError || !conv) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <AlertCircle className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {convError || msgsError ? t("errorTitle") : t("notFoundRecord")}
        </p>
        <div className="flex gap-2">
          {(convError || msgsError) && (
            <Button
              onClick={() => {
                refetchConv();
                refetchMsgs();
              }}
              className="h-11 px-5 font-bold"
            >
              {t("retry")}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/chat", replace: true })}
            className="h-11 px-5 font-bold"
          >
            {t("back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-4xl items-center gap-2 px-2 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/chat", replace: true })}
          className="size-11 shrink-0 rounded-full"
          aria-label={t("back")}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </Button>
        <Link to="/seller/$id" params={{ id: otherId ?? "" }} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg px-1 hover:bg-secondary/60">
          <div className="relative size-11 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setHeaderMenu((v) => !v)}
            className="size-11 rounded-full"
            aria-label={t("more")}
          >
            <MoreVertical className="size-5" />
          </Button>
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
        </div>
      </header>

      {!online && (
        <div className="flex items-center justify-center gap-2 bg-destructive/10 py-1.5 text-[11px] font-bold text-destructive">
          <WifiOff className="size-3.5" />
          {t("youAreOffline")}
        </div>
      )}

      {/* Listing pinned preview */}
      {listing && (
        <Link
          to="/listing/$id"
          params={{ id: listing.id }}
          className="mx-auto mt-3 flex w-[calc(100%-1.5rem)] max-w-4xl items-center gap-3 rounded-lg border border-border bg-card p-2.5 shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
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
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-1 overflow-y-auto px-3 pb-44 pt-3 sm:px-5">
        {visible.length === 0 && pending.length === 0 && (
          <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full border border-border bg-card shadow-sm">
              <Send className="size-6 text-muted-foreground rtl:-scale-x-100" />
            </div>
            <p className="max-w-xs text-sm font-semibold text-muted-foreground">{t("typeMessage")}</p>
          </div>
        )}
        {visible.map((m, i) => {
          const mine = m.sender_id === user?.id;
          const prev = visible[i - 1];
          const showDay = !prev || !sameDay(prev.created_at, m.created_at);
          const removed = !!m.deleted_at;
          return (
            <div key={m.id}>
              {showDay && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {dateLabel(m.created_at)}
                  </span>
                </div>
              )}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className="relative max-w-[78%]">
                  <button
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (!removed) setMenuOpen(m.id);
                    }}
                    onClick={() => !removed && setMenuOpen((v) => (v === m.id ? null : m.id))}
                    className="block min-h-11 w-full text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    {removed ? (
                      <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-3.5 py-2 text-sm italic text-muted-foreground">
                        <Trash2 className="size-3.5 shrink-0" />
                        <span>{t("messageRemoved")}</span>
                      </div>
                    ) : m.type === "image" && m.image_paths && m.image_paths.length > 0 ? (
                      <div
                        className={cn(
                          "grid gap-1 overflow-hidden rounded-2xl",
                          m.image_paths.length === 1 ? "grid-cols-1" : "grid-cols-2",
                          mine ? "rounded-ee-sm" : "rounded-es-sm",
                        )}
                      >
                        {m.image_paths.map((p, idx) => (
                          <div
                            key={p}
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightbox({ paths: m.image_paths!, index: idx });
                            }}
                            className="aspect-square cursor-zoom-in overflow-hidden bg-muted"
                          >
                            <StorageImage bucket="chat-images" path={p} alt="" className="size-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "min-h-11 whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm",
                          mine
                            ? "rounded-ee-sm bg-accent text-accent-foreground"
                            : "rounded-es-sm border border-border bg-card",
                        )}
                      >
                        {quoted(m.reply_to_id)}
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
                    {m.edited_at && !removed && <span>({t("edited")})</span>}
                    <span>{timeLabel(m.created_at)}</span>
                    {mine && !removed && (
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
                          "absolute top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-popover shadow-xl",
                          mine ? "end-0" : "start-0",
                        )}
                      >
                        {canSend && (
                          <button
                            onClick={() => {
                              setMenuOpen(null);
                              setReplyTo(m);
                              inputRef.current?.focus();
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
                          >
                            <CornerUpLeft className="size-4" /> {t("reply")}
                          </button>
                        )}
                        {m.body && (
                          <button
                            onClick={() => copy(m)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
                          >
                            <Copy className="size-4" /> {t("copy")}
                          </button>
                        )}
                        {mine && m.type === "text" && m.body && (
                          <button
                            onClick={() => {
                              setMenuOpen(null);
                              setEditing(m);
                              setText(m.body ?? "");
                              inputRef.current?.focus();
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
                          >
                            <Pencil className="size-4" /> {t("edit")}
                          </button>
                        )}
                        {mine && (
                          <button
                            onClick={() => {
                              setMenuOpen(null);
                              deleteForAll.mutate({ _message_id: m.id });
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary"
                          >
                            <Trash2 className="size-4" /> {t("deleteForEveryone")}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setMenuOpen(null);
                            deleteForMe.mutate({ _message_id: m.id });
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

        {/* Optimistic outgoing messages */}
        {pending.map((p) => (
          <div key={p.tempId} className="flex justify-end">
            <div className="max-w-[78%]">
              {p.previews.length > 0 ? (
                <div
                  className={cn(
                    "grid gap-1 overflow-hidden rounded-2xl rounded-ee-sm opacity-70",
                    p.previews.length === 1 ? "grid-cols-1" : "grid-cols-2",
                  )}
                >
                  {p.previews.map((u) => (
                    <img key={u} src={u} alt="" className="aspect-square size-full object-cover" />
                  ))}
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words rounded-2xl rounded-ee-sm bg-accent/70 px-3.5 py-2 text-sm text-accent-foreground">
                  {p.body}
                </div>
              )}
              <div className="mt-0.5 flex items-center justify-end gap-1.5 px-1 text-[10px]">
                {p.status === "sending" ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> {t("sending")}
                  </span>
                ) : (
                  <>
                    <button onClick={() => retry(p)} className="min-h-9 rounded-md px-2 font-bold text-destructive hover:bg-destructive/10">
                      {t("failedToSend")}
                    </button>
                    <button onClick={() => discard(p)} aria-label={t("cancel")} className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
                      <X className="size-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {otherTyping && (
          <div className="flex justify-start">
            <div className="flex min-h-11 items-center gap-1 rounded-2xl rounded-es-sm border border-border bg-card px-4 py-2 shadow-sm">
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
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground backdrop-blur">
          {t("archived")} ·{" "}
          <button onClick={toggleArchive} className="font-bold text-accent">
            {t("unarchive")}
          </button>
        </div>
      ) : blockedByMe || blockedMe ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground backdrop-blur">
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
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto w-full max-w-4xl">
          {(replyTo || editing) && (
            <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs">
              {editing ? <Pencil className="size-3.5 text-accent" /> : <CornerUpLeft className="size-3.5 text-accent" />}
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                <span className="font-bold text-foreground">{editing ? t("edit") : t("replyingTo")}: </span>
                {(editing ?? replyTo)?.body ?? t("imageMessage")}
              </span>
              <button
                onClick={() => {
                  setReplyTo(null);
                  if (editing) setText("");
                  setEditing(null);
                }}
                aria-label={t("cancel")}
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
          <form
            onSubmit={send}
            className="flex w-full items-end gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4"
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
              disabled={uploading || !canSend || !!editing}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"
              aria-label={t("attach")}
            >
              {uploading ? <Loader2 className="size-5 animate-spin" /> : <Paperclip className="size-5" />}
            </button>
            <textarea
              ref={inputRef}
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
              className="min-h-11 max-h-32 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm leading-6 outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
            />
            <button
              type="submit"
              disabled={!text.trim() || (!canSend && !editing)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-40"
              aria-label={t("sendMessage")}
            >
              <Send className="size-5 rtl:-scale-x-100" />
            </button>
          </form>
          </div>
        </div>
      )}

      {/* Block confirm */}
      {confirmBlock && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-black">{blockedByMe ? t("unblock") : t("block")}</h3>
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

      {lightbox && (
        <ImageLightbox
          bucket="chat-images"
          paths={lightbox.paths}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
