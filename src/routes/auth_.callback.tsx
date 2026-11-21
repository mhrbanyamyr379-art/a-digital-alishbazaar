import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

const NEXT_KEY = "alish:auth-next";

export const Route = createFileRoute("/auth_/callback")({
  ssr: false,
  component: AuthCallback,
  head: () => ({
    meta: [
      { title: "Signing in — Alish الیش" },
      { name: "description", content: "Completing your Google sign-in to Alish." },
      { property: "og:title", content: "Signing in — Alish الیش" },
      { property: "og:description", content: "Completing your Google sign-in to Alish." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function safeNext(): string {
  try {
    const n = sessionStorage.getItem(NEXT_KEY) ?? localStorage.getItem(NEXT_KEY);
    sessionStorage.removeItem(NEXT_KEY);
    localStorage.removeItem(NEXT_KEY);
    if (n && /^\/(?![\/\\])[^\\\s]*$/.test(n)) return n;
  } catch { /* storage blocked */ }
  return "/";
}

function AuthCallback() {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let done = false;
    // Full reload so every part of the app starts with the saved session.
    const go = () => {
      if (done) return;
      done = true;
      window.location.replace(safeNext());
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) go();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });
    const timer = setTimeout(() => {
      if (!done) setFailed(true);
    }, 10000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-primary px-6 text-center text-primary-foreground">
      {failed ? (
        <>
          <p className="text-sm">{t("errGoogle")}</p>
          <a href="/auth" className="rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground">
            {t("back")}
          </a>
        </>
      ) : (
        <Loader2 className="size-8 animate-spin" aria-label="loading" />
      )}
    </main>
  );
}
