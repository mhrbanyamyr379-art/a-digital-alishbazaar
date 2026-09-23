-- Guests no longer read the private listings bucket directly; signed URLs for
-- photos of active ads are issued server-side after validation.
DROP POLICY IF EXISTS "Anon read active listings images" ON storage.objects;

-- Profile reads are bound to visible accounts (own row always readable).
DROP POLICY IF EXISTS "Public read of safe profile columns" ON public.profiles;

CREATE POLICY "Public read of safe profile columns"
ON public.profiles
FOR SELECT
USING (id = auth.uid() OR is_banned = false);