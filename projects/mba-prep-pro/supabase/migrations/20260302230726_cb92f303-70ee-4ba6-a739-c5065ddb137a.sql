-- Delete the second orphaned session
DELETE FROM interview_sessions WHERE id = '00000000-0000-0000-0000-000000000002';

-- Restore the consumed credit for Harvard (school_id 1)
UPDATE user_schools 
SET interviews_used = GREATEST(interviews_used - 1, 0)
WHERE user_id = '00000000-0000-0000-0000-000000000001' 
  AND school_id = 1;