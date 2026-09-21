-- Internal authorization helper; only called from inside other SECURITY DEFINER
-- functions (which run as owner), never from the client. Remove direct exposure.
REVOKE EXECUTE ON FUNCTION public.require_moderator() FROM PUBLIC, anon, authenticated;
