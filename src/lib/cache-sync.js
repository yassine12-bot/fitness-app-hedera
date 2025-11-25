require('dotenv').config();
const fitnessContract = require('./fitness-contract');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Cache Sync Service - FIXED VERSION
 * 
 * Added missing onWorkoutLogged() method that is called by steps.js
 */

class CacheSyncService {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../../data.db');
  }

  async initDB() {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Database connection error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * ✅ ADDED: Called after workout is logged to blockchain
   * This method was MISSING - causing cache sync to fail!
   */
  async onWorkoutLogged(userId, hederaAccountId, steps, transactionId) {
    await this.initDB();
    await fitnessContract.initialize();

    console.log(`🔄 Cache sync after workout: ${steps} steps logged`);

    try {
      // 1. Get total steps from blockchain
      const totalSteps = await fitnessContract.getTotalSteps(hederaAccountId);
      console.log(`   Total steps on-chain: ${totalSteps}`);

      // 2. Update user's total steps in database
      await new Promise((resolve, reject) => {
        this.db.run(`
          UPDATE users 
          SET totalSteps = ?, updatedAt = CURRENT_TIMESTAMP
          WHERE hederaAccountId = ?
        `, [totalSteps, hederaAccountId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 3. Get challenge count from blockchain
      const challengeCount = await fitnessContract.getChallengeCount();

      // 4. Sync progress for all challenges
      const completedChallenges = [];
      
      for (let i = 1; i <= challengeCount; i++) {
        const progress = await fitnessContract.getChallengeProgress(hederaAccountId, i);
        const completed = await fitnessContract.isChallengeCompleted(hederaAccountId, i);

        // Update progress in cache
        await this.updateUserProgress(hederaAccountId, i, progress, completed);

        // If completed, check if it's newly completed
        if (completed) {
          const challenge = await new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM challenges WHERE id = ?', [i], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });

          if (challenge) {
            // Check if already recorded
            const existing = await new Promise((resolve, reject) => {
              this.db.get(
                'SELECT id FROM challenge_completions WHERE userId = ? AND challengeId = ?',
                [userId, i],
                (err, row) => {
                  if (err) reject(err);
                  else resolve(row);
                }
              );
            });

            if (!existing) {
              // Record new completion
              await new Promise((resolve, reject) => {
                this.db.run(`
                  INSERT INTO challenge_completions 
                  (userId, challengeId, challengeTitle, challengeLevel, reward, hederaTxId, completedAt)
                  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                `, [
                  userId, i, challenge.title, challenge.level, challenge.reward, transactionId
                ], (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              });

              // Update user's FIT balance
              await new Promise((resolve, reject) => {
                this.db.run(`
                  UPDATE users 
                  SET fitBalance = fitBalance + ?
                  WHERE id = ?
                `, [challenge.reward, userId], (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              });

              completedChallenges.push({
                id: i,
                title: challenge.title,
                reward: challenge.reward,
                level: challenge.level
              });

              console.log(`   🎉 Challenge ${i} completed: ${challenge.title} (+${challenge.reward} FIT)`);
            }
          }
        }
      }

      // 5. Record workout in workouts table
      await new Promise((resolve, reject) => {
        this.db.run(`
          INSERT INTO workouts (userId, steps, workoutDate, hederaTxId)
          VALUES (?, ?, datetime('now'), ?)
        `, [userId, steps, transactionId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log(`✅ Cache sync complete!`);
      if (completedChallenges.length > 0) {
        console.log(`   🏆 ${completedChallenges.length} challenge(s) newly completed!`);
      }

      return {
        success: true,
        totalSteps,
        completedChallenges
      };

    } catch (error) {
      console.error('❌ Error in onWorkoutLogged:', error);
      throw error;
    }
  }

  async syncAllChallenges() {
    await this.initDB();
    await fitnessContract.initialize();

    console.log('🔄 Syncing challenges from blockchain...');

    try {
      const count = await fitnessContract.getChallengeCount();
      console.log(`   Found ${count} challenges on blockchain`);

      for (let i = 1; i <= count; i++) {
        await this.syncChallenge(i);
      }

      console.log('✅ All challenges synced!');
      return { success: true, count };

    } catch (error) {
      console.error('❌ Error syncing challenges:', error);
      throw error;
    }
  }

  async syncChallenge(challengeId) {
    try {
      const blockchainData = await fitnessContract.getChallenge(challengeId);

      return new Promise((resolve, reject) => {
        this.db.run(`
          UPDATE challenges 
          SET 
            target = ?,
            reward = ?,
            level = ?,
            isActive = ?,
            updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          blockchainData.target,
          blockchainData.reward,
          blockchainData.level,
          blockchainData.isActive ? 1 : 0,
          challengeId
        ], (err) => {
          if (err) {
            console.error(`   ❌ Error syncing challenge ${challengeId}:`, err);
            reject(err);
          } else {
            console.log(`   ✓ Challenge ${challengeId}: target=${blockchainData.target}, reward=${blockchainData.reward}`);
            resolve();
          }
        });
      });

    } catch (error) {
      console.error(`   ❌ Error fetching challenge ${challengeId}:`, error);
      throw error;
    }
  }

  async syncUserProgress(userId) {
    await this.initDB();
    await fitnessContract.initialize();

    console.log(`🔄 Syncing progress for user ${userId}...`);

    try {
      const totalSteps = await fitnessContract.getTotalSteps(userId);
      const count = await fitnessContract.getChallengeCount();

      for (let i = 1; i <= count; i++) {
        const progress = await fitnessContract.getChallengeProgress(userId, i);
        const completed = await fitnessContract.isChallengeCompleted(userId, i);

        await this.updateUserProgress(userId, i, progress, completed);
      }

      console.log(`   ✓ Total steps: ${totalSteps}`);
      return { success: true, totalSteps };

    } catch (error) {
      console.error('❌ Error syncing user progress:', error);
      throw error;
    }
  }

  async updateUserProgress(userId, challengeId, progress, completed) {
    return new Promise((resolve, reject) => {
      this.db.run(`
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
      `, () => {
        this.db.run(`
          INSERT INTO user_challenges (user_id, challenge_id, progress, completed, completed_at, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id, challenge_id) DO UPDATE SET
            progress = excluded.progress,
            completed = excluded.completed,
            completed_at = CASE WHEN excluded.completed = 1 AND completed = 0 THEN CURRENT_TIMESTAMP ELSE completed_at END,
            updated_at = CURRENT_TIMESTAMP
        `, [
          userId,
          challengeId,
          progress,
          completed ? 1 : 0,
          completed ? new Date().toISOString() : null
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async getChallengesWithProgress(userId) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          c.id,
          c.title,
          c.type,
          c.target,
          c.reward,
          c.level,
          c.isActive,
          COALESCE(uc.progress, 0) as progress,
          COALESCE(uc.completed, 0) as completed,
          uc.completed_at
        FROM challenges c
        LEFT JOIN user_challenges uc ON c.id = uc.challenge_id AND uc.user_id = ?
        WHERE c.isActive = 1
        ORDER BY c.id
      `, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

const cacheSyncService = new CacheSyncService();
module.exports = cacheSyncService;