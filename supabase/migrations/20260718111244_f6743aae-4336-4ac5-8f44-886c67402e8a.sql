
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, display_name, avatar_url, bio, province, rating_avg, rating_count, is_banned, last_seen, created_at, updated_at) ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_conversation_archived(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.heartbeat() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_message_for_me(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.set_conversation_archived(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_message_for_me(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.check_message_not_blocked() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_seller_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_favorites_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_message_insert() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
