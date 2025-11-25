require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Add totalPosts column to users table
 */

async function addTotalPostsColumn() {
  console.log('🔧 Adding totalPosts column...');

  const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'data.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Cannot open database:', err.message);
        reject(err);
        return;
      }

      console.log('✅ Connected to database');

      db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
          console.error('❌ Error checking table:', err.message);
          db.close();
          reject(err);
          return;
        }

        const hasTotalPosts = columns.some(col => col.name === 'totalPosts');

        if (hasTotalPosts) {
          console.log('✅ Column totalPosts already exists');
          db.close();
          resolve();
          return;
        }

        console.log('📝 Adding totalPosts column...');

        db.run(`
          ALTER TABLE users 
          ADD COLUMN totalPosts INTEGER DEFAULT 0
        `, (err) => {
          if (err) {
            console.error('❌ Error adding column:', err.message);
            db.close();
            reject(err);
            return;
          }

          console.log('✅ Column added successfully');
          db.close();
          resolve();
        });
      });
    });
  });
}

addTotalPostsColumn().catch(console.error);