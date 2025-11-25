require('dotenv').config();
const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

function hederaTokenIdToEvmAddress(tokenId) {
  const tokenNum = tokenId.replace('0.0.', '');
  const hexNum = parseInt(tokenNum).toString(16).padStart(8, '0');
  return '0x' + '0'.repeat(32) + hexNum;
}

async function main() {
  console.log('🚀 Deploy FitnessContract with Types\n');
  console.log('='.repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log('\n🔑 Deploying from:', deployer.address);

  const FIT_TOKEN_ID = process.env.FIT_TOKEN_ID;
  if (!FIT_TOKEN_ID) {
    throw new Error('FIT_TOKEN_ID not found in .env');
  }

  const FIT_TOKEN_ADDRESS = hederaTokenIdToEvmAddress(FIT_TOKEN_ID);
  console.log('🪙 FIT Token (EVM):', FIT_TOKEN_ADDRESS);

  console.log('\n📦 Deploying FitnessContract...');
  const FitnessContract = await hre.ethers.getContractFactory("FitnessContract");
  const fitnessContract = await FitnessContract.deploy(FIT_TOKEN_ADDRESS);
  await fitnessContract.waitForDeployment();

  const fitnessAddress = await fitnessContract.getAddress();
  console.log('✅ FitnessContract deployed:', fitnessAddress);

  const CHALLENGES = [
    // Daily Steps (type 1)
    { target: 1000, reward: 5, level: 1, type: 1 },
    { target: 5000, reward: 10, level: 2, type: 1 },
    { target: 10000, reward: 20, level: 3, type: 1 },
    { target: 15000, reward: 30, level: 4, type: 1 },
    { target: 20000, reward: 50, level: 5, type: 1 },
    
    // Duration Steps (type 2)
    { target: 3000, reward: 10, level: 1, type: 2 },
    { target: 10000, reward: 20, level: 2, type: 2 },
    { target: 25000, reward: 40, level: 3, type: 2 },
    { target: 50000, reward: 80, level: 4, type: 2 },
    { target: 100000, reward: 150, level: 5, type: 2 },
    
    // Social (type 3)
    { target: 2, reward: 5, level: 1, type: 3 },
    { target: 5, reward: 15, level: 2, type: 3 },
    { target: 10, reward: 30, level: 3, type: 3 },
    { target: 20, reward: 60, level: 4, type: 3 },
    { target: 50, reward: 120, level: 5, type: 3 }
  ];

  console.log('\n✨ Adding challenges (15 total)...\n');

  for (let i = 0; i < CHALLENGES.length; i++) {
    const challenge = CHALLENGES[i];
    const typeLabel = ['', 'Daily', 'Duration', 'Social'][challenge.type];
    
    console.log(`   Adding Challenge ${i + 1} (${typeLabel})...`);
    console.log(`   → Target: ${challenge.target}, Reward: ${challenge.reward}, Level: ${challenge.level}, Type: ${challenge.type}`);

    try {
      const tx = await fitnessContract.addChallenge(
        challenge.target,
        challenge.reward,
        challenge.level,
        challenge.type  // ✅ 4th parameter
      );
      await tx.wait();
      console.log(`   ✅ Success!\n`);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}\n`);
      throw error;
    }
  }

  console.log('✅ All 15 challenges added!');

  console.log('\n🔍 Verifying deployment...');
  
  const challengeCount = await fitnessContract.challengeCount();
  console.log(`   Challenge count: ${challengeCount}`);

  const [target, reward, level, active] = await fitnessContract.getChallenge(1);
  console.log(`   Challenge 1: Target=${target}, Reward=${reward}, Level=${level}, Active=${active}`);

  if (challengeCount.toString() === '15' && target.toString() === '1000' && reward.toString() === '5') {
    console.log('\n✅ VERIFICATION PASSED!');
  }

  console.log('\n💾 Updating .env file...');

  const envPath = path.resolve(__dirname, '.env');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(/FITNESS_CONTRACT_ADDRESS=.*\n?/g, '');
  } catch (error) {
    console.log('   Creating new .env file...');
  }

  const timestamp = new Date().toISOString();
  envContent += `\n# FitnessContract deployed ${timestamp}\n`;
  envContent += `FITNESS_CONTRACT_ADDRESS=${fitnessAddress}\n`;

  fs.writeFileSync(envPath, envContent);
  console.log(`   ✅ Updated: ${fitnessAddress}`);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 DEPLOYMENT COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n📋 Contract Info:');
  console.log(`   Address: ${fitnessAddress}`);
  console.log(`   Challenges: 15 ✅`);
  console.log('\n📌 NEXT STEPS:');
  console.log('   1. Fund contract with FIT tokens');
  console.log('   2. Test: node WALKING-TEST-SIMPLE.js');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });