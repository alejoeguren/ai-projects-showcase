
-- Drop restrictive check constraints that block valid session types and statuses
ALTER TABLE public.interview_sessions DROP CONSTRAINT IF EXISTS interview_sessions_session_type_check;
ALTER TABLE public.interview_sessions DROP CONSTRAINT IF EXISTS interview_sessions_status_check;

-- Re-add with expanded allowed values
ALTER TABLE public.interview_sessions ADD CONSTRAINT interview_sessions_session_type_check
  CHECK (session_type = ANY (ARRAY['behavioral', 'technical', 'case_study', 'general', 'school']::text[]) OR session_type LIKE 'school_%');

ALTER TABLE public.interview_sessions ADD CONSTRAINT interview_sessions_status_check
  CHECK (status = ANY (ARRAY['pending', 'in_progress', 'evaluating', 'completed', 'cancelled']::text[]));
