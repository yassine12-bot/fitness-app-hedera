require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Add missing walletCreatedAt column to users table
 */

async function fixDatabase() {
  console.log('🔧 Fixing database schema...');
  console.log('');

  const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'data.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Cannot open database:', err.message);
        reject(err);
        return;
      }

      console.log('✅ Connected to database:', dbPath);
      console.log('');

      // Check if column exists
      db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
          console.error('❌ Error checking table:', err.message);
          db.close();
          reject(err);
          return;
        }

        const hasWalletCreatedAt = columns.some(col => col.name === 'walletCreatedAt');

        if (hasWalletCreatedAt) {
          console.log('✅ Column walletCreatedAt already exists!');
          db.close();
          resolve();
          return;
        }

        console.log('📝 Adding walletCreatedAt column...');

        // Add the missing column
        db.run(`
          ALTER TABLE users 
          ADD COLUMN walletCreatedAt DATETIME
        `, (err) => {
          if (err) {
            console.error('❌ Error adding column:', err.message);
            db.close();
            reject(err);
            return;
          }

          console.log('✅ Column added successfully!');
          console.log('');
          console.log('🎉 Database fixed!');
          console.log('');
          console.log('You can now run: node WALKING-TEST-SIMPLE.js');
          console.log('');

          db.close();
          resolve();
        });
      });
    });
  });
}

fixDatabase().catch(console.error);