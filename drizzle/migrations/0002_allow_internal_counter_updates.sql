-- Allow trusted internal counter updates (view_count / favorites_count) to pass the
-- moderation guard, while still blocking direct user edits of those columns.

CREATE OR REPLACE FUNCTION public.guard_listing_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _internal boolean := COALESCE(current_setting('app.internal_counter', true), 'off') = 'on';
BEGIN
  -- Service role / internal jobs and staff are unrestricted.
  IF auth.uid() IS NULL OR public.is_moderator(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
     OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT _internal
     AND (NEW.view_count IS DISTINCT FROM OLD.view_count
          OR NEW.favorites_count IS DISTINCT FROM OLD.favorites_count) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF OLD.status IN ('suspended', 'rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.increment_listing_views(_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.internal_counter', 'on', true);
  UPDATE public.listings SET view_count = view_count + 1 WHERE id = _listing_id;
  PERFORM set_config('app.internal_counter', 'off', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.recompute_favorites_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _listing uuid;
BEGIN
  _listing := COALESCE(NEW.listing_id, OLD.listing_id);
  PERFORM set_config('app.internal_counter', 'on', true);
  UPDATE public.listings l
    SET favorites_count = (SELECT COUNT(*) FROM public.favorites WHERE listing_id = _listing)
  WHERE l.id = _listing;
  PERFORM set_config('app.internal_counter', 'off', true);
  RETURN NULL;
END; $function$;

REVOKE ALL ON FUNCTION public.increment_listing_views(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO authenticated, service_role;
