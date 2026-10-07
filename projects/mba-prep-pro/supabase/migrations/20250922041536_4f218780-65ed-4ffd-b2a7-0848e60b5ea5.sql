-- Fix security warnings by updating function search paths
CREATE OR REPLACE FUNCTION public.get_tier_limits(_tier TEXT)
RETURNS TABLE(schools_limit INTEGER, interviews_per_school INTEGER) 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;