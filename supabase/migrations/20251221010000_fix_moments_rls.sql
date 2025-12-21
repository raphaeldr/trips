-- Fix RLS: Ensure `user_id` is mandatory and matches auth.uid()
-- Re-applying the policy correctly since previous attempts might have been shaky or overwritten.

-- First, ensure the policy exists cleanly
DROP POLICY IF EXISTS "Users can insert their own moments" ON moments;

CREATE POLICY "Users can insert their own moments"
ON moments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also ensure update policy is correct
DROP POLICY IF EXISTS "Users can update their own moments" ON moments;

CREATE POLICY "Users can update their own moments"
ON moments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Ensure public view is correct (read-only for anon/everyone)
DROP POLICY IF EXISTS "Moments are viewable by everyone" ON moments;

CREATE POLICY "Moments are viewable by everyone"
ON moments
FOR SELECT
USING (true);
