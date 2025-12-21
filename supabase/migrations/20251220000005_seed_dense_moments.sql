-- Seed dense data for Moments page visualization
-- This script adds dummy moments across several destination countries

-- Function to generate random dates
create or replace function random_date(start_date date, end_date date) 
returns timestamp with time zone as $$
begin
  return timestamp with time zone '2025-01-01 00:00:00+00' +
    random() * (extract(epoch from (end_date - start_date)) * interval '1 second');
end;
$$ language plpgsql;

DO $$
DECLARE
  dest_id uuid;
  target_user_id uuid;
  i integer;
  countries text[] := ARRAY['Japan', 'Italy', 'France', 'Australia', 'Brazil', 'Canada', 'Iceland'];
  country_name text;
  continent_name text;
  dest_lat float;
  dest_long float;
BEGIN
  -- Get the first user to assign moments to
  SELECT id INTO target_user_id FROM auth.users LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'No user found in auth.users, skipping seed data.';
    RETURN;
  END IF;

  -- Clear existing test data to ensure clean slate (remove old valid/invalid moments)
  DELETE FROM moments WHERE title LIKE 'Test Moment %';
  DELETE FROM destinations WHERE name LIKE '% Trip' AND country = ANY(countries);

  FOREACH country_name IN ARRAY countries LOOP
    -- Ensure destination exists or get one
    SELECT id INTO dest_id FROM destinations WHERE country = country_name LIMIT 1;
    
    IF dest_id IS NULL THEN
      -- Determine continent and coordinates
      CASE country_name
        WHEN 'Japan' THEN 
          continent_name := 'Asia';
          dest_lat := 36.2048; dest_long := 138.2529;
        WHEN 'Italy' THEN 
          continent_name := 'Europe';
          dest_lat := 41.8719; dest_long := 12.5674;
        WHEN 'France' THEN 
          continent_name := 'Europe';
          dest_lat := 46.2276; dest_long := 2.2137;
        WHEN 'Australia' THEN 
          continent_name := 'Oceania';
          dest_lat := -25.2744; dest_long := 133.7751;
        WHEN 'Brazil' THEN 
          continent_name := 'South America';
          dest_lat := -14.2350; dest_long := -51.9253;
        WHEN 'Canada' THEN 
          continent_name := 'North America';
          dest_lat := 56.1304; dest_long := -106.3468;
        WHEN 'Iceland' THEN 
          continent_name := 'Europe';
          dest_lat := 64.9631; dest_long := -19.0208;
        ELSE 
          continent_name := 'Europe'; -- Fallback
          dest_lat := 48.8566; dest_long := 2.3522;
      END CASE;

      INSERT INTO destinations (name, country, continent, latitude, longitude, arrival_date, departure_date)
      VALUES (country_name || ' Trip', country_name, continent_name, dest_lat, dest_long, '2025-01-01', '2025-01-14')
      RETURNING id INTO dest_id;
    END IF;

    -- Insert 15-20 photos per country
    FOR i IN 1..(15 + floor(random() * 10)::int) LOOP
      INSERT INTO moments (
        destination_id,
        title,
        description,
        media_type,
        mime_type,
        storage_path,
        taken_at,
        created_at,
        updated_at,
        is_hero,
        status,
        user_id
      ) VALUES (
        dest_id,
        'Test Moment ' || country_name || ' ' || i,
        'A beautiful shot from ' || country_name,
        'photo',
        'image/jpeg',
        -- Use Lorem Picsum with specific IDs to guarantee valid images (avoiding 404s from random seeds)
        'https://picsum.photos/id/' || (10 + floor(random() * 100))::text || '/800/1000',
        NOW() - (random() * 365 || ' days')::interval,
        NOW(),
        NOW(),
        (random() > 0.9), -- 10% chance of hero
        'published',
        target_user_id
      );
    END LOOP;
  END LOOP;
END $$;
