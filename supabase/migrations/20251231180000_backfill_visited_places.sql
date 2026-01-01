-- Backfill visited_places from existing moments
-- This script creates "Reality" (Visited Places) records from your existing "Moment" data.

-- 1. Insert missing Visited Places
INSERT INTO visited_places (user_id, name, country, latitude, longitude, first_visited_at, last_visited_at)
SELECT DISTINCT ON (m.location_name, m.country)
  m.user_id,
  m.location_name,
  COALESCE(m.country, d.country, 'Unknown') as country,
  m.latitude,
  m.longitude,
  min(m.taken_at) over (partition by m.location_name) as first_visited_at,
  max(m.taken_at) over (partition by m.location_name) as last_visited_at
FROM moments m
LEFT JOIN destinations d ON m.destination_id = d.id
WHERE m.location_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM visited_places vp 
    WHERE vp.name = m.location_name 
      AND vp.user_id = m.user_id
  );

-- 2. Link Moments to Visited Places
UPDATE moments m
SET visited_place_id = vp.id
FROM visited_places vp
WHERE m.location_name IS NOT NULL
  AND m.location_name = vp.name
  AND m.user_id = vp.user_id
  AND m.visited_place_id IS NULL;
