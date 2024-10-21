-- Create a new database
DROP DATABASE IF EXISTS ticketing_system;
CREATE DATABASE IF NOT EXISTS ticketing_system;

-- Use the newly created database
USE ticketing_system;

-- Ta bort tabeller om de redan finns
DROP TABLE IF EXISTS emailtickets;
DROP TABLE IF EXISTS knowledgeBase;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS categories;

-- Skapa tabell 1: users (updated)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL,
    role ENUM('Admin', 'user', 'agent') NOT NULL, -- Added 'Admin'
    department VARCHAR(100) DEFAULT 'Not Assigned',
    CONSTRAINT chk_role CHECK (role IN ('Admin', 'user', 'agent'))
);
-- Insert the default admin credentials -- PASSWORD FOR THE ADMIN 9912
INSERT INTO users (username, password, email, role, department)
VALUES ('admin', '$2b$10$nGp1Dcgr8GGBqbXpeVe0YOHngkO1qd6M5vFM.Ee3ckgRneBls9zZa', 'admin@admin.ts', 'Admin', 'Management');

-- Skapa tabell 2: tickets
CREATE TABLE tickets (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('open', 'in progress', 'closed') NOT NULL,
    category VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    user_id INT,
    assigned_agent_id INT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_agent_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Skapa tabell 3: attachments
CREATE TABLE attachments (
    attachment_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT,
    file_name VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
);

-- Skapa tabell 4: comments
CREATE TABLE comments (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT,
    user_id INT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Skapa tabell 5: knowledgeBase
CREATE TABLE knowledgeBase (
    article_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);


-- Skapa tabell 6: emailtickets
CREATE TABLE emailtickets (
    email_ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    email_subject VARCHAR(255) NOT NULL,
    email_body TEXT NOT NULL,
    email_sender VARCHAR(255) NOT NULL,
    status ENUM('unprocessed', 'processed') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skapa tabell 7: categories
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL
);
-- Insert default categories
INSERT INTO categories(category_name)
VALUES ('software'), ('network'), ('hardware'), ('security'), ('other');

-- Stored procedure for admin login
DELIMITER $$
CREATE PROCEDURE AdminLogin (
    IN p_email VARCHAR(100),
    IN p_password VARCHAR(255)
)
BEGIN
    DECLARE admin_count INT;

    -- Check if admin credentials are valid
    SELECT COUNT(*) INTO admin_count 
    FROM users 
    WHERE email = p_email 
    AND password = p_password 
    AND role = 'Admin';

    IF admin_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid admin credentials';
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE UpdateUserRole (
    IN p_user_id INT,
    IN p_new_role ENUM('user', 'agent')
)
BEGIN
    -- Update the user's role
    UPDATE users
    SET role = p_new_role
    WHERE user_id = p_user_id;
END$$
DELIMITER ;

-- Trigger to set department based on role
DELIMITER //
CREATE TRIGGER set_department_based_on_role
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF NEW.role = 'agent' THEN
        SET NEW.department = 'IT';
    ELSEIF NEW.role = 'user' THEN
        SET NEW.department = 'HR';
    END IF;
END;
//
DELIMITER ;

-- Stored procedure for user creation (updated)
DELIMITER $$
CREATE PROCEDURE CreateUser (
    IN p_username VARCHAR(255),
    IN p_password VARCHAR(255),
    IN p_email VARCHAR(255),
    IN p_role ENUM('user', 'agent'),
    IN p_department VARCHAR(255),
    IN p_creator_role ENUM('Admin', 'user', 'agent')
)
BEGIN
    DECLARE existing_user_count INT;

    -- Only admin can create new users
    IF p_creator_role != 'Admin' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only Admin can create new users';
    END IF;

    -- Check if the user with the same email already exists
    SELECT COUNT(*) INTO existing_user_count FROM users WHERE email = p_email;

    IF existing_user_count > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User with this email already exists';
    ELSE
        -- Insert into users table
        INSERT INTO users (username, password, email, role, department)
        VALUES (p_username, p_password, p_email, p_role, p_department);
    END IF;
END$$
DELIMITER ;

-- Stored procedure for ticket creation
DELIMITER $$
CREATE PROCEDURE CreateTicket (
    IN p_title VARCHAR(255),
    IN p_description TEXT,
    IN p_status ENUM('open', 'in progress', 'closed'),
    IN p_category VARCHAR(255),
    IN p_user_id INT,
    IN p_assigned_agent_id INT
)
BEGIN
    -- Insert into the tickets table
    INSERT INTO tickets (title, description, status, category, user_id, assigned_agent_id)
    VALUES (p_title, p_description, p_status, p_category, p_user_id, p_assigned_agent_id);
END$$
DELIMITER ;

-- Stored procedure to show a ticket
DELIMITER $$
CREATE PROCEDURE ShowTicket (
    IN p_ticket_id INT
)
BEGIN
    -- Select the ticket and associated agent information
    SELECT t.ticket_id, t.title, t.description, t.status, t.category, 
           t.created_at, u.username AS agent_name
    FROM tickets t
    LEFT JOIN users u ON t.assigned_agent_id = u.user_id
    WHERE t.ticket_id = p_ticket_id;
END$$
DELIMITER ;

-- Specify a category for a ticket
DELIMITER $$
CREATE PROCEDURE SpecifyCategory (
    IN p_ticket_id INT,
    IN p_category VARCHAR(255)
)
BEGIN
    UPDATE tickets
    SET category = p_category
    WHERE ticket_id = p_ticket_id;
END$$
DELIMITER ;

-- Create a new category
DELIMITER $$
CREATE PROCEDURE CreateCategory (
    IN p_category_name VARCHAR(255)
)
BEGIN
    INSERT INTO categories (category_name)
    VALUES (p_category_name);
END$$
DELIMITER ;

-- Filter tickets by category, status, and department
DELIMITER $$
CREATE PROCEDURE FilterTickets (
    IN p_category VARCHAR(255),
    IN p_status ENUM('open', 'in progress', 'closed'),
    IN p_department VARCHAR(255)
)
BEGIN
    SELECT t.* 
    FROM tickets t
    JOIN users u ON t.user_id = u.user_id
    WHERE t.category = p_category
    AND t.status = p_status
    AND u.department = p_department;
END$$
DELIMITER ;

-- Change the status of a ticket
DELIMITER $$
CREATE PROCEDURE ChangeTicketStatus (
    IN p_ticket_id INT,
    IN p_status ENUM('open', 'in progress', 'closed')
)
BEGIN
    UPDATE tickets
    SET status = p_status
    WHERE ticket_id = p_ticket_id;
END$$
DELIMITER ;

-- Show ticket with progress
DELIMITER $$
CREATE PROCEDURE ShowTicketWithProgress (
    IN p_ticket_id INT
)
BEGIN
    SELECT t.ticket_id, t.title, t.description, t.status, t.category, t.created_at, 
           c.content AS comment_content, c.created_at AS comment_date
    FROM tickets t
    LEFT JOIN comments c ON t.ticket_id = c.ticket_id
    WHERE t.ticket_id = p_ticket_id;
END$$
DELIMITER ;

-- Sort tickets by category
DELIMITER $$
CREATE PROCEDURE SortTicketsByCategory ()
BEGIN
    SELECT * FROM tickets
    ORDER BY category ASC;
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE AddCategory (
    IN p_category_name VARCHAR(255)
)
BEGIN
    -- Check if the category already exists
    IF (SELECT COUNT(*) FROM categories WHERE category_name = p_category_name) > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Category already exists';
    ELSE
        -- Insert the new category if it doesn't exist
        INSERT INTO categories (category_name)
        VALUES (p_category_name);
    END IF;
END $$
DELIMITER ;

--user adds a comment
DELIMITER $$

CREATE PROCEDURE AddUserComment(
    IN p_ticket_id INT,
    IN p_user_id INT,
    IN p_content TEXT
)
BEGIN
    INSERT INTO comments (ticket_id, user_id, content, sender_role)
    VALUES (p_ticket_id, p_user_id, p_content, 'user');
END $$

DELIMITER ;

-- agent adds a comment
DELIMITER $$

CREATE PROCEDURE AddAgentComment(
    IN p_ticket_id INT,
    IN p_agent_id INT,
    IN p_content TEXT
)
BEGIN
    INSERT INTO comments (ticket_id, user_id, content, sender_role)
    VALUES (p_ticket_id, p_agent_id, p_content, 'agent');
END $$

DELIMITER ;

--fetch comments
DELIMITER $$

CREATE PROCEDURE GetTicketComments(
    IN p_ticket_id INT
)
BEGIN
    SELECT 
        c.comment_id,
        c.ticket_id,
        c.content,
        c.sender_role,
        u.username AS sender_name,
        c.created_at
    FROM comments c
    JOIN users u ON c.user_id = u.user_id
    WHERE c.ticket_id = p_ticket_id
    ORDER BY c.created_at ASC;
END $$

DELIMITER ;
