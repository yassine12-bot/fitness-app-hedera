require('dotenv').config();
const {
    Client,
    TopicCreateTransaction,
    PrivateKey,
    AccountId
} = require('@hashgraph/sdk');

/**
 * Create 3 Hedera HCS Topics for community groups
 * Output: Topic IDs to add to .env file
 */

async function createHederaTopics() {
    console.log('\n🚀 Creating Hedera HCS Topics\n');
    console.log('='.repeat(60));

    const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    const topics = [
        {
            name: "💪 Women's Workout",
            memo: "Community topic for women's fitness discussions"
        },
        {
            name: "🏋️ Men's Workout",
            memo: "Community topic for men's fitness discussions"
        },
        {
            name: "📅 Fitness Events",
            memo: "Community topic for fitness events and competitions"
        }
    ];

    const createdTopics = [];

    try {
        for (const topic of topics) {
            console.log(`\n📝 Creating topic: ${topic.name}`);
            console.log(`   Memo: ${topic.memo}`);

            // Create Hedera HCS Topic
            const transaction = await new TopicCreateTransaction()
                .setTopicMemo(topic.memo)
                .setAdminKey(operatorKey.publicKey)
                .setSubmitKey(operatorKey.publicKey)
                .execute(client);

            const receipt = await transaction.getReceipt(client);
            const topicId = receipt.topicId.toString();

            console.log(`   ✅ Topic created: ${topicId}`);
            console.log(`   🔗 Explorer: https://hashscan.io/testnet/topic/${topicId}`);

            createdTopics.push({
                name: topic.name,
                topicId: topicId,
                envKey: topic.name.includes('Women') ? 'WOMEN_WORKOUT_TOPIC_ID'
                    : topic.name.includes('Men') ? 'MEN_WORKOUT_TOPIC_ID'
                        : 'FITNESS_EVENTS_TOPIC_ID'
            });
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ All topics created successfully!\n');
        console.log('📋 Add these to your .env file:\n');

        for (const topic of createdTopics) {
            console.log(`${topic.envKey}=${topic.topicId}`);
        }

        console.log('\n💡 Next steps:');
        console.log('   1. Copy the above lines to your .env file');
        console.log('   2. Run: sqlite3 data.db < migrations/add-hedera-topic-id.sql');
        console.log('   3. Run: node seed-hedera-topics.js');
        console.log('   4. Restart your backend\n');

    } catch (error) {
        console.error('\n❌ Error creating topics:', error.message);
        console.error(error);
    } finally {
        client.close();
    }
}

createHederaTopics();
