const mysql = require('mysql2/promise');
const config = require('../config/db/tecktingsystem.json');

async function connectToDatabase() {
    try {
        return await mysql.createConnection(config);
    } catch (error) {
        console.error('Error connecting to the database:', error);
        throw error;
    }
}

module.exports = connectToDatabase;