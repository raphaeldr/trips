-- Migration: Stories and Weekly Summaries
-- Purpose: Add support for weekly narrative summaries and curated stories (collections of moments).

-- CLEANUP/RESET: Ensure we start fresh to avoid partial schema mismatches
-- (e.g. if a previous run created the table but failed later)
DROP TABLE IF EXISTS public.story_moments CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;
DROP TABLE IF EXISTS public.weekly_summaries CASCADE;

-- 1. Weekly Summaries Table
-- Simple storage for the text associated with a specific week.
CREATE TABLE public.weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  summary TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure only one summary per week per user
  UNIQUE(week_start_date, user_id)
);

-- 2. Stories Table (The container)
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_path TEXT, 
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Story Moments (The many-to-many link)
CREATE TABLE public.story_moments (
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  moment_id UUID REFERENCES public.moments(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  
  PRIMARY KEY (story_id, moment_id)
);

-- RLS POLICIES

-- Enable RLS
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_moments ENABLE ROW LEVEL SECURITY;

-- Weekly Summaries: Public Read, Auth Write
CREATE POLICY "Summaries are viewable by everyone" 
  ON public.weekly_summaries FOR SELECT USING (true);

CREATE POLICY "Users can insert their own summaries" 
  ON public.weekly_summaries FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own summaries" 
  ON public.weekly_summaries FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Stories: Public Read (if published), Auth Read All, Auth Write
CREATE POLICY "Stories are viewable by everyone" 
  ON public.stories FOR SELECT 
  USING (is_published = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own stories" 
  ON public.stories FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" 
  ON public.stories FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" 
  ON public.stories FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Story Moments: Inherit access from Story or Public Read
CREATE POLICY "Story moments are viewable by everyone" 
  ON public.story_moments FOR SELECT 
  USING (true);

CREATE POLICY "Users can manage story moments" 
  ON public.story_moments FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.stories 
      WHERE id = story_moments.story_id 
      AND user_id = auth.uid()
    )
  );
