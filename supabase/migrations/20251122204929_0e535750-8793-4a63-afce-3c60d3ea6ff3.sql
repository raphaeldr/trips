-- Add is_hero field to photos table
ALTER TABLE photos ADD COLUMN is_hero boolean DEFAULT false;

-- Create index for faster hero image lookup
CREATE INDEX idx_photos_is_hero ON photos(is_hero) WHERE is_hero = true;

-- Create a function to ensure only one hero image at a time
CREATE OR REPLACE FUNCTION ensure_single_hero_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_hero = true THEN
    -- Set all other photos to not be hero
    UPDATE photos SET is_hero = false WHERE id != NEW.id AND is_hero = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single hero image
CREATE TRIGGER trigger_ensure_single_hero_image
BEFORE INSERT OR UPDATE ON photos
FOR EACH ROW
WHEN (NEW.is_hero = true)
EXECUTE FUNCTION ensure_single_hero_image();