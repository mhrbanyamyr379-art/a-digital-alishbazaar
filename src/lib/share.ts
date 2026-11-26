export const SHARE_SITE_URL = "https://a-digital-alishbazaar.lovable.app";

export type ShareResult = "shared" | "cancelled" | "unsupported" | "failed";

export function shareData(kind: "listing" | "seller", id: string, title: string, description?: string | null): ShareData {
  const summary = (description ?? "").replace(/\s+/g, " ").trim();
  return {
    title,
    text: summary.length > 180 ? `${summary.slice(0, 177)}…` : summary || title,
    url: `${SHARE_SITE_URL}/${kind}/${encodeURIComponent(id)}`,
  };
}

// Invoke synchronously from the click handler: never await work before share().
export function nativeShare(data: ShareData, nav: Partial<Pick<Navigator, "share" | "canShare">> = navigator): Promise<ShareResult> {
  if (typeof nav.share !== "function") return Promise.resolve("unsupported");
  try {
    if (typeof nav.canShare === "function" && !nav.canShare(data)) return Promise.resolve("unsupported");
    return nav.share(data).then(
      () => "shared" as const,
      (error: unknown) => error instanceof Error && error.name === "AbortError" ? "cancelled" as const : "failed" as const,
    );
  } catch (error) {
    return Promise.resolve(error instanceof Error && error.name === "AbortError" ? "cancelled" : "failed");
  }
}

export async function copyShareLink(url: string): Promise<void> {
  if (typeof navigator.clipboard?.writeText === "function") {
    try {
      await navigator.clipboard.writeText(url);
      return;
    } catch { /* Try the legacy clipboard only after an explicit copy click. */ }
  }
  const field = document.createElement("textarea");
  field.value = url;
  field.readOnly = true;
  field.hidden = false;
  field.setAttribute("aria-hidden", "true");
  const focused = document.activeElement;
  document.body.appendChild(field);
  try {
    field.select();
    if (!document.execCommand("copy")) throw new Error("Clipboard unavailable");
  } finally {
    field.remove();
    if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
  }
}