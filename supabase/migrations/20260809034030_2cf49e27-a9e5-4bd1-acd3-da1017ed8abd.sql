REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO authenticated;