-- Seed Test Data (v2)
-- Uses reliable Picsum Lorem Ipsum images
-- Populates thumbnail_path to avoid logic gaps

-- CLEANUP FIRST: Remove any previous test data to avoid duplicates
DELETE FROM public.moments 
WHERE storage_path LIKE 'http%';

-- Insert new test data
WITH user_ref AS (
  SELECT '0b5714ef-24f4-47bc-a097-9835bda2a723'::uuid as uid -- Raphaël's ID
)
INSERT INTO public.moments (destination_id, user_id, media_type, mime_type, storage_path, thumbnail_path, caption, taken_at, status)
VALUES
  -- Luxembourg (Start)
  (
    (SELECT id FROM destinations WHERE name = 'Luxembourg' LIMIT 1),
    (SELECT uid FROM user_ref),
    'photo', 'image/jpeg', 
    'https://picsum.photos/seed/lux1/800/800', -- Storage
    'https://picsum.photos/seed/lux1/200/200', -- Thumbnail
    'Starting the journey! Adieu Luxembourg for now.',
    '2026-02-17 10:00:00',
    'published'
  ),
  
  -- Buenos Aires
  (
    (SELECT id FROM destinations WHERE name = 'Buenos Aires' LIMIT 1),
    (SELECT uid FROM user_ref),
    'photo', 'image/jpeg', 
    'https://picsum.photos/seed/baires/800/600',
    'https://picsum.photos/seed/baires/200/150',
    'The colors of La Boca are incredible.',
    '2026-02-20 14:30:00',
    'published'
  ),

  -- Mexico City
  (
    (SELECT id FROM destinations WHERE name = 'Mexico City' LIMIT 1),
    (SELECT uid FROM user_ref),
    'photo', 'image/jpeg', 
    'https://picsum.photos/seed/mexico/800/800',
    'https://picsum.photos/seed/mexico/200/200',
    'Zocalo square is massive.',
    '2026-03-16 09:15:00',
    'published'
  ),

  -- Tokyo (Video - using a public reliable MP4)
  (
    (SELECT id FROM destinations WHERE name = 'Tokyo' LIMIT 1),
    (SELECT uid FROM user_ref),
    'video', 'video/mp4', 
    'https://videos.pexels.com/video-files/855564/855564-sd_640_360_30fps.mp4',
    'https://picsum.photos/seed/tokyo_vid/200/200', -- Fake thumbnail for video
    'Walking through the neon streets.',
    '2026-03-20 20:00:00',
    'published'
  ),
  
  -- Tokyo (Photo)
  (
    (SELECT id FROM destinations WHERE name = 'Tokyo' LIMIT 1),
    (SELECT uid FROM user_ref),
    'photo', 'image/jpeg', 
    'https://picsum.photos/seed/tokyo2/800/800', 
    'https://picsum.photos/seed/tokyo2/200/200',
    'Shibuya crossing is organized chaos.',
    '2026-03-21 11:00:00',
    'published'
  ),

  -- Auckland
  (
    (SELECT id FROM destinations WHERE name = 'Auckland' LIMIT 1),
    (SELECT uid FROM user_ref),
    'photo', 'image/jpeg', 
    'https://picsum.photos/seed/auckland/800/600',
    'https://picsum.photos/seed/auckland/200/150',
    'Kia Ora! view from the Sky Tower.',
    '2026-03-30 16:20:00',
    'published'
  ),

  -- Melbourne
  (
    (SELECT id FROM destinations WHERE name = 'Melbourne' LIMIT 1),
    (SELECT uid FROM user_ref),
    'photo', 'image/jpeg', 
    'https://picsum.photos/seed/melb/800/800',
    'https://picsum.photos/seed/melb/200/200',
    'Coffee culture here is real.',
    '2026-05-12 08:30:00',
    'published'
  ),

  -- Perth
  (
    (SELECT id FROM destinations WHERE name = 'Perth' LIMIT 1),
    (SELECT uid FROM user_ref),
    'photo', 'image/jpeg', 
    'https://picsum.photos/seed/perth/800/600',
    'https://picsum.photos/seed/perth/200/150',
    'Beautiful sunset over the Indian Ocean.',
    '2026-07-01 19:00:00',
    'published'
  ),

  -- Singapore
  (
    (SELECT id FROM destinations WHERE name = 'Singapore' LIMIT 1),
    (SELECT uid FROM user_ref),
    'photo', 'image/jpeg', 
    'https://picsum.photos/seed/sing/800/800',
    'https://picsum.photos/seed/sing/200/200',
    'Marina Bay Sands looks like a spaceship.',
    '2026-07-05 21:00:00',
    'published'
  ),

  -- Frankfurt
  (
    (SELECT id FROM destinations WHERE name = 'Frankfurt' LIMIT 1),
    (SELECT uid FROM user_ref),
    'photo', 'image/jpeg', 
    'https://picsum.photos/seed/frank/800/600',
    'https://picsum.photos/seed/frank/200/150',
    'Final stop before home.',
    '2026-08-01 14:00:00',
    'published'
  );
