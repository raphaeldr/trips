
-- Fix Segments Table
ALTER TABLE public.segments 
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS continent text,
ADD COLUMN IF NOT EXISTS arrival_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS departure_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS description text;

-- Fix Places Table
ALTER TABLE public.places 
ADD COLUMN IF NOT EXISTS segment_id uuid REFERENCES public.segments(id),
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS first_visited_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_visited_at timestamp with time zone;

-- Fix Media Table
ALTER TABLE public.media 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS segment_id uuid REFERENCES public.segments(id),
ADD COLUMN IF NOT EXISTS place_id uuid REFERENCES public.places(id),
ADD COLUMN IF NOT EXISTS taken_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS location_name text,
ADD COLUMN IF NOT EXISTS width integer,
ADD COLUMN IF NOT EXISTS height integer,
ADD COLUMN IF NOT EXISTS description text;

-- Add RLS Policies (Basic)
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.segments FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.segments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.segments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable read access for all users" ON public.places FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.places FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.places FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable read access for all users" ON public.media FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.media FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.media FOR UPDATE TO authenticated USING (true);
