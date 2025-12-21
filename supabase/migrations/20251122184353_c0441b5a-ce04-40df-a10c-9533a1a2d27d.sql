-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Profiles table for family members
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Destinations table (countries/cities visited)
CREATE TABLE public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  continent TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  arrival_date DATE NOT NULL,
  departure_date DATE,
  description TEXT,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Photos table with EXIF data and AI tags
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination_id UUID REFERENCES public.destinations(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  title TEXT,
  description TEXT,
  
  -- EXIF data
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  taken_at TIMESTAMP WITH TIME ZONE,
  camera_make TEXT,
  camera_model TEXT,
  
  -- AI-generated tags
  ai_tags TEXT[] DEFAULT '{}',
  ai_caption TEXT,
  
  -- Metadata
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  mime_type TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Blog posts with rich content
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination_id UUID REFERENCES public.destinations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL, -- Rich content (text, images, videos, audio)
  excerpt TEXT,
  cover_image_url TEXT,
  
  -- SEO
  meta_description TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Featured
  is_featured BOOLEAN DEFAULT false,
  featured_order INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Stories (Instagram-style daily highlights)
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination_id UUID REFERENCES public.destinations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  
  -- Story content (array of media items)
  media JSONB NOT NULL, -- [{type: 'photo', url: '...', caption: '...'}, ...]
  
  -- Highlight settings
  is_highlight BOOLEAN DEFAULT false,
  highlight_cover_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Journey points for animated map route
CREATE TABLE public.journey_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  is_live BOOLEAN DEFAULT false, -- For real-time tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Reactions (likes, emojis on content)
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Polymorphic references
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_post', 'photo', 'story')),
  content_id UUID NOT NULL,
  
  -- Reaction type
  emoji TEXT NOT NULL, -- '❤️', '😍', '🔥', '👍', etc.
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  UNIQUE(user_id, content_type, content_id, emoji)
);

-- Trip settings (for the day counter and global settings)
CREATE TABLE public.trip_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  family_name TEXT DEFAULT 'Anderson Family',
  tagline TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert initial trip settings
INSERT INTO public.trip_settings (start_date, end_date, total_days, family_name, tagline)
VALUES ('2024-01-10', '2024-07-08', 180, 'Anderson Family', 'Six Months. One World. Infinite Memories.');

-- Create indexes for better query performance
CREATE INDEX idx_photos_user_id ON public.photos(user_id);
CREATE INDEX idx_photos_destination_id ON public.photos(destination_id);
CREATE INDEX idx_photos_taken_at ON public.photos(taken_at);
CREATE INDEX idx_photos_ai_tags ON public.photos USING GIN(ai_tags);

CREATE INDEX idx_blog_posts_user_id ON public.blog_posts(user_id);
CREATE INDEX idx_blog_posts_destination_id ON public.blog_posts(destination_id);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at);
CREATE INDEX idx_blog_posts_is_featured ON public.blog_posts(is_featured);

CREATE INDEX idx_stories_user_id ON public.stories(user_id);
CREATE INDEX idx_stories_destination_id ON public.stories(destination_id);
CREATE INDEX idx_stories_date ON public.stories(date);

CREATE INDEX idx_journey_points_destination_id ON public.journey_points(destination_id);
CREATE INDEX idx_journey_points_recorded_at ON public.journey_points(recorded_at);

CREATE INDEX idx_reactions_content ON public.reactions(content_type, content_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for destinations (public read, admin write)
CREATE POLICY "Destinations are viewable by everyone"
  ON public.destinations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert destinations"
  ON public.destinations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update destinations"
  ON public.destinations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete destinations"
  ON public.destinations FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for photos (public read, owner write)
CREATE POLICY "Photos are viewable by everyone"
  ON public.photos FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own photos"
  ON public.photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos"
  ON public.photos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
  ON public.photos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for blog posts (public read published, owner write)
CREATE POLICY "Published blog posts are viewable by everyone"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own blog posts"
  ON public.blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blog posts"
  ON public.blog_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blog posts"
  ON public.blog_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for stories (public read, owner write)
CREATE POLICY "Stories are viewable by everyone"
  ON public.stories FOR SELECT
  USING (true);

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

-- RLS Policies for journey points (public read, admin write)
CREATE POLICY "Journey points are viewable by everyone"
  ON public.journey_points FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert journey points"
  ON public.journey_points FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update journey points"
  ON public.journey_points FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete journey points"
  ON public.journey_points FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for reactions (public read, user write own)
CREATE POLICY "Reactions are viewable by everyone"
  ON public.reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert reactions"
  ON public.reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own reactions"
  ON public.reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for trip settings (public read, admin write)
CREATE POLICY "Trip settings are viewable by everyone"
  ON public.trip_settings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update trip settings"
  ON public.trip_settings FOR UPDATE
  TO authenticated
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_photos_updated_at
  BEFORE UPDATE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_settings_updated_at
  BEFORE UPDATE ON public.trip_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();