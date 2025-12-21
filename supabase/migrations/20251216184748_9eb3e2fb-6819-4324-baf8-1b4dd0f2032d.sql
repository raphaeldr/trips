-- Fix security issues

-- 1. Make moments_public view use invoker security (not definer)
DROP VIEW IF EXISTS moments_public;
CREATE VIEW moments_public WITH (security_invoker = true) AS
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