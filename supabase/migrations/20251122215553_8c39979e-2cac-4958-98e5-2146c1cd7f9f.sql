-- Add column to store animated version of photos (video or animated image)
ALTER TABLE public.photos
ADD COLUMN animated_path text;

-- Add comment to explain the column
COMMENT ON COLUMN public.photos.animated_path IS 'Storage path for animated version of the photo (video/GIF for subtle animations like moving water, clouds, swaying branches)';
