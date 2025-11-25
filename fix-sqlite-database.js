require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Fix SQLite Database - Add correct 15 challenges
 * Run this BEFORE redeploying contract
 */

const CORRECT_CHALLENGES = [
  // Daily Steps (1-1 to 1-5)
  { id: 1, title: '1-1 Premier Pas', type: 'daily_steps', target: 1000, reward: 5, level: 1 },
  { id: 2, title: '1-2 Randonneur', type: 'daily_steps', target: 5000, reward: 10, level: 2 },
  { id: 3, title: '1-3 Marcheur Serieux', type: 'daily_steps', target: 10000, reward: 20, level: 3 },
  { id: 4, title: '1-4 Champion du Jour', type: 'daily_steps', target: 15000, reward: 30, level: 4 },
  { id: 5, title: '1-5 Maitre du Mouvement', type: 'daily_steps', target: 20000, reward: 50, level: 5 },
  
  // Duration Steps (2-1 to 2-5)
  { id: 6, title: '2-1 Debut d\'Aventure', type: 'duration_steps', target: 3000, reward: 10, level: 1 },
  { id: 7, title: '2-2 Marathonien Debutant', type: 'duration_steps', target: 10000, reward: 20, level: 2 },
  { id: 8, title: '2-3 Endurance Pro', type: 'duration_steps', target: 25000, reward: 40, level: 3 },
  { id: 9, title: '2-4 Ultra-Marathonien', type: 'duration_steps', target: 50000, reward: 80, level: 4 },
  { id: 10, title: '2-5 Legende Vivante', type: 'duration_steps', target: 100000, reward: 150, level: 5 },
  
  // Social (3-1 to 3-5)
  { id: 11, title: '3-1 Partage Ton Debut', type: 'social', target: 2, reward: 5, level: 1 },
  { id: 12, title: '3-2 Ambassadeur', type: 'social', target: 5, reward: 15, level: 2 },
  { id: 13, title: '3-3 Influenceur Fitness', type: 'social', target: 10, reward: 30, level: 3 },
  { id: 14, title: '3-4 Leader Communautaire', type: 'social', target: 20, reward: 60, level: 4 },
  { id: 15, title: '3-5 Icone du Fitness', type: 'social', target: 50, reward: 120, level: 5 }
];

async function fixSQLite() {
  return new Promise((resolve, reject) => {
    const dbPath = process.env.DATABASE_PATH || './data.db';
    const db = new sqlite3.Database(dbPath);

    console.log('🔧 Fixing SQLite Database\n');
    console.log('='.repeat(60));
    
    db.serialize(() => {
      // Step 1: Backup old challenges
      console.log('\n📦 Step 1: Backing up old challenges...');
      db.run(`CREATE TABLE IF NOT EXISTS challenges_backup AS SELECT * FROM challenges`, (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('❌ Backup failed:', err.message);
        } else {
          console.log('✅ Backup created: challenges_backup');
        }
      });

      // Step 2: Clear current challenges
      console.log('\n🗑️  Step 2: Clearing corrupted challenges...');
      db.run('DELETE FROM challenges', (err) => {
        if (err) {
          console.error('❌ Clear failed:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Old challenges deleted');

        // Step 3: Insert correct challenges
        console.log('\n✨ Step 3: Inserting correct challenges...\n');
        
        const stmt = db.prepare(`
          INSERT INTO challenges (id, title, type, target, reward, level, isActive)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `);

        let successCount = 0;
        CORRECT_CHALLENGES.forEach((ch) => {
          stmt.run([ch.id, ch.title, ch.type, ch.target, ch.reward, ch.level], (err) => {
            if (err) {
              console.error(`   ❌ Failed to add challenge ${ch.id}:`, err.message);
            } else {
              successCount++;
              console.log(`   ✅ ${ch.id}. ${ch.title} | ${ch.type} | ${ch.target} steps | ${ch.reward} FIT`);
            }
          });
        });

        stmt.finalize(() => {
          // Step 4: Verify
          console.log('\n📊 Step 4: Verifying...');
          db.all('SELECT id, title, type, target, reward FROM challenges ORDER BY id', (err, rows) => {
            if (err) {
              console.error('❌ Verification failed:', err.message);
              reject(err);
              return;
            }

            console.log(`\n✅ Database now has ${rows.length} challenges`);
            
            if (rows.length === 15) {
              console.log('\n📋 First 3 challenges:');
              rows.slice(0, 3).forEach(ch => {
                console.log(`   ${ch.id}. "${ch.title}" | ${ch.type} | Target: ${ch.target} | Reward: ${ch.reward}`);
              });
              
              console.log('\n' + '='.repeat(60));
              console.log('✅ SQLite database fixed successfully!');
              console.log('📌 Next step: Redeploy contract');
            } else {
              console.log('⚠️ Expected 15 challenges, got ' + rows.length);
            }

            db.close();
            resolve();
          });
        });
      });
    });
  });
}

// Run
fixSQLite()
  .then(() => {
    console.log('\n✅ Done! Now run: node redeploy-contract.js');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });