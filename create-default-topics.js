require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../data.db');
const db = new sqlite3.Database(dbPath);

const ADMIN_ID = 1; // Operator/Admin user ID

const topics = [
    {
        name: "💪 Women's Workout",
        description: "Espace dédié aux femmes pour partager conseils, motivation et programmes fitness",
        messages: [
            "Bienvenue dans le groupe Women's Workout! 🎉 Partagez vos objectifs et soutenez-vous mutuellement!",
            "N'oubliez pas: la constance est la clé du succès! 💪",
            "Astuce du jour: Échauffez-vous toujours avant votre séance pour éviter les blessures 🏃‍♀️"
        ]
    },
    {
        name: "🏋️ Men's Workout",
        description: "Espace dédié aux hommes pour partager programmes, résultats et conseils fitness",
        messages: [
            "Bienvenue dans le groupe Men's Workout! 💪 Ensemble vers nos objectifs!",
            "Rappel: La récupération est aussi importante que l'entraînement! 😴",
            "Défi de la semaine: 100 pompes par jour! Qui est partant? 🔥"
        ]
    },
    {
        name: "📅 Fitness Events",
        description: "Annonces et discussions sur les événements fitness, courses et compétitions locales",
        messages: [
            "Bienvenue dans Fitness Events! 🎯 Restez informés des événements à venir!",
            "Prochaine course locale: Marathon de la ville le 15 décembre! Inscrivez-vous! 🏃",
            "Nouveau: Séances de yoga en groupe tous les samedis matins au parc! 🧘"
        ]
    }
];

async function createTopicsWithMessages() {
    console.log('\n📝 Creating default topics with sample messages...\n');
    console.log('═'.repeat(60));

    try {
        for (const topic of topics) {
            // 1. Create topic
            const topicId = await new Promise((resolve, reject) => {
                db.run(`
          INSERT INTO topics (name, description, isPrivate, creatorId, createdAt)
          VALUES (?, ?, 0, ?, datetime('now'))
        `, [topic.name, topic.description, ADMIN_ID], function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });

            console.log(`\n✅ Created topic: ${topic.name} (ID: ${topicId})`);

            // 2. Auto-join admin to topic
            await new Promise((resolve, reject) => {
                db.run(`
          INSERT INTO topic_members (topicId, userId, joinedAt)
          VALUES (?, ?, datetime('now'))
        `, [topicId, ADMIN_ID], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log(`   👤 Admin joined topic`);

            // 3. Add sample messages
            for (const message of topic.messages) {
                await new Promise((resolve, reject) => {
                    db.run(`
            INSERT INTO topic_messages (topicId, userId, message, messageType, createdAt)
            VALUES (?, ?, ?, 'text', datetime('now'))
          `, [topicId, ADMIN_ID, message], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                console.log(`   💬 Added message: "${message.substring(0, 50)}..."`);
            }

            // 4. Auto-join all existing users to this topic
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

            console.log(`   👥 Auto-joined ${users.length} existing users`);
        }

        console.log('\n' + '═'.repeat(60));
        console.log('✅ All topics created successfully!\n');
        console.log('📊 Summary:');
        console.log(`   - ${topics.length} topics created`);
        console.log(`   - ${topics.reduce((sum, t) => sum + t.messages.length, 0)} sample messages added`);
        console.log(`   - All existing users auto-joined\n`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        db.close();
    }
}

createTopicsWithMessages();
