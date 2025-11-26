require('dotenv').config();
const {
    Client,
    ContractCallQuery,
    ContractFunctionParameters,
    AccountId,
    PrivateKey
} = require('@hashgraph/sdk');

async function inspectAllChallenges() {
    console.log('🔍 Detailed Challenge Inspection with ETHERS.JS\n');
    console.log('='.repeat(60));

    const accountId = process.env.HEDERA_ACCOUNT_ID;
    const privateKey = process.env.HEDERA_PRIVATE_KEY;
    const contractId = process.env.FITNESS_CONTRACT_ADDRESS;

    console.log(`\n🎯 Contract: ${contractId}\n`);

    const client = Client.forTestnet();
    client.setOperator(
        AccountId.fromString(accountId),
        PrivateKey.fromString(privateKey)
    );

    try {
        // Get challenge count
        const countQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(300000)
            .setFunction("challengeCount");
        const countResult = await countQuery.execute(client);
        const count = countResult.getUint256(0).toNumber();

        console.log(`\n📊 Total challenges: ${count}\n`);

        // ✅ USE ETHERS.JS to decode Challenge struct
        const ethers = require('ethers');

        // Check ALL 15 challenges
        for (let i = 1; i <= Math.min(count, 15); i++) {
            const params = new ContractFunctionParameters().addUint256(i);
            const query = new ContractCallQuery()
                .setContractId(contractId)
                .setGas(300000)
                .setFunction("getChallenge", params);

            const result = await query.execute(client);

            // ✅ DECODE WITH ETHERS.JS
            const bytes = result.asBytes();
            const hexString = '0x' + Buffer.from(bytes).toString('hex');
            const abiCoder = ethers.AbiCoder.defaultAbiCoder();

            const decoded = abiCoder.decode(
                ['tuple(uint256 id, uint256 target, uint256 reward, uint256 level, bool isActive, string title, string challengeType)'],
                hexString
            );

            const challenge = decoded[0];

            console.log(`Challenge ${i}:`);
console.log(`   ID: ${Number(challenge.id)}`);
            console.log(`   Target: ${Number(challenge.target)}`);
            console.log(`   Reward: ${Number(challenge.reward)}`);
            console.log(`   Level: ${Number(challenge.level)}`);
            console.log(`   Active: ${challenge.isActive}`);
            console.log(`   Title: "${challenge.title}"`);
            console.log(`   Type: "${challenge.challengeType}"`);

            // Check if data is correct
            if (i === 1) {
                if (Number(challenge.target) === 1000 && Number(challenge.reward) === 5) {
                    console.log(`   ✅ CORRECT DATA!`);
                } else {
                    console.log(`   ❌ WRONG! Expected target=1000, reward=5`);
                    console.log(`   Got target=${Number(challenge.target)}, reward=${Number(challenge.reward)}`);
                }
            }

            console.log('');
        }

        console.log('='.repeat(60));
        console.log('✅ All challenges decoded with ethers.js!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        client.close();
    }
}

inspectAllChallenges()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
