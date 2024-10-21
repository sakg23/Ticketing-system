"use strict";
const mysql = require("promise-mysql");
const config = require("./../config/db/tecktingsystem.json");

// Function to get tickets for a specific user and their attachments
async function getTicketsQuery(userId) {
    const db = await mysql.createConnection(config);
    let sql = `
        SELECT tickets.*, GROUP_CONCAT(attachments.file_name) AS attachments
        FROM tickets
        LEFT JOIN attachments ON tickets.ticket_id = attachments.ticket_id
        WHERE tickets.user_id = ?
        GROUP BY tickets.ticket_id
    `;
    let res = await db.query(sql, [userId]);
    await db.end();
    return res;
}


async function createTicket(title, description, status, category, userId) {
    const db = await mysql.createConnection(config);
    let sql = `
        INSERT INTO tickets (title, description, status, category, user_id)
        VALUES (?, ?, ?, ?, ?)
    `;
    let result = await db.query(sql, [title, description, status, category, userId]);
    await db.end();

    // Return the ID of the newly created ticket
    return result.insertId;
}

// Function to update the ticket status (no changes to existing database schema)
async function updateTicketStatus(ticketId, status) {
    const db = await mysql.createConnection(config);
    let sql = 'UPDATE tickets SET status = ? WHERE ticket_id = ?';
    let values = [status, ticketId];
    await db.query(sql, values);
    await db.end();
}

// Function to get a user by their email
async function getUserByEmail(email) {
    const db = await mysql.createConnection(config);
    let sql = 'SELECT * FROM users WHERE email = ?';
    let result = await db.query(sql, [email]);
    await db.end();
    
    // Return the user if found, otherwise return null
    if (result.length > 0) {
        return result[0];
    } else {
        return null;
    }
}

async function getAllUsersWithTickets() {
    let db;
    try {
        db = await mysql.createConnection(config);
        const sql = `SELECT * FROM tickets;`;
        const [results] = await db.query(sql);
        
        // Log the results and its type
        console.log('Results:', results);
        console.log('Is results an array:', Array.isArray(results));

        // Ensure results is an array
        return Array.isArray(results) ? results : [];
    } catch (error) {
        console.error('Error fetching tickets:', error);
        return [];
    } finally {
        if (db) {
            await db.end(); // Close the connection in the finally block
        }
    }
}
// Function to send email updates to users
async function sendTicketUpdateEmail(email, ticketId, updateDetails) {
    let transporter = nodeMailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'your-email@gmail.com', // Your Gmail account
            pass: 'your-email-password'   // Your Gmail password
        }
    });

    let mailOptions = {
        from: 'your-email@gmail.com', // Sender address
        to: email,                    // Receiver (user's email)
        subject: `Update on Ticket #${ticketId}`,  // Subject line
        text: `Your ticket #${ticketId} has been updated. \nDetails: ${updateDetails}`  // Email body
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to:', email);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}


const handleFileUpload = async (req) => {
    const { title, description, category } = req.body;  // Extract ticket details from request
    const file = req.file;  // Access uploaded file via Multer
    
    if (!file) {
        throw new Error('No file uploaded');
    }

    // Create ticket and insert into the database
    const ticketId = await createTicket(title, description, 'open', category, req.session.user.id);

    // Insert file attachment into the database
    const attachmentSql = 'INSERT INTO attachments (ticket_id, file_name) VALUES (?, ?)';
    await db.query(attachmentSql, [ticketId, file.filename, file.originalname]);

    return { ticketId, fileName: file.filename };
};



module.exports = {
    createTicket,
    getTicketsQuery,
    updateTicketStatus,
    getUserByEmail,
    getAllUsersWithTickets,
    sendTicketUpdateEmail,
    handleFileUpload
};
