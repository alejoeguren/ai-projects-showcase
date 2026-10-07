
CREATE OR REPLACE FUNCTION public.get_tier_limits(_tier text)
 RETURNS TABLE(schools_limit integer, interviews_per_school integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT 
    CASE 
      WHEN _tier = 'free' THEN NULL
      WHEN _tier = 'beta' THEN NULL
      WHEN _tier = 'essential' THEN 1
      WHEN _tier = 'professional' THEN 3
      WHEN _tier = 'premium' THEN 5
      ELSE NULL
    END::INTEGER as schools_limit,
    CASE 
      WHEN _tier = 'free' THEN 0
      WHEN _tier = 'beta' THEN 9999
      ELSE 3
    END::INTEGER as interviews_per_school;
END;
$function$;
