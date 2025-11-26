require('dotenv').config();
const { Client, ContractCallQuery, ContractFunctionParameters } = require('@hashgraph/sdk');

const YOUR_ACCOUNT = '0.0.7309024';
const MARKETPLACE_CONTRACT = process.env.MARKETPLACE_CONTRACT_ADDRESS;

async function testNFTs() {
    const client = Client.forTestnet();
    client.setOperator(
        process.env.HEDERA_ACCOUNT_ID,
        process.env.HEDERA_PRIVATE_KEY
    );

    console.log('\n🔍 Testing NFT Queries for', YOUR_ACCOUNT);
    console.log('📍 Contract:', MARKETPLACE_CONTRACT);
    console.log('─'.repeat(60));

    try {
        // Test 1: Get total NFT count
        console.log('\n1️⃣ Testing getNFTCount()...');
        try {
            const countQuery = new ContractCallQuery()
                .setContractId(MARKETPLACE_CONTRACT)
                .setGas(100000)
                .setFunction("getNFTCount");

            const countResult = await countQuery.execute(client);
            const totalNFTs = countResult.getUint256(0).toNumber();
            console.log(`   ✅ Total NFTs minted: ${totalNFTs}`);
        } catch (err) {
            console.log(`   ❌ Error:`, err.message);
        }

        // Test 2: Try to get NFT #6 (your first purchase)
        console.log('\n2️⃣ Testing getNFT(6)...');
        try {
            const nft6Query = new ContractCallQuery()
                .setContractId(MARKETPLACE_CONTRACT)
                .setGas(300000)
                .setFunction("getNFT", new ContractFunctionParameters().addUint256(6));

            const nft6Result = await nft6Query.execute(client);

            console.log('   📦 Raw result bytes:', nft6Result.asBytes());
            console.log('   📦 Trying to parse as individual fields:');

            try {
                console.log('      - ID:', nft6Result.getUint256(0).toNumber());
                console.log('      - Product ID:', nft6Result.getUint256(1).toNumber());
                console.log('      - Owner:', nft6Result.getAddress(2));
                console.log('      - Purchase Date:', nft6Result.getUint256(3).toNumber());
                console.log('      - Is Used:', nft6Result.getBool(4));
            } catch (parseErr) {
                console.log('   ❌ Parse error:', parseErr.message);
            }
        } catch (err) {
            console.log(`   ❌ Error:`, err.message);
            console.log(`   📝 Full error:`, err.status?.toString());
        }

        // Test 3: Try to get NFT #7 (your second purchase)
        console.log('\n3️⃣ Testing getNFT(7)...');
        try {
            const nft7Query = new ContractCallQuery()
                .setContractId(MARKETPLACE_CONTRACT)
                .setGas(300000)
                .setFunction("getNFT", new ContractFunctionParameters().addUint256(7));

            const nft7Result = await nft7Query.execute(client);
            console.log('   ✅ NFT #7 exists!');
            console.log('   📦 Raw bytes:', nft7Result.asBytes());
        } catch (err) {
            console.log(`   ❌ Error:`, err.message);
        }

        // Test 4: Try getUserNFTs
        console.log('\n4️⃣ Testing getUserNFTs()...');
        try {
            // Convert Hedera ID to EVM address
            const accountNum = YOUR_ACCOUNT.split('.')[2];
            const hexNum = parseInt(accountNum).toString(16).padStart(8, '0');
            const evmAddress = '0x' + '0'.repeat(32) + hexNum;

            console.log(`   🔄 Converting ${YOUR_ACCOUNT} to EVM: ${evmAddress}`);

            const userNFTsQuery = new ContractCallQuery()
                .setContractId(MARKETPLACE_CONTRACT)
                .setGas(300000)
                .setFunction("getUserNFTs", new ContractFunctionParameters().addAddress(evmAddress));

            const userNFTsResult = await userNFTsQuery.execute(client);

            console.log('   📦 Raw result:', userNFTsResult.asBytes());

            try {
                const arrayLength = userNFTsResult.getUint256(0).toNumber();
                console.log(`   ✅ Array length: ${arrayLength}`);

                if (arrayLength > 0) {
                    console.log('   📋 Your NFT IDs:');
                    for (let i = 0; i < arrayLength; i++) {
                        const nftId = userNFTsResult.getUint256(i + 1).toNumber();
                        console.log(`      - NFT #${nftId}`);
                    }
                } else {
                    console.log('   ⚠️ No NFTs found for this address');
                }
            } catch (parseErr) {
                console.log('   ❌ Parse error:', parseErr.message);
            }
        } catch (err) {
            console.log(`   ❌ Error:`, err.message);
        }

        // Test 5: Check product #7 (what you purchased)
        console.log('\n5️⃣ Testing getProduct(7)...');
        try {
            const productQuery = new ContractCallQuery()
                .setContractId(MARKETPLACE_CONTRACT)
                .setGas(300000)
                .setFunction("getProduct", new ContractFunctionParameters().addUint256(7));

            const productResult = await productQuery.execute(client);

            // Try to decode using ethers
            const ethers = require('ethers');
            const bytes = productResult.asBytes();
            const hexString = '0x' + Buffer.from(bytes).toString('hex');

            const abiCoder = ethers.AbiCoder.defaultAbiCoder();
            const decoded = abiCoder.decode(
                ['tuple(uint256 id, string name, string description, string category, uint256 priceTokens, uint256 stock, string imageUrl, bool isActive)'],
                hexString
            );

            const product = decoded[0];
            console.log('   ✅ Product #7:');
            console.log(`      - Name: ${product.name}`);
            console.log(`      - Price: ${product.priceTokens} FIT`);
            console.log(`      - Stock: ${product.stock}`);
            console.log(`      - Category: ${product.category}`);
        } catch (err) {
            console.log(`   ❌ Error:`, err.message);
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
    } finally {
        client.close();
        console.log('\n' + '─'.repeat(60));
        console.log('✅ Test complete!\n');
    }
}

testNFTs();
