require('dotenv').config();
const { Client, AccountId, PrivateKey, AccountBalanceQuery } = require('@hashgraph/sdk');

async function checkBalance() {
    try {
        const client = Client.forTestnet();
        client.setOperator(
            process.env.HEDERA_ACCOUNT_ID,
            process.env.HEDERA_PRIVATE_KEY
        );

        console.log('\n💰 Checking Operator Balance\n');
        console.log(`Account: ${process.env.HEDERA_ACCOUNT_ID}`);

        const query = new AccountBalanceQuery()
            .setAccountId(process.env.HEDERA_ACCOUNT_ID);

        const balance = await query.execute(client);

        console.log(`\n✅ HBAR Balance: ${balance.hbars.toString()}`);
        console.log(`   (${balance.hbars.toBigNumber().toString()} tinybars)\n`);

        client.close();

        if (balance.hbars.toBigNumber().isGreaterThan(10)) {
            console.log('✅ Sufficient balance for operations!\n');
        } else {
            console.log('⚠️  Low balance - may need more HBAR\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkBalance();
