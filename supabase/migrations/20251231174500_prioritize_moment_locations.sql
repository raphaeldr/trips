-- Update get_gallery_manifest to prioritize organic moment locations over destination names
-- This ensures "Reality" (where the photo was taken) is shown instead of "Plan" (the broad trip destination).

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
    -- Priority: Moment Country -> Destination Country -> Fallback
    coalesce(max(m.country), max(d.country), 'Other Locations') as country,
    
    -- Priority: Moment Location -> Destination Name -> Fallback
    coalesce(max(m.location_name), max(d.name), '') as place,
    
    max(m.destination_id::text)::uuid as destination_id,
    max(m.location_name) as location_name,
    max(m.taken_at) as max_taken_at
  from moments m
  left join destinations d on m.destination_id = d.id
  where m.media_type in ('photo', 'video', 'audio', 'text')
  -- We group by the PRIORITY Result. 
  -- Note: Grouping by calculated columns in SQL usually requires repeating the expression or using a subquery.
  -- To keep it simple and performant, we'll group by the raw columns that define the "Event" 
  -- BUT wait, we want to group by the DISPLAY Place.
  -- If we group by m.location_name, distinct locations like "Buenos Aires" and "Tigre" will be separate groups, even if they share a Destination.
  -- This IS what we want: Distinct "Visited Places".
  
  group by 
    coalesce(m.location_name, d.name, ''),
    coalesce(m.country, d.country, 'Other Locations')
    
  order by max_taken_at desc
  limit limit_val offset offset_val;
end;
$$;
