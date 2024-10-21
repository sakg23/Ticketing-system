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
        cb(null, Date.now() + path.extname(file.originalname));  // Rename the file
    }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const result = await handleFileUpload(req);  // Handle the uploaded file
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
    cookie: { secure: false } // Använd true om du använder HTTPS
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

app.get('/signup', isAuthenticated, (req, res) => {
    console.log('entered the route for the signup'); // Debug statement to confirm the route is triggered

    if (req.session.user.role !== 'Admin') {
        return res.redirect('/');  // If not an admin, redirect to the homepage
    }

    res.render('signup.ejs', { userName: req.session.user.username });
});

app.post('/signup', async (req, res) => {
    console.log('Entered signup route');  // Initial debug statement

    // Debug: Log the incoming request body
    console.log('Request body:', req.body);

    const { name, email, password, department, role } = req.body;

    // Debug: Log the session data
    console.log('Session data:', req.session);

    // Ensure req.session.user exists
    if (!req.session.user) {
        console.log('No user session found, redirecting to home');
        return res.redirect('/');
    }

    // Debug: Log the role of the session user
    console.log('Session user role:', req.session.user.role);

    if (req.session.user.role !== 'Admin') {
        console.log('User is not an Admin, redirecting to home');
        return res.redirect('/');  // Redirect to homepage if not admin
    }

    try {
        console.log('Signup request received, hashing password...');

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10); // Hashing the password
        console.log('Password hashed successfully:', hashedPassword);

        // Debug: Log the SQL query and parameters before executing
        console.log('Preparing to call stored procedure CreateUser with parameters:', {
            name, hashedPassword, email, role, department, creatorRole: req.session.user.role
        });

        // Use the updated stored procedure to create a new user
        const db = await connectToDatabase();
        let sql = 'CALL CreateUser(?, ?, ?, ?, ?, ?)'; // Updated the SQL to match the stored procedure
        const result = await db.query(sql, [name, hashedPassword, email, role, department, req.session.user.role]); // Passing the Admin's role as p_creator_role
        
        // Debug: Log the result from the database query
        console.log('Database response:', result);

        await db.end();
        console.log('User created successfully, closing database connection');

        // Redirect to homepage after successful signup
        res.redirect('/admin-view-all-users');

    } catch (error) {
        console.error('Error during signup process:', error);

        // Handle the case where the user already exists
        if (error.sqlMessage && error.sqlMessage.includes('User with this email already exists')) {
            console.log('User with this email already exists, sending error response');
            return res.status(400).send('User with this email already exists.');
        }

        console.log('An internal server error occurred, sending error response');
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

// Middleware to check if the user is logged in
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next(); // User is logged in, proceed to the next middleware or route
    } else {
        console.log("User is not authenticated, redirecting to login.");
        return res.redirect('/login'); // If not logged in, redirect to the login page
    }
}

// Route for agent dashboard
app.get('/admin-dashboard', isAuthenticated, (req, res) => {
    if (req.session.user.role !== 'Admin') {
        return res.redirect('/admin-view-all-users');
 // If not an admin, redirect to the homepage
    }

    res.render('admin-dashboard.ejs', { userName: req.session.user.username });
});

app.get('/agent-dashboard', (req, res) => {
    const userName = req.session.user.username; // Use username from the session
    res.render('agent-dashboard.ejs', { userName });
});

app.get('/user-dashboard', (req, res) => {
    const userName = req.session.user.username; // Use username from the session
    res.render('user-dashboard.ejs', { userName });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Failed to logout.');
        }
        res.render('logout.ejs'); // Rendera logout.ejs efter utloggning
    });
});



