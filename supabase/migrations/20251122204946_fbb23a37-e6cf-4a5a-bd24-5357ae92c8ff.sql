-- Fix search_path for the ensure_single_hero_image function
CREATE OR REPLACE FUNCTION ensure_single_hero_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_hero = true THEN
    -- Set all other photos to not be hero
    UPDATE photos SET is_hero = false WHERE id != NEW.id AND is_hero = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;