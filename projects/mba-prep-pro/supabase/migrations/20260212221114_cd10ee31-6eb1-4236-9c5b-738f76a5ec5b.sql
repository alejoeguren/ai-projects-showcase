
-- Create app_settings table for beta_mode toggle
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Settings are readable by everyone"
  ON public.app_settings FOR SELECT
  USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings"
  ON public.app_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert default beta_mode = on
INSERT INTO public.app_settings (key, value) VALUES ('beta_mode', 'true');

-- Create beta_whitelist table
CREATE TABLE public.beta_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  invited_at timestamp with time zone
);

ALTER TABLE public.beta_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage beta whitelist"
  ON public.beta_whitelist FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow anon/authenticated to check if their email is whitelisted
CREATE POLICY "Anyone can check whitelist by email"
  ON public.beta_whitelist FOR SELECT
  USING (true);

-- Create waitlist table
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

-- Only admins can read waitlist
CREATE POLICY "Admins can read waitlist"
  ON public.waitlist FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can delete from waitlist
CREATE POLICY "Admins can manage waitlist"
  ON public.waitlist FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on app_settings
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
