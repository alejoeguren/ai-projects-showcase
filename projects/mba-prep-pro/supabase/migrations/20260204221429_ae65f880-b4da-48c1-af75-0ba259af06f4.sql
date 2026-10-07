-- Add required_documents column to schools table
-- This will store an array of document types required for each school's interview
-- Common types: 'resume', 'transcript', 'essay', 'recommendation', 'application'
ALTER TABLE public.schools 
ADD COLUMN required_documents text[] DEFAULT ARRAY['resume']::text[];

-- Add a comment explaining the column
COMMENT ON COLUMN public.schools.required_documents IS 'Array of document types required before mock interview. Options: resume, transcript, essay, recommendation, application';

-- Update some schools to require more documents (examples - can be adjusted via admin)
UPDATE public.schools SET required_documents = ARRAY['resume', 'essay', 'transcript'] 
WHERE name ILIKE '%Harvard%' OR name ILIKE '%Stanford%' OR name ILIKE '%Wharton%';

UPDATE public.schools SET required_documents = ARRAY['resume', 'essay'] 
WHERE name ILIKE '%MIT%' OR name ILIKE '%Chicago%' OR name ILIKE '%Columbia%';

UPDATE public.schools SET required_documents = ARRAY['resume', 'application'] 
WHERE name ILIKE '%Yale%' OR name ILIKE '%Kellogg%';