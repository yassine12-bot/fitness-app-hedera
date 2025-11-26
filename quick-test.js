require('dotenv').config();
const marketplaceContract = require('./src/lib/marketplace-contract');

async function quickTest() {
    try {
        await marketplaceContract.initialize();

        console.log('\n🧪 Quick Test\n');

        // Test 1: Get product count
        console.log('1️⃣ Testing getProductCount...');
        const productCount = await marketplaceContract.getProductCount();
        console.log(`   ✅ Product count: ${productCount}`);

        // Test 2: Get product #7
        console.log('\n2️⃣ Testing getProduct(7)...');
        const product = await marketplaceContract.getProduct(7);
        if (product) {
            console.log(`   ✅ Product: ${product.name}, ${product.priceTokens} FIT, stock: ${product.stock}`);
        } else {
            console.log('   ❌ getProduct returned null');
        }

        // Test 3: Get NFT count
        console.log('\n3️⃣ Testing getNFTCount...');
        const nftCount = await marketplaceContract.getNFTCount();
        console.log(`   ✅ NFT count: ${nftCount}`);

        // Test 4: Get NFT #7
        console.log('\n4️⃣ Testing getNFT(7)...');
        const nft = await marketplaceContract.getNFT(7);
        if (nft) {
            console.log(`   ✅ NFT: Product #${nft.productId}, Owner: ${nft.owner}`);
            console.log(`   ✅ Is Used: ${nft.isUsed}, Date: ${new Date(nft.purchaseDate * 1000).toISOString()}`);
        } else {
            console.log('   ❌ getNFT returned null');
        }

        // Test 5: Get user NFTs
        console.log('\n5️⃣ Testing getUserNFTs...');
        const userNFTs = await marketplaceContract.getUserNFTs('0.0.7309024');
        console.log(`   ✅ User has ${userNFTs.length} NFTs: ${userNFTs.join(', ')}`);

        marketplaceContract.close();
        console.log('\n✅ All tests complete!\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
    }
}

quickTest();
