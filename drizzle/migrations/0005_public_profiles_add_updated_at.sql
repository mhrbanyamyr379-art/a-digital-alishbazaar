CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, display_name, avatar_url, bio, province,
       rating_avg, rating_count, is_banned, last_seen, created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;