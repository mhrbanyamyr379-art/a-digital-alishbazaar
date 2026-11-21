CREATE TABLE IF NOT EXISTS public.listing_view_log (
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);
GRANT ALL ON public.listing_view_log TO service_role;
ALTER TABLE public.listing_view_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_listing_views(_listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _n int;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = _listing_id AND status = 'active' AND seller_id <> _uid) THEN RETURN; END IF;
  INSERT INTO public.listing_view_log (user_id, listing_id, viewed_at) VALUES (_uid, _listing_id, now())
  ON CONFLICT (user_id, listing_id) DO UPDATE SET viewed_at = now()
    WHERE public.listing_view_log.viewed_at < now() - interval '24 hours';
  GET DIAGNOSTICS _n = ROW_COUNT;
  IF _n = 0 THEN RETURN; END IF;
  PERFORM set_config('app.internal_counter', 'on', true);
  UPDATE public.listings SET view_count = view_count + 1 WHERE id = _listing_id;
  PERFORM set_config('app.internal_counter', 'off', true);
END; $$;

DROP POLICY IF EXISTS "likes readable by everyone" ON public.listing_likes;
CREATE POLICY "likes readable on visible listings" ON public.listing_likes FOR SELECT
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.status IN ('active','sold')));

DROP POLICY IF EXISTS "comments readable by everyone" ON public.listing_comments;
CREATE POLICY "comments readable on visible listings" ON public.listing_comments FOR SELECT
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.status IN ('active','sold')));

DROP POLICY IF EXISTS "share counts readable by everyone" ON public.listing_shares;
CREATE POLICY "shares readable on visible listings" ON public.listing_shares FOR SELECT
USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.status IN ('active','sold')));

REVOKE ALL ON FUNCTION public.admin_list_audit(integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_users(text, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_reports(text, text, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_listings(text, text, text, text, timestamptz, text, integer, integer) FROM PUBLIC, anon;