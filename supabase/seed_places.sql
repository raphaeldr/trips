-- Auto-generated seed file for visited_places
-- Logic:
-- 1. Cleans up existing visited places to maintain a clean state.
-- 2. Iterates through destinations chronologically to establish time windows.
-- 3. Generates 2-5 "visited places" per destination strictly within the arrival window of that destination.
-- 4. Places are located 20-500km from the destination (regional).
-- 5. Uses safe, generic naming logic (e.g., "Hidden Gem near Japan").

DO $$
DECLARE
    r RECORD;
    next_arrival TIMESTAMP WITH TIME ZONE;
    curr_arrival TIMESTAMP WITH TIME ZONE;
    place_time TIMESTAMP WITH TIME ZONE;
    
    -- Config
    min_dist_km FLOAT := 20;
    max_dist_km FLOAT := 500;
    
    -- Variables for generation
    dist FLOAT;
    bearing FLOAT;
    new_lat FLOAT;
    new_lng FLOAT;
    place_name TEXT;
    
    -- Safe naming list
    prefixes TEXT[] := ARRAY[
        'Hidden Gem', 
        'Scenic View', 
        'Local Market', 
        'Historic Site', 
        'Street Food', 
        'Hiking Trail', 
        'Art Corner', 
        'Cozy Cafe', 
        'Sunset Point', 
        'Old Town',
        'Cultural Center',
        'Botanical Garden'
    ];
    
    places_per_dest INT;
    i INT;
    ref_name TEXT;
BEGIN
    -- 1. Clean up old visited_places to ensure consistency
    DELETE FROM visited_places;

    -- 2. Iterate destinations ordered by time
    FOR r IN SELECT * FROM destinations ORDER BY arrival_date ASC
    LOOP
        curr_arrival := r.arrival_date;
        
        -- Get next destination's arrival date to close the window
        SELECT arrival_date INTO next_arrival 
        FROM destinations 
        WHERE arrival_date > curr_arrival 
        ORDER BY arrival_date ASC 
        LIMIT 1;

        -- If `next_arrival` is null (last destination), add a default buffer (e.g., 14 days)
        IF next_arrival IS NULL THEN
            next_arrival := curr_arrival + INTERVAL '14 days';
        END IF;

        -- Use country name for smarter naming, fallback to 'Destination'
        ref_name := COALESCE(r.country, 'Destination');

        -- Generate 2 to 5 places per destination
        places_per_dest := 2 + floor(random() * 4)::INT;

        FOR i IN 1..places_per_dest LOOP
            -- A. Chronological Consistency: Random time within [curr_arrival, next_arrival)
            place_time := curr_arrival + (random() * (extract(epoch from (next_arrival - curr_arrival)) * interval '1 second'));

            -- B. Logical Naming
            place_name := prefixes[1 + floor(random() * array_length(prefixes, 1))::INT] || ' near ' || ref_name;

            -- C. Proximity: 20-500km
            dist := min_dist_km + random() * (max_dist_km - min_dist_km);
            bearing := random() * 2 * PI();

            -- Simple spherical shift
            -- 1 degree lat ~= 111.32 km
            new_lat := r.latitude + (dist / 111.32) * cos(bearing);
            
            -- 1 degree lng ~= 111.32 * cos(lat). Avoid division by zero at poles.
            IF abs(r.latitude) < 89.9 THEN
                new_lng := r.longitude + (dist / (111.32 * cos(radians(r.latitude)))) * sin(bearing);
            ELSE
                new_lng := r.longitude; -- minimal shift at poles
            END IF;

            INSERT INTO visited_places (name, latitude, longitude, first_visited_at)
            VALUES (place_name, new_lat, new_lng, place_time);
        END LOOP;
        
    END LOOP;
END $$;
