-- Allow admins to manage schools
CREATE POLICY "Admins can manage schools"
ON public.schools
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));