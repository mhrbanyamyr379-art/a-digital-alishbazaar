DROP POLICY IF EXISTS "Approved listing images are public" ON public.listing_images;

CREATE POLICY "Guests see approved listing images"
  ON public.listing_images FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.listings l
                 WHERE l.id = listing_images.listing_id AND l.status = 'active'));

CREATE POLICY "Members see approved own or moderated listing images"
  ON public.listing_images FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l
                 WHERE l.id = listing_images.listing_id
                   AND (l.status = 'active' OR l.seller_id = auth.uid() OR public.is_moderator(auth.uid()))));