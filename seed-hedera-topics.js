require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

const ADMIN_ID = 1;

const topics = [
    {
        name: "💪 Women's Workout",
        description: "Espace dédié aux femmes pour partager conseils, motivation et programmes fitness",
        hederaTopicId: process.env.WOMEN_WORKOUT_TOPIC_ID
    },
    {
        name: "🏋️ Men's Workout",
        description: "Espace dédié aux hommes pour partager programmes, résultats et conseils fitness",
        hederaTopicId: process.env.MEN_WORKOUT_TOPIC_ID
    },
    {
        name: "📅 Fitness Events",
        description: "Annonces et discussions sur les événements fitness, courses et compétitions locales",
        hederaTopicId: process.env.FITNESS_EVENTS_TOPIC_ID
    }
];

async function seedTopics() {
    console.log('\n📝 Seeding Hedera Topics in Database\n');
    console.log('='.repeat(60));

    // Verify env variables
    if (!process.env.WOMEN_WORKOUT_TOPIC_ID || !process.env.MEN_WORKOUT_TOPIC_ID || !process.env.FITNESS_EVENTS_TOPIC_ID) {
        console.error('\n❌ Error: Missing Hedera Topic IDs in .env file!');
        console.log('   Please run create-hedera-topics.js first and add the Topic IDs to .env\n');
        process.exit(1);
    }

    try {
        // Clear existing topics
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM topics', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✅ Cleared existing topics\n');

        for (const topic of topics) {
            // Create topic
            const topicId = await new Promise((resolve, reject) => {
                db.run(`
          INSERT INTO topics (name, description, isPrivate, creatorId, hederaTopicId, createdAt)
          VALUES (?, ?, 0, ?, ?, datetime('now'))
        `, [topic.name, topic.description, ADMIN_ID, topic.hederaTopicId], function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });

            console.log(`✅ Created topic: ${topic.name}`);
            console.log(`   DB ID: ${topicId}`);
            console.log(`   Hedera Topic ID: ${topic.hederaTopicId}`);

            // Auto-join admin
            await new Promise((resolve, reject) => {
                db.run(`
          INSERT INTO topic_members (topicId, userId, role, joinedAt)
          VALUES (?, ?, 'admin', datetime('now'))
        `, [topicId, ADMIN_ID], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Auto-join all existing users
            const users = await new Promise((resolve, reject) => {
                db.all('SELECT id FROM users WHERE id != ?', [ADMIN_ID], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            for (const user of users) {
                await new Promise((resolve, reject) => {
                    db.run(`
            INSERT OR IGNORE INTO topic_members (topicId, userId, joinedAt)
            VALUES (?, ?, datetime('now'))
          `, [topicId, user.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            console.log(`   👥 Auto-joined ${users.length + 1} users\n`);
        }

        console.log('='.repeat(60));
        console.log('✅ All topics seeded successfully!\n');
        console.log('📊 Summary:');
        console.log(`   - ${topics.length} topics created`);
        console.log(`   - All users auto-subscribed`);
        console.log(`   - Hedera Topic IDs linked\n`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        db.close();
    }
}

seedTopics();
