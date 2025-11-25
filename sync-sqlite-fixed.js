require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * UPDATE SQLITE TO MATCH BLOCKCHAIN (FIXED VERSION)
 * Handles both 'isActive' and 'is_active' column names
 */

async function syncSQLiteWithBlockchain() {
  console.log('='.repeat(80));
  console.log('🔄 SYNCING SQLITE WITH BLOCKCHAIN VALUES');
  console.log('='.repeat(80));
  console.log('');

  const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'data.db');
  
  console.log(`📂 Database: ${dbPath}`);
  console.log('');

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Database connection error:', err.message);
      process.exit(1);
    }
  });

  return new Promise((resolve, reject) => {
    // First, check which column name exists
    db.all("PRAGMA table_info(challenges)", (err, columns) => {
      if (err) {
        console.error('❌ Error checking table structure:', err.message);
        db.close();
        reject(err);
        return;
      }

      const columnNames = columns.map(col => col.name);
      console.log('📋 Detected columns:', columnNames.join(', '));
      console.log('');

      // Determine which active column name to use
      let activeColumn = null;
      if (columnNames.includes('isActive')) {
        activeColumn = 'isActive';
      } else if (columnNames.includes('is_active')) {
        activeColumn = 'is_active';
      }

      if (!activeColumn) {
        console.log('⚠️  No active column found, proceeding without it');
      }

      console.log('🔄 Reading current challenge data...');
      console.log('');

      // Read current challenges
      db.all('SELECT id, title, type, target, reward, level FROM challenges ORDER BY id', (err, rows) => {
        if (err) {
          console.error('❌ Error reading challenges:', err.message);
          db.close();
          reject(err);
          return;
        }

        console.log(`📊 Found ${rows.length} challenges in database`);
        console.log('');
        console.log('Current values:');
        rows.forEach(row => {
          console.log(`   ID ${row.id}: ${row.title} - Target: ${row.target}, Reward: ${row.reward}, Level: ${row.level}`);
        });
        console.log('');
        console.log('='.repeat(80));
        console.log('');
        console.log('⚠️  MANUAL STEP REQUIRED:');
        console.log('');
        console.log('1. Run this command first:');
        console.log('   node query-actual-blockchain-data.js');
        console.log('');
        console.log('2. Copy the blockchain values from output');
        console.log('');
        console.log('3. I will generate the UPDATE script for you');
        console.log('');
        console.log('='.repeat(80));

        db.close();
        resolve();
      });
    });
  });
}

syncSQLiteWithBlockchain().catch(console.error);