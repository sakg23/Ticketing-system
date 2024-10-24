const express = require('express');
const multer = require('multer');  // For handling file uploads
const path = require('path');
const { createTicket, getUserByEmail, sendTicketUpdateEmail, handleFileUpload } = require('./src/indexFunctions.js');
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;
const connectToDatabase = require('./src/db');
const fs = require('fs');
const session = require('express-session');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');  // Specify the directory for uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));  // Rename the file using a timestamp
    }
});


const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const result = await handleFileUpload(req);  // Call the file upload handler
        res.status(200).json({ success: true, message: 'File uploaded successfully', result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Lägg till session-konfigurationen innan dina routes
app.use(session({
    secret: 'AGENT99:00',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true } // Secure cookie settings
}));


app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route to render index page
app.get('/login', (req, res) => {
    res.render('login.ejs');
});

app.get('/', (req, res) => {
    res.render('index.ejs');
});

// Only allow access to the signup page if the user is an admin
app.get('/signup', isAuthenticated, isAdmin, (req, res) => {
    console.log("User role:", req.session.user.role);
    if (req.session.user.role !== 'Admin') {
        return res.redirect('/'); // Omdirigera om användaren inte har rätt roll
    }
    res.render('signup.ejs');
});

// Only allow the admin to create new accounts
app.post('/signup', isAuthenticated, isAdmin, async (req, res) => {
    console.log('Entered signup route');

    const { name, email, password, department } = req.body;

    try {
        console.log('Signup request received, hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully:', hashedPassword);

        const role = 'user';  // Force role to 'user'
        const creatorRole = 'Admin';  // Assuming the creator is an Admin

        // Prepare and execute the SQL query to insert the new user
        const db = await connectToDatabase();
        let sql = 'CALL CreateUser(?, ?, ?, ?, ?, ?)';
        const result = await db.query(sql, [name, hashedPassword, email, role, department, creatorRole]);

        console.log('Database response:', result);
        await db.end();

        console.log('User created successfully, closing database connection');

        // Render the signup success page, passing the name to display
        res.render('signup-success.ejs', { name });

    } catch (error) {
        console.error('Error during signup process:', error);

        if (error.sqlMessage && error.sqlMessage.includes('User with this email already exists')) {
            return res.status(400).send('User with this email already exists.');
        }
        res.status(500).send('Internal Server Error');
    }
});



app.post('/login', async (req, res) => {
    console.log('Login route triggered'); // Confirm route is triggered

    const { email, password } = req.body;
    console.log('Email provided:', email);
    console.log('Password provided:', password);

    try {
        const user = await getUserByEmail(email);
        console.log('User fetched from database:', user); // Log user object

        if (!user) {
            console.log('User not found');
            return res.render('login.ejs', { error: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Is password valid:', isPasswordValid);

        if (!isPasswordValid) {
            console.log('Invalid password');
            return res.render('login.ejs', { error: 'Invalid password' });
        }

        // Store user information in the session
        req.session.user = {
            id: user.user_id,
            email: user.email,
            role: user.role,
            username: user.username
        };
        console.log('Session User:', req.session.user); // Log session data

        // Redirect based on the user's role
        if (user.role === 'Admin') {
            console.log('Redirecting to admin dashboard');
            res.redirect('/admin-dashboard');  // Redirect to admin dashboard
        } else if (user.role === 'agent') {
            console.log('Redirecting to agent dashboard');
            res.redirect('/agent-dashboard');  // Redirect to agent dashboard
        } else {
            console.log('Redirecting to user dashboard');
            res.redirect('/user-dashboard');   // Redirect to user dashboard
        }

        console.log('Login process complete');
    } catch (error) {
        console.error('Error logging in:', error); // Log any error
        res.status(500).send('Internal Server Error');
    }
});

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next(); // User is logged in, proceed to the next middleware or route
    } else {
        return res.redirect('/login'); // If not logged in, redirect to the login page
    }
}

// Middleware to check if the user is an admin
function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'Admin') {
        return next(); // User is an admin, proceed to the next middleware or route
    } else {
        return res.status(403).send('Access denied: Admins only.');
    }
}

