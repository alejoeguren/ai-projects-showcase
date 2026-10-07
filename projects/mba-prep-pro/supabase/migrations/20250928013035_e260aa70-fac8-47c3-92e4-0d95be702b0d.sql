-- Update schools table to match the MBA school names used in the frontend
UPDATE schools SET 
  name = CASE 
    WHEN id = 1 THEN 'Harvard Business School'
    WHEN id = 2 THEN 'Stanford Graduate School of Business'
    WHEN id = 3 THEN 'Wharton School'
    WHEN id = 4 THEN 'MIT Sloan School of Management'
    WHEN id = 5 THEN 'Chicago Booth School of Business'
    WHEN id = 6 THEN 'Northwestern Kellogg'
    WHEN id = 7 THEN 'Columbia Business School'
    WHEN id = 8 THEN 'Yale School of Management'
    WHEN id = 9 THEN 'Dartmouth Tuck'
    WHEN id = 10 THEN 'NYU Stern'
    WHEN id = 11 THEN 'Duke Fuqua'
    WHEN id = 12 THEN 'Michigan Ross'
    WHEN id = 13 THEN 'Cornell Johnson'
    WHEN id = 14 THEN 'UCLA Anderson'
    WHEN id = 15 THEN 'CMU Tepper'
    ELSE name
  END,
  type = 'university',
  location = CASE 
    WHEN id = 1 THEN 'Boston, MA'
    WHEN id = 2 THEN 'Stanford, CA'
    WHEN id = 3 THEN 'Philadelphia, PA'
    WHEN id = 4 THEN 'Cambridge, MA'
    WHEN id = 5 THEN 'Chicago, IL'
    WHEN id = 6 THEN 'Evanston, IL'
    WHEN id = 7 THEN 'New York, NY'
    WHEN id = 8 THEN 'New Haven, CT'
    WHEN id = 9 THEN 'Hanover, NH'
    WHEN id = 10 THEN 'New York, NY'
    WHEN id = 11 THEN 'Durham, NC'
    WHEN id = 12 THEN 'Ann Arbor, MI'
    WHEN id = 13 THEN 'Ithaca, NY'
    WHEN id = 14 THEN 'Los Angeles, CA'
    WHEN id = 15 THEN 'Pittsburgh, PA'
    ELSE location
  END
WHERE id IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15);