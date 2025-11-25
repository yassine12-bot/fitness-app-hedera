require('dotenv').config();
const axios = require('axios');
const db = require('./src/lib/db');
const fitnessContract = require('./src/lib/fitness-contract');

const BASE_URL = 'http://localhost:3000';

/**
 * Automated test: Log steps via API and verify cache sync
 */

async function automatedSyncTest() {
  console.log('='.repeat(80));
  console.log('🤖 AUTOMATED CACHE SYNC TEST');
  console.log('='.repeat(80));
  console.log('');
  
  await db.initialize();
  await fitnessContract.initialize();
  
  // Get user with wallet
  const user = await db.get(`
    SELECT id, email, hederaAccountId, totalSteps, fitBalance 
    FROM users 
    WHERE hederaAccountId IS NOT NULL 
    ORDER BY id DESC 
    LIMIT 1
  `);
  
  if (!user) {
    console.log('❌ No user found');
    return;
  }
  
  console.log(`👤 User: ${user.email}`);
  console.log(`   Password: (you need this to login)`);
  console.log('');
  console.log('⚠️  NOTE: You need to login first to get auth token');
  console.log('   Run this after logging in via app or Postman');
  console.log('');
  console.log('Enter auth token (from login response):');
  
  // Get token from user
  const token = await new Promise(resolve => {
    process.stdin.once('data', data => resolve(data.toString().trim()));
  });
  
  const headers = { 'Authorization': `Bearer ${token}` };
  
  console.log('✅ Token received');
  console.log('');
  
  // Query BEFORE state
  console.log('📊 BEFORE STATE:');
  console.log('-'.repeat(80));
  
  const beforeStepsBlockchain = await fitnessContract.getTotalSteps(user.hederaAccountId);
  const beforeStepsCache = user.totalSteps || 0;
  
  console.log(`Blockchain: ${beforeStepsBlockchain} steps`);
  console.log(`Cache: ${beforeStepsCache} steps`);
  console.log('');
  
  // Log steps via API
  const stepsToLog = 300;
  
  console.log(`🏃 Logging ${stepsToLog} steps via API...`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/workouts/steps`, {
      steps: stepsToLog,
      distance: 0.21,
      calories: 15
    }, { headers });
    
    console.log('✅ API request successful');
    console.log(`   TX: ${response.data.data.blockchain.transactionId}`);
    console.log('');
    
    console.log('⏳ Waiting 12 seconds for blockchain...');
    await new Promise(r => setTimeout(r, 12000));
    console.log('');
    
    // Query AFTER state
    console.log('📊 AFTER STATE:');
    console.log('-'.repeat(80));
    
    const afterStepsBlockchain = await fitnessContract.getTotalSteps(user.hederaAccountId);
    
    const userAfter = await db.get(
      'SELECT totalSteps, fitBalance FROM users WHERE id = ?',
      [user.id]
    );
    
    const afterStepsCache = userAfter.totalSteps || 0;
    
    console.log(`Blockchain: ${afterStepsBlockchain} steps (+${afterStepsBlockchain - beforeStepsBlockchain})`);
    console.log(`Cache: ${afterStepsCache} steps (+${afterStepsCache - beforeStepsCache})`);
    console.log('');
    
    // Check challenge 1
    const challenge1Progress = await fitnessContract.getChallengeProgress(user.hederaAccountId, 1);
    const cacheChallenge1 = await db.get(
      'SELECT progress FROM user_challenges WHERE user_id = ? AND challenge_id = 1',
      [user.hederaAccountId]
    );
    
    console.log('🏆 Challenge 1:');
    console.log(`   Blockchain: ${challenge1Progress}/1000`);
    console.log(`   Cache: ${cacheChallenge1?.progress || 0}/1000`);
    console.log('');
    
    // Analysis
    console.log('='.repeat(80));
    console.log('✅ VALIDATION');
    console.log('='.repeat(80));
    console.log('');
    
    let allPassed = true;
    
    // Check 1: Blockchain updated
    if (afterStepsBlockchain === beforeStepsBlockchain + stepsToLog) {
      console.log('✅ Blockchain updated correctly');
    } else {
      console.log(`❌ Blockchain not updated correctly`);
      console.log(`   Expected: ${beforeStepsBlockchain + stepsToLog}`);
      console.log(`   Got: ${afterStepsBlockchain}`);
      allPassed = false;
    }
    
    // Check 2: Cache synced
    if (afterStepsCache === afterStepsBlockchain) {
      console.log('✅ Cache synced with blockchain');
    } else {
      console.log('❌ Cache NOT synced');
      console.log(`   Blockchain: ${afterStepsBlockchain}`);
      console.log(`   Cache: ${afterStepsCache}`);
      allPassed = false;
    }
    
    // Check 3: Challenge progress synced
    if (cacheChallenge1 && cacheChallenge1.progress === challenge1Progress) {
      console.log('✅ Challenge progress synced');
    } else {
      console.log('❌ Challenge progress NOT synced');
      console.log(`   Blockchain: ${challenge1Progress}`);
      console.log(`   Cache: ${cacheChallenge1?.progress || 0}`);
      allPassed = false;
    }
    
    console.log('');
    
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('   Cache sync is working correctly ✅');
    } else {
      console.log('⚠️  SOME TESTS FAILED');
      console.log('');
      console.log('Possible issues:');
      console.log('   1. onWorkoutLogged() not implemented');
      console.log('   2. Backend not restarted after updating cache-sync.js');
      console.log('   3. Database connection issue');
    }
    
  } catch (error) {
    console.log('❌ API Error:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  }
  
  console.log('');
  console.log('='.repeat(80));
}

automatedSyncTest().catch(console.error);