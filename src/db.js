require('dotenv').config();
module.exports = require('mysql2/promise').createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASS, database: process.env.DB_NAME,
  waitForConnections: true, connectionLimit: 20, charset: 'utf8mb4'
});
