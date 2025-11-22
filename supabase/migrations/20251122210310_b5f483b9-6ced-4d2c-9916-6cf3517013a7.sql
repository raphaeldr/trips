-- Create storage bucket for blog media
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-media', 'blog-media', true);

-- Create RLS policies for blog media bucket
CREATE POLICY "Blog media files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-media');

CREATE POLICY "Authenticated users can upload blog media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own blog media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blog-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own blog media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);