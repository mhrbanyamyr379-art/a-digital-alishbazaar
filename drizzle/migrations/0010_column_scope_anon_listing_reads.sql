REVOKE SELECT ON public.listings FROM anon;
GRANT SELECT (
  id, seller_id, title, description, price, currency, negotiable,
  category, subcategory, custom_subcategory, condition, province, city,
  status, view_count, is_featured, created_at, updated_at, contact_method,
  tags, published_at, expires_at, favorites_count
) ON public.listings TO anon;
