ALTER TABLE public.listings
  ADD COLUMN contact_phone text,
  ADD COLUMN contact_whatsapp text;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_contact_phone_format
  CHECK (contact_phone IS NULL OR contact_phone ~ '^\+[1-9]\d{7,14}$') NOT VALID,
  ADD CONSTRAINT listings_contact_whatsapp_format
  CHECK (contact_whatsapp IS NULL OR contact_whatsapp ~ '^\+[1-9]\d{7,14}$') NOT VALID;