// Middleware to check if the user is authenticated and is an agent
function isAgent(req, res, next) {
    if (req.session && req.session.user) {
        if (req.session.user.role === 'agent' || req.session.user.role === 'Admin') {
            return next(); // Proceed if the user is an agent or admin
        } else {
            return res.status(403).send('Access denied: You do not have permission to view this page.');
        }
    } else {
        return res.redirect('/login'); // Redirect to login if not logged in
    }
}


// Protect dashboard routes with authentication
app.get('/agent-dashboard', isAuthenticated, isAgent, (req, res) => {
    console.log("User role:", req.session.user.role);
    if (req.session.user.role !== 'agent') {
        return res.redirect('/'); // Omdirigera om användaren inte har rätt roll
    }
    const userName = req.session.user.username; // Use the username from the session
    res.render('agent-dashboard.ejs', { userName });
});

app.get('/admin-dashboard', isAuthenticated, isAdmin, (req, res) => {
    console.log("User role:", req.session.user.role);
    if (req.session.user.role !== 'Admin') {
        return res.redirect('/'); // Omdirigera om användaren inte har rätt roll
    }
    const userName = req.session.user.username; // Use the username from the session
    res.render('admin-dashboard.ejs', { userName });
});

app.get('/user-dashboard', isAuthenticated, (req, res) => {
    console.log("User role:", req.session.user.role);
    if (req.session.user.role !== 'user') {
        return res.redirect('/'); // Omdirigera om användaren inte har rätt roll
    }
    console.log("User role:", req.session.user.role);
    if (req.session.user.role !== 'user') {
        return res.redirect('/'); // Omdirigera om användaren inte har rätt roll
    }
    const userName = req.session.user.username; // Use username from the session
    res.render('user-dashboard.ejs', { userName });
});


app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Failed to logout.');
        }
        // Redirect to the login page after session is destroyed
        res.redirect('/login');
    });
});





// Protect ticket creation
app.get('/create-ticket', isAuthenticated, (req, res) => {
    console.log("User role:", req.session.user.role);
        if (req.session.user.role !== 'user') {
            return res.redirect('/'); // Omdirigera om användaren inte har rätt roll
        }
    const userName = req.session.user.username; // Use username from the session
    res.render('create-ticket.ejs', { userName });
});

app.post('/create-ticket', isAuthenticated, upload.single('attachment'), async (req, res) => {
    const { title, description, category } = req.body;
    const userId = req.session.user.id;

    try {
        const ticketId = await createTicket(title, description, 'open', category, userId);
        
        if (req.file) {
            const db = await connectToDatabase();
            const attachmentSql = 'INSERT INTO attachments (ticket_id, file_name) VALUES (?, ?)';
            await db.query(attachmentSql, [ticketId, req.file.filename]);
            await db.end();
        }

        res.redirect('/view-tickets');
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).send('Error creating ticket');
    }
});

// Example route to fetch tickets with attachments
app.get('/view-tickets', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;

    try {
        console.log("User role:", req.session.user.role);
        if (req.session.user.role !== 'user') {
            return res.redirect('/'); // Omdirigera om användaren inte har rätt roll
        }
        const db = await connectToDatabase();
        
        const ticketsSql = `
        SELECT t.ticket_id, t.title, t.description, t.category, t.status, t.created_at, 
               a.file_name AS attachment, a.original_name
        FROM tickets t
        LEFT JOIN attachments a ON t.ticket_id = a.ticket_id
        WHERE t.user_id = ?
        ORDER BY t.ticket_id DESC;
    `;
    
        const [tickets] = await db.query(ticketsSql, [userId]);

        const categoriesSql = "SELECT * FROM categories";
        const [categories] = await db.query(categoriesSql);

        await db.end();

        res.render('view-tickets.ejs', { tickets, categories });
    } catch (error) {
        console.error('Error fetching tickets or categories:', error);
        res.status(500).send('Error fetching tickets or categories');
    }
});

