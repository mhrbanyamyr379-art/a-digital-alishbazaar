import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Clock, TrendingUp, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { usePopularSearches } from "@/hooks/useDiscovery";
import { categoryById } from "@/data/categories";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
}

export function SearchBar({ value, onChange, onSubmit }: Props) {
  const { t, locName } = useI18n();
  const { recent, add, remove, clear } = useRecentSearches();
  const { data: popular } = usePopularSearches();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const trimmed = value.trim();

  const { data: suggestions } = useQuery({
    queryKey: ["search-suggestions", trimmed],
    enabled: trimmed.length >= 2 && focused,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select("title")
        .eq("status", "active")
        .ilike("title", `%${trimmed}%`)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("view_count", { ascending: false })
        .limit(6);
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((r) => r.title))).slice(0, 6);
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const submit = (v: string) => {
    const term = v.trim();
    if (term) add(term);
    onSubmit(term);
    setOpen(false);
    (document.activeElement as HTMLElement | null)?.blur?.();
  };

  const showRecent = recent.length > 0;
  const showPopular = !trimmed && (popular?.terms.length ?? 0) > 0;
  const showSuggestions = trimmed.length >= 2 && (suggestions?.length ?? 0) > 0;
  const panelVisible = open && (showRecent || showPopular || showSuggestions);

  return (
    <div className="relative" ref={wrapRef}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="relative flex items-center"
      >
        <Search className="absolute start-3 size-5 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          placeholder={t("search")}
          className="w-full rounded-lg bg-card py-3 pe-10 ps-10 text-sm font-medium text-foreground ring-2 ring-transparent transition-all focus:outline-none focus:ring-accent/50"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              onSubmit("");
            }}
            className="absolute end-3 text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      {panelVisible && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-card text-card-foreground shadow-xl">
          {showSuggestions && (
            <Section icon={<Search className="size-3.5" />} label={t("search")}>
              {suggestions!.map((s) => (
                <SuggestRow key={"s-" + s} onSelect={() => submit(s)} label={s} highlight={trimmed} />
              ))}
            </Section>
          )}

          {showRecent && (
            <Section
              icon={<History className="size-3.5" />}
              label={t("recentSearches")}
              action={
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    clear();
                  }}
                  className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  {t("clear")}
                </button>
              }
            >
              {recent.map((s) => (
                <div key={"r-" + s} className="group flex items-center">
                  <SuggestRow onSelect={() => submit(s)} label={s} icon={<Clock className="size-3.5 text-muted-foreground" />} />
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      remove(s);
                    }}
                    className="pe-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="remove"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </Section>
          )}

          {showPopular && (
            <Section icon={<TrendingUp className="size-3.5" />} label={t("popularSearches")}>
              <div className="flex flex-wrap gap-2 px-3 pb-3">
                {popular!.terms.map((s) => (
                  <button
                    key={"p-" + s}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      submit(s);
                    }}
                    className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium hover:border-accent"
                  >
                    {s}
                  </button>
                ))}
                {popular!.categories.map((cid) => {
                  const c = categoryById(cid);
                  if (!c) return null;
                  return (
                    <button
                      key={"pc-" + cid}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        submit(locName(c));
                      }}
                      className="rounded-full border border-border bg-accent/10 px-3 py-1 text-xs font-bold text-accent-foreground hover:bg-accent/20"
                    >
                      <c.icon className="me-1 inline size-3" />
                      {locName(c)}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  label,
  action,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

function SuggestRow({
  onSelect,
  label,
  icon,
  highlight,
}: {
  onSelect: () => void;
  label: string;
  icon?: React.ReactNode;
  highlight?: string;
}) {
  const parts = highlight
    ? label.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"))
    : [label];
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm font-medium hover:bg-muted/60",
      )}
    >
      {icon ?? <Search className="size-3.5 text-muted-foreground" />}
      <span className="line-clamp-1">
        {parts.map((p, i) =>
          highlight && p.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-transparent font-bold text-accent">
              {p}
            </mark>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </span>
    </button>
  );
}
