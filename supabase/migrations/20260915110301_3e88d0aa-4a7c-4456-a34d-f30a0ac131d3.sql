
-- 1) Profiles: hide phone / moderation fields from public reads (column-level privileges)
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, bio, province, rating_avg, rating_count, is_banned, created_at, updated_at, last_seen)
  ON public.profiles TO anon, authenticated;

-- 2) Listing images: make admin bypass explicit and symmetric on write checks
DROP POLICY IF EXISTS "Owner manages listing images" ON public.listing_images;
CREATE POLICY "Owner manages listing images"
  ON public.listing_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l
                 WHERE l.id = listing_images.listing_id
                   AND (l.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l
                 WHERE l.id = listing_images.listing_id
                   AND (l.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- 3) Remove anonymous execute rights on SECURITY DEFINER routines
REVOKE EXECUTE ON FUNCTION public.get_seller_phone(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_moderator(uuid) FROM anon;
