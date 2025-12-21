-- Cleanup Test Data
-- Deletes all moments that differ from normal Supabase uploads (i.e. those with http links)

DELETE FROM public.moments 
WHERE storage_path LIKE 'http%' 
   OR (media_type = 'text' AND caption LIKE 'Arrived in Chile%');
