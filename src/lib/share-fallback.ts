type ShareFallback = { data: ShareData; completed: () => void };
let current: ShareFallback | null = null;
const listeners = new Set<() => void>();
export const shareFallbackStore = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => current,
  getServerSnapshot: () => null,
  open(data: ShareData, completed: () => void) {
    current = { data, completed };
    listeners.forEach((listener) => listener());
  },
  close() { current = null; listeners.forEach((listener) => listener()); },
};

export function directShareLinks(data: ShareData) {
  const text = [data.title, data.text === data.title ? "" : data.text].filter(Boolean).join("\n");
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent([text, data.url].filter(Boolean).join("\n"))}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(data.url ?? "")}&text=${encodeURIComponent(text)}`,
  };
}