
-- Fix interview_sessions policies: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Users can create their own interview sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users can update their own interview sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users can view their own interview sessions" ON public.interview_sessions;

CREATE POLICY "Users can create their own interview sessions"
ON public.interview_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interview sessions"
ON public.interview_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own interview sessions"
ON public.interview_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Fix interview_responses policies too
DROP POLICY IF EXISTS "Users can create their own interview responses" ON public.interview_responses;
DROP POLICY IF EXISTS "Users can update their own interview responses" ON public.interview_responses;
DROP POLICY IF EXISTS "Users can view their own interview responses" ON public.interview_responses;

CREATE POLICY "Users can create their own interview responses"
ON public.interview_responses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interview responses"
ON public.interview_responses FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own interview responses"
ON public.interview_responses FOR SELECT TO authenticated
USING (auth.uid() = user_id);
