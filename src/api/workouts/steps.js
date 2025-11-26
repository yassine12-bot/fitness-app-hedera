const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const authMiddleware = require('../../auth/middleware');
const fitnessContract = require('../../lib/fitness-contract');
const activityLogger = require('../../lib/activity-logger');

/**
 * POST /api/workouts/steps
 * NEW ROUTE: For Step Simulator frontend
 * Log steps to smart contract (matches frontend expectations)
 */
router.post('/steps', authMiddleware, async (req, res) => {
  try {
    const { steps, distance, calories } = req.body;

    if (!steps || steps <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Steps must be greater than 0'
      });
    }

    const user = await db.get('SELECT hederaAccountId FROM users WHERE id = ?', [req.user.id]);

    if (!user.hederaAccountId) {
      return res.status(400).json({
        success: false,
        message: 'No Hedera wallet found'
      });
    }

    // Log steps to smart contract
    const contractResult = await fitnessContract.updateSteps(user.hederaAccountId, steps);
    const txId = contractResult.transactionId;

    console.log(`✅ Steps logged to blockchain: ${steps} steps`);

    // Update local DB
    await db.run(
      'UPDATE users SET totalSteps = totalSteps + ? WHERE id = ?',
      [steps, req.user.id]
    );

    // Check all challenges for completion
    const challenges = await db.all('SELECT * FROM challenges WHERE isActive = 1');
    const completedChallenges = [];

    for (const challenge of challenges) {
      const isCompleted = await fitnessContract.isChallengeCompleted(
        user.hederaAccountId,
        challenge.id
      );

      if (isCompleted) {
        // ✅ RACE CONDITION FIX: Check AND insert in same operation
        try {
          // Try to insert immediately - UNIQUE constraint will prevent duplicates
          await db.run(`
            INSERT INTO challenge_completions (
              userId, challengeId, challengeTitle, challengeLevel, reward, hederaTxId, completedAt
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `, [req.user.id, challenge.id, challenge.name, challenge.level || 1, challenge.reward, txId]);

          // ✅ INSERT succeeded = First time logging this challenge
          console.log(`🆕 First time completing challenge ${challenge.id}, logging to topic...`);

          // NOW log to Hedera Topic (only if insert succeeded)
          const logResult = await activityLogger.logChallengeCompleted(
            user.hederaAccountId,
            challenge.id,
            challenge.name,
            challenge.reward,
            txId
          );

          if (logResult && logResult.success) {
            completedChallenges.push({
              id: challenge.id,
              name: challenge.name,
              reward: challenge.reward
            });
            console.log(`📝 Challenge ${challenge.id} "${challenge.name}" logged to registry topic`);
          } else {
            // Logging failed - remove from database so we can retry
            console.error(`❌ Failed to log to topic, removing from DB to retry later`);
            await db.run(
              'DELETE FROM challenge_completions WHERE userId = ? AND challengeId = ?',
              [req.user.id, challenge.id]
            );
          }

        } catch (dbError) {
          // UNIQUE constraint error = Another request already logged this
          if (dbError.code === 'SQLITE_CONSTRAINT') {
            console.log(`⏭️ Challenge ${challenge.id} already logged by concurrent request, skipping`);
            // This is OK - don't log to topic, don't add to response
          } else {
            // Unexpected database error
            console.error(`❌ Database error for challenge ${challenge.id}:`, dbError.message);
          }
        }
      }
    }

    // Get updated totals
    const updatedUser = await db.get(
      'SELECT totalSteps, fitBalance FROM users WHERE id = ?',
      [req.user.id]
    );

    // Return format expected by StepSimulator.jsx
    res.json({
      success: true,
      message: 'Steps logged successfully',
      data: {
        steps,
        distance: distance || 0,
        calories: calories || 0,
        totalSteps: updatedUser.totalSteps,
        fitBalance: updatedUser.fitBalance,
        completedChallenges,
        blockchain: {
          transactionId: txId,
          explorerUrl: `https://hashscan.io/testnet/transaction/${txId}`
        }
      }
    });

  } catch (error) {
    console.error('❌ Error logging steps:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/workouts/log-steps
 * EXISTING ROUTE: Keep for backward compatibility
 */
router.post('/log-steps', authMiddleware, async (req, res) => {
  try {
    const { steps } = req.body;

    if (!steps || steps <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Steps must be greater than 0'
      });
    }

    const user = await db.get('SELECT hederaAccountId FROM users WHERE id = ?', [req.user.id]);

    if (!user.hederaAccountId) {
      return res.status(400).json({
        success: false,
        message: 'No Hedera wallet found'
      });
    }

    // Log steps to smart contract
    const contractResult = await fitnessContract.updateSteps(user.hederaAccountId, steps);
    const txId = contractResult.transactionId;

    console.log(`✅ Steps logged to blockchain: ${steps} steps`);

    // Check all challenges for completion
    const challenges = await db.all('SELECT * FROM challenges WHERE isActive = 1');
    const completedChallenges = [];

    for (const challenge of challenges) {
      const isCompleted = await fitnessContract.isChallengeCompleted(
        user.hederaAccountId,
        challenge.id
      );

      if (isCompleted) {
        // ✅ RACE CONDITION FIX: Insert first, then log
        try {
          await db.run(`
            INSERT INTO challenge_completions (
              userId, challengeId, challengeTitle, challengeLevel, reward, hederaTxId, completedAt
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `, [req.user.id, challenge.id, challenge.name, challenge.level || 1, challenge.reward, txId]);

          console.log(`🆕 First time completing challenge ${challenge.id}, logging to topic...`);

          const logResult = await activityLogger.logChallengeCompleted(
            user.hederaAccountId,
            challenge.id,
            challenge.name,
            challenge.reward,
            txId
          );

          if (logResult && logResult.success) {
            completedChallenges.push({
              id: challenge.id,
              name: challenge.name,
              reward: challenge.reward
            });
            console.log(`📝 Challenge ${challenge.id} "${challenge.name}" logged to registry topic`);
          } else {
            console.error(`❌ Failed to log to topic, removing from DB to retry later`);
            await db.run(
              'DELETE FROM challenge_completions WHERE userId = ? AND challengeId = ?',
              [req.user.id, challenge.id]
            );
          }

        } catch (dbError) {
          if (dbError.code === 'SQLITE_CONSTRAINT') {
            console.log(`⏭️ Challenge ${challenge.id} already logged by concurrent request, skipping`);
          } else {
            console.error(`❌ Database error for challenge ${challenge.id}:`, dbError.message);
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Steps logged successfully',
      data: {
        steps,
        transactionId: txId,
        completedChallenges
      }
    });

  } catch (error) {
    console.error('❌ Error logging steps:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/workouts/manual-steps
 * EXISTING ROUTE: Keep for backward compatibility
 */
router.post('/manual-steps', authMiddleware, async (req, res) => {
  try {
    const { steps = 50 } = req.body;

    if (steps <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Steps must be greater than 0'
      });
    }

    const user = await db.get('SELECT hederaAccountId, totalSteps, fitBalance FROM users WHERE id = ?', [req.user.id]);

    if (!user.hederaAccountId) {
      return res.status(400).json({
        success: false,
        message: 'No Hedera wallet found'
      });
    }

    // Log steps to smart contract
    const contractResult = await fitnessContract.updateSteps(user.hederaAccountId, steps);
    const txId = contractResult.transactionId;

    console.log(`✅ Manual steps logged to blockchain: ${steps} steps`);

    // Update local DB
    await db.run(
      'UPDATE users SET totalSteps = totalSteps + ? WHERE id = ?',
      [steps, req.user.id]
    );

    // Check challenges for completion
    const challenges = await db.all('SELECT * FROM challenges WHERE isActive = 1');
    const completedChallenges = [];

    for (const challenge of challenges) {
      const isCompleted = await fitnessContract.isChallengeCompleted(
        user.hederaAccountId,
        challenge.id
      );

      if (isCompleted) {
        // ✅ RACE CONDITION FIX: Insert first, then log
        try {
          await db.run(`
            INSERT INTO challenge_completions (
              userId, challengeId, challengeTitle, challengeLevel, reward, hederaTxId, completedAt
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `, [req.user.id, challenge.id, challenge.name, challenge.level || 1, challenge.reward, txId]);

          console.log(`🆕 First time completing challenge ${challenge.id}, logging to topic...`);

          const logResult = await activityLogger.logChallengeCompleted(
            user.hederaAccountId,
            challenge.id,
            challenge.name,
            challenge.reward,
            txId
          );

          if (logResult && logResult.success) {
            completedChallenges.push({
              id: challenge.id,
              name: challenge.name,
              reward: challenge.reward
            });
            console.log(`📝 Challenge ${challenge.id} "${challenge.name}" logged to registry topic`);
          } else {
            console.error(`❌ Failed to log to topic, removing from DB to retry later`);
            await db.run(
              'DELETE FROM challenge_completions WHERE userId = ? AND challengeId = ?',
              [req.user.id, challenge.id]
            );
          }

        } catch (dbError) {
          if (dbError.code === 'SQLITE_CONSTRAINT') {
            console.log(`⏭️ Challenge ${challenge.id} already logged by concurrent request, skipping`);
          } else {
            console.error(`❌ Database error for challenge ${challenge.id}:`, dbError.message);
          }
        }
      }
    }

    // Get updated totals
    const updatedUser = await db.get(
      'SELECT totalSteps, fitBalance FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      message: `+${steps} pas ajoutés! 👟`,
      data: {
        stepsAdded: steps,
        totalSteps: updatedUser.totalSteps,
        fitBalance: updatedUser.fitBalance,
        completedChallenges
      }
    });

  } catch (error) {
    console.error('❌ Error adding manual steps:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;