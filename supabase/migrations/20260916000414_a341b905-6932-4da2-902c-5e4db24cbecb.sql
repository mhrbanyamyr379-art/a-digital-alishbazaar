-- Restore access to public profile fields. A previous hardening step revoked table
-- access without leaving the column-level grants in place, so nobody (not even the
-- owner or the app server) could read profiles.

GRANT SELECT (id, display_name, avatar_url, bio, province, rating_avg, rating_count,
              is_banned, created_at, updated_at, last_seen)
  ON public.profiles TO anon, authenticated;

-- Owners edit their own row; RLS still restricts which row.
GRANT INSERT (id, display_name, phone, avatar_url, bio, province) ON public.profiles TO authenticated;
GRANT UPDATE (display_name, phone, avatar_url, bio, province) ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;