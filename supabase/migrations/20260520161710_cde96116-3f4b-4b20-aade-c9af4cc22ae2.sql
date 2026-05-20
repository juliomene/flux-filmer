
-- Drop overly permissive public SELECT on storage objects
DROP POLICY IF EXISTS "Public read images" ON storage.objects;
DROP POLICY IF EXISTS "Public read videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read thumbnails" ON storage.objects;

-- Files in public buckets are still fetchable by direct URL (public bucket flag),
-- but we no longer expose a LIST endpoint to anonymous clients.
-- Authenticated owners can list/read their own folder.
CREATE POLICY "Users read own images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Lock down SECURITY DEFINER functions: only triggers / postgres should call them
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
