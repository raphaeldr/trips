-- Fix 1: Update moments table SELECT policy to only show published moments OR user's own moments
DROP POLICY IF EXISTS "Moments are viewable by everyone" ON public.moments;

CREATE POLICY "Public can view published moments"
ON public.moments
FOR SELECT
USING (status = 'published' OR auth.uid() = user_id);

-- Fix 2: Update storage policies to include ownership verification
-- The file naming convention is: user_id/filename (used in MomentCapture.tsx)

-- Drop existing overpermissive policies
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

-- Create properly scoped UPDATE policy
CREATE POLICY "Users can update their own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create properly scoped DELETE policy
CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);