require('dotenv').config();
const hre = require("hardhat");

/**
 * Test deployed smart contracts
 */

async function main() {
    console.log('🧪 Testing Deployed Smart Contracts...\n');

    const [deployer] = await hre.ethers.getSigners();
    console.log('📍 Testing from account:', deployer.address);
    console.log('');

    // ====================================================
    // 1. TEST FITNESS CONTRACT
    // ====================================================

    console.log('='.repeat(50));
    console.log('🏃 TESTING FITNESS CONTRACT');
    console.log('='.repeat(50));
    console.log('');

    const fitnessAddress = process.env.FITNESS_CONTRACT_ADDRESS;
    const FitnessContract = await hre.ethers.getContractAt("FitnessContract", fitnessAddress);

    // Check contract balance
    const contractBalance = await FitnessContract.getContractBalance();
    console.log('💰 Contract FIT Balance:', contractBalance.toString());

    if (contractBalance == 0) {
        console.log('⚠️  WARNING: Contract has 0 FIT tokens!');
        console.log('   → You need to transfer FIT tokens to:', fitnessAddress);
        console.log('');
    }

    // Check challenge count
    const challengeCount = await FitnessContract.challengeCount();
    console.log('📊 Total Challenges:', challengeCount.toString());

    // Get first challenge details
    if (challengeCount > 0) {
        const challenge1 = await FitnessContract.getChallenge(1);
        console.log('');
        console.log('🎯 Challenge #1:');
        console.log('   Title:', challenge1.title);
        console.log('   Type:', challenge1.challengeType);
        console.log('   Target:', challenge1.target.toString(), 'steps');
        console.log('   Reward:', challenge1.reward.toString(), 'FIT');
        console.log('   Level:', challenge1.level.toString());
        console.log('   Active:', challenge1.isActive);
    }

    // Check user steps (should be 0 initially)
    const userSteps = await FitnessContract.getTotalSteps(deployer.address);
    console.log('');
    console.log('👟 Your Total Steps:', userSteps.toString());

    console.log('');
    console.log('✅ FitnessContract is working!\n');

    // ====================================================
    // 2. TEST MARKETPLACE CONTRACT
    // ====================================================

    console.log('='.repeat(50));
    console.log('🛒 TESTING MARKETPLACE CONTRACT');
    console.log('='.repeat(50));
    console.log('');

    const marketplaceAddress = process.env.MARKETPLACE_CONTRACT_ADDRESS;
    const MarketplaceContract = await hre.ethers.getContractAt("MarketplaceContract", marketplaceAddress);

    // Check product count
    const productCount = await MarketplaceContract.productCount();
    console.log('📦 Total Products:', productCount.toString());

    // Get first product details
    if (productCount > 0) {
        const product1 = await MarketplaceContract.getProduct(1);
        console.log('');
        console.log('🎁 Product #1:');
        console.log('   Name:', product1.name);
        console.log('   Category:', product1.category);
        console.log('   Price:', product1.priceTokens.toString(), 'FIT');
        console.log('   Stock:', product1.stock.toString());
        console.log('   Active:', product1.isActive);
    }

    // Check NFT count (should be 0 initially)
    const nftCount = await MarketplaceContract.nftCount();
    console.log('');
    console.log('🎨 Total NFTs Minted:', nftCount.toString());

    // Check treasury
    const treasury = await MarketplaceContract.treasury();
    console.log('💎 Treasury Address:', treasury);

    console.log('');
    console.log('✅ MarketplaceContract is working!\n');

    // ====================================================
    // 3. SUMMARY
    // ====================================================

    console.log('='.repeat(50));
    console.log('📋 SUMMARY');
    console.log('='.repeat(50));
    console.log('');
    console.log('✅ Both contracts deployed successfully');
    console.log(`✅ ${challengeCount} challenges loaded`);
    console.log(`✅ ${productCount} products loaded`);
    console.log('');

    if (contractBalance == 0) {
        console.log('⚠️  NEXT STEP: Fund FitnessContract with FIT tokens');
        console.log(`   Transfer FIT to: ${fitnessAddress}`);
        console.log('');
    } else {
        console.log('✅ FitnessContract is funded and ready!');
        console.log('');
    }

    console.log('🔗 View on HashScan:');
    console.log(`   Fitness: https://hashscan.io/testnet/contract/${fitnessAddress}`);
    console.log(`   Marketplace: https://hashscan.io/testnet/contract/${marketplaceAddress}`);
    console.log('');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
