-- Refine Schema for "Moments-first" Architecture

-- 1. Ensure moments table has correct defaults and strict status
ALTER TABLE public.moments 
  ALTER COLUMN status SET DEFAULT 'draft',
  ADD CONSTRAINT status_check CHECK (status IN ('draft', 'published', 'archived'));

-- 2. Create visited_places table (Emergent/Automatic)
CREATE TABLE IF NOT EXISTS public.visited_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_name TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  first_visited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_visited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  moment_count INTEGER DEFAULT 1,
  
  -- Prevent manual editing lock (optional convention)
  is_system_managed BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  UNIQUE(place_name, country) -- Simple de-duplication strategy
);

-- Enable RLS
ALTER TABLE public.visited_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visited places are viewable by everyone"
  ON public.visited_places FOR SELECT
  USING (true);

-- Only service role or postgres should generally update this if it's strictly auto-derived, 
-- but we allow authenticated users (the traveler) to trigger the creation via Edge Functions or Client logic for now.
CREATE POLICY "Authenticated users can insert visited_places"
  ON public.visited_places FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update visited_places"
  ON public.visited_places FOR UPDATE
  TO authenticated
  USING (true);

-- 3. Cleanup unused AI columns from moments (Optional, safe to keep but ignoring them per brief)
-- ALTER TABLE public.moments DROP COLUMN IF EXISTS ai_tags;
-- ALTER TABLE public.moments DROP COLUMN IF EXISTS ai_caption;
