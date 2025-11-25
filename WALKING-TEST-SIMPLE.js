require('dotenv').config();
const fitnessContract = require('./src/lib/fitness-contract');
const db = require('./src/lib/db');
const fs = require('fs');

/**
 * SIMPLE WALKING TEST - Uses existing user with wallet
 * No user creation, no wallet creation - just walk and validate
 */

const BLOCKCHAIN_WAIT_TIME = 12000; // 12 seconds

async function simpleWalkingTest() {
  let logOutput = '';

  function log(msg) {
    console.log(msg);
    logOutput += msg + '\n';
  }

  function wait(ms) {
    const seconds = ms / 1000;
    log(`⏳ Waiting ${seconds} seconds for blockchain...`);
    return new Promise(r => setTimeout(r, ms));
  }

  try {
    log('='.repeat(80));
    log('🚶 SIMPLE WALKING TEST - BLOCKCHAIN VALIDATION');
    log('='.repeat(80));
    log('');

    // Initialize
    await db.initialize();
    await fitnessContract.initialize();

    log('✅ Services initialized');
    log('');

    // ====================================================
    // Find existing user with wallet
    // ====================================================
    log('📝 Finding user with Hedera wallet...');
    log('-'.repeat(80));

    const user = await db.get(`
      SELECT id, email, hederaAccountId, fitBalance, totalSteps 
      FROM users 
      WHERE hederaAccountId IS NOT NULL 
      ORDER BY id DESC 
      LIMIT 1
    `);

    if (!user || !user.hederaAccountId) {
      log('❌ No user with Hedera wallet found!');
      log('');
      log('Please:');
      log('   1. Login to your app');
      log('   2. Create a wallet');
      log('   3. Run this test again');
      log('');
      return;
    }

    const hederaAccountId = user.hederaAccountId;

    log(`✅ Found user: ${user.email}`);
    log(`   Account: ${hederaAccountId}`);
    log(`   FIT Balance (cache): ${user.fitBalance || 0}`);
    log(`   Total Steps (cache): ${user.totalSteps || 0}`);
    log('');

    // ====================================================
    // Query INITIAL state from blockchain
    // ====================================================
    log('📝 STEP 1: Query INITIAL State from Blockchain');
    log('-'.repeat(80));
    log('🔗 Querying smart contract...');
    log('');

    const initialSteps = await fitnessContract.getTotalSteps(hederaAccountId);
    const contractBalance = await fitnessContract.getContractBalance();
    const challengeCount = await fitnessContract.getChallengeCount();

    log(`📊 BLOCKCHAIN STATE (BEFORE):`);
    log(`   Total Steps (ON-CHAIN): ${initialSteps}`);
    log(`   Contract Balance: ${contractBalance} FIT`);
    log(`   Total Challenges: ${challengeCount}`);
    log('');

    // Query first 5 challenges (daily)
    log('🏆 Daily Challenges (1-5):');
    const initialChallenges = [];
    for (let i = 1; i <= 5; i++) {
      const challenge = await fitnessContract.getChallenge(i);
      const progress = await fitnessContract.getChallengeProgress(hederaAccountId, i);
      const completed = await fitnessContract.isChallengeCompleted(hederaAccountId, i);
      
      initialChallenges.push({ id: i, target: challenge.target, reward: challenge.reward, progress, completed });
      
      const levelEmoji = ['🌱', '🔵', '🟡', '🔴', '👑'][challenge.level - 1];
      const status = completed ? '✅' : '⏳';
      const percent = Math.min(100, Math.floor((progress / challenge.target) * 100));
      
      log(`   ${status} ${levelEmoji} Challenge ${i}: ${progress}/${challenge.target} (${percent}%)`);
    }
    log('');

    // ====================================================
    // Simulate 500 steps directly via contract
    // ====================================================
    log('📝 STEP 2: Log 500 Steps to Blockchain');
    log('-'.repeat(80));
    log(`🏃 Calling FitnessContract.updateSteps(${hederaAccountId}, 500)...`);

    const result1 = await fitnessContract.updateSteps(hederaAccountId, 500);

    log(`✅ Transaction submitted!`);
    log(`   TX: ${result1.transactionId}`);
    log(`   Explorer: https://hashscan.io/testnet/transaction/${result1.transactionId}`);
    log('');

    await wait(BLOCKCHAIN_WAIT_TIME);
    log('');

    // Query state after first walk
    log('📝 STEP 3: Query State After 500 Steps');
    log('-'.repeat(80));
    log('🔗 Querying blockchain...');
    log('');

    const steps1 = await fitnessContract.getTotalSteps(hederaAccountId);

    log(`📊 BLOCKCHAIN STATE (AFTER 500 steps):`);
    log(`   Total Steps: ${steps1}`);
    log(`   Steps Added: +${steps1 - initialSteps}`);
    log('');

    log('🏆 Challenges:');
    for (let i = 1; i <= 5; i++) {
      const progress = await fitnessContract.getChallengeProgress(hederaAccountId, i);
      const completed = await fitnessContract.isChallengeCompleted(hederaAccountId, i);
      const challenge = initialChallenges[i - 1];
      
      const levelEmoji = ['🌱', '🔵', '🟡', '🔴', '👑'][i - 1];
      const status = completed ? '✅ COMPLETED!' : '⏳';
      const change = progress - challenge.progress;
      const percent = Math.min(100, Math.floor((progress / challenge.target) * 100));
      
      log(`   ${status} ${levelEmoji} Challenge ${i}: ${progress}/${challenge.target} (${percent}%) ${change > 0 ? `(+${change})` : ''}`);
    }
    log('');

    // ====================================================
    // Log 500 more steps
    // ====================================================
    log('📝 STEP 4: Log 500 MORE Steps to Blockchain');
    log('-'.repeat(80));
    log(`🏃 Calling FitnessContract.updateSteps(${hederaAccountId}, 500)...`);

    const result2 = await fitnessContract.updateSteps(hederaAccountId, 500);

    log(`✅ Transaction submitted!`);
    log(`   TX: ${result2.transactionId}`);
    log('');

    await wait(BLOCKCHAIN_WAIT_TIME);
    log('');

    // Query final state
    log('📝 STEP 5: Query FINAL State');
    log('-'.repeat(80));
    log('🔗 Querying blockchain...');
    log('');

    const stepsFinal = await fitnessContract.getTotalSteps(hederaAccountId);
    const contractBalanceFinal = await fitnessContract.getContractBalance();

    log(`📊 BLOCKCHAIN STATE (FINAL):`);
    log(`   Total Steps: ${stepsFinal}`);
    log(`   Steps Added This Walk: +${stepsFinal - steps1}`);
    log(`   Steps Added Total: +${stepsFinal - initialSteps}`);
    log(`   Contract Balance: ${contractBalanceFinal} FIT`);
    log('');

    log('🏆 Challenges:');
    const completedChallenges = [];
    
    for (let i = 1; i <= 5; i++) {
      const progress = await fitnessContract.getChallengeProgress(hederaAccountId, i);
      const completed = await fitnessContract.isChallengeCompleted(hederaAccountId, i);
      const challenge = initialChallenges[i - 1];
      
      const levelEmoji = ['🌱', '🔵', '🟡', '🔴', '👑'][i - 1];
      const status = completed ? '✅ COMPLETED!' : '⏳';
      const change = progress - challenge.progress;
      const percent = Math.min(100, Math.floor((progress / challenge.target) * 100));
      
      log(`   ${status} ${levelEmoji} Challenge ${i}: ${progress}/${challenge.target} (${percent}%) ${change > 0 ? `(+${change})` : ''}`);
      
      if (completed && !challenge.completed) {
        completedChallenges.push({ id: i, target: challenge.target, reward: challenge.reward });
      }
    }
    log('');

    if (completedChallenges.length > 0) {
      log(`🎉 NEWLY COMPLETED: ${completedChallenges.length} challenges!`);
      completedChallenges.forEach(ch => {
        log(`   • Challenge ${ch.id}: ${ch.target} steps → +${ch.reward} FIT`);
      });
      log('');
    }

    // ====================================================
    // Validation
    // ====================================================
    log('='.repeat(80));
    log('🔍 VALIDATION');
    log('='.repeat(80));
    log('');

    const totalAdded = stepsFinal - initialSteps;
    log(`✅ Steps Logged: ${totalAdded} (500 + 500)`);
    log(`✅ Blockchain Recorded: ${stepsFinal - initialSteps} steps`);
    log(`✅ Challenges Completed: ${completedChallenges.length}`);
    log('');

    // Check Challenge 1 specifically (1000 steps)
    const challenge1Progress = await fitnessContract.getChallengeProgress(hederaAccountId, 1);
    const challenge1Completed = await fitnessContract.isChallengeCompleted(hederaAccountId, 1);

    log('🎯 Challenge 1 (Premier Pas - 1000 steps):');
    log(`   Progress: ${challenge1Progress}/1000`);
    log(`   Status: ${challenge1Completed ? '✅ COMPLETED!' : '⏳ In Progress'}`);
    
    if (initialSteps + totalAdded >= 1000 && challenge1Completed) {
      log(`   ✅ SUCCESS: Challenge validated on-chain!`);
    } else if (initialSteps + totalAdded >= 1000 && !challenge1Completed) {
      log(`   ⚠️  User has ${initialSteps + totalAdded} steps but challenge not marked complete`);
      log(`   This might be a contract issue!`);
    }
    log('');

    // ====================================================
    // Summary
    // ====================================================
    log('='.repeat(80));
    log('📊 SUMMARY');
    log('='.repeat(80));
    log('');
    log(`👤 User: ${user.email}`);
    log(`   Hedera: ${hederaAccountId}`);
    log('');
    log(`🏃 Activity:`);
    log(`   Walk 1: 500 steps (TX: ${result1.transactionId})`);
    log(`   Walk 2: 500 steps (TX: ${result2.transactionId})`);
    log(`   Total: ${totalAdded} steps logged`);
    log('');
    log(`🏆 Results:`);
    log(`   Initial Steps: ${initialSteps}`);
    log(`   Final Steps: ${stepsFinal}`);
    log(`   New Completions: ${completedChallenges.length}`);
    log('');
    
    if (completedChallenges.length > 0) {
      const totalRewards = completedChallenges.reduce((sum, ch) => sum + ch.reward, 0);
      log(`💰 Rewards Earned: ${totalRewards} FIT`);
      log('');
    }

    log('📌 ALL DATA QUERIED FROM BLOCKCHAIN ✅');
    log('   No cache used - pure smart contract queries');
    log('');

  } catch (error) {
    log('');
    log('❌ ERROR: ' + error.message);
    log('');
    log('Stack:');
    log(error.stack);
  }

  // Save log
  fs.writeFileSync('SIMPLE-WALKING-TEST-LOG.txt', logOutput);

  log('='.repeat(80));
  log('📄 Log saved: SIMPLE-WALKING-TEST-LOG.txt');
  log('='.repeat(80));
}

simpleWalkingTest().catch(console.error);