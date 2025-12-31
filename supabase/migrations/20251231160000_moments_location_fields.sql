-- Add country and continent columns to moments table to support better grouping
ALTER TABLE moments 
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS continent text;
