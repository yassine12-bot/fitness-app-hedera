const express = require('express');
const router = express.Router();
const fitnessContract = require('../../lib/fitness-contract');
const cacheSync = require('../../lib/cache-sync');
const authMiddleware = require('../../auth/middleware');
const db = require('../../lib/db');

/**
 * POST /api/social/post - Log a social post
 */
router.post('/post', authMiddleware, async (req, res) => {
  try {
    const { content, image } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Content required'
      });
    }

    // Get user's Hedera account
    const user = await db.get(
      'SELECT id, hederaAccountId, totalPosts FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user.hederaAccountId) {
      return res.status(400).json({
        success: false,
        message: 'No Hedera wallet'
      });
    }

    // Get user's current level
    const userLevel = await fitnessContract.getUserLevel(user.hederaAccountId);

    // Find the social challenge for this level
    const socialChallengeId = 10 + userLevel; // Challenge IDs: 11, 12, 13, 14, 15

    // Check if already completed
    const completed = await fitnessContract.isChallengeCompleted(
      user.hederaAccountId,
      socialChallengeId
    );

    if (completed) {
      return res.status(400).json({
        success: false,
        message: 'Social challenge already completed for this level'
      });
    }

    // Increment user's post count
    const newPostCount = (user.totalPosts || 0) + 1;

    await db.run(
      'UPDATE users SET totalPosts = ? WHERE id = ?',
      [newPostCount, req.user.id]
    );

    // Get challenge target
    const challenge = await fitnessContract.getChallenge(socialChallengeId);

    // Check if challenge should complete
    if (newPostCount >= challenge.target) {
      // Complete the challenge on blockchain
      const result = await fitnessContract.completeSocialChallenge(
        user.hederaAccountId,
        socialChallengeId
      );

      // Sync cache
      if (cacheSync.onWorkoutLogged) {
        await cacheSync.onWorkoutLogged(
          req.user.id,
          user.hederaAccountId,
          0, // No steps for social
          result.transactionId
        );
      }

      return res.json({
        success: true,
        message: 'Social challenge completed! 🎉',
        data: {
          postCount: newPostCount,
          challengeCompleted: true,
          challengeId: socialChallengeId,
          reward: challenge.reward,
          blockchain: result
        }
      });
    }

    // Challenge not complete yet
    res.json({
      success: true,
      message: 'Post logged',
      data: {
        postCount: newPostCount,
        challengeCompleted: false,
        challengeId: socialChallengeId,
        progress: newPostCount,
        target: challenge.target
      }
    });

  } catch (error) {
    console.error('❌ Error logging social post:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging post',
      error: error.message
    });
  }
});

/**
 * GET /api/social/progress - Get social challenge progress
 */
router.get('/progress', authMiddleware, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, hederaAccountId, totalPosts FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user.hederaAccountId) {
      return res.status(400).json({
        success: false,
        message: 'No Hedera wallet'
      });
    }

    const userLevel = await fitnessContract.getUserLevel(user.hederaAccountId);
    const socialChallengeId = 10 + userLevel;
    const challenge = await fitnessContract.getChallenge(socialChallengeId);
    const completed = await fitnessContract.isChallengeCompleted(
      user.hederaAccountId,
      socialChallengeId
    );

    res.json({
      success: true,
      data: {
        userLevel,
        challengeId: socialChallengeId,
        postCount: user.totalPosts || 0,
        target: challenge.target,
        completed,
        reward: challenge.reward
      }
    });

  } catch (error) {
    console.error('❌ Error getting social progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting progress',
      error: error.message
    });
  }
});

module.exports = router;