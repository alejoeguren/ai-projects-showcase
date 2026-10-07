-- Create table for AI configuration management
CREATE TABLE public.ai_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  system_prompt text NOT NULL,
  guardrails jsonb DEFAULT '[]'::jsonb,
  tools_config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_configurations ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage AI configurations"
ON public.ai_configurations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_ai_configurations_updated_at
BEFORE UPDATE ON public.ai_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to activate a configuration (deactivate others)
CREATE OR REPLACE FUNCTION public.activate_ai_configuration(_config_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Deactivate all configurations
  UPDATE public.ai_configurations SET is_active = false;
  
  -- Activate the specified one
  UPDATE public.ai_configurations 
  SET is_active = true 
  WHERE id = _config_id;
END;
$$;