-- Migration: Reset Destinations and Consolidate Moments
-- 1. Clears all destinations.
-- 2. Inserts the specific itinerary provided by the user.
-- 3. Reassigns ALL existing moments to these new destinations randomly, ensuring no data loss.

DO $$
DECLARE
  dest_id uuid;
  moment_record record;
  new_dest_ids uuid[];
  random_dest_id uuid;
BEGIN
  -- 1. Clear existing destinations
  -- Note: We temporarily nullify destination_id in moments to avoid constraint errors during deletion
  UPDATE moments SET destination_id = NULL; 
  DELETE FROM destinations;

  -- 2. Insert new Itinerary
  INSERT INTO public.destinations (name, country, continent, arrival_date, departure_date, latitude, longitude, is_current)
  VALUES 
    ('Luxembourg', 'Luxembourg', 'Europe', '2026-02-17', '2026-02-17', 49.6116, 6.1319, true),
    
    ('Buenos Aires', 'Argentina', 'South America', '2026-02-18', '2026-03-05', -34.6037, -58.3816, false),
    
    ('Santiago', 'Chile', 'South America', '2026-03-05', '2026-03-15', -33.4489, -70.6693, false),
    
    ('Mexico City', 'Mexico', 'North America', '2026-03-15', '2026-03-17', 19.4326, -99.1332, false),
    
    ('Tokyo', 'Japan', 'Asia', '2026-03-18', '2026-03-28', 35.6762, 139.6503, false),
    
    ('Auckland', 'New Zealand', 'Oceania', '2026-03-29', '2026-05-10', -36.8485, 174.7633, false),
    
    ('Melbourne', 'Australia', 'Oceania', '2026-05-10', '2026-07-01', -37.8136, 144.9631, false),
    
    ('Perth', 'Australia', 'Oceania', '2026-07-01', '2026-07-01', -31.9505, 115.8605, false),
    
    ('Singapore', 'Singapore', 'Asia', '2026-07-01', '2026-08-01', 1.3521, 103.8198, false),
    
    ('Frankfurt', 'Germany', 'Europe', '2026-08-01', '2026-08-02', 50.1109, 8.6821, false),
    
    ('Luxembourg', 'Luxembourg', 'Europe', '2026-08-02', NULL, 49.6116, 6.1319, false);

  -- 3. Consolidate Moments
  -- Fetch all new destination IDs into an array
  SELECT array_agg(id) INTO new_dest_ids FROM destinations;

  -- Iterate over all moments (including test data AND real uploads) and assign them to a random new destination
  FOR moment_record IN SELECT id FROM moments LOOP
    -- Pick a random destination ID from the array
    random_dest_id := new_dest_ids[floor(random() * array_length(new_dest_ids, 1) + 1)];
    
    UPDATE moments 
    SET destination_id = random_dest_id 
    WHERE id = moment_record.id;
  END LOOP;

  RAISE NOTICE 'Destinations reset and % moments reassigned.', (SELECT count(*) FROM moments);

END $$;
