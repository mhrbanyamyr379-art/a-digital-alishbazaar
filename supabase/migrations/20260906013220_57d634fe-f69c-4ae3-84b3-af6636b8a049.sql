-- 1. Least-privilege grants -------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Public read surfaces
GRANT SELECT (id, display_name, avatar_url, bio, province, rating_avg, rating_count, is_banned, created_at, updated_at, last_seen)
  ON public.profiles TO anon, authenticated;
GRANT INSERT (id, display_name, phone, avatar_url, bio, province) ON public.profiles TO authenticated;
GRANT UPDATE (display_name, phone, avatar_url, bio, province) ON public.profiles TO authenticated;

GRANT SELECT ON public.listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listings TO authenticated;

GRANT SELECT ON public.listing_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listing_images TO authenticated;

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

-- Authenticated-only surfaces
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recently_viewed TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT SELECT, DELETE ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;

-- 2. Messages are mutated only through SECURITY DEFINER RPCs ----------------
DROP POLICY IF EXISTS "Recipients mark read" ON public.messages;

-- 3. Listing photos: public only for approved listings ----------------------
DROP POLICY IF EXISTS "Listing images are public" ON public.listing_images;
CREATE POLICY "Approved listing images are public"
  ON public.listing_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_images.listing_id
        AND (
          l.status = 'active'
          OR l.seller_id = auth.uid()
          OR public.is_moderator(auth.uid())
        )
    )
  );

-- 4. Sellers cannot touch moderation-controlled fields ----------------------
CREATE OR REPLACE FUNCTION public.guard_listing_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Service role / internal jobs and staff are unrestricted.
  IF auth.uid() IS NULL OR public.is_moderator(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
     OR NEW.view_count IS DISTINCT FROM OLD.view_count
     OR NEW.favorites_count IS DISTINCT FROM OLD.favorites_count
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
     OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF OLD.status IN ('suspended', 'rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_listing_moderation ON public.listings;
CREATE TRIGGER trg_guard_listing_moderation
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.guard_listing_moderation_fields();

-- 5. New listings cannot be created pre-featured ----------------------------
CREATE OR REPLACE FUNCTION public.guard_listing_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_moderator(auth.uid()) THEN
    NEW.is_featured := false;
    NEW.view_count := 0;
    NEW.favorites_count := 0;
    NEW.rejection_reason := NULL;
    NEW.moderated_by := NULL;
    NEW.moderated_at := NULL;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_listing_insert ON public.listings;
CREATE TRIGGER trg_guard_listing_insert
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.guard_listing_insert();

-- 6. One review per reviewer per seller -------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS reviews_seller_reviewer_key
  ON public.reviews (seller_id, reviewer_id);

-- 7. Missing indexes --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_favorites_listing ON public.favorites (listing_id);
CREATE INDEX IF NOT EXISTS idx_reports_listing ON public.reports (listing_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user ON public.recently_viewed (user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id);