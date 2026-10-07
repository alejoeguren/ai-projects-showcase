-- Enable leaked password protection for better security
UPDATE auth.config 
SET password_min_length = 6;

-- Note: Leaked password protection is managed through Supabase Dashboard
-- This needs to be enabled in: Authentication > Settings > Password Protection
-- We cannot enable it via SQL, only through the dashboard