-- 1. Structured references on notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (user_id) WHERE read_at IS NULL;

-- 2. Message notifications carry conversation + sender
CREATE OR REPLACE FUNCTION public.on_message_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _conv public.conversations%ROWTYPE;
  _recipient uuid;
  _preview text;
  _sender_name text;
BEGIN
  SELECT * INTO _conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  NEW.delivered_at := now();

  IF NEW.sender_id = _conv.buyer_id THEN
    _recipient := _conv.seller_id;
  ELSE
    _recipient := _conv.buyer_id;
  END IF;

  _preview := CASE NEW.type
    WHEN 'image' THEN '📷'
    WHEN 'listing' THEN '🔗'
    ELSE COALESCE(NEW.body,'')
  END;

  UPDATE public.conversations SET
    last_message = _preview,
    last_message_at = NEW.created_at,
    buyer_unread = CASE WHEN _recipient = buyer_id THEN buyer_unread + 1 ELSE buyer_unread END,
    seller_unread = CASE WHEN _recipient = seller_id THEN seller_unread + 1 ELSE seller_unread END,
    archived_by_buyer = CASE WHEN _recipient = buyer_id THEN false ELSE archived_by_buyer END,
    archived_by_seller = CASE WHEN _recipient = seller_id THEN false ELSE archived_by_seller END
  WHERE id = NEW.conversation_id;

  SELECT display_name INTO _sender_name FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, conversation_id, listing_id, actor_id)
  VALUES (
    _recipient,
    'message',
    COALESCE(_sender_name, 'Message'),
    LEFT(_preview, 120),
    '/chat/' || NEW.conversation_id::text,
    NEW.conversation_id,
    _conv.listing_id,
    NEW.sender_id
  );

  RETURN NEW;
END; $function$;

-- 3. Favorite notifications: structured + de-duplicated per actor/listing/day
CREATE OR REPLACE FUNCTION public.notify_on_favorite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _seller uuid; _title text; _actor text;
BEGIN
  SELECT seller_id, title INTO _seller, _title FROM public.listings WHERE id = NEW.listing_id;
  IF _seller IS NULL OR _seller = NEW.user_id THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.notifications
     WHERE user_id = _seller AND type = 'favorite'
       AND listing_id = NEW.listing_id AND actor_id = NEW.user_id
       AND created_at > now() - interval '1 day'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO _actor FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, body, link, listing_id, actor_id)
  VALUES (_seller, 'favorite', COALESCE(_actor,'Someone'), LEFT(COALESCE(_title,''),120),
          '/listing/' || NEW.listing_id::text, NEW.listing_id, NEW.user_id);
  RETURN NEW;
END; $function$;

-- 4. Review notifications keep the reviewer reference
CREATE OR REPLACE FUNCTION public.notify_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _actor text;
BEGIN
  IF NEW.seller_id = NEW.reviewer_id THEN RETURN NEW; END IF;
  SELECT display_name INTO _actor FROM public.profiles WHERE id = NEW.reviewer_id;
  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id)
  VALUES (NEW.seller_id, 'review', COALESCE(_actor,'Review'),
          NEW.rating::text || '★ ' || LEFT(COALESCE(NEW.comment,''),100),
          '/seller/' || NEW.seller_id::text, NEW.reviewer_id);
  RETURN NEW;
END; $function$;

-- 5. Listing status + renewal notifications
CREATE OR REPLACE FUNCTION public.notify_on_listing_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, listing_id)
    VALUES (
      NEW.seller_id,
      'listing_' || NEW.status::text,
      LEFT(NEW.title, 120),
      NEW.status::text,
      '/listing/' || NEW.id::text,
      NEW.id
    );
  ELSIF NEW.expires_at IS DISTINCT FROM OLD.expires_at
        AND NEW.expires_at > COALESCE(OLD.expires_at, now())
        AND NEW.status = 'active' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, listing_id)
    VALUES (
      NEW.seller_id,
      'listing_renewed',
      LEFT(NEW.title, 120),
      to_char(NEW.expires_at, 'YYYY-MM-DD'),
      '/listing/' || NEW.id::text,
      NEW.id
    );
  END IF;
  RETURN NEW;
END; $function$;

-- 6. Expiring-soon sweep (idempotent: at most one reminder per listing per cycle)
CREATE OR REPLACE FUNCTION public.notify_expiring_listings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _n integer;
BEGIN
  WITH inserted AS (
    INSERT INTO public.notifications (user_id, type, title, body, link, listing_id)
    SELECT l.seller_id, 'listing_expiring', LEFT(l.title,120),
           to_char(l.expires_at, 'YYYY-MM-DD'), '/listing/' || l.id::text, l.id
      FROM public.listings l
     WHERE l.status = 'active'
       AND l.expires_at IS NOT NULL
       AND l.expires_at > now()
       AND l.expires_at < now() + interval '3 days'
       AND NOT EXISTS (
         SELECT 1 FROM public.notifications n
          WHERE n.user_id = l.seller_id AND n.type = 'listing_expiring'
            AND n.listing_id = l.id AND n.created_at > now() - interval '3 days'
       )
    RETURNING 1
  )
  SELECT count(*) INTO _n FROM inserted;
  RETURN _n;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.notify_expiring_listings() FROM PUBLIC, anon, authenticated;