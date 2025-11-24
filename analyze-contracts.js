const fitnessContract = require('./src/lib/fitness-contract');
const marketplaceContract = require('./src/lib/marketplace-contract');

async function analyzeContracts() {
    console.log('📊 ANALYZING SMART CONTRACTS\n');
    console.log('='.repeat(60));

    // Initialize contracts
    await fitnessContract.initialize();
    await marketplaceContract.initialize();

    // ====================================================
    // CHALLENGES (FitnessContract)
    // ====================================================
    console.log('\n🎯 CHALLENGES (FitnessContract):');
    console.log('-'.repeat(60));

    try {
        const challengeCount = await fitnessContract.getChallengeCount();
        console.log(`Total challenges in contract: ${challengeCount}\n`);

        if (challengeCount > 0) {
            for (let i = 1; i <= challengeCount; i++) {
                const challenge = await fitnessContract.getChallenge(i);
                console.log(`${i}. ${challenge.title}`);
                console.log(`   Type: ${challenge.challengeType}`);
                console.log(`   Target: ${challenge.target} steps`);
                console.log(`   Reward: ${challenge.reward} FIT`);
                console.log(`   Level: ${challenge.level}`);
                console.log(`   Active: ${challenge.isActive ? '✅' : '❌'}`);
                console.log('');
            }
        } else {
            console.log('⚠️  No challenges found in contract!');
            console.log('   Run: node add-challenges-to-contract.js\n');
        }
    } catch (error) {
        console.error('❌ Error fetching challenges:', error.message);
    }

    // ====================================================
    // PRODUCTS (MarketplaceContract)
    // ====================================================
    console.log('\n🛒 PRODUCTS (MarketplaceContract):');
    console.log('-'.repeat(60));

    try {
        const productCount = await marketplaceContract.getProductCount();
        console.log(`Total products in contract: ${productCount}\n`);

        if (productCount > 0) {
            for (let i = 1; i <= productCount; i++) {
                const product = await marketplaceContract.getProduct(i);
                console.log(`${i}. ${product.name}`);
                console.log(`   Category: ${product.category}`);
                console.log(`   Price: ${product.priceTokens} FIT`);
                console.log(`   Stock: ${product.stock}`);
                console.log(`   Active: ${product.isActive ? '✅' : '❌'}`);
                console.log('');
            }
        } else {
            console.log('⚠️  No products found in contract!');
            console.log('   Products need to be added to the smart contract\n');
        }
    } catch (error) {
        console.error('❌ Error fetching products:', error.message);
    }

    // ====================================================
    // SUMMARY
    // ====================================================
    console.log('\n📋 SUMMARY:');
    console.log('='.repeat(60));
    console.log('Challenges: Stored in FitnessContract ✅');
    console.log('Products: Stored in MarketplaceContract ✅');
    console.log('\nBoth should be queried from smart contracts, not database!');
    console.log('='.repeat(60));

    process.exit(0);
}

analyzeContracts().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
