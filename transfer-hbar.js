require('dotenv').config();
const { Client, AccountId, PrivateKey, Hbar, TransferTransaction, AccountBalanceQuery } = require('@hashgraph/sdk');

// Source accounts with HBAR
const SOURCES = [
    {
        accountId: '0.0.5394636',
        privateKey: '302e020100300506032b65700422042069a3f70a82c49c82354e0e747367f4de0ae32d4bbd09ae0db166128d9e7a2ed1'
    }
];

// Destination (operator account from .env)
const OPERATOR_ACCOUNT = process.env.HEDERA_ACCOUNT_ID; // Should be 0.0.5425861
const AMOUNT_TO_SEND = 100; // HBAR to send

async function transferHBAR() {
    console.log('\n💰 Transferring HBAR to Operator Account\n');
    console.log(`📍 Operator: ${OPERATOR_ACCOUNT}`);
    console.log(`💵 Amount to send: ${AMOUNT_TO_SEND} HBAR\n`);
    console.log('═'.repeat(60));

    for (const source of SOURCES) {
        try {
            console.log(`\n📤 From: ${source.accountId}`);

            // Create client with source account
            const client = Client.forTestnet();
            client.setOperator(
                AccountId.fromString(source.accountId),
                PrivateKey.fromStringED25519(source.privateKey)
            );

            // Check source balance first
            const balanceQuery = new AccountBalanceQuery()
                .setAccountId(source.accountId);

            const balance = await balanceQuery.execute(client);
            console.log(`   💰 Current balance: ${balance.hbars.toString()}`);

            const balanceAmount = parseFloat(balance.hbars.toString().replace(' ℏ', ''));

            if (balanceAmount < AMOUNT_TO_SEND) {
                console.log(`   ⚠️  Insufficient balance (need ${AMOUNT_TO_SEND} HBAR), skipping...`);
                client.close();
                continue;
            }

            // Create transfer transaction
            const transaction = new TransferTransaction()
                .addHbarTransfer(source.accountId, new Hbar(-AMOUNT_TO_SEND))
                .addHbarTransfer(OPERATOR_ACCOUNT, new Hbar(AMOUNT_TO_SEND));

            // Execute transaction
            console.log(`   🔄 Sending ${AMOUNT_TO_SEND} HBAR to ${OPERATOR_ACCOUNT}...`);
            const txResponse = await transaction.execute(client);
            const receipt = await txResponse.getReceipt(client);

            console.log(`   ✅ Transfer complete!`);
            console.log(`   📝 Transaction ID: ${txResponse.transactionId.toString()}`);
            console.log(`   ✅ Status: ${receipt.status.toString()}`);

            // Check new balance
            const newBalanceQuery = new AccountBalanceQuery()
                .setAccountId(source.accountId);
            const newBalance = await newBalanceQuery.execute(client);
            console.log(`   💰 New balance: ${newBalance.hbars.toString()}`);

            client.close();

        } catch (error) {
            console.error(`   ❌ Error transferring from ${source.accountId}:`);
            console.error(`   ${error.message}`);
        }
    }

    console.log('\n' + '═'.repeat(60));

    // Check operator's final balance
    try {
        const operatorClient = Client.forTestnet();
        operatorClient.setOperator(
            AccountId.fromString(OPERATOR_ACCOUNT),
            PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY)
        );

        const operatorBalanceQuery = new AccountBalanceQuery()
            .setAccountId(OPERATOR_ACCOUNT);

        const operatorBalance = await operatorBalanceQuery.execute(operatorClient);
        console.log(`\n✅ Operator final balance: ${operatorBalance.hbars.toString()}`);

        operatorClient.close();
    } catch (error) {
        console.error('❌ Error checking operator balance:', error.message);
    }

    console.log('\n✅ Transfer process complete!\n');
}

transferHBAR();
