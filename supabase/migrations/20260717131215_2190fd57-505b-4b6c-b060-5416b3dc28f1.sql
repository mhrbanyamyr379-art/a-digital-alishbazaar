
-- profiles.last_seen
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen timestamptz;

-- conversations upgrades
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS buyer_unread int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_unread int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buyer_last_read_at timestamptz,
  ADD COLUMN IF NOT EXISTS seller_last_read_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by_buyer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_by_seller boolean NOT NULL DEFAULT false;

-- messages upgrades
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS image_paths text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attachment_listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_for uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.messages ADD CONSTRAINT messages_type_chk CHECK (type IN ('text','image','listing'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow body to be empty for image/listing messages
ALTER TABLE public.messages ALTER COLUMN body DROP NOT NULL;

CREATE INDEX IF NOT EXISTS messages_conv_created_idx ON public.messages(conversation_id, created_at);

-- blocks table
CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own blocks" ON public.blocks
    FOR ALL USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger: after new message, update conversation, bump unread, notify
CREATE OR REPLACE FUNCTION public.on_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    _recipient,
    'message',
    COALESCE(_sender_name, 'Message'),
    LEFT(_preview, 120),
    '/chat/' || NEW.conversation_id::text
  );

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_on_message_insert ON public.messages;
CREATE TRIGGER trg_on_message_insert
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.on_message_insert();

REVOKE EXECUTE ON FUNCTION public.on_message_insert() FROM PUBLIC, anon, authenticated;

-- Mark conversation as read
CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid; _c public.conversations%ROWTYPE;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT * INTO _c FROM public.conversations WHERE id = _conv_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF _uid <> _c.buyer_id AND _uid <> _c.seller_id THEN RETURN; END IF;

  UPDATE public.messages SET read_at = now()
    WHERE conversation_id = _conv_id AND sender_id <> _uid AND read_at IS NULL;

  IF _uid = _c.buyer_id THEN
    UPDATE public.conversations SET buyer_unread = 0, buyer_last_read_at = now() WHERE id = _conv_id;
  ELSE
    UPDATE public.conversations SET seller_unread = 0, seller_last_read_at = now() WHERE id = _conv_id;
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

-- Archive toggle
CREATE OR REPLACE FUNCTION public.set_conversation_archived(_conv_id uuid, _archived boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid; _c public.conversations%ROWTYPE;
BEGIN
  _uid := auth.uid();
  SELECT * INTO _c FROM public.conversations WHERE id = _conv_id;
  IF NOT FOUND OR _uid IS NULL THEN RETURN; END IF;
  IF _uid = _c.buyer_id THEN
    UPDATE public.conversations SET archived_by_buyer = _archived WHERE id = _conv_id;
  ELSIF _uid = _c.seller_id THEN
    UPDATE public.conversations SET archived_by_seller = _archived WHERE id = _conv_id;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.set_conversation_archived(uuid, boolean) TO authenticated;

-- Heartbeat presence
CREATE OR REPLACE FUNCTION public.heartbeat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles SET last_seen = now() WHERE id = auth.uid();
END; $$;
GRANT EXECUTE ON FUNCTION public.heartbeat() TO authenticated;

-- Delete message for me
CREATE OR REPLACE FUNCTION public.delete_message_for_me(_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid; _c public.conversations%ROWTYPE; _m public.messages%ROWTYPE;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT * INTO _m FROM public.messages WHERE id = _message_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO _c FROM public.conversations WHERE id = _m.conversation_id;
  IF _uid <> _c.buyer_id AND _uid <> _c.seller_id THEN RETURN; END IF;
  UPDATE public.messages
    SET deleted_for = CASE WHEN _uid = ANY(deleted_for) THEN deleted_for ELSE array_append(deleted_for, _uid) END
    WHERE id = _message_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.delete_message_for_me(uuid) TO authenticated;

-- Prevent sending when blocked
CREATE OR REPLACE FUNCTION public.check_message_not_blocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _c public.conversations%ROWTYPE; _other uuid;
BEGIN
  SELECT * INTO _c FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  _other := CASE WHEN NEW.sender_id = _c.buyer_id THEN _c.seller_id ELSE _c.buyer_id END;
  IF EXISTS (SELECT 1 FROM public.blocks WHERE blocker_id = _other AND blocked_id = NEW.sender_id) THEN
    RAISE EXCEPTION 'blocked';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_check_message_not_blocked ON public.messages;
CREATE TRIGGER trg_check_message_not_blocked
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.check_message_not_blocked();

REVOKE EXECUTE ON FUNCTION public.check_message_not_blocked() FROM PUBLIC, anon, authenticated;

-- Realtime publication (safe re-add)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
