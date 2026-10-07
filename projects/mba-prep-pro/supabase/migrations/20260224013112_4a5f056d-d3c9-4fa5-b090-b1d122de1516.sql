-- Add a column to store AI-analyzed school materials summary on user_schools
ALTER TABLE public.user_schools
ADD COLUMN materials_summary text NULL;

-- Add a column to track when materials were last processed
ALTER TABLE public.user_schools
ADD COLUMN materials_processed_at timestamp with time zone NULL;