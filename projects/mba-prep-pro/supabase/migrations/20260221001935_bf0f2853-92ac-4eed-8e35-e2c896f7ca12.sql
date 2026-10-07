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
  UPDATE public.ai_configurations SET is_active = false WHERE is_active = true;
  
  -- Activate the specified one
  UPDATE public.ai_configurations 
  SET is_active = true 
  WHERE id = _config_id;
END;
$function$;