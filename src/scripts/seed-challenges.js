require('dotenv').config();
const fitnessContract = require('./src/lib/fitness-contract');

/**
 * Seed challenges with types: 1=daily, 2=duration, 3=social
 */

const CHALLENGES = [
  // DAILY CHALLENGES
  { target: 1000, reward: 5, level: 1, type: 1, name: "Premier Pas" },
  { target: 5000, reward: 10, level: 2, type: 1, name: "Randonneur" },
  { target: 10000, reward: 20, level: 3, type: 1, name: "Marcheur Sérieux" },
  { target: 15000, reward: 30, level: 4, type: 1, name: "Champion du Jour" },
  { target: 20000, reward: 50, level: 5, type: 1, name: "Maître du Mouvement" },
  
  // DURATION CHALLENGES
  { target: 3000, reward: 10, level: 1, type: 2, name: "Début d'Aventure" },
  { target: 10000, reward: 20, level: 2, type: 2, name: "Marathonien Débutant" },
  { target: 25000, reward: 40, level: 3, type: 2, name: "Endurance Pro" },
  { target: 50000, reward: 80, level: 4, type: 2, name: "Ultra-Marathonien" },
  { target: 100000, reward: 150, level: 5, type: 2, name: "Légende Vivante" },
  
  // SOCIAL CHALLENGES
  { target: 2, reward: 5, level: 1, type: 3, name: "Partage Ton Début" },
  { target: 5, reward: 15, level: 2, type: 3, name: "Ambassadeur" },
  { target: 10, reward: 30, level: 3, type: 3, name: "Influenceur Fitness" },
  { target: 20, reward: 60, level: 4, type: 3, name: "Leader Communautaire" },
  { target: 50, reward: 120, level: 5, type: 3, name: "Icône du Fitness" }
];

async function seedChallenges() {
  console.log('🌱 Seeding challenges with types...');
  console.log('');

  await fitnessContract.initialize();

  const currentCount = await fitnessContract.getChallengeCount();
  console.log(`Current challenge count: ${currentCount}`);
  console.log('');

  if (currentCount >= 15) {
    console.log('⚠️  15 challenges already exist.');
    console.log('   To re-seed, deploy a new contract.');
    return;
  }

  for (const challenge of CHALLENGES) {
    try {
      console.log(`Adding: ${challenge.name} (Level ${challenge.level}, Type ${challenge.type})`);
      console.log(`   Target: ${challenge.target}, Reward: ${challenge.reward} FIT`);
      
      const result = await fitnessContract.addChallenge(
        challenge.target,
        challenge.reward,
        challenge.level,
        challenge.type
      );
      
      console.log(`   ✅ TX: ${result.transactionId}`);
      console.log('');
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.log('');
    }
  }

  const finalCount = await fitnessContract.getChallengeCount();
  console.log(`✅ Total challenges: ${finalCount}`);
}

seedChallenges().catch(console.error);