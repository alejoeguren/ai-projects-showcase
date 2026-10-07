ALTER TABLE public.interview_sessions
  ADD COLUMN substance_score integer,
  ADD COLUMN structure_score integer,
  ADD COLUMN presence_score integer,
  ADD COLUMN top_opportunities jsonb,
  ADD COLUMN detailed_evaluation jsonb,
  ADD COLUMN transcript text;