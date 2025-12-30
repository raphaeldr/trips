-- Create a function to get the manifest of gallery groups (locations)
-- for pagination purposes.

create or replace function get_gallery_manifest(limit_val int, offset_val int)
returns table (
  country text,
  place text,
  destination_id uuid,
  location_name text,
  max_taken_at timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    coalesce(d.country, 'Other Locations') as country,
    coalesce(d.name, m.location_name, '') as place,
    max(m.destination_id::text)::uuid as destination_id, -- Use Max to pick one valid ID if grouping matches
    max(m.location_name) as location_name,   -- Use Max to pick one valid name
    max(m.taken_at) as max_taken_at
  from moments m
  left join destinations d on m.destination_id = d.id
  where m.media_type in ('photo', 'video', 'audio', 'text')
  group by 1, 2
  order by max_taken_at desc
  limit limit_val offset offset_val;
end;
$$;

GRANT EXECUTE ON FUNCTION get_gallery_manifest(int, int) TO anon, authenticated;
