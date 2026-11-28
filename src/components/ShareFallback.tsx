import { useState, useSyncExternalStore } from "react";
import { Copy, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { copyShareLink } from "@/lib/share";
import { directShareLinks, shareFallbackStore } from "@/lib/share-fallback";

export function ShareFallback() {
  const state = useSyncExternalStore(shareFallbackStore.subscribe, shareFallbackStore.getSnapshot, shareFallbackStore.getServerSnapshot);
  const { t, dir } = useI18n();
  const [copying, setCopying] = useState(false);
  if (!state) return null;
  const links = directShareLinks(state.data);
  const copy = async () => {
    if (!state.data.url || copying) return;
    setCopying(true);
    try {
      await copyShareLink(state.data.url);
      toast.success(t("linkCopied"));
      state.completed();
      shareFallbackStore.close();
    } catch {
      // Leave the selectable URL and sharing choices available; never replace them with an error.
    } finally { setCopying(false); }
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) shareFallbackStore.close(); }}>
      <DialogContent dir={dir} className="w-[calc(100%-2rem)] max-w-sm rounded-lg">
        <DialogTitle>{t("share")}</DialogTitle>
        <DialogDescription className="break-words">{state.data.title}</DialogDescription>
        <div className="grid gap-3">
          <Button asChild variant="outline" className="min-h-12"><a href={links.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle />{t("whatsapp")}</a></Button>
          <Button asChild variant="outline" className="min-h-12"><a href={links.telegram} target="_blank" rel="noopener noreferrer"><Send />{t("telegram")}</a></Button>
          <Button variant="outline" className="min-h-12" disabled={copying} onClick={copy}><Copy />{t("copyLink")}</Button>
          <Input readOnly dir="ltr" aria-label={t("copyLink")} value={state.data.url ?? ""} onFocus={(event) => event.currentTarget.select()} />
        </div>
      </DialogContent>
    </Dialog>
  );
}