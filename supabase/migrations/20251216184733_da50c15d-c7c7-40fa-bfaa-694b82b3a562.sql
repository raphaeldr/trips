-- Drop deprecated tables
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS stories CASCADE;
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS journey_points CASCADE;

-- Drop the old photos_public view first
DROP VIEW IF EXISTS photos_public;

-- Add new columns to photos table for moments support
ALTER TABLE photos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE photos ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'photo';
ALTER TABLE photos ADD COLUMN IF NOT EXISTS caption TEXT;

-- Make storage_path nullable for text-only moments
ALTER TABLE photos ALTER COLUMN storage_path DROP NOT NULL;

-- Rename photos table to moments
ALTER TABLE photos RENAME TO moments;

-- Recreate the public view with obfuscation as moments_public
CREATE VIEW moments_public AS
SELECT 
  id,
  destination_id,
  is_hero,
  width,
  height,
  file_size,
  created_at,
  updated_at,
  ROUND(latitude::numeric, 2) as latitude,
  ROUND(longitude::numeric, 2) as longitude,
  taken_at::date as taken_at,
  title,
  description,
  storage_path,
  thumbnail_path,
  animated_path,
  ai_caption,
  mime_type,
  ai_tags,
  status,
  media_type,
  caption
FROM moments;

-- Update RLS policies for moments table (renamed from photos)
-- First drop old policies
DROP POLICY IF EXISTS "Photos are viewable by everyone" ON moments;
DROP POLICY IF EXISTS "Users can insert their own photos" ON moments;
DROP POLICY IF EXISTS "Users can delete their own photos" ON moments;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON moments;
DROP POLICY IF EXISTS "Users can update their own photos" ON moments;
DROP POLICY IF EXISTS "Public can view photos" ON moments;

-- Create new policies for moments
CREATE POLICY "Moments are viewable by everyone" 
ON moments FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own moments" 
ON moments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own moments" 
ON moments FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own moments" 
ON moments FOR DELETE 
USING (auth.uid() = user_id);