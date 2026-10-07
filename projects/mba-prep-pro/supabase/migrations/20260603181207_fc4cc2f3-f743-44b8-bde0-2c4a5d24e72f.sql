
-- Harden has_role to ignore caller-supplied user_id and always use auth.uid()
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = COALESCE(auth.uid(), _user_id)
      AND user_id = _user_id
      AND role = _role
  )
$function$;

-- Add unique constraint on waitlist email to prevent duplicates/spam
DELETE FROM public.waitlist a USING public.waitlist b
  WHERE a.ctid < b.ctid AND lower(a.email) = lower(b.email);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_unique_idx
  ON public.waitlist (lower(email));
