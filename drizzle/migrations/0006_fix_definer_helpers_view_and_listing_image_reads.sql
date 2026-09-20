-- 1) Guests no longer execute the role-check helpers (only signed-in policies use them)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_moderator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_moderator(uuid) TO authenticated;

-- 2) Replace the SECURITY DEFINER view with column-level privileges on profiles.
--    Safe public columns only; phone and ban details stay unselectable for everyone via the API.
DROP VIEW public.public_profiles;
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, bio, province, rating_avg, rating_count, is_banned, last_seen, created_at, updated_at) ON public.profiles TO anon, authenticated;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Public read of safe profile columns" ON public.profiles
  FOR SELECT TO anon, authenticated USING (true);

-- 3) Listing images: public reads only for active listings; owners and staff keep full access
CREATE INDEX IF NOT EXISTS listing_images_url_idx ON public.listing_images (url);
DROP POLICY IF EXISTS "Public read listings images" ON storage.objects;
CREATE POLICY "Anon read active listings images" ON storage.objects
  FOR SELECT TO anon
  USING (
    bucket_id = 'listings'
    AND EXISTS (
      SELECT 1 FROM public.listing_images li
      JOIN public.listings l ON l.id = li.listing_id
      WHERE li.url = objects.name AND l.status = 'active'
    )
  );
CREATE POLICY "Members read listings images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'listings'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'moderator'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.listing_images li
        JOIN public.listings l ON l.id = li.listing_id
        WHERE li.url = objects.name AND l.status = 'active'
      )
    )
  );