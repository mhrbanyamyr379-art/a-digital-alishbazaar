CREATE OR REPLACE FUNCTION public.guard_listing_moderation_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _internal boolean := COALESCE(current_setting('app.internal_counter', true), 'off') = 'on';
BEGIN
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
  IF NOT _internal AND (NEW.view_count IS DISTINCT FROM OLD.view_count
          OR NEW.favorites_count IS DISTINCT FROM OLD.favorites_count) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status::text IN ('suspended','rejected','pending') AND NEW.status::text <> 'draft' THEN
      RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
    END IF;
    IF OLD.status::text IN ('suspended','rejected') THEN
      RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
    END IF;
    IF NEW.status::text IN ('suspended','rejected') THEN
      RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
    END IF;
    IF NEW.status::text = 'active' AND OLD.status::text NOT IN ('draft','expired','sold') THEN
      RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.guard_listing_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_moderator(auth.uid()) THEN
    IF NEW.status::text NOT IN ('draft','active','pending') THEN
      RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
    END IF;
    NEW.is_featured := false;
    NEW.view_count := 0;
    NEW.favorites_count := 0;
    NEW.rejection_reason := NULL;
    NEW.moderated_by := NULL;
    NEW.moderated_at := NULL;
  END IF;
  RETURN NEW;
END; $function$;