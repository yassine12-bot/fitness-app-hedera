require('dotenv').config();
const { Client, ContractCallQuery, ContractFunctionParameters } = require('@hashgraph/sdk');

const MARKETPLACE_CONTRACT = process.env.MARKETPLACE_CONTRACT_ADDRESS;

async function diagnoseNFTs() {
    const client = Client.forTestnet();
    client.setOperator(
        process.env.HEDERA_ACCOUNT_ID,
        process.env.HEDERA_PRIVATE_KEY
    );

    console.log('\n🔬 DETAILED NFT DIAGNOSIS');
    console.log('═'.repeat(60));

    try {
        // Get total NFT count
        const countQuery = new ContractCallQuery()
            .setContractId(MARKETPLACE_CONTRACT)
            .setGas(300000)
            .setFunction("getNFTCount");

        const countResult = await countQuery.execute(client);
        const totalNFTs = countResult.getUint256(0).toNumber();

        console.log(`\n📊 Total NFTs: ${totalNFTs}\n`);

        // Check each NFT in detail
        for (let nftId = 1; nftId <= totalNFTs; nftId++) {
            console.log(`\n${'─'.repeat(60)}`);
            console.log(`NFT #${nftId}:`);
            console.log('─'.repeat(60));

            try {
                // Query NFT data
                const nftQuery = new ContractCallQuery()
                    .setContractId(MARKETPLACE_CONTRACT)
                    .setGas(300000)
                    .setFunction("getNFT", new ContractFunctionParameters().addUint256(nftId));

                const nftResult = await nftQuery.execute(client);
                const bytes = nftResult.asBytes();

                console.log('📦 Raw bytes length:', bytes.length);
                console.log('📦 First 64 bytes (hex):', Buffer.from(bytes.slice(0, 64)).toString('hex'));

                // Try different parsing approaches
                console.log('\n🔍 Parsing attempts:');

                // Attempt 1: Standard struct parsing
                try {
                    const id = nftResult.getUint256(0).toNumber();
                    const productId = nftResult.getUint256(1).toNumber();
                    const owner = nftResult.getAddress(2);
                    const purchaseDate = nftResult.getUint256(3).toNumber();
                    const isUsed = nftResult.getBool(4);
                    const usedDate = nftResult.getUint256(5).toNumber();

                    console.log('  ✅ Standard parsing:');
                    console.log(`     - ID: ${id}`);
                    console.log(`     - Product ID: ${productId}`);
                    console.log(`     - Owner: ${owner}`);
                    console.log(`     - Purchase Date: ${purchaseDate} (${new Date(purchaseDate * 1000).toISOString()})`);
                    console.log(`     - Is Used: ${isUsed}`);
                    console.log(`     - Used Date: ${usedDate}`);
                } catch (err) {
                    console.log('  ❌ Standard parsing failed:', err.message);
                }

                // Attempt 2: Using ethers to decode
                try {
                    const ethers = require('ethers');
                    const hexString = '0x' + Buffer.from(bytes).toString('hex');
                    const abiCoder = ethers.AbiCoder.defaultAbiCoder();

                    const decoded = abiCoder.decode(
                        ['tuple(uint256 id, uint256 productId, address owner, uint256 purchaseDate, bool isUsed, uint256 usedDate, string metadata)'],
                        hexString
                    );

                    const nft = decoded[0];
                    console.log('  ✅ Ethers parsing:');
                    console.log(`     - ID: ${nft.id}`);
                    console.log(`     - Product ID: ${nft.productId}`);
                    console.log(`     - Owner: ${nft.owner}`);
                    console.log(`     - Purchase Date: ${nft.purchaseDate} (${new Date(Number(nft.purchaseDate) * 1000).toISOString()})`);
                    console.log(`     - Is Used: ${nft.isUsed}`);
                    console.log(`     - Used Date: ${nft.usedDate}`);
                    console.log(`     - Metadata: ${nft.metadata}`);
                } catch (err) {
                    console.log('  ❌ Ethers parsing failed:', err.message);
                }

            } catch (err) {
                console.log(`❌ Failed to query NFT #${nftId}:`, err.message);
            }
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
    } finally {
        client.close();
        console.log('\n' + '═'.repeat(60));
        console.log('✅ Diagnosis complete!\n');
    }
}

diagnoseNFTs();
