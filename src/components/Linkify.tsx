import { Fragment } from "react";

// Detects http(s) links, www. links and bare domains like alish.af/page.
const LINK_RE =
  /((?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|af|io|app|me|info|co|dev|ir|pk|tv|ly|gl|be|link)(?:\/[^\s<>"']*)?)/gi;
const TRAIL = /[.,!?؛،:;)\]}'"»]+$/;

export function toHref(raw: string): string | null {
  const h = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(h);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

export function Linkify({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    const start = m.index ?? 0;
    let raw = m[0];
    const trail = raw.match(TRAIL)?.[0] ?? "";
    if (trail) raw = raw.slice(0, -trail.length);
    const href = raw ? toHref(raw) : null;
    if (!href) continue;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <a
        key={start}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        dir="ltr"
        onClick={(e) => e.stopPropagation()}
        className="break-all font-semibold underline underline-offset-2"
      >
        {raw}
      </a>,
    );
    last = start + raw.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <Fragment>{out}</Fragment>;
}
