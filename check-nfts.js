require('dotenv').config();
const marketplaceContract = require('./src/lib/marketplace-contract');

async function checkUserNFTs() {
    try {
        await marketplaceContract.initialize();

        const userAccount = '0.0.7309024'; // Your account

        console.log(`\n🔍 Checking NFTs for ${userAccount}...\n`);

        // Check total NFT count
        const totalNFTs = await marketplaceContract.getNFTCount();
        console.log(`📊 Total NFTs minted: ${totalNFTs}`);

        // Try to get user's NFTs
        console.log(`\n🔍 Querying getUserNFTs...`);
        const nftIds = await marketplaceContract.getUserNFTs(userAccount);
        console.log(`   Result: ${nftIds.length} NFTs found`);
        console.log(`   IDs: ${JSON.stringify(nftIds)}`);

        // Check each NFT individually
        console.log(`\n🔍 Checking all NFTs individually:\n`);
        for (let i = 1; i <= totalNFTs; i++) {
            try {
                const nft = await marketplaceContract.getNFT(i);
                console.log(`NFT #${i}:`);
                console.log(`  Owner: ${nft.owner}`);
                console.log(`  Product ID: ${nft.productId}`);
                console.log(`  Is Used: ${nft.isUsed}`);
                console.log(`  Purchase Date: ${new Date(nft.purchaseDate * 1000).toISOString()}`);
                console.log('');
            } catch (err) {
                console.error(`  ❌ Error fetching NFT #${i}:`, err.message);
            }
        }

        marketplaceContract.close();

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkUserNFTs();
