DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;

CREATE POLICY "Public read avatars"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.avatar_url = objects.name
    )
  )
);