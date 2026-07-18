
-- ============ 1. Chat images bucket policies ============
-- Path convention: <conversation_id>/<uploader_uid>/<filename>
CREATE POLICY "Chat images: participants can read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);

CREATE POLICY "Chat images: participants can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);

CREATE POLICY "Chat images: uploader can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- ============ 2. Restrict phone column from authenticated bulk reads ============
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, display_name, avatar_url, bio, province, rating_avg, rating_count, is_banned, last_seen, created_at, updated_at) ON public.profiles TO authenticated;

-- ============ 3. Controlled phone access via RPCs ============
CREATE OR REPLACE FUNCTION public.get_my_phone()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_phone() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_phone() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_seller_phone(_seller_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _phone text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;

  -- Reveal phone only if the caller is the seller themselves, or they share a
  -- conversation with that seller (context-scoped contact reveal).
  IF auth.uid() = _seller_id
     OR EXISTS (
       SELECT 1 FROM public.conversations c
       WHERE (c.buyer_id = auth.uid() AND c.seller_id = _seller_id)
          OR (c.seller_id = auth.uid() AND c.buyer_id = _seller_id)
     )
  THEN
    SELECT phone INTO _phone FROM public.profiles WHERE id = _seller_id;
    RETURN _phone;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_seller_phone(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_seller_phone(uuid) TO authenticated;
