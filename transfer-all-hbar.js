require('dotenv').config();
const { Client, AccountId, PrivateKey, Hbar, TransferTransaction, AccountBalanceQuery } = require('@hashgraph/sdk');

// Source accounts with HBAR
const SOURCES = [
    {
        accountId: '0.0.5394636',
        privateKey: '302e020100300506032b65700422042069a3f70a82c49c82354e0e747367f4de0ae32d4bbd09ae0db166128d9e7a2ed1'
    },
    {
        accountId: '0.0.5425861', // The second account you gave
        privateKey: '302e020100300506032b65700422042084e3f7dfbeeb835cee916e87d691441ba068aa8b91876d85649ed5a9028da317'
    }
];

// Destination (operator account from .env)
const OPERATOR_ACCOUNT = process.env.HEDERA_ACCOUNT_ID;
const RESERVE_AMOUNT = 1; // Keep 1 HBAR for transaction fees

async function transferAllHBAR() {
    console.log('\n💰 Transferring ALL HBAR to Operator Account\n');
    console.log(`📍 Operator: ${OPERATOR_ACCOUNT}`);
    console.log(`🔒 Reserve per account: ${RESERVE_AMOUNT} HBAR (for fees)\n`);
    console.log('═'.repeat(60));

    let totalTransferred = 0;

    for (const source of SOURCES) {
        try {
            // Skip if source is the same as operator
            if (source.accountId === OPERATOR_ACCOUNT) {
                console.log(`\n⏭️  Skipping ${source.accountId} (same as operator)`);
                continue;
            }

            console.log(`\n📤 From: ${source.accountId}`);

            // Create client with source account
            const client = Client.forTestnet();
            client.setOperator(
                AccountId.fromString(source.accountId),
                PrivateKey.fromStringED25519(source.privateKey)
            );

            // Check source balance
            const balanceQuery = new AccountBalanceQuery()
                .setAccountId(source.accountId);

            const balance = await balanceQuery.execute(client);
            const currentBalance = parseFloat(balance.hbars.toString().replace(' ℏ', ''));

            console.log(`   💰 Current balance: ${balance.hbars.toString()}`);

            // Calculate amount to transfer (all minus reserve)
            const amountToTransfer = currentBalance - RESERVE_AMOUNT;

            if (amountToTransfer <= 0) {
                console.log(`   ⚠️  Balance too low (need to keep ${RESERVE_AMOUNT} HBAR), skipping...`);
                client.close();
                continue;
            }

            // Create transfer transaction
            const transaction = new TransferTransaction()
                .addHbarTransfer(source.accountId, new Hbar(-amountToTransfer))
                .addHbarTransfer(OPERATOR_ACCOUNT, new Hbar(amountToTransfer));

            // Execute transaction
            console.log(`   🔄 Transferring ${amountToTransfer.toFixed(2)} HBAR to ${OPERATOR_ACCOUNT}...`);
            const txResponse = await transaction.execute(client);
            const receipt = await txResponse.getReceipt(client);

            console.log(`   ✅ Transfer complete!`);
            console.log(`   📝 Transaction ID: ${txResponse.transactionId.toString()}`);
            console.log(`   ✅ Status: ${receipt.status.toString()}`);

            totalTransferred += amountToTransfer;

            // Check new balance
            const newBalanceQuery = new AccountBalanceQuery()
                .setAccountId(source.accountId);
            const newBalance = await newBalanceQuery.execute(client);
            console.log(`   💰 Remaining balance: ${newBalance.hbars.toString()}`);

            client.close();

        } catch (error) {
            console.error(`   ❌ Error transferring from ${source.accountId}:`);
            console.error(`   ${error.message}`);
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`\n💵 Total transferred: ${totalTransferred.toFixed(2)} HBAR`);

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

transferAllHBAR();
