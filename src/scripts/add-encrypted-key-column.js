/**
 * Database Migration: Add hederaPrivateKeyEncrypted column
 * 
 * This migration adds secure storage for user Hedera private keys.
 * Run this ONCE before deploying the updated code.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database.db');

async function migrate() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Database connection failed:', err);
        reject(err);
        return;
      }
      
      console.log('📊 Connected to database');
      
      // Check if column already exists
      db.get("PRAGMA table_info(users)", (err, result) => {
        if (err) {
          console.error('❌ Failed to check table info:', err);
          db.close();
          reject(err);
          return;
        }
        
        // Add column
        db.run(`
          ALTER TABLE users 
          ADD COLUMN hederaPrivateKeyEncrypted TEXT
        `, (err) => {
          if (err) {
            if (err.message.includes('duplicate column')) {
              console.log('✅ Column already exists, skipping');
              db.close();
              resolve();
            } else {
              console.error('❌ Migration failed:', err);
              db.close();
              reject(err);
            }
            return;
          }
          
          console.log('✅ Migration successful: hederaPrivateKeyEncrypted column added');
          
          // Create index for faster lookups
          db.run(`
            CREATE INDEX IF NOT EXISTS idx_users_hedera_account 
            ON users(hederaAccountId)
          `, (err) => {
            if (err) {
              console.warn('⚠️  Index creation failed:', err.message);
            } else {
              console.log('✅ Index created on hederaAccountId');
            }
            
            db.close();
            resolve();
          });
        });
      });
    });
  });
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✅ Database migration complete!');
    console.log('   You can now start the server.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  });