app.get('/create-ticket', isAuthenticated, (req, res) => {
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
app.get('/view-tickets', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const userId = req.session.user.id;

    try {
        const db = await connectToDatabase();
        
        // Hämta användarens biljetter
        const ticketsSql = `
            SELECT t.ticket_id, t.title, t.description, t.category, t.status, t.created_at, a.file_name AS attachment
            FROM tickets t
            LEFT JOIN attachments a ON t.ticket_id = a.ticket_id
            WHERE t.user_id = ?
            ORDER BY t.ticket_id DESC;
        `;
        const [tickets] = await db.query(ticketsSql, [userId]);

        // Hämta kategorierna
        const categoriesSql = "SELECT * FROM categories";
        const [categories] = await db.query(categoriesSql);

        await db.end();

        // Skicka både biljetter och kategorier till vyn
        res.render('view-tickets.ejs', { tickets, categories });
    } catch (error) {
        console.error('Error fetching tickets or categories:', error);
        res.status(500).send('Error fetching tickets or categories');
    }
});


// Visa alla biljetter för agenter
app.get('/view-all-tickets', isAuthenticated, async (req, res) => {
    try {
        if (req.session.user.role !== 'agent' && req.session.user.role !== 'Admin') {
            return res.redirect('/'); // Omdirigera om användaren inte har rätt roll
        }

        const db = await connectToDatabase();

        // Hämta biljetterna
        const ticketsSql = `
        SELECT t.ticket_id, t.title, t.description, t.status, t.category, t.created_at, 
        u.username AS created_by, a.file_name AS attachment
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.user_id
        LEFT JOIN attachments a ON t.ticket_id = a.ticket_id;
        `;
        const [tickets] = await db.query(ticketsSql);

        // Hämta kategorierna
        const categoriesSql = "SELECT * FROM categories";
        const [categories] = await db.query(categoriesSql);

        await db.end();

        // Skicka biljetterna och kategorierna till vyn
        res.render('view-all-tickets.ejs', { tickets, categories, userName: req.session.user.username });

    } catch (error) {
        console.error('Error fetching tickets or categories:', error);
        res.status(500).send('Error fetching tickets or categories');
    }
});


app.get('/admin-view-all-tickets', isAuthenticated, async (req, res) => {
    if (req.session.user.role !== 'Admin') {
        return res.redirect('/'); // Redirect if user is not an admin
    }

    try {
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

app.get('/view-all-users', isAuthenticated, async (req, res) => {
    let db;
    try {
        db = await connectToDatabase(); // Använd den befintliga funktionen för att ansluta till databasen

        const sql = `SELECT * FROM users WHERE role IN ('user', 'agent') ORDER BY user_id DESC;`; // SQL-fråga för att hämta alla användare
        console.log('Executing SQL:', sql); // Logga SQL-frågan
        
        const [users] = await db.query(sql); // Exekvera frågan och hämta användare
        console.log('Users fetched from database:', users); // Logga de hämtade användarna

        // Rendera view-all-users.ejs och passera användarna och användarnamnet till mallen
        res.render('view-all-users.ejs', { users, userName: req.session.user.username });
    } catch (error) {
        console.error('Error fetching users:', error.message); // Logga eventuella fel
        res.status(500).send('Error fetching users'); // Skicka ett felmeddelande som svar
    } finally {
        if (db) {
            await db.end(); // Stäng anslutningen till databasen
        }
    }
});

// Admin view all users and manage them
app.get('/admin-view-all-users', isAuthenticated, async (req, res) => {
    if (req.session.user.role !== 'Admin') {
        return res.redirect('/'); // Only admin can view users
    }

    try {
        const db = await connectToDatabase();
        const usersSql = `SELECT * FROM users WHERE role IN ('user', 'agent') ORDER BY user_id DESC;`;
        const [users] = await db.query(usersSql);
        await db.end();

        // Render 'admin-view-all-users.ejs' and pass users to the view
        res.render('admin-view-all-users.ejs', { users, userName: req.session.user.username });
    } catch (error) {
        console.error('Error fetching users for admin:', error);
        res.status(500).send('Error fetching users');
    }
});

// Display ticket information
app.get('/view-ticket/:id', isAuthenticated, async (req, res) => {
    const ticketId = req.params.id;  // Get the ticket ID from the URL parameter
    
    try {
        const db = await connectToDatabase();
        const ticketSql = `
            SELECT t.ticket_id, t.title, t.description, t.status, t.category, t.created_at, 
            u.username AS created_by, a.file_name AS attachment
            FROM tickets t
            LEFT JOIN users u ON t.user_id = u.user_id
            LEFT JOIN attachments a ON t.ticket_id = a.ticket_id
            WHERE t.ticket_id = ?;
        `;

        const [ticket] = await db.query(ticketSql, [ticketId]);
        await db.end();

        if (!ticket.length) {
            return res.status(404).send('Ticket not found');
        }

        // Render the view-ticket.ejs file with the ticket details
        res.render('ticket.ejs', { ticket: ticket[0], userName: req.session.user.username });
    } catch (error) {
        console.error('Error fetching ticket details:', error);
        res.status(500).send('Error fetching ticket details');
    }
});


// Admin route to delete a user
app.get('/admin/delete-user/:id', isAuthenticated, async (req, res) => {
    if (req.session.user.role !== 'Admin') {
        return res.redirect('/');  // Only Admins can delete users
    }

    const userId = req.params.id;

    try {
        const db = await connectToDatabase();
        const deleteUserSql = 'DELETE FROM users WHERE user_id = ?';  // SQL to delete user by id
        await db.query(deleteUserSql, [userId]);
        await db.end();

        // Redirect to view-all-users after deletion
        res.redirect('/admin-view-all-users');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Error deleting user');
    }
});


// Admin route to update user role
app.get('/admin/update-role/:id', isAuthenticated, async (req, res) => {
    if (req.session.user.role !== 'Admin') {
        return res.redirect('/');  // Only Admins can update user roles
    }

    const userId = req.params.id;
    const newRole = req.query.role;

    if (!['user', 'agent'].includes(newRole)) {
        return res.status(400).send('Invalid role');  // Validate role
    }

    try {
        const db = await connectToDatabase();
        const updateRoleSql = 'UPDATE users SET role = ? WHERE user_id = ?';
        await db.query(updateRoleSql, [newRole, userId]);
        await db.end();

        // Redirect back to the user list or wherever appropriate
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

app.get('/add-category', isAuthenticated, (req, res) => {
    // Kontrollera att bara agenter och admin kan lägga till nya kategorier
    if (req.session.user.role !== 'agent' && req.session.user.role !== 'Admin') {
        return res.redirect('/');  // Endast agenter och admin kan komma åt denna sida
    }
    res.render('add-category.ejs');  // Rendera sidan för att lägga till en ny kategori
});

app.post('/add-category', isAuthenticated, async (req, res) => {
    console.log('Request body:', req.body);  // Log the request body to check the data

    if (req.session.user.role !== 'agent' && req.session.user.role !== 'Admin') {
        return res.redirect('/');  // Redirect unauthorized users
    }

    const newCategory = req.body.category_name;  
    console.log("fetched category: ", newCategory);

    if (!newCategory) {
        return res.status(400).send('Category name is required');
    }

    try {
        const db = await connectToDatabase();  // Connect to the database
        
        const query = `INSERT INTO categories (category_name) VALUES (?)`;
        await db.query(query, [newCategory]);  // Execute the query

        await db.end();  // Close the connection
        res.redirect('/view-all-tickets');  // Redirect after successful addition
    } catch (err) {
        console.error('Detailed Error Info:', err);  // Log the full error object
        res.status(500).send('Error adding category. Details: ' + err.message);
    }
});


// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
