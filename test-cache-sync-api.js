require('dotenv').config();
const axios = require('axios');
const db = require('./src/lib/db');
const fitnessContract = require('./src/lib/fitness-contract');

const BASE_URL = 'http://localhost:3000';

/**
 * Test cache sync when logging steps via API
 */

async function testCacheSync() {
  console.log('='.repeat(80));
  console.log('🔄 TESTING CACHE SYNC VIA API');
  console.log('='.repeat(80));
  console.log('');
  
  await db.initialize();
  await fitnessContract.initialize();
  
  // Get existing user
  const user = await db.get(`
    SELECT id, email, hederaAccountId, totalSteps, fitBalance 
    FROM users 
    WHERE hederaAccountId IS NOT NULL 
    ORDER BY id DESC 
    LIMIT 1
  `);
  
  if (!user || !user.hederaAccountId) {
    console.log('❌ No user with wallet found');
    console.log('   Create a user and wallet first');
    return;
  }
  
  console.log(`👤 User: ${user.email}`);
  console.log(`   Account: ${user.hederaAccountId}`);
  console.log('');
  
  // Query BEFORE state
  console.log('📊 STATE BEFORE LOGGING STEPS:');
  console.log('-'.repeat(80));
  
  const beforeStepsBlockchain = await fitnessContract.getTotalSteps(user.hederaAccountId);
  const beforeStepsCache = user.totalSteps || 0;
  const beforeFitCache = user.fitBalance || 0;
  
  console.log('Blockchain:');
  console.log(`   Total Steps: ${beforeStepsBlockchain}`);
  
  console.log('Cache (SQLite):');
  console.log(`   Total Steps: ${beforeStepsCache}`);
  console.log(`   FIT Balance: ${beforeFitCache}`);
  
  const beforeMatch = beforeStepsBlockchain === beforeStepsCache;
  console.log(`   Sync Status: ${beforeMatch ? '✅ SYNCED' : '❌ OUT OF SYNC'}`);
  console.log('');
  
  // Query challenge progress BEFORE
  console.log('🏆 Challenge Progress BEFORE:');
  const challenge1ProgressBefore = await fitnessContract.getChallengeProgress(user.hederaAccountId, 1);
  const challenge1CompletedBefore = await fitnessContract.isChallengeCompleted(user.hederaAccountId, 1);
  console.log(`   Challenge 1: ${challenge1ProgressBefore}/1000 ${challenge1CompletedBefore ? '✅' : '⏳'}`);
  console.log('');
  
  // Ask user to log steps manually
  console.log('📝 INSTRUCTIONS:');
  console.log('   1. Login to your app with:');
  console.log(`      Email: ${user.email}`);
  console.log('   2. Log 200 steps via the app');
  console.log('   3. Wait for the request to complete');
  console.log('   4. Press Enter here to continue...');
  console.log('');
  
  // Wait for user input
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
  
  console.log('⏳ Waiting 10 seconds for blockchain to settle...');
  await new Promise(r => setTimeout(r, 10000));
  console.log('');
  
  // Query AFTER state
  console.log('📊 STATE AFTER LOGGING STEPS:');
  console.log('-'.repeat(80));
  
  // Query blockchain
  const afterStepsBlockchain = await fitnessContract.getTotalSteps(user.hederaAccountId);
  
  // Query cache
  const userAfter = await db.get(
    'SELECT totalSteps, fitBalance FROM users WHERE id = ?',
    [user.id]
  );
  
  const afterStepsCache = userAfter.totalSteps || 0;
  const afterFitCache = userAfter.fitBalance || 0;
  
  console.log('Blockchain:');
  console.log(`   Total Steps: ${afterStepsBlockchain}`);
  console.log(`   Steps Added: +${afterStepsBlockchain - beforeStepsBlockchain}`);
  
  console.log('Cache (SQLite):');
  console.log(`   Total Steps: ${afterStepsCache}`);
  console.log(`   Steps Added: +${afterStepsCache - beforeStepsCache}`);
  console.log(`   FIT Balance: ${afterFitCache} (was ${beforeFitCache})`);
  
  const afterMatch = afterStepsBlockchain === afterStepsCache;
  console.log(`   Sync Status: ${afterMatch ? '✅ SYNCED' : '❌ OUT OF SYNC'}`);
  console.log('');
  
  // Query challenge progress AFTER
  console.log('🏆 Challenge Progress AFTER:');
  const challenge1ProgressAfter = await fitnessContract.getChallengeProgress(user.hederaAccountId, 1);
  const challenge1CompletedAfter = await fitnessContract.isChallengeCompleted(user.hederaAccountId, 1);
  console.log(`   Challenge 1: ${challenge1ProgressAfter}/1000 ${challenge1CompletedAfter ? '✅' : '⏳'}`);
  console.log(`   Progress Added: +${challenge1ProgressAfter - challenge1ProgressBefore}`);
  console.log('');
  
  // Check if cache has challenge progress
  const cacheChallenge = await db.get(`
    SELECT progress, completed 
    FROM user_challenges 
    WHERE user_id = ? AND challenge_id = 1
  `, [user.hederaAccountId]);
  
  if (cacheChallenge) {
    console.log('Cache Challenge Progress:');
    console.log(`   Progress: ${cacheChallenge.progress}/1000`);
    console.log(`   Completed: ${cacheChallenge.completed ? '✅' : '⏳'}`);
    
    const progressMatch = cacheChallenge.progress === challenge1ProgressAfter;
    const completedMatch = (cacheChallenge.completed ? true : false) === challenge1CompletedAfter;
    
    console.log(`   Progress Synced: ${progressMatch ? '✅' : '❌'}`);
    console.log(`   Completion Synced: ${completedMatch ? '✅' : '❌'}`);
  } else {
    console.log('❌ No challenge progress in cache!');
  }
  console.log('');
  
  // Analysis
  console.log('='.repeat(80));
  console.log('🔍 ANALYSIS');
  console.log('='.repeat(80));
  console.log('');
  
  const stepsAddedBlockchain = afterStepsBlockchain - beforeStepsBlockchain;
  const stepsAddedCache = afterStepsCache - beforeStepsCache;
  
  console.log('✅ CHECKS:');
  console.log('');
  
  // Check 1: Steps added to blockchain
  if (stepsAddedBlockchain > 0) {
    console.log(`✅ Steps logged to blockchain: +${stepsAddedBlockchain}`);
  } else {
    console.log(`❌ No steps added to blockchain`);
  }
  
  // Check 2: Cache synced with blockchain
  if (afterMatch) {
    console.log(`✅ Cache synced with blockchain: ${afterStepsCache} steps`);
  } else {
    console.log(`❌ Cache NOT synced with blockchain:`);
    console.log(`   Blockchain: ${afterStepsBlockchain}`);
    console.log(`   Cache: ${afterStepsCache}`);
    console.log(`   Difference: ${Math.abs(afterStepsBlockchain - afterStepsCache)}`);
  }
  
  // Check 3: Steps match what was logged
  if (stepsAddedCache === stepsAddedBlockchain) {
    console.log(`✅ Cache updated by same amount as blockchain`);
  } else {
    console.log(`❌ Cache update doesn't match blockchain:`);
    console.log(`   Blockchain added: ${stepsAddedBlockchain}`);
    console.log(`   Cache added: ${stepsAddedCache}`);
  }
  
  // Check 4: Challenge progress synced
  if (cacheChallenge && cacheChallenge.progress === challenge1ProgressAfter) {
    console.log(`✅ Challenge progress synced in cache`);
  } else {
    console.log(`❌ Challenge progress NOT synced in cache`);
  }
  
  // Check 5: FIT balance updated if challenge completed
  if (challenge1CompletedAfter && !challenge1CompletedBefore) {
    console.log(`✅ Challenge 1 completed!`);
    if (afterFitCache > beforeFitCache) {
      console.log(`✅ FIT balance updated: +${afterFitCache - beforeFitCache}`);
    } else {
      console.log(`❌ FIT balance NOT updated in cache`);
    }
  }
  
  console.log('');
  
  // Overall verdict
  if (afterMatch && cacheChallenge && cacheChallenge.progress === challenge1ProgressAfter) {
    console.log('🎉 CACHE SYNC IS WORKING! ✅');
    console.log('   Steps, progress, and completion all synced correctly');
  } else {
    console.log('⚠️  CACHE SYNC ISSUES DETECTED:');
    if (!afterMatch) {
      console.log('   • Total steps not synced');
    }
    if (!cacheChallenge || cacheChallenge.progress !== challenge1ProgressAfter) {
      console.log('   • Challenge progress not synced');
    }
    console.log('');
    console.log('💡 POSSIBLE CAUSES:');
    console.log('   1. onWorkoutLogged() method not in cache-sync.js');
    console.log('   2. steps.js not calling cacheSync.onWorkoutLogged()');
    console.log('   3. Backend not restarted after updating cache-sync.js');
  }
  
  console.log('');
  console.log('='.repeat(80));
}

testCacheSync().catch(console.error);