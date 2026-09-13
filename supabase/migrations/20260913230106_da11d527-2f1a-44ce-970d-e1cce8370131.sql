DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- Guest-callable helpers (public listing page)
GRANT EXECUTE ON FUNCTION public.get_seller_phone(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO anon, authenticated;

-- Used inside RLS policies, must stay callable by both roles
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_moderator(uuid) TO anon, authenticated;

-- Signed-in application APIs (self-authorizing)
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_listings(text, text, text, text, timestamptz, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_reports(text, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_listing_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_banned(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_report(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_message_for_everyone(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_message_for_me(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_phone() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_conversation_archived(uuid, boolean) TO authenticated;