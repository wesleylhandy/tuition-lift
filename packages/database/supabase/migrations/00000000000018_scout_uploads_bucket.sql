-- Migration: Create scout_uploads Storage bucket with RLS
-- Path pattern: {user_id}/{uuid}.{ext}; private; 10 MB max; PDF/PNG/JPEG only
-- See specs/007-scout-vision-ingestion/data-model.md §3

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scout_uploads',
  'scout_uploads',
  false,
  10485760,  -- 10 MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects (bucket already has RLS enabled by default)
-- Authenticated users can INSERT only to their own folder: {user_id}/*
CREATE POLICY "scout_uploads_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'scout_uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can SELECT only their own files
CREATE POLICY "scout_uploads_select_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'scout_uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can UPDATE only their own files (for upsert/overwrite)
CREATE POLICY "scout_uploads_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'scout_uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'scout_uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can DELETE only their own files (optional cleanup)
CREATE POLICY "scout_uploads_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'scout_uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
