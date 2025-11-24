/**
 * Script to Mint FIT Tokens to Users
 * 
 * Purpose: Add FIT tokens to user wallets so they can purchase products
 * Use Case: When users complete workouts, challenges, or need tokens for testing
 */

require('dotenv').config();
const { Client, AccountId, PrivateKey, TokenId, TransferTransaction } = require('@hashgraph/sdk');
const db = require('./src/lib/db');

async function mintFITToUsers() {
    console.log('💰 Minting FIT Tokens to Users...\n');

    // Initialize Hedera client with operator (treasury) account
    const client = Client.forTestnet();
    client.setOperator(
        AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
        PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY)
    );

    const fitTokenId = TokenId.fromString(process.env.FIT_TOKEN_ID);

    try {
        // Initialize database
        await db.initialize();

        // Get all users with Hedera wallets
        const users = await db.all(`
      SELECT id, name, email, hederaAccountId, fitBalance 
      FROM users 
      WHERE hederaAccountId IS NOT NULL
    `);

        if (users.length === 0) {
            console.log('❌ No users with Hedera wallets found');
            return;
        }

        console.log(`Found ${users.length} users with wallets:\n`);

        // Ask for amount to mint
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const amount = await new Promise(resolve => {
            readline.question('How many FIT tokens to give each user? (default: 100): ', answer => {
                readline.close();
                resolve(parseInt(answer) || 100);
            });
        });

        console.log(`\n🪙 Minting ${amount} FIT to each user...\n`);

        // Transfer FIT tokens to each user
        for (const user of users) {
            try {
                console.log(`  → ${user.name} (${user.email})`);
                console.log(`     Current balance: ${user.fitBalance} FIT`);
                console.log(`     Hedera Account: ${user.hederaAccountId}`);

                // Transfer FIT tokens from treasury to user
                const transferTx = await new TransferTransaction()
                    .addTokenTransfer(fitTokenId, process.env.HEDERA_ACCOUNT_ID, -amount)
                    .addTokenTransfer(fitTokenId, user.hederaAccountId, amount)
                    .execute(client);

                const receipt = await transferTx.getReceipt(client);

                // Update database
                await db.run(`
          UPDATE users 
          SET fitBalance = fitBalance + ? 
          WHERE id = ?
        `, [amount, user.id]);

                console.log(`     ✅ Sent ${amount} FIT`);
                console.log(`     New balance: ${user.fitBalance + amount} FIT`);
                console.log(`     TX: ${transferTx.transactionId.toString()}\n`);

            } catch (error) {
                console.log(`     ❌ Failed: ${error.message}\n`);
            }
        }

        console.log('✅ Done minting FIT tokens!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.close();
    }
}

mintFITToUsers();
