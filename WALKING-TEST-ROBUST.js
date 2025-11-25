require('dotenv').config();
const axios = require('axios');
const fitnessContract = require('./src/lib/fitness-contract');
const db = require('./src/lib/db');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const BLOCKCHAIN_WAIT_TIME = 12000; // 12 seconds

/**
 * COMPREHENSIVE WALKING TEST - ROBUST VERSION
 * Works with existing users or creates new ones
 * Queries everything from blockchain
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
    log(`⏳ Waiting ${seconds} seconds for blockchain...`);
    return new Promise(r => setTimeout(r, ms));
  }

  try {
    log('='.repeat(80));
    log('🚶 COMPREHENSIVE WALKING TEST - ALL BLOCKCHAIN QUERIES');
    log('='.repeat(80));
    log('');

    // Initialize
    await db.initialize();
    await fitnessContract.initialize();

    log('✅ Services initialized');
    log(`   Contract: ${process.env.FITNESS_CONTRACT_ADDRESS}`);
    log(`   Token: ${process.env.FIT_TOKEN_ID}`);
    log('');

    // ====================================================
    // STEP 1: Get or Create Test User
    // ====================================================
    log('📝 STEP 1: Get or Create Test User');
    log('-'.repeat(80));

    let token, hederaAccountId, userEmail;

    // Try to find an existing user with a wallet
    const existingUser = await db.get(`
      SELECT id, email, hederaAccountId FROM users 
      WHERE hederaAccountId IS NOT NULL 
      ORDER BY id DESC 
      LIMIT 1
    `);

    if (existingUser) {
      log('✅ Using existing user with wallet');
      log(`   Email: ${existingUser.email}`);
      log(`   Account: ${existingUser.hederaAccountId}`);
      log('');
      log('⚠️  NOTE: You need to login manually or provide password');
      log('   For this test, we\'ll create a NEW user instead...');
      log('');
    }

    // Create new user
    const testEmail = `walk-test-${Date.now()}@test.com`;
    const testPassword = 'WalkTest123!';

    log('Creating new test user...');
    const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Walking Test User',
      email: testEmail,
      password: testPassword
    });

    token = registerRes.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };
    userEmail = testEmail;

    log(`✅ User created`);
    log(`   Email: ${testEmail}`);
    log(`   Password: ${testPassword}`);
    log('');

    // ====================================================
    // STEP 2: Create or Get Wallet
    // ====================================================
    log('📝 STEP 2: Create or Get Wallet');
    log('-'.repeat(80));

    try {
      // Try to get existing wallet first
      const walletCheck = await axios.get(`${BASE_URL}/api/users/wallet`, { headers });
      
      if (walletCheck.data.hasWallet) {
        hederaAccountId = walletCheck.data.wallet.accountId;
        log(`✅ User already has wallet: ${hederaAccountId}`);
      } else {
        // Create new wallet
        log('Creating Hedera wallet...');
        const walletRes = await axios.post(`${BASE_URL}/api/users/wallet/create`, {}, { headers });
        hederaAccountId = walletRes.data.wallet.accountId;
        log(`✅ Wallet created: ${hederaAccountId}`);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        log('⚠️  User already has wallet, fetching it...');
        const walletCheck = await axios.get(`${BASE_URL}/api/users/wallet`, { headers });
        hederaAccountId = walletCheck.data.wallet.accountId;
        log(`✅ Retrieved wallet: ${hederaAccountId}`);
      } else {
        throw error;
      }
    }

    log(`   Explorer: https://hashscan.io/testnet/account/${hederaAccountId}`);
    log('');

    await wait(3000);

    // ====================================================
    // STEP 3: Query INITIAL State from BLOCKCHAIN
    // ====================================================
    log('📝 STEP 3: Query INITIAL State from BLOCKCHAIN');
    log('-'.repeat(80));
    log('🔗 Querying smart contract...');
    log('');

    const initialSteps = await fitnessContract.getTotalSteps(hederaAccountId);
    const contractBalance = await fitnessContract.getContractBalance();
    const challengeCount = await fitnessContract.getChallengeCount();

    log(`📊 BLOCKCHAIN STATE (BEFORE walking):`);
    log(`   Total Steps (ON-CHAIN): ${initialSteps}`);
    log(`   Contract FIT Balance: ${contractBalance} FIT`);
    log(`   Total Challenges: ${challengeCount}`);
    log('');

    const initialChallenges = await queryAllChallengesFromBlockchain(hederaAccountId);
    
    log('🏆 Daily Challenges (IDs 1-5):');
    initialChallenges.slice(0, 5).forEach(ch => {
      const levelEmoji = ['🌱', '🔵', '🟡', '🔴', '👑'][ch.level - 1];
      const status = ch.completed ? '✅' : '⏳';
      log(`   ${status} ${levelEmoji} Challenge ${ch.id}: ${ch.progress}/${ch.target} (${ch.percentComplete}%)`);
    });
    log('');

    const initialCompleted = initialChallenges.filter(ch => ch.completed).length;
    log(`   Completed: ${initialCompleted}/${challengeCount}`);
    log('');

    report.push({
      step: 3,
      name: 'Initial State',
      stepsOnChain: initialSteps,
      contractBalance,
      challengeCount,
      completedChallenges: initialCompleted
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

    await wait(BLOCKCHAIN_WAIT_TIME);
    log('');

    // ====================================================
    // STEP 5: Query State AFTER First Walk
    // ====================================================
    log('📝 STEP 5: Query State AFTER First Walk (FROM BLOCKCHAIN)');
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
      const status = ch.completed ? '✅ COMPLETED!' : '⏳';
      const initialProg = initialChallenges[ch.id - 1]?.progress || 0;
      const change = ch.progress - initialProg;
      log(`   ${status} ${levelEmoji} Challenge ${ch.id}: ${ch.progress}/${ch.target} (${ch.percentComplete}%) ${change > 0 ? `(+${change})` : ''}`);
    });
    log('');

    const completed1 = challenges1.filter(ch => ch.completed).length;
    const newCompleted1 = completed1 - initialCompleted;
    
    if (newCompleted1 > 0) {
      log(`🎉 NEW COMPLETIONS: ${newCompleted1}`);
    } else {
      log(`⏳ No new completions yet`);
    }
    log('');

    report.push({
      step: 5,
      name: 'After First Walk',
      transactionId: tx1,
      stepsOnChain: steps1,
      stepsAdded: steps1 - initialSteps,
      challengesCompleted: completed1,
      newCompletions: newCompleted1
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
    log('');

    await wait(BLOCKCHAIN_WAIT_TIME);
    log('');

    // ====================================================
    // STEP 7: Query FINAL State
    // ====================================================
    log('📝 STEP 7: Query FINAL State (FROM BLOCKCHAIN)');
    log('-'.repeat(80));
    log('🔗 Querying blockchain...');
    log('');

    const stepsFinal = await fitnessContract.getTotalSteps(hederaAccountId);
    const challengesFinal = await queryAllChallengesFromBlockchain(hederaAccountId);
    const contractBalanceFinal = await fitnessContract.getContractBalance();

    log(`📊 BLOCKCHAIN STATE (FINAL):`);
    log(`   Total Steps (ON-CHAIN): ${stepsFinal}`);
    log(`   Steps Added This Walk: +${stepsFinal - steps1}`);
    log(`   Steps Added Total: +${stepsFinal - initialSteps}`);
    log(`   Contract Balance: ${contractBalanceFinal} FIT (was ${contractBalance})`);
    log('');

    log('🏆 Daily Challenges Status:');
    challengesFinal.slice(0, 5).forEach(ch => {
      const levelEmoji = ['🌱', '🔵', '🟡', '🔴', '👑'][ch.level - 1];
      const status = ch.completed ? '✅ COMPLETED!' : '⏳';
      const progressBefore = challenges1[ch.id - 1]?.progress || 0;
      const change = ch.progress - progressBefore;
      log(`   ${status} ${levelEmoji} Challenge ${ch.id}: ${ch.progress}/${ch.target} (${ch.percentComplete}%) ${change > 0 ? `(+${change})` : ''}`);
    });
    log('');

    const completedFinal = challengesFinal.filter(ch => ch.completed).length;
    const newlyCompleted = completedFinal - initialCompleted;
    const totalRewards = challengesFinal.filter(ch => ch.completed).reduce((sum, ch) => sum + ch.reward, 0);

    if (newlyCompleted > 0) {
      log(`🎉 NEWLY COMPLETED: ${newlyCompleted} challenges!`);
      challengesFinal.filter((ch, idx) => ch.completed && !initialChallenges[idx].completed).forEach(ch => {
        log(`   • Challenge ${ch.id}: +${ch.reward} FIT`);
      });
      log('');
    }

    log(`📊 Final Stats:`);
    log(`   Total Completed: ${completedFinal}/${challengeCount}`);
    log(`   Total Rewards: ${totalRewards} FIT`);
    log('');

    report.push({
      step: 7,
      name: 'Final State',
      transactionId: tx2,
      stepsOnChain: stepsFinal,
      totalStepsAdded: stepsFinal - initialSteps,
      challengesCompleted: completedFinal,
      newlyCompleted,
      totalRewards,
      contractBalanceFinal
    });

    // ====================================================
    // VALIDATION
    // ====================================================
    log('='.repeat(80));
    log('🔍 VALIDATION');
    log('='.repeat(80));
    log('');

    const stepsAdded = stepsFinal - initialSteps;
    const expectedSteps = 1000;

    log(`Steps Added: ${stepsAdded} / Expected: ${expectedSteps} ${stepsAdded === expectedSteps ? '✅' : '⚠️'}`);
    
    const challenge1 = challengesFinal.find(ch => ch.id === 1);
    if (challenge1 && challenge1.target === 1000) {
      const shouldBeCompleted = (initialSteps + stepsAdded) >= 1000;
      const isCompleted = challenge1.completed;
      log(`Challenge 1 (1000 steps): ${isCompleted ? 'COMPLETED ✅' : `${challenge1.progress}/1000 ⏳`}`);
      
      if (shouldBeCompleted && !isCompleted) {
        log(`   ⚠️  ISSUE: Should be completed but isn't!`);
        log(`   Progress: ${challenge1.progress}`);
      }
    }
    log('');

    if (newlyCompleted > 0) {
      log('🎉 SUCCESS: Challenges completed during test!');
    } else {
      log('⚠️  No new challenges completed during this test');
      log(`   (User had ${initialSteps} steps before test started)`);
    }
    log('');

    // ====================================================
    // SUMMARY
    // ====================================================
    log('='.repeat(80));
    log('📊 SUMMARY');
    log('='.repeat(80));
    log('');
    log(`👤 User: ${userEmail}`);
    log(`   Password: ${testPassword}`);
    log(`   Hedera: ${hederaAccountId}`);
    log('');
    log(`🏃 Activity:`);
    log(`   Walk 1: 500 steps (TX: ${tx1})`);
    log(`   Walk 2: 500 steps (TX: ${tx2})`);
    log(`   Total Steps Added: ${stepsAdded}`);
    log('');
    log(`🏆 Results:`);
    log(`   Challenges Completed: ${completedFinal}/${challengeCount}`);
    log(`   New Completions: ${newlyCompleted}`);
    log(`   Total Rewards: ${totalRewards} FIT`);
    log('');

  } catch (error) {
    log('');
    log('❌ ERROR: ' + error.message);
    if (error.response) {
      log(`   Status: ${error.response.status}`);
      log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    log('');
    log('Stack:');
    log(error.stack);
    
    report.push({
      step: 'ERROR',
      error: error.message,
      details: error.response?.data
    });
  } finally {
    // Don't call close() - it doesn't exist
    // The Hedera client will close when process exits
  }

  // Save reports
  fs.writeFileSync('WALKING-TEST-REPORT.json', JSON.stringify(report, null, 2));
  fs.writeFileSync('WALKING-TEST-LOG.txt', logOutput);

  log('='.repeat(80));
  log('📄 Reports saved:');
  log('   • WALKING-TEST-REPORT.json');
  log('   • WALKING-TEST-LOG.txt');
  log('='.repeat(80));
}

comprehensiveWalkingTest().catch(console.error);