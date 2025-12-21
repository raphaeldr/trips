-- Ensure photos bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

-- Recreate policies with proper security

-- 1. Public Select (Read access for everyone)
CREATE POLICY "Photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- 2. Insert (Allow authenticated users to upload to their own folder)
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'photos'
    AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Update (Allow users to update files in their own folder)
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'photos'
    AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Delete (Allow users to delete files in their own folder)
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'photos'
    AND
    (storage.foldername(name))[1] = auth.uid()::text
);