// Visa alla biljetter för agenter
app.get('/view-all-tickets', isAuthenticated, async (req, res) => {
    try { 
        console.log("User role:", req.session.user.role);
        if (req.session.user.role !== 'agent') {
            return res.redirect('/'); // Omdirigera om användaren inte har rätt roll
        }

        const db = await connectToDatabase();

        // Hämta biljetterna
        const ticketsSql = `
        SELECT t.ticket_id, t.title, t.description, t.status, t.category, t.created_at, 
        u.username AS created_by, a.file_name AS attachment, a.original_name
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.user_id
        LEFT JOIN attachments a ON t.ticket_id = a.ticket_id
        ORDER BY t.ticket_id DESC;
        `;
        const [tickets] = await db.query(ticketsSql);
        console.log("Tickets fetched:", tickets); // Log the tickets fetched

        // Hämta kategorierna
        const categoriesSql = "SELECT * FROM categories";
        const [categories] = await db.query(categoriesSql);
        console.log("Categories fetched:", categories); // Log the categories fetched

        await db.end();

        // Skicka biljetterna och kategorierna till vyn
        res.render('view-all-tickets.ejs', { tickets, categories, userName: req.session.user.username });

    } catch (error) {
        console.error('Error fetching tickets or categories:', error); // Log the specific error
        res.status(500).send('Error fetching tickets or categories');
    }
});



app.get('/admin-view-all-tickets', isAuthenticated, async (req, res) => {
    if (req.session.user.role !== 'Admin') {
        return res.redirect('/'); // Redirect if user is not an admin
    }

    try {
        console.log("User role:", req.session.user.role);
        if (req.session.user.role !== 'Admin') {
            return res.redirect('/'); // Omdirigera om användaren inte har rätt roll
        }
        const db = await connectToDatabase();
        const ticketsSql = `
            SELECT t.ticket_id, t.title, t.description, t.status, t.category, t.created_at, 
            u.username AS created_by, a.file_name AS attachment
            FROM tickets t
            LEFT JOIN users u ON t.user_id = u.user_id
            LEFT JOIN attachments a ON t.ticket_id = a.ticket_id;
        `;

        const [tickets] = await db.query(ticketsSql);
        await db.end();

        // Render 'admin-view-all-tickets.ejs' with tickets
        res.render('admin-view-all-tickets.ejs', { tickets, userName: req.session.user.username });
    } catch (error) {
        console.error('Error fetching tickets for admin:', error);
        res.status(500).send('Error fetching tickets');
    }
});

app.get('/view-ticket/:id', isAuthenticated, async (req, res) => {
    const ticketId = req.params.id;
    const userId = req.session.user.id; 

    try {
        const db = await connectToDatabase();

        // Fetch ticket details
        const ticketSql = `
            SELECT t.ticket_id, t.title, t.description, t.status, t.category, t.created_at, 
            u.username AS created_by, a.file_name AS attachment
            FROM tickets t
            LEFT JOIN users u ON t.user_id = u.user_id
            LEFT JOIN attachments a ON t.ticket_id = a.ticket_id
            WHERE t.ticket_id = ? AND (t.user_id = ? OR ? IN ('agent', 'Admin'));
        `;
        const [ticket] = await db.query(ticketSql, [ticketId, userId, req.session.user.role]);

        // Fetch all categories
        const categoriesSql = 'SELECT * FROM categories';
        const [categories] = await db.query(categoriesSql);

        await db.end();

        if (!ticket.length) {
            return res.status(404).send('Ticket not found');
        }

        // Pass ticket details and categories to the view
        res.render('ticket.ejs', { 
            ticket: ticket[0], 
            categories,  // Pass categories to the view
            userName: req.session.user.username 
        });

    } catch (error) {
        console.error('Error fetching ticket details or categories:', error);
        res.status(500).send('Error fetching ticket details or categories');
    }
});


