require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * UPDATE SQLITE TO MATCH BLOCKCHAIN
 * 
 * Your blockchain has VALID data, just different from what we expected.
 * This script updates SQLite to match the blockchain values.
 */

const ACTUAL_CONTRACT_CHALLENGES = [
  // Daily Steps (1-5) - LEVEL 1 TO 5
  { id: 1, title: '1-1 Premier Pas', type: 'daily_steps', target: 1000, reward: 5, level: 1 },
  { id: 2, title: '1-2 Randonneur', type: 'daily_steps', target: 5000, reward: 10, level: 2 },
  { id: 3, title: '1-3 Marcheur Sérieux', type: 'daily_steps', target: 10000, reward: 20, level: 3 },
  { id: 4, title: '1-4 Champion du Jour', type: 'daily_steps', target: 15000, reward: 30, level: 4 },
  { id: 5, title: '1-5 Maître du Mouvement', type: 'daily_steps', target: 20000, reward: 50, level: 5 },
  
  // Duration Steps (6-10) - LEVEL 1 TO 5
  { id: 6, title: '2-1 Début d\'Aventure', type: 'duration_steps', target: 3000, reward: 10, level: 1 },
  { id: 7, title: '2-2 Marathonien Débutant', type: 'duration_steps', target: 10000, reward: 20, level: 2 },
  { id: 8, title: '2-3 Endurance Pro', type: 'duration_steps', target: 25000, reward: 40, level: 3 },
  { id: 9, title: '2-4 Ultra-Marathonien', type: 'duration_steps', target: 50000, reward: 80, level: 4 },
  { id: 10, title: '2-5 Légende Vivante', type: 'duration_steps', target: 100000, reward: 150, level: 5 },
  
  // Social (11-15) - LEVEL 1 TO 5
  { id: 11, title: '3-1 Partage Ton Début', type: 'social', target: 2, reward: 5, level: 1 },
  { id: 12, title: '3-2 Ambassadeur', type: 'social', target: 5, reward: 15, level: 2 },
  { id: 13, title: '3-3 Influenceur Fitness', type: 'social', target: 10, reward: 30, level: 3 },
  { id: 14, title: '3-4 Leader Communautaire', type: 'social', target: 20, reward: 60, level: 4 },
  { id: 15, title: '3-5 Icône du Fitness', type: 'social', target: 50, reward: 120, level: 5 }
];

async function syncSQLiteWithBlockchain() {
  console.log('='.repeat(80));
  console.log('🔄 SYNCING SQLITE WITH BLOCKCHAIN VALUES');
  console.log('='.repeat(80));
  console.log('');

  const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'src/fitness.db');
  const db = new sqlite3.Database(dbPath);

  console.log(`📂 Database: ${dbPath}`);
  console.log('');

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('🔄 Updating challenge values...');
      console.log('');

      let updated = 0;
      let errors = 0;

      const stmt = db.prepare(`
        UPDATE challenges 
        SET title = ?, type = ?, target = ?, reward = ?, level = ?, is_active = 1
        WHERE id = ?
      `);

      ACTUAL_CONTRACT_CHALLENGES.forEach((challenge) => {
        stmt.run(
          challenge.title,
          challenge.type,
          challenge.target,
          challenge.reward,
          challenge.level,
          challenge.id,
          (err) => {
            if (err) {
              console.error(`❌ Challenge ${challenge.id}: ${err.message}`);
              errors++;
            } else {
              const levelEmoji = ['🌱', '🔵', '🟡', '🔴', '👑'][challenge.level - 1];
              console.log(`${levelEmoji} Updated ${challenge.id}: ${challenge.title}`);
              console.log(`   Target: ${challenge.target.toLocaleString()} | Reward: ${challenge.reward} FIT`);
              updated++;
            }
          }
        );
      });

      stmt.finalize(() => {
        console.log('');
        console.log('='.repeat(80));
        console.log('📊 SYNC SUMMARY');
        console.log('='.repeat(80));
        console.log('');
        console.log(`✅ Updated: ${updated} challenges`);
        console.log(`❌ Errors: ${errors}`);
        console.log('');

        if (errors === 0) {
          console.log('🎉 SUCCESS!');
          console.log('');
          console.log('✅ SQLite now matches blockchain values');
          console.log('✅ Your app will now show correct challenge data');
          console.log('');
          console.log('📋 Challenge Structure:');
          console.log('   IDs 1-5:   Daily Steps (Level 1→5)');
          console.log('   IDs 6-10:  Duration Steps (Level 1→5)');
          console.log('   IDs 11-15: Social (Level 1→5)');
          console.log('');
          console.log('🎯 Next Steps:');
          console.log('   1. Restart your backend server');
          console.log('   2. Run: node FINAL-TEST.js');
          console.log('   3. Challenges should complete correctly!');
        } else {
          console.log('⚠️  Some errors occurred');
          console.log('   Check error messages above');
        }

        console.log('');
        console.log('='.repeat(80));

        db.close();
        resolve();
      });
    });
  });
}

syncSQLiteWithBlockchain().catch(console.error);