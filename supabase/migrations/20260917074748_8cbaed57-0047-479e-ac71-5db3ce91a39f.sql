REVOKE SELECT (is_banned) ON public.profiles FROM anon, authenticated;
REVOKE SELECT (banned_reason, banned_at) ON public.profiles FROM anon, authenticated;

DROP POLICY IF EXISTS "Profiles are public" ON public.profiles;
CREATE POLICY "Profiles are public"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);