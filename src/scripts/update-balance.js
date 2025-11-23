require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data.db');
const db = new sqlite3.Database(DB_PATH);

const accountId = '0.0.7307810';
const balance = 20;

db.run('UPDATE users SET fitBalance = ? WHERE hederaAccountId = ?', 
  [balance, accountId], 
  (err) => {
    if (err) {
      console.error('❌ Error:', err.message);
    } else {
      console.log(`✅ Balance updated: ${accountId} now has ${balance} FIT`);
    }
    db.close();
  }
);