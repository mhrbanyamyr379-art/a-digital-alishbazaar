
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- Notify seller when their listing is favorited
CREATE OR REPLACE FUNCTION public.notify_on_favorite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _seller uuid; _title text; _actor text;
BEGIN
  SELECT seller_id, title INTO _seller, _title FROM public.listings WHERE id = NEW.listing_id;
  IF _seller IS NULL OR _seller = NEW.user_id THEN RETURN NEW; END IF;
  SELECT display_name INTO _actor FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (_seller, 'favorite', COALESCE(_actor,'Someone'), LEFT(COALESCE(_title,''),120), '/listing/' || NEW.listing_id::text);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_favorite ON public.favorites;
CREATE TRIGGER trg_notify_favorite AFTER INSERT ON public.favorites
FOR EACH ROW EXECUTE FUNCTION public.notify_on_favorite();

-- Notify seller when they receive a review
CREATE OR REPLACE FUNCTION public.notify_on_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _actor text;
BEGIN
  IF NEW.seller_id = NEW.reviewer_id THEN RETURN NEW; END IF;
  SELECT display_name INTO _actor FROM public.profiles WHERE id = NEW.reviewer_id;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (NEW.seller_id, 'review', COALESCE(_actor,'Review'), NEW.rating::text || '★ ' || LEFT(COALESCE(NEW.comment,''),100), '/seller/' || NEW.seller_id::text);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_review ON public.reviews;
CREATE TRIGGER trg_notify_review AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.notify_on_review();

-- Notify owner when listing status changes (approved / rejected / sold / expired)
CREATE OR REPLACE FUNCTION public.notify_on_listing_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.seller_id,
      'listing_' || NEW.status::text,
      LEFT(NEW.title, 120),
      NEW.status::text,
      '/listing/' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_listing_status ON public.listings;
CREATE TRIGGER trg_notify_listing_status AFTER UPDATE OF status ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.notify_on_listing_status();

REVOKE EXECUTE ON FUNCTION public.notify_on_favorite() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_review() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_listing_status() FROM PUBLIC, anon, authenticated;
