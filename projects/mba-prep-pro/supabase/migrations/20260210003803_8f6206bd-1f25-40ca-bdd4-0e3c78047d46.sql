-- Fix needs_resume_processing to allow service-role calls
CREATE OR REPLACE FUNCTION public.needs_resume_processing(_user_id uuid, _document_updated_at timestamp with time zone)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last_processed TIMESTAMP WITH TIME ZONE;
  _current_role TEXT;
BEGIN
  -- Get current role
  _current_role := current_setting('request.jwt.claim.role', true);
  
  -- Authorization: service_role can check any user, regular users can only check themselves
  IF _current_role IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
      RAISE EXCEPTION 'Unauthorized: can only check own processing status';
    END IF;
  END IF;

  SELECT resume_processed_at INTO _last_processed
  FROM public.profiles
  WHERE user_id = _user_id;
  
  RETURN (_last_processed IS NULL OR _document_updated_at > _last_processed);
END;
$$;

-- Fix update_candidate_metadata to allow service-role calls
CREATE OR REPLACE FUNCTION public.update_candidate_metadata(
  _user_id uuid,
  _metadata jsonb,
  _skills text[],
  _experience_summary text,
  _education text,
  _objectives text,
  _industries text[],
  _leadership text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_role TEXT;
BEGIN
  -- Get current role
  _current_role := current_setting('request.jwt.claim.role', true);
  
  -- Authorization: service_role can update any user, regular users can only update themselves
  IF _current_role IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
      RAISE EXCEPTION 'Unauthorized: can only update own profile';
    END IF;
  END IF;

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