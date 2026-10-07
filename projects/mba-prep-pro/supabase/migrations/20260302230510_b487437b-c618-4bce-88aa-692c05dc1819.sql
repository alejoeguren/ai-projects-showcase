-- Delete the orphaned 0-duration session with no transcript
DELETE FROM interview_sessions WHERE id = '00000000-0000-0000-0000-000000000002';

-- Restore the consumed interview credit
UPDATE user_schools 
SET interviews_used = interviews_used - 1 
WHERE user_id = '00000000-0000-0000-0000-000000000001' 
  AND school_id = 8 
  AND interviews_used > 0;