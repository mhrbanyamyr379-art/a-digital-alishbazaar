GRANT SELECT (last_active, hide_last_active) ON public.profiles TO anon, authenticated;
GRANT UPDATE (hide_last_active, last_active) ON public.profiles TO authenticated;