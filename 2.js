require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function createUserChallengesTable() {
  console.log('🔧 Creating user_challenges table...');

  const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'data.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Cannot open database:', err.message);
        reject(err);
        return;
      }

      console.log('✅ Connected to database');

      db.run(`
        CREATE TABLE IF NOT EXISTS user_challenges (
          user_id TEXT NOT NULL,
          challenge_id INTEGER NOT NULL,
          progress INTEGER DEFAULT 0,
          completed BOOLEAN DEFAULT 0,
          completed_at DATETIME,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, challenge_id),
          FOREIGN KEY (challenge_id) REFERENCES challenges(id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating table:', err.message);
          db.close();
          reject(err);
          return;
        }

        console.log('✅ Table user_challenges created');

        // Also create challenge_completions table
        db.run(`
          CREATE TABLE IF NOT EXISTS challenge_completions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            challengeId INTEGER NOT NULL,
            challengeTitle TEXT,
            challengeLevel INTEGER,
            reward INTEGER,
            hederaTxId TEXT,
            completedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id),
            FOREIGN KEY (challengeId) REFERENCES challenges(id)
          )
        `, (err) => {
          if (err) {
            console.error('❌ Error creating challenge_completions:', err.message);
          } else {
            console.log('✅ Table challenge_completions created');
          }

          // Create workouts table
          db.run(`
            CREATE TABLE IF NOT EXISTS workouts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              userId INTEGER NOT NULL,
              steps INTEGER NOT NULL,
              workoutDate DATETIME DEFAULT CURRENT_TIMESTAMP,
              hederaTxId TEXT,
              FOREIGN KEY (userId) REFERENCES users(id)
            )
          `, (err) => {
            if (err) {
              console.error('❌ Error creating workouts:', err.message);
            } else {
              console.log('✅ Table workouts created');
            }

            db.close();
            resolve();
          });
        });
      });
    });
  });
}

createUserChallengesTable().catch(console.error);