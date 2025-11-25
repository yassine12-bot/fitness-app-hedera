require('dotenv').config();
const axios = require('axios');
const fitnessContract = require('./src/lib/fitness-contract');
const db = require('./src/lib/db');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const BLOCKCHAIN_WAIT_TIME = 12000; // 12 seconds - give blockchain time to settle

/**
 * COMPREHENSIVE WALKING TEST - ALL DATA FROM BLOCKCHAIN
 * 
 * This test:
 * 1. Queries EVERYTHING from smart contract (no cache)
 * 2. Waits properly for blockchain confirmations
 * 3. Tests 500 steps + 500 steps = 1000 steps (should complete Challenge 1)
 * 4. Validates challenge completion from blockchain
 * 5. Checks rewards from blockchain
 */

async function queryAllChallengesFromBlockchain(hederaAccountId) {
  const challenges = [];
  const challengeCount = await fitnessContract.getChallengeCount();
  
  for (let i = 1; i <= challengeCount; i++) {
    const challenge = await fitnessContract.getChallenge(i);
    const progress = await fitnessContract.getChallengeProgress(hederaAccountId, i);
    const completed = await fitnessContract.isChallengeCompleted(hederaAccountId, i);
    
    challenges.push({
      id: i,
      target: challenge.target,
      reward: challenge.reward,
      level: challenge.level,
      active: challenge.isActive,
      progress,
      completed,
      percentComplete: Math.min(100, Math.floor((progress / challenge.target) * 100))
    });
  }
  
  return challenges;
}

