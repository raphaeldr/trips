-- Create a view that shows obfuscated coordinates (rounded to ~1km precision, which is city-level)
-- This hides precise GPS coordinates while still allowing general location display
CREATE OR REPLACE VIEW public.photos_public AS
SELECT 
  id,
  title,
  description,
  storage_path,
  thumbnail_path,
  animated_path,
  destination_id,
  is_hero,
  ai_tags,
  ai_caption,
  mime_type,
  width,
  height,
  file_size,
  created_at,
  updated_at,
  -- Obfuscate coordinates to ~1km precision (city-level)
  -- This rounds to 2 decimal places which is approximately 1.1km at the equator
  CASE WHEN latitude IS NOT NULL THEN ROUND(latitude::numeric, 2) ELSE NULL END as latitude,
  CASE WHEN longitude IS NOT NULL THEN ROUND(longitude::numeric, 2) ELSE NULL END as longitude,
  -- Only show date, not exact time (removes time-based tracking)
  CASE WHEN taken_at IS NOT NULL THEN DATE(taken_at) ELSE NULL END as taken_at
FROM public.photos;

-- Grant select on the view to anonymous and authenticated users
GRANT SELECT ON public.photos_public TO anon, authenticated;

-- Add comment explaining the purpose
COMMENT ON VIEW public.photos_public IS 'Public view of photos with obfuscated GPS coordinates (city-level only) and date-only timestamps to protect user privacy';

-- Update RLS on photos table to prevent direct access to precise coordinates
-- First, drop existing public select policy if it exists
DROP POLICY IF EXISTS "Anyone can view photos" ON public.photos;
DROP POLICY IF EXISTS "Public can view photos" ON public.photos;

-- Create a more restrictive policy that only allows owners to see full data
-- For public access, they should use the photos_public view
CREATE POLICY "Only owners can view full photo details"
ON public.photos
FOR SELECT
USING (auth.uid() = user_id);

-- Keep the insert/update/delete policies for authenticated users
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON public.photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.photos;

CREATE POLICY "Authenticated users can upload photos"
ON public.photos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos"
ON public.photos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
ON public.photos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);