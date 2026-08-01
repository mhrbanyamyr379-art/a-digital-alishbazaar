DROP POLICY IF EXISTS "Active listings are public" ON public.listings;

CREATE POLICY "Anon can view active listings"
ON public.listings FOR SELECT TO anon
USING (status = 'active'::listing_status);

CREATE POLICY "Users can view active or own listings"
ON public.listings FOR SELECT TO authenticated
USING (
  status = 'active'::listing_status
  OR auth.uid() = seller_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);