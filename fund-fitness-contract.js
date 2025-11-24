/**
 * Script to Fund the FitnessContract
 * 
 * Purpose: Transfer FIT tokens to the FitnessContract so it can pay rewards
 * Use Case: When users complete challenges, the contract needs FIT to pay them
 */

require('dotenv').config();
const { Client, AccountId, PrivateKey, TokenId, TransferTransaction, ContractId } = require('@hashgraph/sdk');

async function fundFitnessContract() {
    console.log('💰 Funding FitnessContract with FIT Tokens...\n');

    // Initialize Hedera client with operator (treasury) account
    const client = Client.forTestnet();
    client.setOperator(
        AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
        PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY)
    );

    const fitTokenId = TokenId.fromString(process.env.FIT_TOKEN_ID);
    const fitnessContractId = ContractId.fromString(process.env.FITNESS_CONTRACT_ADDRESS);

    try {
        // Ask for amount to fund
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const amount = await new Promise(resolve => {
            readline.question('How many FIT tokens to send to FitnessContract? (default: 1000): ', answer => {
                readline.close();
                resolve(parseInt(answer) || 1000);
            });
        });

        console.log(`\n🪙 Sending ${amount} FIT to FitnessContract...\n`);
        console.log(`   From: ${process.env.HEDERA_ACCOUNT_ID} (Treasury)`);
        console.log(`   To: ${process.env.FITNESS_CONTRACT_ADDRESS} (FitnessContract)\n`);

        // Transfer FIT tokens from treasury to contract
        const transferTx = await new TransferTransaction()
            .addTokenTransfer(fitTokenId, process.env.HEDERA_ACCOUNT_ID, -amount)
            .addTokenTransfer(fitTokenId, fitnessContractId, amount)
            .execute(client);

        const receipt = await transferTx.getReceipt(client);

        console.log(`✅ Successfully funded FitnessContract!`);
        console.log(`   Amount: ${amount} FIT`);
        console.log(`   Status: ${receipt.status.toString()}`);
        console.log(`   TX: ${transferTx.transactionId.toString()}`);
        console.log(`   Explorer: https://hashscan.io/testnet/transaction/${transferTx.transactionId.toString()}\n`);

        console.log('ℹ️  The FitnessContract can now pay rewards to users who complete challenges!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.close();
    }
}

fundFitnessContract();
