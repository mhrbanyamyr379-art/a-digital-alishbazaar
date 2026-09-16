-- New accounts never got a profile row (no signup hook exists), which left seller
-- pages and chat headers blank. Provide a safe self-service bootstrap the app calls
-- right after sign-in, and backfill the accounts that are already missing one.

CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid; _u auth.users%ROWTYPE;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT * INTO _u FROM auth.users WHERE id = _uid;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.profiles (id, display_name, phone)
  VALUES (
    _uid,
    COALESCE(
      NULLIF(btrim(_u.raw_user_meta_data->>'display_name'), ''),
      NULLIF(btrim(_u.raw_user_meta_data->>'full_name'), ''),
      NULLIF(split_part(COALESCE(_u.email,''),'@',1), ''),
      NULLIF('+' || COALESCE(_u.phone,''), '+'),
      'User'
    ),
    NULLIF(_u.phone, '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'user')
  ON CONFLICT DO NOTHING;
END; $$;

REVOKE ALL ON FUNCTION public.ensure_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated;

-- Backfill existing accounts.
INSERT INTO public.profiles (id, display_name, phone)
SELECT u.id,
       COALESCE(
         NULLIF(btrim(u.raw_user_meta_data->>'display_name'), ''),
         NULLIF(btrim(u.raw_user_meta_data->>'full_name'), ''),
         NULLIF(split_part(COALESCE(u.email,''),'@',1), ''),
         NULLIF('+' || COALESCE(u.phone,''), '+'),
         'User'
       ),
       NULLIF(u.phone, '')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user' FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT DO NOTHING;