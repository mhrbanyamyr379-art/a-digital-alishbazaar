CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT (
    auth.uid() IS NULL OR _user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles c WHERE c.user_id = auth.uid() AND c.role IN ('admin','moderator'))
  ) AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_moderator(_uid uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.has_role(_uid, 'admin') OR public.has_role(_uid, 'moderator');
$$;

DROP POLICY IF EXISTS "anyone records a share" ON public.listing_shares;
CREATE POLICY "signed-in users record their own share" ON public.listing_shares
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX IF NOT EXISTS listing_shares_listing_user_uniq ON public.listing_shares (listing_id, user_id);

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(_listing_id uuid, _seller_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid; _id uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _seller_id IS NULL OR _uid = _seller_id THEN RAISE EXCEPTION 'invalid seller'; END IF;

  SELECT id INTO _id FROM public.conversations
   WHERE buyer_id = _uid AND seller_id = _seller_id
     AND (_listing_id IS NULL AND listing_id IS NULL OR listing_id = _listing_id) LIMIT 1;
  IF _id IS NOT NULL THEN RETURN _id; END IF;

  SELECT id INTO _id FROM public.conversations
   WHERE buyer_id = _seller_id AND seller_id = _uid
     AND (_listing_id IS NULL AND listing_id IS NULL OR listing_id = _listing_id) LIMIT 1;
  IF _id IS NOT NULL THEN RETURN _id; END IF;

  -- New conversations must be tied to a real, visible listing owned by that seller.
  IF _listing_id IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.listings WHERE seller_id = _seller_id AND status IN ('active','sold')) THEN
      RAISE EXCEPTION 'invalid seller';
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = _listing_id AND seller_id = _seller_id AND status IN ('active','sold')) THEN
    RAISE EXCEPTION 'invalid listing';
  END IF;

  INSERT INTO public.conversations (listing_id, buyer_id, seller_id)
  VALUES (_listing_id, _uid, _seller_id) RETURNING id INTO _id;
  RETURN _id;
EXCEPTION WHEN unique_violation THEN
  SELECT id INTO _id FROM public.conversations
   WHERE buyer_id = _uid AND seller_id = _seller_id
     AND (_listing_id IS NULL AND listing_id IS NULL OR listing_id = _listing_id) LIMIT 1;
  RETURN _id;
END; $function$;