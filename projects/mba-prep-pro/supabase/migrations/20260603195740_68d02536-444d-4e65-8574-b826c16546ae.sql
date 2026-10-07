
-- 1) Protect sensitive profile columns from self-escalation
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _jwt_role TEXT;
BEGIN
  _jwt_role := coalesce(current_setting('request.jwt.claims', true)::json->>'role', '');

  -- Allow service_role and admins to change anything
  IF _jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Block changes to privileged columns from regular users
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
    RAISE EXCEPTION 'Not allowed to modify subscription_tier directly';
  END IF;
  IF NEW.schools_limit IS DISTINCT FROM OLD.schools_limit THEN
    RAISE EXCEPTION 'Not allowed to modify schools_limit directly';
  END IF;
  IF NEW.tier_purchased_at IS DISTINCT FROM OLD.tier_purchased_at THEN
    RAISE EXCEPTION 'Not allowed to modify tier_purchased_at directly';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2) Fix can_select_school so missing profile denies selection
CREATE OR REPLACE FUNCTION public.can_select_school(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier TEXT;
  tier_school_limit INTEGER;
  current_selections INTEGER;
  profile_exists BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RETURN FALSE;
  END IF;

  SELECT subscription_tier, TRUE
    INTO user_tier, profile_exists
  FROM public.profiles
  WHERE user_id = _user_id;

  -- No profile -> deny
  IF profile_exists IS NULL THEN
    RETURN FALSE;
  END IF;

  -- No tier set -> deny
  IF user_tier IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT schools_limit INTO tier_school_limit
  FROM public.get_tier_limits(user_tier);

  IF tier_school_limit IS NULL THEN
    RETURN TRUE;
  END IF;

  SELECT COUNT(*) INTO current_selections
  FROM public.user_schools
  WHERE user_id = _user_id;

  RETURN current_selections < tier_school_limit;
END;
$$;
