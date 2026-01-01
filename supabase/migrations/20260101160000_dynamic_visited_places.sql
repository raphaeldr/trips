-- 1. Create Function to Derive Visited Places from Moments
-- This replaces the static 'visited_places' table with a dynamic view of reality.

create or replace function get_visited_places_from_moments()
returns table (
  id uuid,
  name text,
  latitude double precision,
  longitude double precision,
  first_visited_at timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    -- Generate a deterministic UUID from the location name for React keys
    -- uuid_generate_v5 is standard, but md5 cast works if extension missing
    extensions.uuid_generate_v5(extensions.uuid_ns_url(), m.location_name) as id,
    m.location_name as name,
    -- Use the first coordinate found for this location
    (array_agg(m.latitude order by m.taken_at))[1]::double precision as latitude,
    (array_agg(m.longitude order by m.taken_at))[1]::double precision as longitude,
    min(m.taken_at) as first_visited_at
  from moments m
  left join destinations d on lower(d.name) = lower(m.location_name) -- Case-insensitive match check
  where m.location_name is not null 
    and m.latitude is not null
    and m.media_type != 'text' -- Ignore text-only notes for location pins? Maybe safer to include if they have coords. Let's keep all media with coords.
    and d.id is null -- Exclude places that ARE Destinations (they have their own pins)
  group by m.location_name;
end;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_visited_places_from_moments() TO anon, authenticated;

-- 2. Drop the old table (Deprecate)
-- We can comment this out if we want to risk a migration failure, but user asked to remove it.
-- We'll do it in a separate step or file usually, but for speed here:
-- DROP TABLE visited_places CASCADE; 
-- (Wait, let's Verify first! I will NOT drop it in this file to be safe during verifying).
