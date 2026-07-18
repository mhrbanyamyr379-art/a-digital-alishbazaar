import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { StorageImage } from "@/components/StorageImage";

interface Props {
  bucket: "listings" | "avatars" | "chat-images";
  paths: string[];
  startIndex?: number;
  onClose: () => void;
}

export function ImageLightbox({ bucket, paths, startIndex = 0, onClose }: Props) {
  const [i, setI] = useState(startIndex);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((v) => Math.min(paths.length - 1, v + 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [paths.length, onClose]);

  if (!paths.length) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95" onClick={onClose}>
      <button
        onClick={onClose}
        aria-label="close"
        className="absolute end-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
      >
        <X className="size-6" />
      </button>
      {paths.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setI((v) => Math.max(0, v - 1));
            }}
            disabled={i === 0}
            className="absolute start-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronLeft className="size-6 rtl:rotate-180" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setI((v) => Math.min(paths.length - 1, v + 1));
            }}
            disabled={i === paths.length - 1}
            className="absolute end-16 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronRight className="size-6 rtl:rotate-180" />
          </button>
          <span className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            {i + 1} / {paths.length}
          </span>
        </>
      )}
      <div className="max-h-[90vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
        <StorageImage
          bucket={bucket}
          path={paths[i]}
          alt=""
          className="max-h-[90vh] max-w-[92vw] object-contain"
        />
      </div>
    </div>
  );
}
