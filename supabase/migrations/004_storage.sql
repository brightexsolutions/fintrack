-- ============================================================
-- FinTrack: Storage Buckets + Policies Migration 004
-- Run AFTER 003_seed_categories.sql
-- ============================================================

-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars',  'avatars',  true),
  ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Avatars: public read, owner write
CREATE POLICY "avatars_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Receipts: owner only (private)
CREATE POLICY "receipts_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "receipts_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "receipts_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
