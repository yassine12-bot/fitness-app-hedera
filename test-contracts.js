const fitnessContract = require('./src/lib/fitness-contract');
const marketplaceContract = require('./src/lib/marketplace-contract');

async function testContracts() {
    console.log('🧪 TESTING SMART CONTRACT QUERIES\n');
    console.log('='.repeat(60));

    await fitnessContract.initialize();
    await marketplaceContract.initialize();

    // Test Challenges
    console.log('\n🎯 CHALLENGES (FitnessContract):');
    console.log('-'.repeat(60));
    try {
        const challengeCount = await fitnessContract.getChallengeCount();
        console.log(`✅ Challenge count: ${challengeCount}`);

        if (challengeCount > 0) {
            console.log('\nFirst 3 challenges:');
            for (let i = 1; i <= Math.min(3, challengeCount); i++) {
                const c = await fitnessContract.getChallenge(i);
                console.log(`  ${i}. ${c.title} - ${c.target} steps = ${c.reward} FIT`);
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    // Test Products
    console.log('\n\n🛒 PRODUCTS (MarketplaceContract):');
    console.log('-'.repeat(60));
    try {
        const productCount = await marketplaceContract.getProductCount();
        console.log(`✅ Product count: ${productCount}`);

        if (productCount > 0) {
            console.log('\nAll products:');
            for (let i = 1; i <= productCount; i++) {
                const p = await marketplaceContract.getProduct(i);
                console.log(`  ${i}. ${p.name} - ${p.priceTokens} FIT (Stock: ${p.stock})`);
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test complete!');
    process.exit(0);
}

testContracts().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
