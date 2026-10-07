
-- ===========================================
-- FIX 1: app_settings - restrict public read to non-sensitive keys only
-- ===========================================

-- Drop the overly permissive "readable by everyone" policy
DROP POLICY IF EXISTS "Settings are readable by everyone" ON public.app_settings;

-- Replace with a policy that only exposes non-sensitive configuration keys
CREATE POLICY "Authenticated users can read non-sensitive settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (key IN ('skip_pricing', 'beta_mode', 'platform_name', 'support_email', 'welcome_emails', 'interview_reminders', 'progress_reports'));

-- Also allow anon to read skip_pricing and beta_mode (needed during onboarding before auth)
CREATE POLICY "Public can read onboarding settings"
ON public.app_settings
FOR SELECT
TO anon
USING (key IN ('skip_pricing', 'beta_mode'));

-- ===========================================
-- FIX 2: can_select_school - add authorization check
-- ===========================================

CREATE OR REPLACE FUNCTION public.can_select_school(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier TEXT;
  tier_school_limit INTEGER;
  current_selections INTEGER;
BEGIN
  -- Authorization: users can only check their own tier limits
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RETURN FALSE;
  END IF;

  -- Get user's tier
  SELECT subscription_tier INTO user_tier 
  FROM public.profiles 
  WHERE user_id = _user_id;
  
  -- Get tier limits
  SELECT schools_limit INTO tier_school_limit 
  FROM public.get_tier_limits(user_tier);
  
  -- If no limit (free tier), allow unlimited selections
  IF tier_school_limit IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Count current school selections
  SELECT COUNT(*) INTO current_selections 
  FROM public.user_schools 
  WHERE user_id = _user_id;
  
  RETURN current_selections < tier_school_limit;
END;
$$;

-- ===========================================
-- FIX 3: interview_responses - add admin SELECT policy
-- ===========================================

CREATE POLICY "Admins can view all interview responses"
ON public.interview_responses
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===========================================
-- FIX 4: school_interview_questions - tighten access for null school_id
-- ===========================================

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Active questions are readable" ON public.school_interview_questions;

-- Replace with authenticated-only access for active questions
CREATE POLICY "Authenticated users can read active questions"
ON public.school_interview_questions
FOR SELECT
TO authenticated
USING (is_active = true);
