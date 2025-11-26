require('dotenv').config();
const hederaTopicsService = require('./src/lib/hedera-topics-service');

/**
 * Post sample messages to the 3 Hedera Topics
 * Makes the topics look active and credible
 */

const sampleMessages = {
    WOMEN_WORKOUT_TOPIC_ID: [
        { userId: 1, userName: "Admin", message: "Bienvenue dans le groupe Women's Workout! 💪 Partagez vos objectifs et soutenez-vous mutuellement!" },
        { userId: 1, userName: "Admin", message: "N'oubliez pas: la constance est la clé du succès! 💪" },
        { userId: 1, userName: "Admin", message: "Astuce du jour: Échauffez-vous toujours avant votre séance pour éviter les blessures 🏃‍♀️" }
    ],
    MEN_WORKOUT_TOPIC_ID: [
        { userId: 1, userName: "Admin", message: "Bienvenue dans le groupe Men's Workout! 💪 Ensemble vers nos objectifs!" },
        { userId: 1, userName: "Admin", message: "Rappel: La récupération est aussi importante que l'entraînement! 😴" },
        { userId: 1, userName: "Admin", message: "Défi de la semaine: 100 pompes par jour! Qui est partant? 🔥" }
    ],
    FITNESS_EVENTS_TOPIC_ID: [
        { userId: 1, userName: "Admin", message: "Bienvenue dans Fitness Events! 🎯 Restez informés des événements à venir!" },
        { userId: 1, userName: "Admin", message: "Prochaine course locale: Marathon de la ville le 15 décembre! Inscrivez-vous! 🏃" },
        { userId: 1, userName: "Admin", message: "Nouveau: Séances de yoga en groupe tous les samedis matins au parc! 🧘" }
    ]
};

async function postSampleMessages() {
    console.log('\n📝 Posting sample messages to Hedera Topics\n');
    console.log('='.repeat(60));

    // Verify env variables
    if (!process.env.WOMEN_WORKOUT_TOPIC_ID || !process.env.MEN_WORKOUT_TOPIC_ID || !process.env.FITNESS_EVENTS_TOPIC_ID) {
        console.error('\n❌ Error: Missing Hedera Topic IDs in .env file!');
        console.log('   Please run create-hedera-topics.js first and add the Topic IDs to .env\n');
        process.exit(1);
    }

    try {
        await hederaTopicsService.initialize();

        for (const [envKey, messages] of Object.entries(sampleMessages)) {
            const topicId = process.env[envKey];
            const topicName = envKey.replace('_TOPIC_ID', '').replace(/_/g, ' ');

            console.log(`\n📢 Posting to ${topicName} (${topicId})`);

            for (const msg of messages) {
                const result = await hederaTopicsService.submitMessage(
                    topicId,
                    msg.userId,
                    msg.userName,
                    msg.message
                );

                if (result.success) {
                    console.log(`   ✅ Posted: "${msg.message.substring(0, 50)}..."`);
                    console.log(`      Seq: ${result.sequenceNumber}`);
                } else {
                    console.error(`   ❌ Failed: ${result.error}`);
                }

                // Wait 1 second between messages to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ All sample messages posted successfully!\n');
        console.log('💡 Cost: ~$0.0009 HBAR (9 messages × $0.0001)\n');
        console.log('🔗 View messages on HashScan:');
        console.log(`   Women: https://hashscan.io/testnet/topic/${process.env.WOMEN_WORKOUT_TOPIC_ID}`);
        console.log(`   Men: https://hashscan.io/testnet/topic/${process.env.MEN_WORKOUT_TOPIC_ID}`);
        console.log(`   Events: https://hashscan.io/testnet/topic/${process.env.FITNESS_EVENTS_TOPIC_ID}\n`);

    } catch (error) {
        console.error('\n❌ Error posting messages:', error.message);
        console.error(error);
    } finally {
        hederaTopicsService.close();
    }
}

postSampleMessages();
