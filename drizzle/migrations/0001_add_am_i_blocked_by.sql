CREATE OR REPLACE FUNCTION public.am_i_blocked_by(_other_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.blocks
     WHERE blocker_id = _other_id AND blocked_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.am_i_blocked_by(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.am_i_blocked_by(uuid) TO authenticated;