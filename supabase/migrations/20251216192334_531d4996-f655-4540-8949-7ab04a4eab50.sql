
-- Fix the broken trigger that still references 'photos' table
CREATE OR REPLACE FUNCTION ensure_single_hero_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_hero = true THEN
    UPDATE moments SET is_hero = false WHERE id != NEW.id AND is_hero = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
