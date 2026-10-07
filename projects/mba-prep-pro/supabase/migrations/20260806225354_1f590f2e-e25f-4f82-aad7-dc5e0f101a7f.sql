CREATE OR REPLACE FUNCTION public.enforce_user_schools_insert_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _jwt_role TEXT;
  _tier TEXT;
  _allowed_per_school INTEGER;
BEGIN
  _jwt_role := coalesce(current_setting('request.jwt.claims', true)::json->>'role', '');

  IF _jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Force interviews_used to 0 on insert
  NEW.interviews_used := 0;

  -- Force application_status to the default on insert
  NEW.application_status := 'interested';

  -- Compute allowed interviews_limit from tier
  SELECT subscription_tier INTO _tier FROM public.profiles WHERE user_id = NEW.user_id;
  SELECT interviews_per_school INTO _allowed_per_school FROM public.get_tier_limits(_tier);
  IF _allowed_per_school IS NULL THEN
    _allowed_per_school := 0;
  END IF;

  IF NEW.interviews_limit IS NULL OR NEW.interviews_limit > _allowed_per_school THEN
    NEW.interviews_limit := _allowed_per_school;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_user_schools_quota_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _jwt_role TEXT;
BEGIN
  _jwt_role := coalesce(current_setting('request.jwt.claims', true)::json->>'role', '');

  IF _jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.interviews_limit IS DISTINCT FROM OLD.interviews_limit THEN
    RAISE EXCEPTION 'Not allowed to modify interviews_limit directly';
  END IF;
  IF NEW.interviews_used IS DISTINCT FROM OLD.interviews_used THEN
    RAISE EXCEPTION 'Not allowed to modify interviews_used directly';
  END IF;

  -- Immutable ownership / linkage columns
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Not allowed to modify user_id';
  END IF;
  IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
    RAISE EXCEPTION 'Not allowed to modify school_id';
  END IF;

  -- Constrain application_status to the allowed set
  IF NEW.application_status IS DISTINCT FROM OLD.application_status
     AND (NEW.application_status IS NULL
          OR NEW.application_status NOT IN ('interested','applied','accepted','rejected','enrolled')) THEN
    RAISE EXCEPTION 'Invalid application_status value';
  END IF;

  RETURN NEW;
END;
$function$;