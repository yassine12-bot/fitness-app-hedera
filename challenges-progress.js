require('dotenv').config();
const fitnessContract = require('./src/lib/fitness-contract');

/**
 * Check which challenges are progressing
 */

async function checkAllChallenges() {
  const userAccountId = '0.0.7317363'; // Your test user
  
  console.log('='.repeat(80));
  console.log('📊 CHECKING ALL CHALLENGES PROGRESSION');
  console.log('='.repeat(80));
  console.log('');
  
  await fitnessContract.initialize();
  
  console.log(`👤 User: ${userAccountId}`);
  console.log('');
  
  // Get user level and steps
  const userLevel = await fitnessContract.getUserLevel(userAccountId);
  const totalSteps = await fitnessContract.getTotalSteps(userAccountId);
  
  console.log(`📈 User Level: ${userLevel}`);
  console.log(`🚶 Total Steps: ${totalSteps}`);
  console.log('');
  
  const challengeCount = await fitnessContract.getChallengeCount();
  console.log(`🏆 Total Challenges: ${challengeCount}`);
  console.log('');
  
  // Check all challenges
  console.log('📋 ALL CHALLENGES:');
  console.log('-'.repeat(80));
  console.log('');
  
  const TYPES = ['', 'Daily', 'Duration', 'Social'];
  
  for (let i = 1; i <= challengeCount; i++) {
    const challenge = await fitnessContract.getChallenge(i);
    const progress = await fitnessContract.getChallengeProgress(userAccountId, i);
    const completed = await fitnessContract.isChallengeCompleted(userAccountId, i);
    
    const type = TYPES[i <= 5 ? 1 : i <= 10 ? 2 : 3];
    const status = completed ? '✅ COMPLETE' : progress > 0 ? '📈 PROGRESS' : '⏳ LOCKED';
    const percent = challenge.target > 0 ? Math.min(100, Math.floor((progress / challenge.target) * 100)) : 0;
    
    const atUserLevel = challenge.level === userLevel ? '🔓' : '🔒';
    
    console.log(`${atUserLevel} Challenge ${i} - ${type} Level ${challenge.level}`);
    console.log(`   Status: ${status}`);
    console.log(`   Progress: ${progress}/${challenge.target} (${percent}%)`);
    console.log(`   Reward: ${challenge.reward} FIT`);
    
    if (progress > 0 && challenge.level !== userLevel) {
      console.log(`   ⚠️  WARNING: Progressing but not at user level!`);
    }
    
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('🔍 ANALYSIS');
  console.log('='.repeat(80));
  console.log('');
  
  // Check which challenges have progress
  const progressing = [];
  const completedChallenges = [];
  
  for (let i = 1; i <= challengeCount; i++) {
    const progress = await fitnessContract.getChallengeProgress(userAccountId, i);
    const completed = await fitnessContract.isChallengeCompleted(userAccountId, i);
    
    if (completed) {
      completedChallenges.push(i);
    } else if (progress > 0) {
      progressing.push(i);
    }
  }
  
  console.log(`✅ Completed: ${completedChallenges.length} challenges`);
  if (completedChallenges.length > 0) {
    console.log(`   IDs: ${completedChallenges.join(', ')}`);
  }
  console.log('');
  
  console.log(`📈 In Progress: ${progressing.length} challenges`);
  if (progressing.length > 0) {
    console.log(`   IDs: ${progressing.join(', ')}`);
  }
  console.log('');
  
  console.log(`🔒 Locked: ${challengeCount - progressing.length - completedChallenges.length} challenges`);
  console.log('');
  
  // Check if progression is correct
  console.log('🎯 EXPECTED BEHAVIOR:');
  console.log(`   User is Level ${userLevel}`);
  console.log(`   Should ONLY progress:`);
  
  if (userLevel === 1) {
    console.log(`   • Challenge 1 (Daily Level 1)`);
    console.log(`   • Challenge 6 (Duration Level 1)`);
    console.log(`   • Challenge 11 (Social Level 1) - only via posts`);
  } else {
    console.log(`   • Challenges at Level ${userLevel} only`);
  }
  
  console.log('');
  
  // Validate
  let issuesFound = false;
  
  for (let i = 1; i <= challengeCount; i++) {
    const challenge = await fitnessContract.getChallenge(i);
    const progress = await fitnessContract.getChallengeProgress(userAccountId, i);
    const isSocial = i > 10;
    
    // Check if wrong level is progressing
    if (progress > 0 && challenge.level !== userLevel) {
      console.log(`❌ ISSUE: Challenge ${i} (Level ${challenge.level}) has progress but user is Level ${userLevel}`);
      issuesFound = true;
    }
    
    // Check if social challenge progressed with steps
    if (isSocial && progress > 0 && progress === totalSteps) {
      console.log(`❌ ISSUE: Challenge ${i} (Social) progressed with steps!`);
      issuesFound = true;
    }
  }
  
  if (!issuesFound) {
    console.log('✅ ALL CHECKS PASSED!');
    console.log('   Only correct challenges are progressing');
  }
  
  console.log('');
  console.log('='.repeat(80));
}

checkAllChallenges().catch(console.error);