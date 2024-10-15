-- -- -- Testing with INSERT statements

-- -- -- Insert some users (1 user and 1 agent)
-- -- INSERT INTO users (username, password, email, role, department)
-- -- VALUES ('john_doe', 'password123', 'john@example.com', 'user', 'Customer Support');

-- -- INSERT INTO users (username, password, email, role, department)
-- -- VALUES ('agent_smith', 'password456', 'smith@agency.com', 'agent', 'Tech Support');

-- -- -- Create a new category (e.g., "Tech Issue")
-- -- CALL CreateCategory('Tech Issue');

-- -- -- Create a ticket (user_id = 1, assigned_agent_id = 2)
-- -- CALL CreateTicket('System Down', 'My system crashed and won\'t start.', 'Tech Issue', 1, 2);

-- -- -- Add a comment to the ticket (ticket_id = 1, user_id = 2)
-- -- INSERT INTO comments (ticket_id, user_id, content)
-- -- VALUES (1, 2, 'We are investigating the issue.');

-- -- -- Change the status of the ticket to 'in progress'
-- -- CALL ChangeTicketStatus(1, 'in progress');

-- -- -- Show the ticket details and progress (comments)
-- -- CALL ShowTicketWithProgress(1);

-- -- -- Filter tickets by category 'Tech Issue' and status 'open'
-- -- CALL FilterTickets('Tech Issue', 'open', 'Customer Support');

-- -- -- Sort tickets by category
-- -- CALL SortTicketsByCategory();

-- NR2
-- Extended Test Cases for All Procedures

-- 1. Test CreateUser Procedure with Edge Cases
-- Test with empty username
CALL CreateUser('', 'securepassword', 'emptyuser@example.com', 'IT', 'IsYouForget'); -- Should fail

-- Test with empty password
CALL CreateUser('emptypassword', '', 'emptypassword@example.com', 'IT', 'IsYouForget'); -- Should fail

-- Test with empty email
CALL CreateUser('emptyemail', 'securepassword', '', 'HR', 'IsYouForget'); -- Should fail

-- Test with invalid email format
CALL CreateUser('invalidemail', 'securepassword', 'invalidemail.com', 'HR', 'IsYouForget'); -- Should fail (invalid email format)

-- Test with excessively long username
CALL CreateUser(REPEAT('longuser', 50), 'securepassword', 'longuser@example.com', 'Finance', 'IsYouForget'); -- Should fail if there's a limit on VARCHAR length

-- Test with empty secret word
CALL CreateUser('userwithoutsecret', 'securepassword', 'userwithoutsecret@example.com', 'IT', ''); -- Should assign 'user' as role

-- Test with null inputs for department
CALL CreateUser('userwithnodept', 'securepassword', 'userwithnodept@example.com', NULL, 'IsYouForget'); -- Should work with NULL department

-- 2. Test CreateTicket Procedure with Edge Cases
-- Test with empty title
CALL CreateTicket('', 'This is a description.', 'open', 'IT', 1, 2); -- Should fail

-- Test with empty description
CALL CreateTicket('Title without description', '', 'open', 'Support', 1, 2); -- Should work or fail based on your constraints

-- Test with invalid status
CALL CreateTicket('Title with invalid status', 'Description.', 'invalid_status', 'IT', 1, 2); -- Should fail (invalid status)

-- Test with invalid category (long name)
CALL CreateTicket('Title with long category', 'Description.', 'open', REPEAT('Category', 50), 1, 2); -- Should fail if category length exceeds limit

-- Test with NULL assigned agent
CALL CreateTicket('Title with no agent', 'Description.', 'open', 'HR', 1, NULL); -- Should work with NULL agent

-- 3. Test ShowTicket Procedure with Edge Cases
-- Test with invalid ticket_id (negative value)
CALL ShowTicket(-1); -- Should fail or return no result

-- Test with large ticket_id
CALL ShowTicket(9999999); -- Should fail or return no result if ticket doesn't exist

-- 4. Test SpecifyCategory Procedure with Edge Cases
-- Test with empty category
CALL SpecifyCategory(1, ''); -- Should fail

-- Test with very long category name
CALL SpecifyCategory(1, REPEAT('LongCategoryName', 50)); -- Should fail if category length exceeds limit

-- Test with invalid ticket_id (negative value)
CALL SpecifyCategory(-1, 'HR'); -- Should fail

-- Test with NULL category
CALL SpecifyCategory(1, NULL); -- Should fail if NULL not allowed for category

-- 5. Test CreateCategory Procedure with Edge Cases
-- Test with empty category name
CALL CreateCategory(''); -- Should fail

-- Test with NULL category name
CALL CreateCategory(NULL); -- Should fail

-- Test with very long category name
CALL CreateCategory(REPEAT('LongCategoryName', 50)); -- Should fail if category length exceeds limit

-- 6. Test FilterTickets Procedure with Edge Cases
-- Test with empty category
CALL FilterTickets('', 'open', 'IT'); -- Should return no results or fail

-- Test with invalid status
CALL FilterTickets('IT', 'invalid_status', 'IT'); -- Should fail

-- Test with NULL department
CALL FilterTickets('IT', 'open', NULL); -- Should work or fail based on constraints

-- Test with non-existent category, status, and department
CALL FilterTickets('NonExistentCategory', 'closed', 'NonExistentDept'); -- Should return no results

-- 7. Test ChangeTicketStatus Procedure with Edge Cases
-- Test with invalid ticket_id (negative value)
CALL ChangeTicketStatus(-1, 'in progress'); -- Should fail

-- Test with invalid status
CALL ChangeTicketStatus(1, 'invalid_status'); -- Should fail

-- Test with NULL status
CALL ChangeTicketStatus(1, NULL); -- Should fail

-- 8. Test ShowTicketWithProgress Procedure with Edge Cases
-- Test with invalid ticket_id (negative value)
CALL ShowTicketWithProgress(-1); -- Should fail

-- Test with ticket_id that has no comments
CALL ShowTicketWithProgress(2); -- Should return ticket details but no comments

-- 9. Test SortTicketsByCategory Procedure with Edge Cases
-- Test with no tickets in the system
CALL SortTicketsByCategory(); -- Should return no results

-- Test with a large number of tickets (stress test)
-- Assuming a large number of tickets are already in the system, the procedure should still work efficiently
CALL SortTicketsByCategory(); -- Should return sorted tickets

-- Additional Boundary Cases for General Testing
-- Test with a large number of users (stress test)
-- Assuming 1000+ users have been created, ensure the CreateUser procedure handles this scale
CALL CreateUser('massiveuser', 'securepassword', 'massiveuser@example.com', 'IT', 'IsYouForget'); -- Should still work efficiently

-- Test FilterTickets with a large number of tickets (stress test)
CALL FilterTickets('IT', 'open', 'HR'); -- Should return results efficiently even with many records in the database

-- Test CreateTicket with extremely long description
CALL CreateTicket('Long description test', REPEAT('Description text ', 500), 'open', 'IT', 1, 2); -- Should fail or succeed based on TEXT length constraints

-- Test Comment Content Length
-- Assuming comments have a TEXT length constraint, try creating a comment with the max possible content length
INSERT INTO comments (ticket_id, user_id, content) 
VALUES (1, 1, REPEAT('CommentContent ', 10000)); -- Should fail or succeed based on your database constraints

INSERT INTO categories (category_name) 
VALUES 
('software'),
('network'),
('hardware'),
('security'),
('other');

