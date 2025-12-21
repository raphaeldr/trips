-- Backfill destination_id for moments based on date ranges

-- Update moments that don't have a destination_id yet
UPDATE moments m
SET destination_id = d.id
FROM destinations d
WHERE 
    -- Only update if currently null
    m.destination_id IS NULL
    -- Date logic: taken_at must be >= arrival AND (<= departure OR departure is null)
    AND m.taken_at::date >= d.arrival_date
    AND (d.departure_date IS NULL OR m.taken_at::date <= d.departure_date);

-- Optional: If you want to force functionality even for existing ones (override), just remove 'm.destination_id IS NULL'
-- But usually safe to only fill gaps.

-- Verify results
-- SELECT m.id, m.taken_at, d.name as destination_name 
-- FROM moments m 
-- JOIN destinations d ON m.destination_id = d.id
-- WHERE m.destination_id IS NOT NULL;