app.post('/update-ticket/:id', isAuthenticated, async (req, res) => {
    const ticketId = req.params.id;
    const { title, description, status, category } = req.body;  // Grab new values from the form
    const userId = req.session.user.id;

    try {
        const db = await connectToDatabase();

        // Ensure only the creator (user) or an agent/admin can update the ticket
        const updateTicketSql = `
            UPDATE tickets 
            SET title = ?, description = ?, status = ?, category = ? 
            WHERE ticket_id = ? AND (user_id = ? OR ? IN ('agent', 'Admin'));
        `;
        const result = await db.query(updateTicketSql, [title, description, status, category, ticketId, userId, req.session.user.role]);

        await db.end();

        if (result.affectedRows === 0) {
            return res.status(404).send('Ticket not found or you do not have permission to update this ticket');
        }

        res.redirect(`/view-ticket/${ticketId}`);  // Redirect back to the ticket details page

    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).send('Error updating ticket');
    }
});


// Route to change the status of a ticket
app.get('/change-status/:id', isAuthenticated, async (req, res) => {
    const ticketId = req.params.id;
    const newStatus = req.query.status;

    try {
        const db = await connectToDatabase();
        const statusSql = 'UPDATE tickets SET status = ? WHERE ticket_id = ?';
        await db.query(statusSql, [newStatus, ticketId]);
        await db.end();

        // Kolla användarens roll och omdirigera till rätt sida
        if (req.session.user.role === 'agent') {
            res.redirect('/view-all-tickets'); // Omdirigera agenter till "view all tickets"
        } else {
            res.redirect('/view-tickets'); // Omdirigera vanliga användare till "view tickets"
        }
    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).send('Error updating ticket status');
    }
});
// uppdatera kategori som en agent
app.post('/update-category/:id', isAuthenticated, async (req, res) => {
    const ticketId = req.params.id;  
    const newCategory = req.body.category;  

    try {
        const db = await connectToDatabase();
        const updateCategorySql = 'UPDATE tickets SET category = ? WHERE ticket_id = ?';
        await db.query(updateCategorySql, [newCategory, ticketId]);
        await db.end();

        // Kontrollera användarens roll och omdirigera baserat på deras roll
        if (req.session.user.role === 'agent') {
            res.redirect('/view-all-tickets');  // Omdirigera agenter till "view all tickets"
        } else if (req.session.user.role === 'user') {
            res.redirect('/view-tickets');  // Omdirigera användare till "view tickets"
        } else {
            res.redirect('/');  // Omdirigera alla andra roller (om det finns) till startsidan
        }

    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).send('Error updating category');
    }
});



// Visa alla användaren för agenter

app.get('/view-all-users', async (req, res) => {
    // Check if the user is logged in
    if (!req.session.user) {
        return res.redirect('/login');  // If not logged in, redirect to login page
    }

    // Optionally, you can add role-based access control (if necessary)
    if (req.session.user.role !== 'agent') {
        return res.status(403).send('Access denied: You do not have permission to view this page.');
    }

    let db;
    try {
        db = await connectToDatabase(); // Connect to the database

        const sql = `SELECT * FROM users WHERE role IN ('user', 'agent') ORDER BY user_id DESC;`; // SQL query to fetch users
        console.log('Executing SQL:', sql); // Log the SQL query
        
        const [users] = await db.query(sql); // Execute the query and fetch users
        console.log('Users fetched from database:', users); // Log the fetched users

        // Render the 'view-all-users.ejs' page, passing the users and current user's username
        res.render('view-all-users.ejs', { users, userName: req.session.user.username });
    } catch (error) {
        console.error('Error fetching users:', error.message); // Log any errors
        res.status(500).send('Error fetching users'); // Send an error message as the response
    } finally {
        if (db) {
            await db.end(); // Close the database connection
        }
    }
});


// Admin view all users and manage them
app.get('/admin-view-all-users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        if (req.session.user.role !== 'Admin') {
            return res.status(403).send('Access denied: You do not have permission to view this page.');
        }

        const db = await connectToDatabase();
        const usersSql = `SELECT * FROM users WHERE role IN ('user', 'agent') ORDER BY user_id DESC;`;
        const [users] = await db.query(usersSql);
        await db.end();

        res.render('admin-view-all-users.ejs', { users, userName: req.session.user.username });
    } catch (error) {
        console.error('Error fetching users for admin:', error);
        res.status(500).send('Error fetching users');
    }
});




