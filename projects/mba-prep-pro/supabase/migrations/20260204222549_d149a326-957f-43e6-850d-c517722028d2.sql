-- Create simple question bank table
CREATE TABLE public.school_interview_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id integer REFERENCES public.schools(id) ON DELETE CASCADE,
  questions_text text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint: one question bank per school (NULL for general)
CREATE UNIQUE INDEX unique_school_questions 
ON public.school_interview_questions (COALESCE(school_id, -1));

-- Enable RLS
ALTER TABLE public.school_interview_questions ENABLE ROW LEVEL SECURITY;

-- Admins can manage questions
CREATE POLICY "Admins can manage questions" ON public.school_interview_questions
FOR ALL USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Everyone can read active questions (needed for edge function)
CREATE POLICY "Active questions are readable" ON public.school_interview_questions
FOR SELECT USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_school_interview_questions_updated_at
BEFORE UPDATE ON public.school_interview_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();