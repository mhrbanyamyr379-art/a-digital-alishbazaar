ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hide_last_active boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET last_active = last_seen WHERE last_active IS NULL;
CREATE OR REPLACE FUNCTION public.heartbeat()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles
     SET last_seen = CASE WHEN hide_last_active THEN NULL ELSE now() END,
         last_active = CASE WHEN hide_last_active THEN NULL ELSE now() END
   WHERE id = auth.uid();
END; $function$;