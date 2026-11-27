-- =============================================================================
-- VyaparHub Phase 9.5 Follow-Up — Master Catalog Product Images Storage Setup
-- Idempotent Supabase Storage bucket + PostgreSQL RLS policy configuration.
-- =============================================================================

-- 1. Create / update public-read `product-images` bucket with 5 MB cap & safe image MIME allowlist
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. SECURITY DEFINER helper checking that the current Supabase Auth JWT belongs to
--    an ACTIVE UserRole.ADMIN record in `public.users` (which has deny-all RLS for clients).
CREATE OR REPLACE FUNCTION public.is_active_admin_auth_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u."authUserId" = auth.uid()
      AND u."role" = 'ADMIN'
      AND u."accountStatus" = 'ACTIVE'
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin_auth_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin_auth_user() TO authenticated, service_role;

-- 3. Storage object RLS policies scoped strictly to `product-images`
DROP POLICY IF EXISTS product_images_public_read ON storage.objects;
CREATE POLICY product_images_public_read
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS product_images_admin_insert ON storage.objects;
CREATE POLICY product_images_admin_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_active_admin_auth_user()
  );

DROP POLICY IF EXISTS product_images_admin_delete ON storage.objects;
CREATE POLICY product_images_admin_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_active_admin_auth_user()
  );
