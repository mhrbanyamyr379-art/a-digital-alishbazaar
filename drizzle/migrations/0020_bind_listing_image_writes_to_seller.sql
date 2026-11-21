CREATE POLICY "Listing image inserts stay in seller folder"
ON public.listing_images AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_images.listing_id
      AND split_part(listing_images.url, '/', 1) = l.seller_id::text
      AND listing_images.url ~ '^[0-9a-f-]+(/[A-Za-z0-9_-][A-Za-z0-9._-]*)+$'
  )
);

CREATE POLICY "Listing image updates stay in seller folder"
ON public.listing_images AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_images.listing_id
      AND split_part(listing_images.url, '/', 1) = l.seller_id::text
      AND listing_images.url ~ '^[0-9a-f-]+(/[A-Za-z0-9_-][A-Za-z0-9._-]*)+$'
  )
);