// Admin route to delete a user
app.get('/admin/delete-user/:id', isAuthenticated, isAdmin, async (req, res) => {
    const userId = req.params.id;

    try {
        const db = await connectToDatabase();
        const deleteUserSql = 'DELETE FROM users WHERE user_id = ?';
        await db.query(deleteUserSql, [userId]);
        await db.end();

        res.redirect('/admin-view-all-users');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Error deleting user');
    }
});


// Admin route to update user role
// Protect route to change user role (only for admin)
app.get('/admin/update-role/:id', isAuthenticated, isAdmin, async (req, res) => {
    const userId = req.params.id;
    const newRole = req.query.role;

    if (!['user', 'agent'].includes(newRole)) {
        return res.status(400).send('Invalid role');
    }

    try {
        const db = await connectToDatabase();
        const updateRoleSql = 'UPDATE users SET role = ? WHERE user_id = ?';
        await db.query(updateRoleSql, [newRole, userId]);
        await db.end();

        res.redirect('/admin-view-all-users');
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).send('Error updating user role');
    }
});


// Route to change the status of a ticket (for users, admin and agents)
app.get('/change-status/:id', isAuthenticated, async (req, res) => {
    // Restrict access to only Admins and Agents
    if (req.session.user.role !== 'Admin' && req.session.user.role !== 'agent') {
        return res.status(403).send('Access denied. Only Admins and Agents can change ticket status.');
    }

    const ticketId = req.params.id;
    const newStatus = req.query.status;

    try {
        const db = await connectToDatabase();
        const statusSql = 'UPDATE tickets SET status = ? WHERE ticket_id = ?';
        await db.query(statusSql, [newStatus, ticketId]);

        // Get the user's email (assuming you can retrieve this from the session or the database)
        const userEmailSql = 'SELECT email FROM users JOIN tickets ON users.user_id = tickets.user_id WHERE tickets.ticket_id = ?';
        const [userEmailResult] = await db.query(userEmailSql, [ticketId]);
        const userEmail = userEmailResult[0].email;

        // Send email to the user notifying them of the status change
        const updateDetails = `The status of your ticket has been changed to: ${newStatus}`;
        await sendTicketUpdateEmail(userEmail, ticketId, updateDetails);

        await db.end();

        // Redirect based on the user's role
        if (req.session.user.role === 'Admin') {
            res.redirect('/admin-view-all-tickets');  // Admins see all tickets
        } else if (req.session.user.role === 'agent') {
            res.redirect('/view-all-tickets');  // Agents see their tickets
        } else if (req.session.user.role === 'user') {
            res.redirect('/view-tickets');  // Regular users see their own tickets
        }
    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).send('Error updating ticket status');
    }
});

//Skapa en route för att visa formuläret för att skapa nya kategorier

app.get('/agent-area', isAuthenticated, isAgent, async (req, res) => {
    try {
        if (req.session.user.role !== 'agent') {
            return res.status(403).send('Access denied: You do not have permission to view this page.');
        }
        
        const db = await connectToDatabase();

        // Fetch categories
        const categoriesSql = 'SELECT * FROM categories';
        const [categories] = await db.query(categoriesSql);

        await db.end();

        // Pass categories and userName to the view
        res.render('agent-area.ejs', { categories, userName: req.session.user.username });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Error fetching categories');
    }
});


app.post('/agent-area/add-category', isAuthenticated, isAgent, async (req, res) => {
    const newCategory = req.body.category_name;

    if (!newCategory) {
        return res.status(400).send('Category name is required');
    }

    try {
        const db = await connectToDatabase();  // Connect to the database
        
        const query = `INSERT INTO categories (category_name) VALUES (?)`;
        await db.query(query, [newCategory]);  // Execute the query

        await db.end();  // Close the connection
        res.redirect('/agent-area');  // Redirect after successful addition
    } catch (err) {
        console.error('Error adding category:', err);
        res.status(500).send('Error adding category');
    }
});


