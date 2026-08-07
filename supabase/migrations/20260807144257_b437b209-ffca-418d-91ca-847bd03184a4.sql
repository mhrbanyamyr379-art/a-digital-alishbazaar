ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DROP INDEX IF EXISTS public.idx_messages_conversation;
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON public.conversations (buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON public.conversations (seller_id, last_message_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_direct_unique
  ON public.conversations (buyer_id, seller_id) WHERE listing_id IS NULL;

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(_listing_id uuid, _seller_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid; _id uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _seller_id IS NULL OR _uid = _seller_id THEN RAISE EXCEPTION 'invalid seller'; END IF;

  SELECT id INTO _id FROM public.conversations
   WHERE buyer_id = _uid AND seller_id = _seller_id
     AND (_listing_id IS NULL AND listing_id IS NULL OR listing_id = _listing_id)
   LIMIT 1;
  IF _id IS NOT NULL THEN RETURN _id; END IF;

  SELECT id INTO _id FROM public.conversations
   WHERE buyer_id = _seller_id AND seller_id = _uid
     AND (_listing_id IS NULL AND listing_id IS NULL OR listing_id = _listing_id)
   LIMIT 1;
  IF _id IS NOT NULL THEN RETURN _id; END IF;

  INSERT INTO public.conversations (listing_id, buyer_id, seller_id)
  VALUES (_listing_id, _uid, _seller_id)
  RETURNING id INTO _id;
  RETURN _id;
EXCEPTION WHEN unique_violation THEN
  SELECT id INTO _id FROM public.conversations
   WHERE buyer_id = _uid AND seller_id = _seller_id
     AND (_listing_id IS NULL AND listing_id IS NULL OR listing_id = _listing_id)
   LIMIT 1;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_message_for_everyone(_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid; _m public.messages%ROWTYPE;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT * INTO _m FROM public.messages WHERE id = _message_id;
  IF NOT FOUND OR _m.sender_id <> _uid THEN RETURN; END IF;
  UPDATE public.messages
     SET deleted_at = now(), body = NULL, image_paths = '{}'::text[]
   WHERE id = _message_id;
END; $$;

CREATE OR REPLACE FUNCTION public.edit_message(_message_id uuid, _body text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid; _m public.messages%ROWTYPE;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL OR _body IS NULL OR length(btrim(_body)) = 0 THEN RETURN; END IF;
  SELECT * INTO _m FROM public.messages WHERE id = _message_id;
  IF NOT FOUND OR _m.sender_id <> _uid OR _m.type <> 'text' OR _m.deleted_at IS NOT NULL THEN RETURN; END IF;
  UPDATE public.messages
     SET body = btrim(_body), edited_at = now()
   WHERE id = _message_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_message_for_everyone(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.edit_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_message_for_everyone(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_message(uuid, text) TO authenticated;