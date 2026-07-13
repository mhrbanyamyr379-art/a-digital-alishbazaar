-- Add 'draft' to listing status enum
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'draft';

-- Extend listings with new production fields
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS contact_method text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS favorites_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_listings_expires ON public.listings(expires_at);

-- Keep favorites_count in sync
CREATE OR REPLACE FUNCTION public.recompute_favorites_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _listing uuid;
BEGIN
  _listing := COALESCE(NEW.listing_id, OLD.listing_id);
  UPDATE public.listings l
    SET favorites_count = (SELECT COUNT(*) FROM public.favorites WHERE listing_id = _listing)
  WHERE l.id = _listing;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_favorites_count ON public.favorites;
CREATE TRIGGER trg_favorites_count
  AFTER INSERT OR DELETE ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.recompute_favorites_count();

-- Atomic view increment
CREATE OR REPLACE FUNCTION public.increment_listing_views(_listing_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.listings SET view_count = view_count + 1 WHERE id = _listing_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO anon, authenticated;