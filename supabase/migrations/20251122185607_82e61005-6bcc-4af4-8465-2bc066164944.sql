-- First, create the has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(check_user_id UUID, check_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = check_user_id
    AND user_roles.role = check_role
  );
END;
$$;

-- Create user_roles table for proper role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Update trip_settings policies
DROP POLICY IF EXISTS "Authenticated users can update trip settings" ON public.trip_settings;

CREATE POLICY "Only admins can update trip settings"
  ON public.trip_settings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update destinations policies
DROP POLICY IF EXISTS "Authenticated users can insert destinations" ON public.destinations;
DROP POLICY IF EXISTS "Authenticated users can update destinations" ON public.destinations;
DROP POLICY IF EXISTS "Authenticated users can delete destinations" ON public.destinations;

CREATE POLICY "Only admins can insert destinations"
  ON public.destinations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update destinations"
  ON public.destinations
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete destinations"
  ON public.destinations
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update journey_points policies
DROP POLICY IF EXISTS "Authenticated users can insert journey points" ON public.journey_points;
DROP POLICY IF EXISTS "Authenticated users can update journey points" ON public.journey_points;
DROP POLICY IF EXISTS "Authenticated users can delete journey points" ON public.journey_points;

CREATE POLICY "Only admins can insert journey points"
  ON public.journey_points
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update journey points"
  ON public.journey_points
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete journey points"
  ON public.journey_points
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));