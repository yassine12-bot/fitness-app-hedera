require('dotenv').config();
const db = require('./db');
const activityLogger = require('./activity-logger');
const fitnessContract = require('./fitness-contract');
const marketplaceContract = require('./marketplace-contract');

class CacheSyncService {
  constructor() {
    this.running = false;
  }

  async start() {
    if (this.running) {
      console.log('⚠️ Cache sync already running');
      return;
    }

    console.log('🔄 Starting Cache Sync Service...');

    await fitnessContract.initialize();
    await marketplaceContract.initialize();

    if (!activityLogger.initialized) {
      await activityLogger.initialize();
    }

    // Only startup sync - NO periodic
    

    this.running = true;
    console.log('✅ Cache Sync Service started (startup-only mode)');
  }

  async initialSync() {
    console.log('🔄 Performing initial cache sync...');

    try {
      const users = await db.all('SELECT id, hederaAccountId FROM users WHERE hederaAccountId IS NOT NULL');
      
      console.log(`   Syncing ${users.length} users...`);
      
      for (const user of users) {
        try {
          await this.syncUser(user);
        } catch (error) {
          console.error(`   ✗ Error syncing user ${user.id}:`, error.message);
        }
      }

      console.log('✅ Initial sync complete');
    } catch (error) {
      console.error('❌ Initial sync failed:', error.message);
    }
  }

  async syncUser(user) {
    const contractSteps = await fitnessContract.getTotalSteps(user.hederaAccountId);
    
    await db.run(
      'UPDATE users SET totalSteps = ? WHERE id = ?',
      [contractSteps, user.id]
    );
    
    await this.syncUserChallenges(user);
    
    console.log(`   ✓ User ${user.id}: ${contractSteps} steps`);
  }

  async syncUserChallenges(user) {
    const challenges = await db.all(`
      SELECT id, reward FROM challenges WHERE isActive = 1
    `);

    for (const challenge of challenges) {
      try {
        const isComplete = await fitnessContract.isChallengeCompleted(user.hederaAccountId, challenge.id);
        
        const alreadyRecorded = await db.get(`
          SELECT id FROM challenge_completions 
          WHERE userId = ? AND challengeId = ?
        `, [user.id, challenge.id]);

        if (isComplete && !alreadyRecorded) {
          await this.markChallengeCompleted(user, challenge);
        }
      } catch (error) {
        // Skip on error
      }
    }
  }

  async markChallengeCompleted(user, challenge) {
    console.log(`🎯 Syncing challenge ${challenge.id} completion for user ${user.id}`);

    await db.run(
      'UPDATE users SET fitBalance = fitBalance + ? WHERE id = ?',
      [challenge.reward, user.id]
    );

    const challengeDetails = await db.get('SELECT * FROM challenges WHERE id = ?', [challenge.id]);

    await db.run(`
      INSERT INTO challenge_completions 
      (userId, challengeId, challengeTitle, challengeLevel, reward, hederaTxId, completedAt)
      VALUES (?, ?, ?, ?, ?, 'sync', CURRENT_TIMESTAMP)
    `, [user.id, challenge.id, challengeDetails.title, challengeDetails.level || 0, challenge.reward]);

    console.log(`✅ Challenge ${challenge.id} marked complete (+${challenge.reward} FIT)`);
  }

  async onWorkoutLogged(userId, hederaAccountId, steps, transactionId) {
    try {
      console.log(`📊 Syncing workout: User ${userId}, +${steps} steps`);

      const contractTotal = await fitnessContract.getTotalSteps(hederaAccountId);

      await db.run(
        'UPDATE users SET totalSteps = ? WHERE id = ?',
        [contractTotal, userId]
      );

      await db.run(`
        INSERT INTO workouts (userId, steps, workoutDate, createdAt)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [userId, steps]);

      await activityLogger.logSync(
        hederaAccountId,
        steps,
        0,
        transactionId
      );

      // Check for new challenge completions
      const user = { id: userId, hederaAccountId };
      await this.syncUserChallenges(user);

      console.log('✅ Workout synced to cache + Topic');

    } catch (error) {
      console.error('❌ Error syncing workout:', error.message);
    }
  }

  async onChallengeCompleted(userId, hederaAccountId, challengeId, reward, transactionId) {
    try {
      console.log(`🎯 Syncing challenge completion: User ${userId}, Challenge ${challengeId}`);

      await db.run(
        'UPDATE users SET fitBalance = fitBalance + ? WHERE id = ?',
        [reward, userId]
      );

      const challenge = await db.get('SELECT * FROM challenges WHERE id = ?', [challengeId]);

      await db.run(`
        INSERT INTO challenge_completions 
        (userId, challengeId, challengeTitle, challengeLevel, reward, hederaTxId, completedAt)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, challengeId, challenge.title, challenge.level || 0, reward, transactionId]);

      await activityLogger.logChallengeCompleted(
        hederaAccountId,
        challengeId,
        challenge.title,
        reward,
        transactionId
      );

      console.log('✅ Challenge completion synced to cache + Topic');

    } catch (error) {
      console.error('❌ Error syncing challenge completion:', error.message);
    }
  }

  async onNFTPurchased(userId, hederaAccountId, nftId, productId, price, transactionId) {
    try {
      console.log(`🛒 Syncing NFT purchase: User ${userId}, NFT ${nftId}`);

      const product = await db.get('SELECT * FROM products WHERE id = ?', [productId]);

      await db.run(`
        INSERT INTO purchases (userId, productId, quantity, totalCost, qrCode, createdAt)
        VALUES (?, ?, 1, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, productId, price, `NFT-${nftId}`]);

      await db.run(
        'UPDATE users SET fitBalance = fitBalance - ? WHERE id = ?',
        [price, userId]
      );

      await db.run(
        'UPDATE products SET stock = stock - 1 WHERE id = ?',
        [productId]
      );

      await activityLogger.logPurchase(
        hederaAccountId,
        productId,
        product.name,
        price,
        transactionId
      );

      console.log('✅ NFT purchase synced to cache + Topic');

    } catch (error) {
      console.error('❌ Error syncing NFT purchase:', error.message);
    }
  }

  async onNFTUsed(nftId, transactionId) {
    try {
      console.log(`✅ Syncing NFT used: NFT ${nftId}`);

      await db.run(`
        UPDATE purchases
        SET isUsed = 1, usedAt = CURRENT_TIMESTAMP
        WHERE qrCode = ?
      `, [`NFT-${nftId}`]);

      console.log('✅ NFT used status synced to cache');

    } catch (error) {
      console.error('❌ Error syncing NFT used:', error.message);
    }
  }

  stop() {
    this.running = false;
    console.log('⏹️ Cache Sync Service stopped');
  }
}

const cacheSyncService = new CacheSyncService();
module.exports = cacheSyncService;