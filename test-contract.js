// test-contract.js
require('dotenv').config();
const fitnessContract = require('./src/lib/fitness-contract');

async function test() {
  await fitnessContract.initialize();
  
  console.log('📊 Contract State:');
  console.log('==================');
  
  // Check challenge count
  const count = await fitnessContract.getChallengeCount();
  console.log(`Total challenges: ${count}`);
  
  if (count === 0) {
    console.log('⚠️ NO CHALLENGES IN CONTRACT!');
    console.log('You need to run deploy-contracts.js');
    return;
  }
  
  // Check first few challenges
  for (let i = 1; i <= Math.min(3, count); i++) {
    const ch = await fitnessContract.getChallenge(i);
    console.log(`\nChallenge ${i}:`);
    console.log(`  Title: ${ch.title}`);
    console.log(`  Type: ${ch.challengeType}`);
    console.log(`  Target: ${ch.target}`);
    console.log(`  Reward: ${ch.reward}`);
    console.log(`  Active: ${ch.isActive}`);
  }
  
  // Test with your account
  const testUser = process.env.HEDERA_ACCOUNT_ID;
  console.log(`\n📍 Testing with user: ${testUser}`);
  
  const totalSteps = await fitnessContract.getTotalSteps(testUser);
  console.log(`Total steps: ${totalSteps}`);
  
  const progress1 = await fitnessContract.getChallengeProgress(testUser, 1);
  console.log(`Progress on challenge 1: ${progress1}`);
  
  const complete1 = await fitnessContract.isChallengeCompleted(testUser, 1);
  console.log(`Challenge 1 completed: ${complete1}`);
}

test().then(() => process.exit(0)).catch(console.error);