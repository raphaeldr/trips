-- Seeding Test Data for Dual Place Logic (Planned vs Emergent)
-- This script inserts moments to verify:
-- 1. Auto-linking to 'Destinations' based on date.
-- 2. Auto-creation/linking of 'Visited Places' based on location clustering.

DO $$
DECLARE
  u_id UUID;
BEGIN
  -- Get the first user (assuming it's the admin/test user)
  SELECT id INTO u_id FROM auth.users LIMIT 1;

  IF u_id IS NOT NULL THEN
    -- 1. Tokyo Itinerary (Mar 18 - Mar 28)
    -----------------------------------------------------
    
    -- Moment A: Tsukiji Market (Place 1)
    -- Date: Mar 20 (Inside Tokyo window)
    INSERT INTO public.moments (user_id, status, title, taken_at, latitude, longitude, location_name, media_type)
    VALUES (u_id, 'published', 'Sushi Breakfast', '2026-03-20 08:00:00+00', 35.6655, 139.7706, 'Tsukiji Outer Market', 'photo');

    -- Moment B: Tsukiji Market (Same Place - distinct but very close coords)
    -- Should link to SAME Visited Place as Moment A
    INSERT INTO public.moments (user_id, status, title, taken_at, latitude, longitude, location_name, media_type)
    VALUES (u_id, 'published', 'More Sushi', '2026-03-20 09:00:00+00', 35.6656, 139.7707, 'Tsukiji Outer Market', 'photo');

    -- Moment C: Shibuya (Distinct Place 2 - >5km away from Tsukiji)
    -- Should create NEW Visited Place
    INSERT INTO public.moments (user_id, status, title, taken_at, latitude, longitude, location_name, media_type)
    VALUES (u_id, 'published', 'Shibuya Crossing', '2026-03-21 14:00:00+00', 35.6580, 139.7016, 'Shibuya Crossing', 'video');


    -- 2. Santiago Itinerary (Mar 05 - Mar 15)
    -----------------------------------------------------
    
    -- Moment D: Santiago Center
    -- Date: Mar 10 (Inside Santiago window)
    INSERT INTO public.moments (user_id, status, title, taken_at, latitude, longitude, location_name, media_type)
    VALUES (u_id, 'published', 'Andes View', '2026-03-10 10:00:00+00', -33.4489, -70.6693, 'Santiago View', 'photo');

  END IF;
END $$;
