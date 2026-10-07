-- Create schools table for school selection during onboarding
CREATE TABLE public.schools (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('university', 'college', 'bootcamp', 'other')),
  location TEXT,
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table for user document storage
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('resume', 'cover_letter', 'transcript', 'portfolio', 'other')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interview_sessions table for mock interview tracking
CREATE TABLE public.interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('behavioral', 'technical', 'case_study', 'general')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  duration_minutes INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  overall_score DECIMAL(3,2),
  feedback JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interview_questions table for question bank
CREATE TABLE public.interview_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('behavioral', 'technical', 'case_study', 'general')),
  difficulty_level TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  expected_duration_minutes INTEGER DEFAULT 5,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interview_responses table for user answers
CREATE TABLE public.interview_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.interview_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  response_text TEXT,
  response_audio_path TEXT,
  response_video_path TEXT,
  duration_seconds INTEGER,
  score DECIMAL(3,2),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_schools junction table for many-to-many relationship
CREATE TABLE public.user_schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  school_id INTEGER NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  application_status TEXT DEFAULT 'interested' CHECK (application_status IN ('interested', 'applied', 'accepted', 'rejected', 'enrolled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, school_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_schools ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schools table (publicly readable)
CREATE POLICY "Schools are viewable by everyone" 
ON public.schools 
FOR SELECT 
USING (true);

-- RLS Policies for documents table
CREATE POLICY "Users can view their own documents" 
ON public.documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
ON public.documents 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
ON public.documents 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for interview_sessions table
CREATE POLICY "Users can view their own interview sessions" 
ON public.interview_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interview sessions" 
ON public.interview_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interview sessions" 
ON public.interview_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for interview_questions table (publicly readable)
CREATE POLICY "Interview questions are viewable by everyone" 
ON public.interview_questions 
FOR SELECT 
USING (true);

-- RLS Policies for interview_responses table
CREATE POLICY "Users can view their own interview responses" 
ON public.interview_responses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interview responses" 
ON public.interview_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interview responses" 
ON public.interview_responses 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for user_schools table
CREATE POLICY "Users can view their own school selections" 
ON public.user_schools 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own school selections" 
ON public.user_schools 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own school selections" 
ON public.user_schools 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own school selections" 
ON public.user_schools 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_schools_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_sessions_updated_at
BEFORE UPDATE ON public.interview_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_questions_updated_at
BEFORE UPDATE ON public.interview_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_responses_updated_at
BEFORE UPDATE ON public.interview_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('interview-recordings', 'interview-recordings', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('school-logos', 'school-logos', true);

-- Create storage policies for documents bucket
CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for interview-recordings bucket
CREATE POLICY "Users can view their own recordings" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own recordings" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own recordings" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own recordings" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for school-logos bucket (public read)
CREATE POLICY "School logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'school-logos');

-- Insert sample schools data
INSERT INTO public.schools (name, type, location, website_url) VALUES
('Harvard University', 'university', 'Cambridge, MA', 'https://www.harvard.edu'),
('Stanford University', 'university', 'Stanford, CA', 'https://www.stanford.edu'),
('MIT', 'university', 'Cambridge, MA', 'https://www.mit.edu'),
('UC Berkeley', 'university', 'Berkeley, CA', 'https://www.berkeley.edu'),
('Yale University', 'university', 'New Haven, CT', 'https://www.yale.edu'),
('Princeton University', 'university', 'Princeton, NJ', 'https://www.princeton.edu'),
('Columbia University', 'university', 'New York, NY', 'https://www.columbia.edu'),
('University of Chicago', 'university', 'Chicago, IL', 'https://www.uchicago.edu'),
('Cornell University', 'university', 'Ithaca, NY', 'https://www.cornell.edu'),
('Dartmouth College', 'college', 'Hanover, NH', 'https://www.dartmouth.edu'),
('App Academy', 'bootcamp', 'San Francisco, CA', 'https://www.appacademy.io'),
('General Assembly', 'bootcamp', 'New York, NY', 'https://generalassemb.ly'),
('Lambda School', 'bootcamp', 'San Francisco, CA', 'https://lambdaschool.com'),
('Coding Dojo', 'bootcamp', 'Bellevue, WA', 'https://www.codingdojo.com'),
('Flatiron School', 'bootcamp', 'New York, NY', 'https://flatironschool.com');

-- Insert sample interview questions
INSERT INTO public.interview_questions (question_text, category, difficulty_level, expected_duration_minutes, tags) VALUES
('Tell me about yourself.', 'behavioral', 'easy', 3, '{"introduction", "overview"}'),
('Why do you want to work here?', 'behavioral', 'easy', 3, '{"motivation", "company"}'),
('What are your greatest strengths?', 'behavioral', 'easy', 3, '{"strengths", "self-assessment"}'),
('What is your biggest weakness?', 'behavioral', 'medium', 3, '{"weakness", "self-improvement"}'),
('Describe a challenging situation you faced and how you handled it.', 'behavioral', 'medium', 5, '{"problem-solving", "challenges"}'),
('Where do you see yourself in 5 years?', 'behavioral', 'easy', 3, '{"career-goals", "future"}'),
('Why are you leaving your current job?', 'behavioral', 'medium', 3, '{"transition", "motivation"}'),
('Describe a time when you had to work with a difficult team member.', 'behavioral', 'medium', 5, '{"teamwork", "conflict-resolution"}'),
('What motivates you?', 'behavioral', 'easy', 3, '{"motivation", "values"}'),
('How do you handle stress and pressure?', 'behavioral', 'medium', 3, '{"stress-management", "pressure"}'),
('Explain the concept of object-oriented programming.', 'technical', 'medium', 5, '{"programming", "concepts"}'),
('What is the difference between == and === in JavaScript?', 'technical', 'easy', 2, '{"javascript", "operators"}'),
('How would you optimize a slow database query?', 'technical', 'hard', 7, '{"database", "optimization"}'),
('Explain the difference between SQL and NoSQL databases.', 'technical', 'medium', 5, '{"database", "concepts"}'),
('What is RESTful API design?', 'technical', 'medium', 5, '{"api", "design"}'),
('How would you estimate the number of piano tuners in Chicago?', 'case_study', 'hard', 10, '{"estimation", "logic"}'),
('Design a parking lot system.', 'case_study', 'hard', 15, '{"system-design", "architecture"}'),
('How would you improve user engagement for a social media app?', 'case_study', 'medium', 10, '{"product", "strategy"}');