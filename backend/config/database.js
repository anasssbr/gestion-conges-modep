const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dateStrings: true   // ← empêche la conversion UTC→locale sur les DATE/DATETIME
});

db.connect((err) => {
  if (err) {
    console.error('Erreur connexion MySQL:', err);
    return;
  }
  console.log('MySQL connecté !');
});

module.exports = db;
