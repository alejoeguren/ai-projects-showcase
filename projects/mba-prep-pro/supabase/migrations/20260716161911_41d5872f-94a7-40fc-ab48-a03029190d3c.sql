
-- 1) Prevent quota self-escalation on user_schools
CREATE OR REPLACE FUNCTION public.prevent_user_schools_quota_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_user_schools_quota_escalation_trg ON public.user_schools;
CREATE TRIGGER prevent_user_schools_quota_escalation_trg
BEFORE UPDATE ON public.user_schools
FOR EACH ROW EXECUTE FUNCTION public.prevent_user_schools_quota_escalation();

-- Also enforce that INSERT cannot set arbitrary interviews_limit/interviews_used by regular users
CREATE OR REPLACE FUNCTION public.enforce_user_schools_insert_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS enforce_user_schools_insert_quota_trg ON public.user_schools;
CREATE TRIGGER enforce_user_schools_insert_quota_trg
BEFORE INSERT ON public.user_schools
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_schools_insert_quota();

-- 2) Scope beta_whitelist admin policy to authenticated role
DROP POLICY IF EXISTS "Admins can manage beta whitelist" ON public.beta_whitelist;
CREATE POLICY "Admins can manage beta whitelist"
ON public.beta_whitelist
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
