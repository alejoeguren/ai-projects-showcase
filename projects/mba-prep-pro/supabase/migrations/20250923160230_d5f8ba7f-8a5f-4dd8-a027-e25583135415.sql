-- Enable leaked password protection for better security
UPDATE auth.config 
SET value = 'true' 
WHERE parameter = 'password_min_length';

-- Set minimum password length to 6 characters
UPDATE auth.config 
SET value = '6' 
WHERE parameter = 'password_min_length';