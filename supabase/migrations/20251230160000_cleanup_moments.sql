-- CLEANUP DATABASE
-- Truncate the moments table to remove all pictures.
-- CASCADE will also remove related entries in story_moments.

TRUNCATE TABLE moments CASCADE;
