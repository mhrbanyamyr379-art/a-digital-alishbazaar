REVOKE ALL ON FUNCTION public.guard_listing_moderation_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_listing_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_listing_moderation_fields() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_listing_insert() TO service_role;