app.get('/agent-articles', isAgent, async (req, res) => {
    try {
        if (req.session.user.role !== 'agent') {
            return res.status(403).send('Access denied: You do not have permission to view this page.');
        }
        const db = await connectToDatabase();
        
        // Uppdatera SQL-frågan för att inkludera användarnamnet
        const articlesSql = `
            SELECT k.article_id, k.title, k.content, k.created_at, u.username AS created_by 
            FROM knowledgeBase k 
            JOIN users u ON k.created_by = u.user_id
            ORDER BY k.created_at DESC
        `;
        
        const [articles] = await db.query(articlesSql);
        await db.end();

        res.render('agent-articles.ejs', { articles, userName: req.session.user.username });
    } catch (error) {
        console.error('Error fetching articles:', error);
        res.status(500).send('Error fetching articles');
    }
});



// Route för att skapa en ny artikel
app.post('/agent-articles/create', isAgent, async (req, res) => {
    const { title, content } = req.body;
    const userId = req.session.user.id;

    try {
        const db = await connectToDatabase();
        const insertArticleSql = 'INSERT INTO knowledgeBase (title, content, created_by) VALUES (?, ?, ?)';
        await db.query(insertArticleSql, [title, content, userId]);
        await db.end();

        res.redirect('/agent-articles');
    } catch (error) {
        console.error('Error creating article:', error);
        res.status(500).send('Error creating article');
    }
});


app.get('/agent-article/:id', isAgent, async (req, res) => {
    const articleId = req.params.id;

    try {
        if (req.session.user.role !== 'agent') {
            return res.status(403).send('Access denied: You do not have permission to view this page.');
        }
        const db = await connectToDatabase();
        const articleSql = 'SELECT * FROM knowledgeBase WHERE article_id = ?';
        const [article] = await db.query(articleSql, [articleId]);

        const commentsSql = 'SELECT c.content, c.created_at, u.username FROM article_comments c JOIN users u ON c.user_id = u.user_id WHERE article_id = ? ORDER BY c.created_at ASC';
        const [comments] = await db.query(commentsSql, [articleId]);

        await db.end();

        res.render('agent-article.ejs', { article: article[0], comments, userName: req.session.user.username });
    } catch (error) {
        console.error('Error fetching article or comments:', error);
        res.status(500).send('Error fetching article or comments');
    }
});

// Route för att lägga till en kommentar på en artikel
app.post('/agent-article/:id/comment', isAgent, async (req, res) => {
    const articleId = req.params.id;
    const userId = req.session.user.id;
    const { comment } = req.body;

    try {
        const db = await connectToDatabase();
        const commentSql = 'INSERT INTO article_comments (article_id, user_id, content) VALUES (?, ?, ?)';
        await db.query(commentSql, [articleId, userId, comment]);
        await db.end();

        res.redirect(`/agent-article/${articleId}`);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).send('Error adding comment');
    }
});



app.get('/view-comments/:ticket_id', isAuthenticated, async (req, res) => {
    const ticketId = req.params.ticket_id;
    const userRole = req.session.user.role;  // Retrieve the role from the session

    try {
        const db = await connectToDatabase();

        // Fetch comments for the ticket
        const commentsSql = `
            SELECT c.content, c.created_at, u.username AS sender_name, c.sender_role 
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.ticket_id = ?
            ORDER BY c.created_at ASC;
        `;
        const [comments] = await db.query(commentsSql, [ticketId]);

        await db.end();

        // Check the role and render the correct EJS view
        if (userRole === 'agent') {
            res.render('view-comments-agent.ejs', { ticket_id: ticketId, comments });
        } else {
            res.render('view-comments.ejs', { ticket_id: ticketId, comments });
        }
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).send('Error fetching comments');
    }
});


app.post('/add-comment/:ticket_id', isAuthenticated, async (req, res) => {
    const ticketId = req.params.ticket_id;
    const userId = req.session.user.id; // The logged-in user
    const content = req.body.content;
    const userRole = req.session.user.role;  // Retrieve the role from the session

    try {
        const db = await connectToDatabase();

        // Insert the new comment into the comments table
        const commentSql = `
            INSERT INTO comments (ticket_id, user_id, content, sender_role)
            VALUES (?, ?, ?, ?);
        `;
        await db.query(commentSql, [ticketId, userId, content, userRole]);

        await db.end();

        // Redirect back to the comments page based on user role
        res.redirect(`/view-comments/${ticketId}`);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).send('Error adding comment');
    }
});


// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
