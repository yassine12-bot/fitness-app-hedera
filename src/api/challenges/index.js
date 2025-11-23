const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const authMiddleware = require('../../auth/middleware');
const fitnessContract = require('../../lib/fitness-contract');

/**
 * GET /api/challenges/active
 * All 15 challenges with contract status
 */
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const user = await db.get('SELECT hederaAccountId FROM users WHERE id = ?', [req.user.id]);
    
    if (!user.hederaAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Aucun wallet Hedera. Créez un wallet d\'abord.'
      });
    }

    // Get all challenges
    const challenges = await db.all(`
      SELECT * FROM challenges WHERE isActive = 1 ORDER BY id ASC
    `);

    // Enrich with contract data
    const enriched = [];
    for (const ch of challenges) {
      try {
        const progress = await fitnessContract.getChallengeProgress(user.hederaAccountId, ch.id);
        const completed = await fitnessContract.isChallengeCompleted(user.hederaAccountId, ch.id);

        enriched.push({
          ...ch,
          currentProgress: progress,
          progressPercent: Math.min(100, Math.floor((progress / ch.target) * 100)),
          isCompleted: completed
        });
      } catch (error) {
        // If contract query fails, use cache
        enriched.push({
          ...ch,
          currentProgress: 0,
          progressPercent: 0,
          isCompleted: false
        });
      }
    }

    // Group by type
    const daily = enriched.filter(c => c.type === 'daily_steps');
    const duration = enriched.filter(c => c.type === 'duration_steps');
    const social = enriched.filter(c => c.type === 'social');

    res.json({
      success: true,
      data: {
        daily,
        duration,
        social,
        all: enriched,
        totalCompleted: enriched.filter(c => c.isCompleted).length,
        totalChallenges: enriched.length
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur',
      error: error.message
    });
  }
});

/**
 * GET /api/challenges/my-progress
 */
router.get('/my-progress', authMiddleware, async (req, res) => {
  try {
    const user = await db.get('SELECT hederaAccountId FROM users WHERE id = ?', [req.user.id]);
    
    if (!user.hederaAccountId) {
      return res.json({ success: true, data: [] });
    }

    const challenges = await db.all(`
      SELECT * FROM challenges WHERE isActive = 1
    `);

    const progress = [];
    for (const ch of challenges) {
      try {
        const prog = await fitnessContract.getChallengeProgress(user.hederaAccountId, ch.id);
        const completed = await fitnessContract.isChallengeCompleted(user.hederaAccountId, ch.id);
        
        progress.push({
          progressId: ch.id,
          challengeId: ch.id,
          currentProgress: prog,
          challengeTitle: ch.title,
          type: ch.type,
          target: ch.target,
          progressPercent: Math.floor((prog / ch.target) * 100),
          isCompleted: completed
        });
      } catch (error) {
        // Skip on error
      }
    }

    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/challenges/history
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const history = await db.all(`
      SELECT * FROM challenge_completions
      WHERE userId = ?
      ORDER BY completedAt DESC
      LIMIT 50
    `, [req.user.id]);

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/challenges/my-stats
 */
router.get('/my-stats', authMiddleware, async (req, res) => {
  try {
    const completions = await db.all(`
      SELECT * FROM challenge_completions WHERE userId = ?
    `, [req.user.id]);

    const stats = {
      totalChallenges: 15,
      completedChallenges: completions.length,
      activeChallenges: 15 - completions.length,
      totalRewardsEarned: completions.reduce((sum, c) => sum + c.reward, 0)
    };

    const byType = {};
    for (const comp of completions) {
      const challenge = await db.get('SELECT type FROM challenges WHERE id = ?', [comp.challengeId]);
      if (challenge) {
        if (!byType[challenge.type]) {
          byType[challenge.type] = { count: 0, totalRewards: 0 };
        }
        byType[challenge.type].count++;
        byType[challenge.type].totalRewards += comp.reward;
      }
    }

    stats.byType = Object.entries(byType).map(([type, data]) => ({
      type,
      ...data
    }));

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/challenges/update-progress
 */
router.post('/update-progress', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      message: '✅ Contract auto-validates challenges'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/challenges/admin/reset
 */
router.post('/admin/reset', authMiddleware, async (req, res) => {
  try {
    const user = await db.get('SELECT isAdmin FROM users WHERE id = ?', [req.user.id]);
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    await db.run('DELETE FROM challenge_completions');
    
    res.json({ success: true, message: 'Cache reset (contract unchanged)' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;