-- Update profiles table to support tiered system
ALTER TABLE public.profiles 
ADD COLUMN schools_limit INTEGER DEFAULT NULL,
ADD COLUMN tier_purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add interview usage tracking per school to user_schools table
ALTER TABLE public.user_schools 
ADD COLUMN interviews_used INTEGER DEFAULT 0,
ADD COLUMN interviews_limit INTEGER DEFAULT 0;

-- Create function to get tier limits
CREATE OR REPLACE FUNCTION public.get_tier_limits(_tier TEXT)
RETURNS TABLE(schools_limit INTEGER, interviews_per_school INTEGER) AS $$
BEGIN
  RETURN QUERY SELECT 
    CASE 
      WHEN _tier = 'free' THEN NULL
      WHEN _tier = 'essential' THEN 1
      WHEN _tier = 'professional' THEN 3
      WHEN _tier = 'premium' THEN 5
      ELSE NULL
    END::INTEGER as schools_limit,
    CASE 
      WHEN _tier = 'free' THEN 0
      ELSE 3
    END::INTEGER as interviews_per_school;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user can select more schools
CREATE OR REPLACE FUNCTION public.can_select_school(_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  tier_school_limit INTEGER;
  current_selections INTEGER;
BEGIN
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Function to upgrade user tier
CREATE OR REPLACE FUNCTION public.upgrade_user_tier(_user_id UUID, _new_tier TEXT)
RETURNS VOID AS $$
DECLARE
  tier_limits RECORD;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to add interview usage for a school
CREATE OR REPLACE FUNCTION public.use_school_interview(_user_id UUID, _school_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_used INTEGER;
  interview_limit INTEGER;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to purchase additional interview for school
CREATE OR REPLACE FUNCTION public.purchase_additional_interview(_user_id UUID, _school_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_schools
  SET interviews_limit = interviews_limit + 1
  WHERE user_id = _user_id AND school_id = _school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update existing free users to have proper limits
UPDATE public.profiles 
SET schools_limit = NULL 
WHERE subscription_tier = 'free' OR subscription_tier IS NULL;

-- Create RLS policy for user_schools based on tier limits
DROP POLICY IF EXISTS "Users can create their own school selections" ON public.user_schools;
CREATE POLICY "Users can create their own school selections" 
ON public.user_schools 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  public.can_select_school(auth.uid())
);