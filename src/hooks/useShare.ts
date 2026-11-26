import { useRef } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { copyShareLink, nativeShare } from "@/lib/share";

export function useShare() {
  const { t } = useI18n();
  const busy = useRef(false);

  return async (data: ShareData, onSuccess?: () => void | Promise<unknown>) => {
    if (busy.current) return;
    busy.current = true;
    const completed = () => { void Promise.resolve().then(onSuccess).catch(() => {}); };
    try {
      const result = await nativeShare(data);
      if (result === "shared") completed();
      if (result === "failed") toast.error(t("shareFailed"));
      if (result === "unsupported") {
        toast.message(t("shareUnavailable"), {
          action: {
            label: t("copyLink"),
            onClick: async () => {
              if (!data.url) return;
              try {
                await copyShareLink(data.url);
                toast.success(t("linkCopied"));
                completed();
              } catch { toast.error(t("copyFailed")); }
            },
          },
        });
      }
    } finally { busy.current = false; }
  };
}