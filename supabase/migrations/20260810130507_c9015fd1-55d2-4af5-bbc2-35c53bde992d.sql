-- 1. Schema additions -------------------------------------------------
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS moderated_by uuid,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reported_user_id uuid,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_reports_status_created ON public.reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_status_created ON public.listings (status, created_at DESC);

-- 2. Audit log ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_log (created_at DESC);

-- 3. Helpers -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_moderator(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'admin') OR public.has_role(_uid, 'moderator');
$$;

CREATE OR REPLACE FUNCTION public.require_moderator()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL OR NOT public.is_moderator(_uid) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN _uid;
END; $$;

CREATE OR REPLACE FUNCTION public.log_admin_action(_admin uuid, _action text, _target_type text, _target_id uuid, _reason text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, reason)
  VALUES (_admin, _action, _target_type, _target_id, NULLIF(btrim(coalesce(_reason,'')), ''));
$$;

-- 4. Stats -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  PERFORM public.require_moderator();
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'active_users', (SELECT count(*) FROM public.profiles WHERE last_seen > now() - interval '7 days'),
    'new_users', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'banned_users', (SELECT count(*) FROM public.profiles WHERE is_banned),
    'total_listings', (SELECT count(*) FROM public.listings),
    'active_listings', (SELECT count(*) FROM public.listings WHERE status = 'active'),
    'pending_listings', (SELECT count(*) FROM public.listings WHERE status = 'pending'),
    'sold_listings', (SELECT count(*) FROM public.listings WHERE status = 'sold'),
    'rejected_listings', (SELECT count(*) FROM public.listings WHERE status = 'rejected'),
    'suspended_listings', (SELECT count(*) FROM public.listings WHERE status = 'suspended'),
    'new_listings', (SELECT count(*) FROM public.listings WHERE created_at > now() - interval '7 days'),
    'reported_listings', (SELECT count(DISTINCT listing_id) FROM public.reports WHERE listing_id IS NOT NULL),
    'open_reports', (SELECT count(*) FROM public.reports WHERE status = 'open'),
    'reviewing_reports', (SELECT count(*) FROM public.reports WHERE status = 'reviewing'),
    'moderation_queue', (SELECT count(*) FROM public.listings WHERE status = 'pending')
                        + (SELECT count(*) FROM public.reports WHERE status = 'open')
  ) INTO _r;
  RETURN _r;
END; $$;

-- 5. Listing moderation ------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_listings(
  _search text DEFAULT NULL, _status text DEFAULT NULL, _category text DEFAULT NULL,
  _province text DEFAULT NULL, _since timestamptz DEFAULT NULL,
  _sort text DEFAULT 'newest', _limit int DEFAULT 20, _offset int DEFAULT 0)
