require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function reorganize() {
  const db = new sqlite3.Database(process.env.DATABASE_PATH || './data.db');

  console.log('🔄 Reorganizing challenges...\n');

  // Drop old tables
  db.run('DROP TABLE IF EXISTS user_challenge_levels');
  db.run('DROP TABLE IF EXISTS challenge_progress');
  console.log('✅ Removed level tables');

  // Update challenges with new naming
  const newChallenges = [
    // Daily Steps (1-1 to 1-5)
    { id: 1, name: '1-1 Premier Pas', type: 'daily_steps', target: 1000, reward: 5 },
    { id: 2, name: '1-2 Randonneur', type: 'daily_steps', target: 5000, reward: 10 },
    { id: 3, name: '1-3 Marcheur Sérieux', type: 'daily_steps', target: 10000, reward: 20 },
    { id: 4, name: '1-4 Champion du Jour', type: 'daily_steps', target: 15000, reward: 30 },
    { id: 5, name: '1-5 Maître du Mouvement', type: 'daily_steps', target: 20000, reward: 50 },
    
    // Duration Steps (2-1 to 2-5)
    { id: 6, name: '2-1 Début d\'Aventure', type: 'duration_steps', target: 3000, reward: 10 },
    { id: 7, name: '2-2 Marathonien Débutant', type: 'duration_steps', target: 10000, reward: 20 },
    { id: 8, name: '2-3 Endurance Pro', type: 'duration_steps', target: 25000, reward: 40 },
    { id: 9, name: '2-4 Ultra-Marathonien', type: 'duration_steps', target: 50000, reward: 80 },
    { id: 10, name: '2-5 Légende Vivante', type: 'duration_steps', target: 100000, reward: 150 },
    
    // Social (3-1 to 3-5)
    { id: 11, name: '3-1 Partage Ton Début', type: 'social', target: 2, reward: 5 },
    { id: 12, name: '3-2 Ambassadeur', type: 'social', target: 5, reward: 15 },
    { id: 13, name: '3-3 Influenceur Fitness', type: 'social', target: 10, reward: 30 },
    { id: 14, name: '3-4 Leader Communautaire', type: 'social', target: 20, reward: 60 },
    { id: 15, name: '3-5 Icône du Fitness', type: 'social', target: 50, reward: 120 }
  ];

  // Remove level column, update challenges
  db.run('ALTER TABLE challenges DROP COLUMN level', (err) => {
    if (err && !err.message.includes('no such column')) {
      console.error('Error dropping level column:', err);
    }
  });

  // Update each challenge
  for (const ch of newChallenges) {
    db.run(`
      UPDATE challenges 
      SET title = ?, type = ?, target = ?, reward = ?
      WHERE id = ?
    `, [ch.name, ch.type, ch.target, ch.reward, ch.id]);
  }

  console.log('✅ Challenges reorganized');
  console.log('\n📋 New structure:');
  console.log('   Daily (1-1 to 1-5): 5 challenges');
  console.log('   Duration (2-1 to 2-5): 5 challenges');
  console.log('   Social (3-1 to 3-5): 5 challenges');
  console.log('\n✅ Done! Restart backend.');

  db.close();
}

reorganize().catch(console.error);