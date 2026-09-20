ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS custom_subcategory text;

ALTER TABLE public.listings ADD CONSTRAINT listings_custom_subcategory_length CHECK (custom_subcategory IS NULL OR char_length(btrim(custom_subcategory)) BETWEEN 2 AND 60);