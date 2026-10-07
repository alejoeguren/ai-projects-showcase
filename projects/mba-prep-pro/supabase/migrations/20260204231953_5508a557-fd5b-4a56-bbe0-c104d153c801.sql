-- Fix SECURITY DEFINER functions with proper authorization checks

-- 1. upgrade_user_tier: Admin only
CREATE OR REPLACE FUNCTION public.upgrade_user_tier(_user_id uuid, _new_tier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tier_limits RECORD;
BEGIN
  -- Authorization: Only admins can upgrade user tiers
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only admins can upgrade user tiers';
  END IF;

  -- Get limits for new tier
  SELECT * INTO tier_limits FROM public.get_tier_limits(_new_tier);
  
  -- Update user profile
  UPDATE public.profiles
  SET 
    subscription_tier = _new_tier,
    schools_limit = tier_limits.schools_limit,
    tier_purchased_at = now(),
    updated_at = now()
  WHERE user_id = _user_id;
  
  -- Update existing school selections with interview limits
  UPDATE public.user_schools
  SET 
    interviews_limit = tier_limits.interviews_per_school,
    interviews_used = LEAST(interviews_used, tier_limits.interviews_per_school)
  WHERE user_id = _user_id;
END;
$function$;

-- 2. activate_ai_configuration: Admin only
CREATE OR REPLACE FUNCTION public.activate_ai_configuration(_config_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization: Only admins can activate AI configurations
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only admins can activate AI configurations';
  END IF;

  -- Deactivate all configurations
  UPDATE public.ai_configurations SET is_active = false;
  
  -- Activate the specified one
  UPDATE public.ai_configurations 
  SET is_active = true 
  WHERE id = _config_id;
END;
$function$;

-- 3. update_candidate_metadata: User must own profile
CREATE OR REPLACE FUNCTION public.update_candidate_metadata(_user_id uuid, _metadata jsonb, _skills text[], _experience_summary text, _education text, _objectives text, _industries text[], _leadership text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization: Can only update own profile
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only update own profile';
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
$function$;

-- 4. needs_resume_processing: User must own profile
CREATE OR REPLACE FUNCTION public.needs_resume_processing(_user_id uuid, _document_updated_at timestamp with time zone)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _last_processed TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Authorization: Can only check own processing status
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only check own processing status';
  END IF;

  SELECT resume_processed_at INTO _last_processed
  FROM public.profiles
  WHERE user_id = _user_id;
  
  -- If never processed or document is newer than last processing
  RETURN (_last_processed IS NULL OR _document_updated_at > _last_processed);
END;
$function$;

-- 5. purchase_additional_interview: User must own account, admin only for now (no payment system)
CREATE OR REPLACE FUNCTION public.purchase_additional_interview(_user_id uuid, _school_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization: Must be authenticated and either own the account or be admin
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: must be authenticated';
  END IF;
  
  -- Only allow self-purchase or admin action
  IF auth.uid() != _user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: can only purchase for own account';
  END IF;
  
  -- Non-admins cannot purchase (payment flow not implemented)
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Purchase flow not yet implemented - contact support';
  END IF;

  UPDATE public.user_schools
  SET interviews_limit = interviews_limit + 1
  WHERE user_id = _user_id AND school_id = _school_id;
END;
$function$;

-- 6. use_school_interview: User must own interview
CREATE OR REPLACE FUNCTION public.use_school_interview(_user_id uuid, _school_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_used INTEGER;
  interview_limit INTEGER;
BEGIN
  -- Authorization: Can only use own interviews
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only use own interviews';
  END IF;

  -- Get current usage and limit
  SELECT interviews_used, interviews_limit 
  INTO current_used, interview_limit
  FROM public.user_schools 
  WHERE user_id = _user_id AND school_id = _school_id;
  
  -- Check if user has interviews left
  IF current_used >= interview_limit THEN
    RETURN FALSE;
  END IF;
  
  -- Increment usage
  UPDATE public.user_schools
  SET interviews_used = interviews_used + 1
  WHERE user_id = _user_id AND school_id = _school_id;
  
  RETURN TRUE;
END;
$function$;