ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS village text;
GRANT UPDATE (whatsapp, district, village) ON public.profiles TO authenticated;
CREATE OR REPLACE FUNCTION public.get_my_profile_extras()
RETURNS TABLE(whatsapp text, district text, village text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT p.whatsapp, p.district, p.village FROM public.profiles p WHERE p.id = auth.uid() $$;
REVOKE ALL ON FUNCTION public.get_my_profile_extras() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_extras() TO authenticated;