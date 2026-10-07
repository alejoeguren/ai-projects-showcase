-- Add additional columns to schools table for detailed information
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS program TEXT,
ADD COLUMN IF NOT EXISTS ranking INTEGER,
ADD COLUMN IF NOT EXISTS acceptance_rate TEXT,
ADD COLUMN IF NOT EXISTS avg_gmat INTEGER,
ADD COLUMN IF NOT EXISTS tuition TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS specialties TEXT[];

-- Create index on ranking for better query performance
CREATE INDEX IF NOT EXISTS idx_schools_ranking ON public.schools(ranking);