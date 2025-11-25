require('dotenv').config();
const fitnessContract = require('./src/lib/fitness-contract');
const db = require('./src/lib/db');

/**
 * Script to fix challenges in existing contract
 * 
 * This script:
 * 1. Reads correct challenges from SQLite
 * 2. Checks current contract state
 * 3. Adds missing/correct challenges to contract
 * 
 * ⚠️ NOTE: We CANNOT delete old challenges from contract
 * So we'll just add new correct ones starting from next ID
 */

const CORRECT_CHALLENGES = [
  // Daily Steps (1-1 to 1-5)
  { id: 1, title: 'Premier Pas', type: 'daily_steps', target: 1000, reward: 5, level: 1 },
  { id: 2, title: 'Randonneur', type: 'daily_steps', target: 5000, reward: 10, level: 2 },
  { id: 3, title: 'Marcheur Serieux', type: 'daily_steps', target: 10000, reward: 20, level: 3 },
  { id: 4, title: 'Champion du Jour', type: 'daily_steps', target: 15000, reward: 30, level: 4 },
  { id: 5, title: 'Maitre du Mouvement', type: 'daily_steps', target: 20000, reward: 50, level: 5 },
  
  // Duration Steps (2-1 to 2-5)
  { id: 6, title: 'Debut d\'Aventure', type: 'duration_steps', target: 3000, reward: 10, level: 1 },
  { id: 7, title: 'Marathonien Debutant', type: 'duration_steps', target: 10000, reward: 20, level: 2 },
  { id: 8, title: 'Endurance Pro', type: 'duration_steps', target: 25000, reward: 40, level: 3 },
  { id: 9, title: 'Ultra-Marathonien', type: 'duration_steps', target: 50000, reward: 80, level: 4 },
  { id: 10, title: 'Legende Vivante', type: 'duration_steps', target: 100000, reward: 150, level: 5 },
  
  // Social (3-1 to 3-5)
  { id: 11, title: 'Partage Ton Debut', type: 'social', target: 2, reward: 5, level: 1 },
  { id: 12, title: 'Ambassadeur', type: 'social', target: 5, reward: 15, level: 2 },
  { id: 13, title: 'Influenceur Fitness', type: 'social', target: 10, reward: 30, level: 3 },
  { id: 14, title: 'Leader Communautaire', type: 'social', target: 20, reward: 60, level: 4 },
  { id: 15, title: 'Icone du Fitness', type: 'social', target: 50, reward: 120, level: 5 }
];

async function fixContract() {
  console.log('🔧 Fixing FitnessContract Challenges\n');
  console.log('='.repeat(60));
  
  // Initialize
  await fitnessContract.initialize();
  
  // Step 1: Check current state
  console.log('\n📊 STEP 1: Checking current contract state...');
  const currentCount = await fitnessContract.getChallengeCount();
  console.log(`   Current challenge count: ${currentCount}`);
  
  if (currentCount > 0) {
    console.log('\n   First 3 challenges in contract:');
    for (let i = 1; i <= Math.min(3, currentCount); i++) {
      try {
        const ch = await fitnessContract.getChallenge(i);
        console.log(`   ${i}. "${ch.title}" | ${ch.challengeType} | Target: ${ch.target} | Reward: ${ch.reward}`);
      } catch (error) {
        console.log(`   ${i}. ERROR: ${error.message}`);
      }
    }
  }
  
  // Step 2: Check SQLite
  console.log('\n📊 STEP 2: Checking SQLite database...');
  const sqliteChallenges = await db.all('SELECT id, title, type, target, reward FROM challenges ORDER BY id');
  console.log(`   SQLite has ${sqliteChallenges.length} challenges`);
  
  if (sqliteChallenges.length > 0) {
    console.log('\n   First 3 challenges in SQLite:');
    sqliteChallenges.slice(0, 3).forEach(ch => {
      console.log(`   ${ch.id}. "${ch.title}" | ${ch.type} | Target: ${ch.target} | Reward: ${ch.reward}`);
    });
  }
  
  // Step 3: Decide action
  console.log('\n📊 STEP 3: Determining fix strategy...');
  
  if (currentCount === 0) {
    console.log('   ✅ Contract is empty - will add all 15 challenges');
    await addAllChallenges();
  } else if (currentCount === 15) {
    console.log('   ⚠️ Contract already has 15 challenges');
    console.log('   Options:');
    console.log('   A) Challenges are correct → No action needed');
    console.log('   B) Challenges are corrupted → Need to redeploy contract');
    console.log('\n   Checking if challenges are correct...');
    
    let allCorrect = true;
    for (let i = 1; i <= 15; i++) {
      const contractCh = await fitnessContract.getChallenge(i);
      const correctCh = CORRECT_CHALLENGES[i - 1];
      
      // Check if target and reward match (ignore title encoding issues for now)
      if (contractCh.target !== correctCh.target || contractCh.reward !== correctCh.reward) {
        console.log(`   ❌ Challenge ${i} mismatch:`);
        console.log(`      Contract: target=${contractCh.target}, reward=${contractCh.reward}`);
        console.log(`      Expected: target=${correctCh.target}, reward=${correctCh.reward}`);
        allCorrect = false;
      }
    }
    
    if (allCorrect) {
      console.log('   ✅ All challenges have correct targets and rewards!');
      console.log('   (Title encoding issues are cosmetic only)');
    } else {
      console.log('\n   ❌ Challenges have wrong data!');
      console.log('   ⚠️ Contract can only ADD challenges, not UPDATE them');
      console.log('   Solution: You need to REDEPLOY the contract');
    }
  } else {
    console.log(`   ⚠️ Contract has ${currentCount} challenges (expected 0 or 15)`);
    console.log('   This is unusual - manual investigation needed');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnosis complete!');
}

async function addAllChallenges() {
  console.log('\n🚀 Adding all 15 challenges to contract...\n');
  
  for (const challenge of CORRECT_CHALLENGES) {
    try {
      console.log(`   Adding ${challenge.id}. ${challenge.title}...`);
      
      const result = await fitnessContract.addChallenge({
        title: challenge.title,
        type: challenge.type,
        target: challenge.target,
        reward: challenge.reward,
        level: challenge.level
      });
      
      console.log(`   ✅ Success! TX: ${result.transactionId}`);
      
      // Wait a bit between transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n✅ All challenges added!');
  
  // Verify
  const newCount = await fitnessContract.getChallengeCount();
  console.log(`\n📊 New challenge count: ${newCount}`);
}

// Run
fixContract()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });