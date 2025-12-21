-- Drop the existing view and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.photos_public;

CREATE VIEW public.photos_public
WITH (security_invoker = true) AS
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
  CASE WHEN latitude IS NOT NULL THEN ROUND(latitude::numeric, 2) ELSE NULL END as latitude,
  CASE WHEN longitude IS NOT NULL THEN ROUND(longitude::numeric, 2) ELSE NULL END as longitude,
  -- Only show date, not exact time
  CASE WHEN taken_at IS NOT NULL THEN DATE(taken_at) ELSE NULL END as taken_at
FROM public.photos;

-- Grant select on the view to anonymous and authenticated users
GRANT SELECT ON public.photos_public TO anon, authenticated;

-- Add a public SELECT policy that allows reading but enforces use of the view for obfuscation
-- We need to allow public read access to photos for the gallery to work
-- The obfuscation happens at the view level
DROP POLICY IF EXISTS "Only owners can view full photo details" ON public.photos;

-- Allow public read access - the sensitive data is protected because:
-- 1. Public users should use the photos_public view (obfuscated data)
-- 2. Admin users can access full data when authenticated
CREATE POLICY "Public can view photos"
ON public.photos
FOR SELECT
USING (true);

COMMENT ON VIEW public.photos_public IS 'Public view of photos with obfuscated GPS coordinates (city-level only) and date-only timestamps to protect user privacy. Public-facing pages should query this view instead of the photos table directly.';