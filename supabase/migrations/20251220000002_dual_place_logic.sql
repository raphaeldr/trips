-- 1. Visited Places Table (Emergent)
DROP TABLE IF EXISTS public.visited_places CASCADE;

CREATE TABLE public.visited_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT DEFAULT 'Unnamed Place',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  first_visited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_visited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for visited_places
-- Enable RLS for visited_places
ALTER TABLE public.visited_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visited places are public" ON public.visited_places;
CREATE POLICY "Visited places are public" ON public.visited_places FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users manage their places" ON public.visited_places;
CREATE POLICY "Auth users manage their places" ON public.visited_places FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 2. Modify Moments Table
ALTER TABLE public.moments 
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS visited_place_id UUID REFERENCES public.visited_places(id) ON DELETE SET NULL;

-- 3. Auto-Association Function (The Brain)
CREATE OR REPLACE FUNCTION public.handle_moment_association()
RETURNS TRIGGER AS $$
DECLARE
  matching_destination_id UUID;
  nearby_place_id UUID;
  dist_meters FLOAT;
BEGIN
  -- A. Link to Itinerary Stop (Planned Anchor) based on DATE
  -- Find a destination where moment.taken_at is between arrival and departure
  -- (If departure is null, we can assume it's valid until the next one starts, or just ignore. 
  --  Here we strictly use the range if available, or just arrival date if current)
  IF NEW.taken_at IS NOT NULL THEN
    SELECT id INTO matching_destination_id
    FROM public.destinations
    WHERE NEW.taken_at >= arrival_date::timestamp
    AND (departure_date IS NULL OR NEW.taken_at <= departure_date::timestamp)
    ORDER BY arrival_date DESC
    LIMIT 1;

    IF matching_destination_id IS NOT NULL THEN
      NEW.destination_id := matching_destination_id;
    END IF;
  END IF;

  -- B. Link to Visited Place (Emergent) based on LOCATION (Proximity)
  -- Only if the moment has coordinates
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    -- 1. Search for a nearby existing visited place (within 5km = 5000m)
    -- Using simple spherical distance for now (PostGIS would be better but keeping it dependency-free if possible)
    -- Haversine approximation or just a simple box check if precision isn't critical.
    -- Let's use a postgres extensions-independent approximation: 1 deg lat ~= 111km.
    
    SELECT id INTO nearby_place_id
    FROM public.visited_places
    WHERE 
      abs(latitude - NEW.latitude) < 0.05 -- approx 5km lat
      AND abs(longitude - NEW.longitude) < 0.05 -- approx 5km lon
      AND (
        -- Refined distance check (Haversine-ish)
        (point(longitude, latitude) <@> point(NEW.longitude, NEW.latitude)) < 3.0 -- approx 3 miles / 5km
      )
    LIMIT 1;
    
    IF nearby_place_id IS NOT NULL THEN
       -- Found one, link it
       NEW.visited_place_id := nearby_place_id;
       
       -- Update the place's 'last_visited_at'
       UPDATE public.visited_places 
       SET last_visited_at = GREATEST(last_visited_at, NEW.taken_at, NOW())
       WHERE id = nearby_place_id;
       
    ELSE
       -- Create NEW Visited Place
       INSERT INTO public.visited_places (
         name, 
         latitude, 
         longitude, 
         user_id,
         first_visited_at, 
         last_visited_at
       ) 
       VALUES (
         COALESCE(NEW.location_name, 'New Place @ ' || round(NEW.latitude::numeric, 2) || ', ' || round(NEW.longitude::numeric, 2)),
         NEW.latitude, 
         NEW.longitude, 
         NEW.user_id,
         COALESCE(NEW.taken_at, NOW()), 
         COALESCE(NEW.taken_at, NOW())
       )
       RETURNING id INTO nearby_place_id;
       
       NEW.visited_place_id := nearby_place_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger
DROP TRIGGER IF EXISTS trigger_moment_association ON public.moments;

CREATE TRIGGER trigger_moment_association
BEFORE INSERT OR UPDATE OF taken_at, latitude, longitude ON public.moments
FOR EACH ROW
EXECUTE FUNCTION public.handle_moment_association();

-- Add cube and earthdistance extensions if not enabled (required for <@> operator)
-- Note: You need to respond if this fails due to privileges, cleaner to use simple math if possible.
-- Let's stick to simple Euclidean approx for now to ensure no extension errors:
-- Distance ~= sqrt((lat2-lat1)^2 + (lon2-lon1)^2) * 111km
-- Since we are doing logic inside PLPGSQL without extensions guarantee:
CREATE OR REPLACE FUNCTION public.handle_moment_association()
RETURNS TRIGGER AS $$
DECLARE
  matching_destination_id UUID;
  nearby_place_id UUID;
BEGIN
  -- A. Date Linking
  IF NEW.taken_at IS NOT NULL THEN
    SELECT id INTO matching_destination_id
    FROM public.destinations
    WHERE NEW.taken_at >= arrival_date::timestamp
    AND (departure_date IS NULL OR NEW.taken_at <= departure_date::timestamp)
    ORDER BY arrival_date DESC
    LIMIT 1;

    IF matching_destination_id IS NOT NULL THEN
      NEW.destination_id := matching_destination_id;
    END IF;
  END IF;

  -- B. Place Linking (Simple Euclidean Check)
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    
    SELECT id INTO nearby_place_id
    FROM public.visited_places
    WHERE 
      -- Simple box check approx 5km (0.045 degrees)
      abs(latitude - NEW.latitude) < 0.045
      AND abs(longitude - NEW.longitude) < 0.045
    LIMIT 1;
    
    IF nearby_place_id IS NOT NULL THEN
       NEW.visited_place_id := nearby_place_id;
       UPDATE public.visited_places 
       SET last_visited_at = GREATEST(last_visited_at, NEW.taken_at, NOW())
       WHERE id = nearby_place_id;
    ELSE
       INSERT INTO public.visited_places (name, latitude, longitude, user_id, first_visited_at, last_visited_at) 
       VALUES (
         COALESCE(NEW.location_name, 'New Place'),
         NEW.latitude, 
         NEW.longitude, 
         NEW.user_id,
         COALESCE(NEW.taken_at, NOW()), 
         COALESCE(NEW.taken_at, NOW())
       )
       RETURNING id INTO nearby_place_id;
       NEW.visited_place_id := nearby_place_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