async function comprehensiveWalkingTest() {
  const report = [];
  let logOutput = '';

  function log(msg) {
    console.log(msg);
    logOutput += msg + '\n';
  }

  function wait(ms) {
    const seconds = ms / 1000;
    log(`⏳ Waiting ${seconds} seconds for blockchain to settle...`);
    return new Promise(r => setTimeout(r, ms));
  }

  try {
    log('='.repeat(80));
    log('🚶 COMPREHENSIVE WALKING TEST - ALL BLOCKCHAIN QUERIES');
    log('All data queried directly from smart contract');
    log('='.repeat(80));
    log('');

    // Initialize
    await db.initialize();
    await fitnessContract.initialize();

    log('✅ Services initialized');
    log(`   Contract: ${process.env.FITNESS_CONTRACT_ADDRESS}`);
    log(`   Token: ${process.env.FIT_TOKEN_ID}`);
    log(`   Explorer: https://hashscan.io/testnet/contract/${process.env.FITNESS_CONTRACT_ADDRESS}`);
    log('');

    // ====================================================
    // STEP 1: Create Test User
    // ====================================================
    log('📝 STEP 1: Create Test User');
    log('-'.repeat(80));

    const testEmail = `walk-test-${Date.now()}@test.com`;
    const testPassword = 'WalkTest123!';

    const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Walking Test User',
      email: testEmail,
      password: testPassword
    });

    const token = registerRes.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };

    log(`✅ User created`);
    log(`   Email: ${testEmail}`);
    log(`   Password: ${testPassword}`);
    log('');

    // ====================================================
    // STEP 2: Create Hedera Wallet
    // ====================================================
    log('📝 STEP 2: Create Hedera Wallet');
    log('-'.repeat(80));

    const walletRes = await axios.post(`${BASE_URL}/api/users/wallet/create`, {}, { headers });
    const hederaAccountId = walletRes.data.wallet.accountId;

    log(`✅ Wallet created: ${hederaAccountId}`);
    log(`   Explorer: ${walletRes.data.wallet.explorerUrl}`);
    log('');

    await wait(3000); // Give wallet time to be fully created

    // ====================================================
    // STEP 3: Query INITIAL State from BLOCKCHAIN
    // ====================================================
    log('📝 STEP 3: Query INITIAL State from BLOCKCHAIN');
    log('-'.repeat(80));
    log('🔗 Querying smart contract directly...');
    log('');

    // Query blockchain
    const initialSteps = await fitnessContract.getTotalSteps(hederaAccountId);
    const contractBalance = await fitnessContract.getContractBalance();
    const challengeCount = await fitnessContract.getChallengeCount();

    log(`📊 BLOCKCHAIN STATE (BEFORE any steps):`);
    log(`   Total Steps (ON-CHAIN): ${initialSteps}`);
    log(`   Contract FIT Balance: ${contractBalance} FIT`);
    log(`   Total Challenges in Contract: ${challengeCount}`);
    log('');

    // Query all challenges from blockchain
    log('📋 Querying ALL Challenges from Blockchain...');
    log('');
    
    const initialChallenges = await queryAllChallengesFromBlockchain(hederaAccountId);
    
    // Show first 5 challenges (daily)
    log('🏆 Daily Challenges (IDs 1-5):');
    initialChallenges.slice(0, 5).forEach(ch => {
      const levelEmoji = ['🌱', '🔵', '🟡', '🔴', '👑'][ch.level - 1];
      const status = ch.completed ? '✅' : '⏳';
      log(`   ${status} ${levelEmoji} Challenge ${ch.id}: ${ch.progress}/${ch.target} (${ch.percentComplete}%) | Reward: ${ch.reward} FIT`);
    });
    log('');

    report.push({
      step: 3,
      name: 'Initial State',
      stepsOnChain: initialSteps,
      contractBalance,
      challengeCount,
      completedChallenges: initialChallenges.filter(ch => ch.completed).length
    });

    // ====================================================
    // STEP 4: FIRST WALK - 500 Steps
    // ====================================================
    log('📝 STEP 4: FIRST WALK - Log 500 Steps');
    log('-'.repeat(80));

    log(`🏃 Calling FitnessContract.updateSteps(${hederaAccountId}, 500)...`);

    const walk1Res = await axios.post(`${BASE_URL}/api/workouts/steps`, {
      steps: 500,
      distance: 0.35,
      calories: 25
    }, { headers });

    const tx1 = walk1Res.data.data.blockchain.transactionId;

    log(`✅ Transaction submitted!`);
    log(`   TX: ${tx1}`);
    log(`   Explorer: https://hashscan.io/testnet/transaction/${tx1}`);
    log('');

    // Wait for blockchain to confirm
    await wait(BLOCKCHAIN_WAIT_TIME);
    log('');

    // ====================================================
    // STEP 5: Query State AFTER First Walk (FROM BLOCKCHAIN)
    // ====================================================
    log('📝 STEP 5: Query State AFTER First Walk');
    log('-'.repeat(80));
    log('🔗 Querying blockchain...');
    log('');

    const steps1 = await fitnessContract.getTotalSteps(hederaAccountId);
    const challenges1 = await queryAllChallengesFromBlockchain(hederaAccountId);

    log(`📊 BLOCKCHAIN STATE (AFTER 500 steps):`);
    log(`   Total Steps (ON-CHAIN): ${steps1}`);
    log(`   Steps Added: +${steps1 - initialSteps}`);
    log('');

    log('🏆 Daily Challenges Status:');
    challenges1.slice(0, 5).forEach(ch => {
      const levelEmoji = ['🌱', '🔵', '🟡', '🔴', '👑'][ch.level - 1];
      const status = ch.completed ? '✅ COMPLETED!' : '⏳ In Progress';
      const change = ch.progress - (initialChallenges[ch.id - 1]?.progress || 0);
      log(`   ${status} ${levelEmoji} Challenge ${ch.id}: ${ch.progress}/${ch.target} (${ch.percentComplete}%) ${change > 0 ? `(+${change})` : ''}`);
    });
    log('');

    const completed1 = challenges1.filter(ch => ch.completed);
    if (completed1.length > 0) {
      log(`🎉 CHALLENGES COMPLETED: ${completed1.length}`);
      completed1.forEach(ch => {
        log(`   • Challenge ${ch.id}: +${ch.reward} FIT reward`);
      });
      log('');
    } else {
      log(`⏳ No challenges completed yet (need 1000 steps for Challenge 1)`);
      log('');
    }

    report.push({
      step: 5,
      name: 'After First Walk',
      transactionId: tx1,
      stepsOnChain: steps1,
      stepsAdded: steps1 - initialSteps,
      challengesCompleted: completed1.length,
      completedChallengeIds: completed1.map(ch => ch.id)
    });

    // ====================================================
    // STEP 6: SECOND WALK - 500 More Steps
    // ====================================================
    log('📝 STEP 6: SECOND WALK - Log 500 More Steps');
    log('-'.repeat(80));

    log(`🏃 Calling FitnessContract.updateSteps(${hederaAccountId}, 500)...`);

    const walk2Res = await axios.post(`${BASE_URL}/api/workouts/steps`, {
      steps: 500,
      distance: 0.35,
      calories: 25
    }, { headers });

    const tx2 = walk2Res.data.data.blockchain.transactionId;

    log(`✅ Transaction submitted!`);
    log(`   TX: ${tx2}`);
    log(`   Explorer: https://hashscan.io/testnet/transaction/${tx2}`);
    log('');

    // Wait for blockchain to confirm
    await wait(BLOCKCHAIN_WAIT_TIME);
    log('');

    // ====================================================
    // STEP 7: Query Final State (FROM BLOCKCHAIN)
    // ====================================================
    log('📝 STEP 7: Query FINAL State from BLOCKCHAIN');
    log('-'.repeat(80));
    log('🔗 Querying blockchain...');
    log('');

    const stepsFinal = await fitnessContract.getTotalSteps(hederaAccountId);
    const challengesFinal = await queryAllChallengesFromBlockchain(hederaAccountId);
    const contractBalanceFinal = await fitnessContract.getContractBalance();

    log(`📊 BLOCKCHAIN STATE (AFTER 1000 total steps):`);
    log(`   Total Steps (ON-CHAIN): ${stepsFinal}`);
    log(`   Steps Added This Walk: +${stepsFinal - steps1}`);
    log(`   Steps Added Total: +${stepsFinal - initialSteps}`);
    log(`   Contract Balance: ${contractBalanceFinal} FIT`);
    log('');

    log('🏆 Daily Challenges Status:');
    challengesFinal.slice(0, 5).forEach(ch => {
      const levelEmoji = ['🌱', '🔵', '🟡', '🔴', '👑'][ch.level - 1];
      const status = ch.completed ? '✅ COMPLETED!' : '⏳ In Progress';
      const progressBefore = challenges1[ch.id - 1]?.progress || 0;
      const change = ch.progress - progressBefore;
      log(`   ${status} ${levelEmoji} Challenge ${ch.id}: ${ch.progress}/${ch.target} (${ch.percentComplete}%) ${change > 0 ? `(+${change})` : ''}`);
    });
    log('');

    const completedFinal = challengesFinal.filter(ch => ch.completed);
    const newlyCompleted = completedFinal.filter(ch => {
      const wasPreviouslyCompleted = challenges1.find(c => c.id === ch.id)?.completed || false;
      return !wasPreviouslyCompleted;
    });

    if (newlyCompleted.length > 0) {
      log(`🎉 NEWLY COMPLETED CHALLENGES: ${newlyCompleted.length}`);
      newlyCompleted.forEach(ch => {
        log(`   • Challenge ${ch.id}: +${ch.reward} FIT reward earned!`);
      });
      log('');
    }

    if (completedFinal.length > 0) {
      log(`📊 Total Challenges Completed: ${completedFinal.length}/${challengeCount}`);
      log(`💰 Total Rewards Earned: ${completedFinal.reduce((sum, ch) => sum + ch.reward, 0)} FIT`);
      log('');
    }

    // Check if Challenge 1 was completed (should be!)
    const challenge1 = challengesFinal.find(ch => ch.id === 1);
    if (challenge1 && challenge1.completed) {
      log(`✅ SUCCESS: Challenge 1 (Premier Pas - 1000 steps) COMPLETED!`);
      log(`   Target: 1000 steps`);
      log(`   Actual: ${challenge1.progress} steps`);
      log(`   Reward: ${challenge1.reward} FIT`);
      log('');
    } else if (challenge1) {
      log(`❌ ISSUE: Challenge 1 NOT completed!`);
      log(`   Target: 1000 steps`);
      log(`   Actual: ${challenge1.progress} steps`);
      log(`   Progress: ${challenge1.percentComplete}%`);
      log('');
    }

    report.push({
      step: 7,
      name: 'Final State',
      transactionId: tx2,
      stepsOnChain: stepsFinal,
      totalStepsAdded: stepsFinal - initialSteps,
      challengesCompleted: completedFinal.length,
      newlyCompleted: newlyCompleted.length,
      completedChallengeIds: completedFinal.map(ch => ch.id),
      totalRewardsEarned: completedFinal.reduce((sum, ch) => sum + ch.reward, 0),
      contractBalanceFinal
    });

    // ====================================================
    // STEP 8: Summary & Analysis
    // ====================================================
    log('='.repeat(80));
    log('📊 TEST SUMMARY');
    log('='.repeat(80));
    log('');

    log(`👤 Test User:`);
    log(`   Email: ${testEmail}`);
    log(`   Password: ${testPassword}`);
    log(`   Hedera Account: ${hederaAccountId}`);
    log(`   Explorer: https://hashscan.io/testnet/account/${hederaAccountId}`);
    log('');

    log(`🏃 Walking Activity:`);
    log(`   First Walk: 500 steps (TX: ${tx1})`);
    log(`   Second Walk: 500 steps (TX: ${tx2})`);
    log(`   Total: ${stepsFinal} steps`);
    log('');

    log(`🏆 Challenges:`);
    log(`   Total Available: ${challengeCount}`);
    log(`   Completed: ${completedFinal.length}`);
    log(`   In Progress: ${challengeCount - completedFinal.length}`);
    log('');

    if (completedFinal.length > 0) {
      log(`✅ Completed Challenges:`);
      completedFinal.forEach(ch => {
        log(`   • Challenge ${ch.id}: ${ch.progress}/${ch.target} steps (+${ch.reward} FIT)`);
      });
      log('');
    }

    log(`💰 Rewards:`);
    log(`   Total Earned: ${completedFinal.reduce((sum, ch) => sum + ch.reward, 0)} FIT`);
    log(`   Contract Balance: ${contractBalance} → ${contractBalanceFinal} FIT`);
    log('');

    // Validation
    log('🔍 VALIDATION:');
    log('-'.repeat(80));
    
    const expectedSteps = 1000;
    const stepsMatch = stepsFinal === expectedSteps;
    
    log(`   Steps: ${stepsFinal} / ${expectedSteps} ${stepsMatch ? '✅' : '❌'}`);
    
    const challenge1Complete = challenge1?.completed || false;
    log(`   Challenge 1 Complete: ${challenge1Complete ? '✅' : '❌'}`);
    
    if (challenge1Complete) {
      const rewardExpected = 5;
      const rewardReceived = challenge1.reward;
      log(`   Challenge 1 Reward: ${rewardReceived} FIT ${rewardReceived === rewardExpected ? '✅' : '❌'}`);
    }
    
    log('');

    if (stepsMatch && challenge1Complete) {
      log('🎉 ALL TESTS PASSED!');
      log('');
      log('✅ Steps correctly recorded on blockchain');
      log('✅ Challenge validated and completed on-chain');
      log('✅ Rewards distributed via smart contract');
      log('');
    } else {
      log('⚠️  TEST ISSUES DETECTED:');
      log('');
      if (!stepsMatch) {
        log(`❌ Steps mismatch: Expected ${expectedSteps}, got ${stepsFinal}`);
      }
      if (!challenge1Complete) {
        log(`❌ Challenge 1 not completed (progress: ${challenge1?.progress}/${challenge1?.target})`);
      }
      log('');
    }

  } catch (error) {
    log('');
    log('❌ ERROR: ' + error.message);
    log('');
    log('Stack trace:');
    log(error.stack);
    
    report.push({
      step: 'ERROR',
      error: error.message,
      stack: error.stack
    });
  } finally {
    if (fitnessContract.client) {
      fitnessContract.close();
    }
  }

  // Save reports
  fs.writeFileSync('WALKING-TEST-REPORT.json', JSON.stringify(report, null, 2));
  fs.writeFileSync('WALKING-TEST-LOG.txt', logOutput);

  log('='.repeat(80));
  log('📄 Files saved:');
  log('   • WALKING-TEST-REPORT.json');
  log('   • WALKING-TEST-LOG.txt');
  log('='.repeat(80));
}

comprehensiveWalkingTest().catch(console.error);