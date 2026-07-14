
-- Restrict phone column exposure to anonymous visitors
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, display_name, avatar_url, bio, province, rating_avg, rating_count, is_banned, created_at, updated_at) ON public.profiles TO anon;

-- Lock down SECURITY DEFINER functions: revoke default PUBLIC EXECUTE, grant only where needed
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_seller_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_favorites_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid) FROM PUBLIC;

-- has_role is used inside RLS policies for authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
-- increment_listing_views is invoked by the client when viewing a listing
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO anon, authenticated;
