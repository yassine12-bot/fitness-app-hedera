require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const fitnessContract = require('./src/lib/fitness-contract');

async function syncChallenges() {
  const db = new sqlite3.Database(process.env.DATABASE_PATH || './data.db');
  
  await fitnessContract.initialize();
  
  const count = await fitnessContract.getChallengeCount();
  console.log(`📊 Found ${count} challenges on blockchain`);
  
  for (let i = 1; i <= count; i++) {
    const challenge = await fitnessContract.getChallenge(i);
    
    db.run(`
      INSERT OR REPLACE INTO challenges 
      (id, title, type, target, reward, level, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      challenge.id,
      challenge.title,
      challenge.challengeType,
      challenge.target,
      challenge.reward,
      challenge.level,
      challenge.isActive ? 1 : 0
    ]);
    
    console.log(`✅ ${i}. ${challenge.title} (${challenge.reward} FIT)`);
  }
  
  db.close();
  fitnessContract.close();
  console.log('✅ All challenges synced!');
}

syncChallenges().catch(console.error);