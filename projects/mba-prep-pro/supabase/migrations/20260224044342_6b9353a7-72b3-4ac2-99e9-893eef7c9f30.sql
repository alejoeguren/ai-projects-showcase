
CREATE OR REPLACE FUNCTION public.purchase_additional_interview(_user_id uuid, _school_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _jwt_role TEXT;
BEGIN
  -- Extract role from JWT claims
  _jwt_role := coalesce(
    current_setting('request.jwt.claims', true)::json->>'role',
    ''
  );

  -- Authorization: service_role bypasses check, regular users must be admin or self
  IF _jwt_role != 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: must be authenticated';
    END IF;
    IF auth.uid() != _user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Unauthorized: can only purchase for own account';
    END IF;
  END IF;

  UPDATE public.user_schools
  SET interviews_limit = interviews_limit + 1
  WHERE user_id = _user_id AND school_id = _school_id;
END;
$function$;