RETURNS TABLE (
  id uuid, title text, price numeric, currency text, status listing_status,
  category text, province text, city text, created_at timestamptz,
  view_count int, favorites_count int, rejection_reason text,
  seller_id uuid, seller_name text, seller_banned boolean,
  report_count bigint, image_url text, total_count bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_moderator();
  _limit := least(greatest(coalesce(_limit, 20), 1), 100);
  _offset := greatest(coalesce(_offset, 0), 0);
  RETURN QUERY
  WITH filtered AS (
    SELECT l.* FROM public.listings l
    WHERE (_status IS NULL OR l.status::text = _status)
      AND (_category IS NULL OR l.category = _category)
      AND (_province IS NULL OR l.province = _province)
      AND (_since IS NULL OR l.created_at >= _since)
      AND (_search IS NULL OR btrim(_search) = '' OR l.title ILIKE '%' || btrim(_search) || '%'
           OR l.description ILIKE '%' || btrim(_search) || '%')
  ), counted AS (SELECT count(*) AS n FROM filtered)
  SELECT f.id, f.title, f.price, f.currency, f.status, f.category, f.province, f.city,
         f.created_at, f.view_count, f.favorites_count, f.rejection_reason,
         f.seller_id, p.display_name, p.is_banned,
         (SELECT count(*) FROM public.reports r WHERE r.listing_id = f.id),
         (SELECT li.url FROM public.listing_images li WHERE li.listing_id = f.id ORDER BY li.position LIMIT 1),
         (SELECT n FROM counted)
  FROM filtered f
  LEFT JOIN public.profiles p ON p.id = f.seller_id
  ORDER BY
    CASE WHEN _sort = 'oldest' THEN f.created_at END ASC,
    CASE WHEN _sort = 'newest' THEN f.created_at END DESC,
    CASE WHEN _sort = 'reported' THEN (SELECT count(*) FROM public.reports r WHERE r.listing_id = f.id) END DESC,
    f.created_at DESC
  LIMIT _limit OFFSET _offset;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_listing_status(_listing_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _admin uuid; _old public.listings%ROWTYPE;
BEGIN
  _admin := public.require_moderator();
  IF _status NOT IN ('active','pending','rejected','suspended','sold','expired') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;
  IF _status IN ('rejected','suspended') AND coalesce(btrim(_reason),'') = '' THEN
    RAISE EXCEPTION 'reason required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO _old FROM public.listings WHERE id = _listing_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'P0002'; END IF;
  IF _old.status::text = _status THEN RETURN; END IF;

  UPDATE public.listings
     SET status = _status::listing_status,
         rejection_reason = CASE WHEN _status IN ('rejected','suspended') THEN btrim(_reason) ELSE NULL END,
         moderated_by = _admin, moderated_at = now()
   WHERE id = _listing_id;

  PERFORM public.log_admin_action(_admin, 'listing_' || _status, 'listing', _listing_id, _reason);
END; $$;

-- 6. Reports -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_reports(
  _search text DEFAULT NULL, _status text DEFAULT NULL, _type text DEFAULT NULL,
  _limit int DEFAULT 20, _offset int DEFAULT 0)
RETURNS TABLE (
  id uuid, reason text, details text, status text, created_at timestamptz,
  admin_notes text, listing_id uuid, listing_title text, listing_status listing_status,
  reported_user_id uuid, reported_user_name text,
  reporter_id uuid, reporter_name text, total_count bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_moderator();
  _limit := least(greatest(coalesce(_limit, 20), 1), 100);
  _offset := greatest(coalesce(_offset, 0), 0);
  RETURN QUERY
  WITH filtered AS (
    SELECT r.* FROM public.reports r
    WHERE (_status IS NULL OR r.status = _status)
      AND (_type IS NULL
           OR (_type = 'listing' AND r.listing_id IS NOT NULL)
           OR (_type = 'user' AND r.listing_id IS NULL))
      AND (_search IS NULL OR btrim(_search) = ''
           OR r.reason ILIKE '%' || btrim(_search) || '%'
           OR coalesce(r.details,'') ILIKE '%' || btrim(_search) || '%')
  ), counted AS (SELECT count(*) AS n FROM filtered)
  SELECT f.id, f.reason, f.details, f.status, f.created_at, f.admin_notes,
         f.listing_id, l.title, l.status,
         f.reported_user_id, ru.display_name,
         f.reporter_id, rp.display_name,
         (SELECT n FROM counted)
  FROM filtered f
  LEFT JOIN public.listings l ON l.id = f.listing_id
  LEFT JOIN public.profiles ru ON ru.id = f.reported_user_id
  LEFT JOIN public.profiles rp ON rp.id = f.reporter_id
  ORDER BY f.created_at DESC
  LIMIT _limit OFFSET _offset;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_update_report(_report_id uuid, _status text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _admin uuid; _cur text;
BEGIN
  _admin := public.require_moderator();
  IF _status NOT IN ('open','reviewing','resolved','dismissed') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;
  SELECT status INTO _cur FROM public.reports WHERE id = _report_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'report not found' USING ERRCODE = 'P0002'; END IF;
  IF _cur = _status AND coalesce(btrim(_note),'') = '' THEN RETURN; END IF;

  UPDATE public.reports
     SET status = _status,
         admin_notes = COALESCE(NULLIF(btrim(coalesce(_note,'')), ''), admin_notes),
         reviewed_by = _admin, reviewed_at = now(), updated_at = now()
   WHERE id = _report_id;

  IF _cur IS DISTINCT FROM _status THEN
    PERFORM public.log_admin_action(_admin, 'report_' || _status, 'report', _report_id, _note);
  END IF;
END; $$;

-- 7. Users -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_users(
  _search text DEFAULT NULL, _status text DEFAULT NULL,
  _limit int DEFAULT 20, _offset int DEFAULT 0)
RETURNS TABLE (
  id uuid, display_name text, avatar_url text, province text, created_at timestamptz,
  last_seen timestamptz, is_banned boolean, banned_reason text,
  rating_avg numeric, rating_count int,
  listing_count bigint, active_count bigint, sold_count bigint,
  report_count bigint, is_admin boolean, total_count bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_moderator();
  _limit := least(greatest(coalesce(_limit, 20), 1), 100);
  _offset := greatest(coalesce(_offset, 0), 0);
  RETURN QUERY
  WITH filtered AS (
    SELECT p.* FROM public.profiles p
    WHERE (_status IS NULL
           OR (_status = 'banned' AND p.is_banned)
           OR (_status = 'active' AND NOT p.is_banned))
      AND (_search IS NULL OR btrim(_search) = ''
           OR p.display_name ILIKE '%' || btrim(_search) || '%'
           OR p.id::text = btrim(_search))
  ), counted AS (SELECT count(*) AS n FROM filtered)
  SELECT f.id, f.display_name, f.avatar_url, f.province, f.created_at, f.last_seen,
         f.is_banned, f.banned_reason, f.rating_avg, f.rating_count,
         (SELECT count(*) FROM public.listings l WHERE l.seller_id = f.id),
         (SELECT count(*) FROM public.listings l WHERE l.seller_id = f.id AND l.status = 'active'),
         (SELECT count(*) FROM public.listings l WHERE l.seller_id = f.id AND l.status = 'sold'),
         (SELECT count(*) FROM public.reports r WHERE r.reported_user_id = f.id
            OR r.listing_id IN (SELECT l.id FROM public.listings l WHERE l.seller_id = f.id)),
         EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = f.id AND ur.role IN ('admin','moderator')),
         (SELECT n FROM counted)
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT _limit OFFSET _offset;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_user_banned(_user_id uuid, _banned boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _admin uuid;
BEGIN
  _admin := public.require_moderator();
  IF NOT public.has_role(_admin, 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF _user_id = _admin THEN RAISE EXCEPTION 'cannot modify own account' USING ERRCODE = '22023'; END IF;
  IF public.is_moderator(_user_id) THEN
    RAISE EXCEPTION 'cannot suspend staff account' USING ERRCODE = '22023';
  END IF;
  IF _banned AND coalesce(btrim(_reason),'') = '' THEN
    RAISE EXCEPTION 'reason required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.profiles
     SET is_banned = _banned,
         banned_reason = CASE WHEN _banned THEN btrim(_reason) ELSE NULL END,
         banned_at = CASE WHEN _banned THEN now() ELSE NULL END
   WHERE id = _user_id;

  IF _banned THEN
    UPDATE public.listings SET status = 'suspended', moderated_by = _admin, moderated_at = now()
     WHERE seller_id = _user_id AND status = 'active';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (_user_id, CASE WHEN _banned THEN 'account_suspended' ELSE 'account_restored' END,
          CASE WHEN _banned THEN 'Account suspended' ELSE 'Account restored' END,
          CASE WHEN _banned THEN btrim(_reason) ELSE NULL END, '/profile');

  PERFORM public.log_admin_action(_admin, CASE WHEN _banned THEN 'user_suspended' ELSE 'user_restored' END,
                                  'user', _user_id, _reason);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_audit(_limit int DEFAULT 30, _offset int DEFAULT 0)
RETURNS TABLE (id uuid, action text, target_type text, target_id uuid, reason text,
               created_at timestamptz, admin_name text, total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_moderator();
  _limit := least(greatest(coalesce(_limit, 30), 1), 100);
  _offset := greatest(coalesce(_offset, 0), 0);
  RETURN QUERY
  SELECT a.id, a.action, a.target_type, a.target_id, a.reason, a.created_at,
         p.display_name, (SELECT count(*) FROM public.admin_audit_log)
  FROM public.admin_audit_log a
  LEFT JOIN public.profiles p ON p.id = a.admin_id
  ORDER BY a.created_at DESC
  LIMIT _limit OFFSET _offset;
END; $$;

-- 8. Seller notification detail on rejection ---------------------------
CREATE OR REPLACE FUNCTION public.notify_on_listing_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, listing_id)
    VALUES (
      NEW.seller_id,
      'listing_' || NEW.status::text,
      LEFT(NEW.title, 120),
      CASE WHEN NEW.status IN ('rejected','suspended') AND NEW.rejection_reason IS NOT NULL
           THEN LEFT(NEW.rejection_reason, 200) ELSE NEW.status::text END,
      '/listing/' || NEW.id::text,
      NEW.id
    );
  ELSIF NEW.expires_at IS DISTINCT FROM OLD.expires_at
        AND NEW.expires_at > COALESCE(OLD.expires_at, now())
        AND NEW.status = 'active' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, listing_id)
    VALUES (NEW.seller_id, 'listing_renewed', LEFT(NEW.title, 120),
            to_char(NEW.expires_at, 'YYYY-MM-DD'), '/listing/' || NEW.id::text, NEW.id);
  END IF;
  RETURN NEW;
END; $$;

-- 9. Admin alerts ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_admins_on_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link, listing_id)
  SELECT ur.user_id, 'admin_report', LEFT(NEW.reason, 120),
         LEFT(coalesce(NEW.details,''), 120), '/admin', NEW.listing_id
    FROM public.user_roles ur
   WHERE ur.role IN ('admin','moderator') AND ur.user_id <> NEW.reporter_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_admins_report ON public.reports;
CREATE TRIGGER trg_notify_admins_report AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_report();

CREATE OR REPLACE FUNCTION public.notify_admins_on_pending_listing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link, listing_id)
  SELECT ur.user_id, 'admin_pending_listing', LEFT(NEW.title, 120), 'pending', '/admin', NEW.id
    FROM public.user_roles ur
   WHERE ur.role IN ('admin','moderator') AND ur.user_id <> NEW.seller_id
     AND NOT EXISTS (
       SELECT 1 FROM public.notifications n
        WHERE n.user_id = ur.user_id AND n.type = 'admin_pending_listing' AND n.listing_id = NEW.id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_admins_pending ON public.listings;
CREATE TRIGGER trg_notify_admins_pending AFTER INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_pending_listing();

-- 10. Permissions ------------------------------------------------------
REVOKE ALL ON FUNCTION public.is_moderator(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.require_moderator() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_admin_action(uuid, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admins_on_report() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admins_on_pending_listing() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_listings(text, text, text, text, timestamptz, text, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_listing_status(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_reports(text, text, text, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_report(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_users(text, text, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_user_banned(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_audit(int, int) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_moderator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_listings(text, text, text, text, timestamptz, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_listing_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_reports(text, text, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_report(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_banned(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit(int, int) TO authenticated;