-- 1) Public-safe profile view (no phone, no ban/moderation details)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, display_name, avatar_url, bio, province,
       rating_avg, rating_count, is_banned, last_seen, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2) Lock down the profiles table: no more public whole-row reads
DROP POLICY IF EXISTS "Public profile fields are viewable" ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;

CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

-- 3) Revoke EXECUTE on all SECURITY DEFINER functions from anon/PUBLIC
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon', f.name, f.args);
  END LOOP;
END $$;

-- Policy helper functions must stay callable by the querying roles (used inside RLS policies)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_moderator(uuid) TO anon, authenticated;

-- 4) Revoke EXECUTE from authenticated on purely internal (trigger/audit) functions
DO $$
DECLARE f record;
    internal text[] := ARRAY[
      'check_message_not_blocked','guard_listing_insert','guard_listing_moderation_fields',
      'handle_new_user','log_admin_action','notify_admins_on_pending_listing',
      'notify_admins_on_report','notify_on_favorite','notify_on_listing_status',
      'notify_on_review','on_message_insert','recompute_favorites_count',
      'recompute_seller_rating','notify_expiring_listings'
    ];
BEGIN
  FOR f IN
    SELECT p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.proname = ANY(internal)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated', f.name, f.args);
  END LOOP;
END $$;