CREATE POLICY "Admins can view all interview sessions"
ON public.interview_sessions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));