
-- Create secure function to check whitelist without exposing emails
CREATE OR REPLACE FUNCTION public.is_email_whitelisted(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.beta_whitelist
    WHERE email = lower(_email)
  );
$$;

-- Remove the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can check whitelist by email" ON public.beta_whitelist;
