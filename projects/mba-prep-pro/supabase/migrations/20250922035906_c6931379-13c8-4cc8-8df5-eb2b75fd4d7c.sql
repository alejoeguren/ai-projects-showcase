-- Add candidate metadata columns to profiles table
ALTER TABLE public.profiles ADD COLUMN resume_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN processed_skills TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN work_experience_summary TEXT;
ALTER TABLE public.profiles ADD COLUMN education_background TEXT;
ALTER TABLE public.profiles ADD COLUMN career_objectives TEXT;
ALTER TABLE public.profiles ADD COLUMN industry_experience TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN leadership_examples TEXT;
ALTER TABLE public.profiles ADD COLUMN resume_processed_at TIMESTAMP WITH TIME ZONE;

-- Create function to update candidate metadata
CREATE OR REPLACE FUNCTION public.update_candidate_metadata(
  _user_id UUID,
  _metadata JSONB,
  _skills TEXT[],
  _experience_summary TEXT,
  _education TEXT,
  _objectives TEXT,
  _industries TEXT[],
  _leadership TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    resume_metadata = _metadata,
    processed_skills = _skills,
    work_experience_summary = _experience_summary,
    education_background = _education,
    career_objectives = _objectives,
    industry_experience = _industries,
    leadership_examples = _leadership,
    resume_processed_at = now(),
    updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

-- Create function to check if resume needs reprocessing
CREATE OR REPLACE FUNCTION public.needs_resume_processing(
  _user_id UUID,
  _document_updated_at TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last_processed TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT resume_processed_at INTO _last_processed
  FROM public.profiles
  WHERE user_id = _user_id;
  
  -- If never processed or document is newer than last processing
  RETURN (_last_processed IS NULL OR _document_updated_at > _last_processed);
END;
$$;