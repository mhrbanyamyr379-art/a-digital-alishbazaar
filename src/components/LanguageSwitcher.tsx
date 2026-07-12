import { Globe } from "lucide-react";
import { LANGS, useI18n } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher({ variant = "onDark" }: { variant?: "onDark" | "onLight" }) {
  const { lang, setLang } = useI18n();
  const current = LANGS.find((l) => l.id === lang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          variant === "onDark"
            ? "flex items-center gap-1.5 rounded-md border border-white/20 px-2 py-1 text-xs font-medium text-white"
            : "flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium"
        }
      >
        <Globe className="size-3.5" />
        {current?.native}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32">
        {LANGS.map((l) => (
          <DropdownMenuItem key={l.id} onClick={() => setLang(l.id)} className="flex justify-between gap-3">
            <span>{l.native}</span>
            <span className="text-xs text-muted-foreground">{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
