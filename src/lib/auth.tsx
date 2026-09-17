import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  display_name: string;
  /** Not selectable by the Data API — read via the `get_my_phone` RPC. */
  phone?: string | null;
  avatar_url: string | null;
  bio: string | null;
  province: string | null;
  rating_avg: number;
  rating_count: number;
  /** Moderation state is staff-only; not selectable by the Data API. */
  is_banned?: boolean;
  created_at: string;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadExtras = async (uid: string) => {
    const cols =
      "id,display_name,avatar_url,bio,province,rating_avg,rating_count,is_banned,created_at,last_seen";
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select(cols).eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);

    // Accounts created before the profile bootstrap existed have no profile row;
    // create it once so seller pages, chat and reviews always show a name.
    if (!prof) {
      await supabase.rpc("ensure_profile" as never);
      const { data: created } = await supabase
        .from("profiles")
        .select(cols)
        .eq("id", uid)
        .maybeSingle();
      setProfile((created as Profile) ?? null);
    } else {
      setProfile(prof as Profile);
    }
    setIsAdmin((roles ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "moderator"));
  };

  const refreshProfile = async () => {
    if (user) await loadExtras(user.id);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadExtras(sess.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadExtras(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Presence heartbeat while signed in
  useEffect(() => {
    if (!user) return;
    const beat = () => {
      supabase.rpc("heartbeat" as never).then(() => {});
    };
    beat();
    const iv = setInterval(beat, 45_000);
    const onVis = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <Ctx.Provider value={{ user, session, profile, isAdmin, loading, refreshProfile, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
