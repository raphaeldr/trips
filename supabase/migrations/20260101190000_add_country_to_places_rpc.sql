-- Update function to include country
create or replace function get_visited_places_from_moments()
returns table (
  id uuid,
  name text,
  country text,
  latitude double precision,
  longitude double precision,
  first_visited_at timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    extensions.uuid_generate_v5(extensions.uuid_ns_url(), m.location_name) as id,
    m.location_name as name,
    -- Get the most frequent country for this location, or just the first one. 
    -- Mode() is good but maybe not available by default?
    -- Simple approach: take the first non-null country ordered by reliability or count.
    -- For now, let's just take the MAX(country) or MIN(country) to pick one.
    -- Or better: (array_agg(m.country order by m.taken_at desc))[1] to take the latest?
    -- Let's use the one associated with the first visit to be consistent? Or simply Mode.
    -- We'll use aggregation.
    (array_agg(m.country order by m.taken_at))[1] as country,
    (array_agg(m.latitude order by m.taken_at))[1]::double precision as latitude,
    (array_agg(m.longitude order by m.taken_at))[1]::double precision as longitude,
    min(m.taken_at) as first_visited_at
  from moments m
  left join destinations d on lower(d.name) = lower(m.location_name)
  where m.location_name is not null 
    and m.latitude is not null
    and m.media_type != 'text'
    and d.id is null
  group by m.location_name;
end;
$$;

GRANT EXECUTE ON FUNCTION get_visited_places_from_moments() TO anon, authenticated;
