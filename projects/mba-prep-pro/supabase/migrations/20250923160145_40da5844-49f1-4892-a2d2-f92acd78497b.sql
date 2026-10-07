-- Create a function to safely delete a user and all their associated data
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  -- Delete user data in the correct order to handle dependencies
  DELETE FROM public.interview_responses WHERE user_id = current_user_id;
  DELETE FROM public.interview_sessions WHERE user_id = current_user_id;
  DELETE FROM public.user_schools WHERE user_id = current_user_id;
  DELETE FROM public.documents WHERE user_id = current_user_id;
  DELETE FROM public.profiles WHERE user_id = current_user_id;
  
  -- The auth.users entry will be handled by Supabase when we call auth.admin.deleteUser
  -- or it will cascade when the user signs out and is removed from auth.users
END;
$$;