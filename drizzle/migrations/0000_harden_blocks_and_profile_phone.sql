-- 1. blocks: scope policies to authenticated and to the blocker only
DROP POLICY IF EXISTS "Users manage own blocks" ON public.blocks;

CREATE POLICY "Users view own blocks"
ON public.blocks FOR SELECT TO authenticated
USING (auth.uid() = blocker_id);

CREATE POLICY "Users create own blocks"
ON public.blocks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users update own blocks"
ON public.blocks FOR UPDATE TO authenticated
USING (auth.uid() = blocker_id)
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users delete own blocks"
ON public.blocks FOR DELETE TO authenticated
USING (auth.uid() = blocker_id);

REVOKE ALL ON public.blocks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;

-- 2. profiles: public read is limited to non-sensitive columns only
DROP POLICY IF EXISTS "Profiles are public" ON public.profiles;

CREATE POLICY "Public profile fields are viewable"
ON public.profiles FOR SELECT TO anon, authenticated
USING (true);

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, bio, province, rating_avg, rating_count,
              last_seen, created_at, updated_at)
  ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;