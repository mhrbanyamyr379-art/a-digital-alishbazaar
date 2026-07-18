import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { StorageImage } from "@/components/StorageImage";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  currentPath?: string | null;
  file: File | null;
  onFile: (file: File | null) => void;
  uploading?: boolean;
  fallbackLetter?: string;
}

// Modern avatar uploader with preview, replacing the default browser file input.
export function AvatarPicker({ currentPath, file, onFile, uploading, fallbackLetter }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const hasCurrent = !!currentPath;
  const showPreview = !!preview;

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label={t("editProfile")}
        className={cn(
          "group relative size-24 shrink-0 overflow-hidden rounded-full bg-secondary ring-2 ring-border transition-all",
          "hover:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          uploading && "opacity-70",
        )}
      >
        {showPreview ? (
          <img src={preview!} alt="" className="size-full object-cover" />
        ) : hasCurrent ? (
          <StorageImage bucket="avatars" path={currentPath} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-3xl font-black text-muted-foreground">
            {fallbackLetter?.toUpperCase() ?? "U"}
          </span>
        )}
        <span className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent pb-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="size-5 text-white drop-shadow" />
        </span>
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="size-6 animate-spin text-white" />
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-foreground disabled:opacity-60"
        >
          {showPreview || hasCurrent ? t("edit") : t("photos")}
        </button>
        {(showPreview || file) && (
          <button
            type="button"
            onClick={() => {
              onFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            {t("cancel")}
          </button>
        )}
        <p className="text-[11px] text-muted-foreground">JPG / PNG · &lt; 5 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (f && f.size > 5 * 1024 * 1024) {
            alert("Image too large (max 5 MB)");
            return;
          }
          onFile(f);
        }}
      />
    </div>
  );
}
