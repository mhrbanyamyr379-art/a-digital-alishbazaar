CREATE TABLE public.listing_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);
GRANT SELECT ON public.listing_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.listing_likes TO authenticated;
GRANT ALL ON public.listing_likes TO service_role;
ALTER TABLE public.listing_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes readable by everyone" ON public.listing_likes FOR SELECT USING (true);
CREATE POLICY "users like as themselves" ON public.listing_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users remove own like" ON public.listing_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.listing_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listing_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.listing_comments TO authenticated;
GRANT ALL ON public.listing_comments TO service_role;
ALTER TABLE public.listing_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments readable by everyone" ON public.listing_comments FOR SELECT USING (true);
CREATE POLICY "users comment as themselves" ON public.listing_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND length(btrim(body)) > 0 AND length(body) <= 1000);
CREATE POLICY "users delete own comment" ON public.listing_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.listing_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.listing_shares TO anon;
GRANT SELECT, INSERT ON public.listing_shares TO authenticated;
GRANT ALL ON public.listing_shares TO service_role;
ALTER TABLE public.listing_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "share counts readable by everyone" ON public.listing_shares FOR SELECT USING (true);
CREATE POLICY "anyone records a share" ON public.listing_shares FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE INDEX listing_likes_listing_idx ON public.listing_likes (listing_id);
CREATE INDEX listing_comments_listing_idx ON public.listing_comments (listing_id, created_at DESC);
CREATE INDEX listing_shares_listing_idx ON public.listing_shares (listing_id);