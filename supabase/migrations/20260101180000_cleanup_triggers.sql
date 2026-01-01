-- Cleanup Migration
-- Drop the triggering function and trigger that references the deleted visited_places table.
-- Also drop the orphaned column.

DROP TRIGGER IF EXISTS trigger_moment_association ON public.moments;
DROP FUNCTION IF EXISTS public.handle_moment_association();

-- Drop the column that referenced visited_places
ALTER TABLE public.moments DROP COLUMN IF EXISTS visited_place_id;
