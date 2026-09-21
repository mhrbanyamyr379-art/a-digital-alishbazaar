-- Hide seller contact numbers from unauthenticated visitors.
REVOKE SELECT (contact_phone, contact_whatsapp) ON public.listings FROM anon;

-- Re-assert column-level profile exposure (safe columns only).
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, display_name, avatar_url, bio, province,
  rating_avg, rating_count, is_banned, last_seen, created_at, updated_at
) ON public.profiles TO anon, authenticated;

-- Realtime: broadcast only safe profile columns.
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles (
  id, display_name, avatar_url, bio, province,
  rating_avg, rating_count, is_banned, last_seen, created_at, updated_at
);
