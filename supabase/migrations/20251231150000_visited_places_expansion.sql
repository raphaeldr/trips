-- Add country and continent columns to visited_places table
ALTER TABLE visited_places 
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS continent text;

-- Optional: You might want to backfill these later using a geocoding script/function
-- For now we just add the columns so the UI can populate them if we update the seeding logic or manual entry.
