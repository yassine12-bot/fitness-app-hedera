const express = require('express');
const router = express.Router();
const authMiddleware = require('../auth/middleware');
const fitnessContract = require('../lib/fitness-contract');
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const challengeCount = await fitnessContract.getChallengeCount();
    const challenges = [];
    
    for (let i = 1; i <= challengeCount; i++) {
      const challenge = await fitnessContract.getChallenge(i);
      if (challenge.isActive) {
        let progress = 0, isCompleted = false;
        if (req.user.hederaAccountId) {
          try {
            progress = await fitnessContract.getChallengeProgress(req.user.hederaAccountId, i);
            isCompleted = await fitnessContract.isChallengeCompleted(req.user.hederaAccountId, i);
          } catch (err) { console.error(`Progress error ${i}:`, err.message); }
        }
        challenges.push({
          id: challenge.id,
          title: challenge.title,
          type: challenge.challengeType,
          target: challenge.target,
          reward: challenge.reward,
          level: challenge.level,
          progress, isCompleted,
          percentage: Math.min(100, Math.floor((progress / challenge.target) * 100))
        });
      }
    }
    
    res.json({ 
      success: true, 
      data: {
        daily: challenges.filter(c => c.type === 'daily'),
        duration: challenges.filter(c => c.type === 'duration'),
        social: challenges.filter(c => c.type === 'social')
      }
    });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.post('/update-progress', authMiddleware, async (req, res) => {
  try {
    const { steps } = req.body;
    if (!steps || steps <= 0) return res.status(400).json({ success: false, message: 'Invalid steps' });
    if (!req.user.hederaAccountId) return res.status(400).json({ success: false, message: 'Create wallet first' });
    
    await fitnessContract.updateSteps(req.user.hederaAccountId, steps);
    res.json({ success: true, message: `${steps} steps added` });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get('/my-progress', authMiddleware, async (req, res) => {
  try {
    if (!req.user.hederaAccountId) return res.json({ success: true, data: { challenges: [] } });
    
    const challengeCount = await fitnessContract.getChallengeCount();
    const challenges = [];
    
    for (let i = 1; i <= challengeCount; i++) {
      try {
        const c = await fitnessContract.getChallenge(i);
        if (c.isActive) {
          const p = await fitnessContract.getChallengeProgress(req.user.hederaAccountId, i);
          const done = await fitnessContract.isChallengeCompleted(req.user.hederaAccountId, i);
          challenges.push({
            challengeId: c.id, title: c.title, type: c.challengeType,
            progress: p, target: c.target, reward: c.reward, isCompleted: done,
            percentage: Math.min(100, Math.floor((p / c.target) * 100))
          });
        }
      } catch (err) { console.error(`Challenge ${i}:`, err.message); }
    }
    res.json({ success: true, data: { challenges } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get('/my-stats', authMiddleware, async (req, res) => {
  try {
    if (!req.user.hederaAccountId) {
      return res.json({ success: true, data: { totalSteps: 0, completedChallenges: 0, activeChallenges: 0, totalChallenges: 0, totalRewards: 0, level: 1 } });
    }
    
    const count = await fitnessContract.getChallengeCount();
    const steps = await fitnessContract.getTotalSteps(req.user.hederaAccountId);
    let completed = 0, active = 0, rewards = 0;
    
    for (let i = 1; i <= count; i++) {
      try {
        const c = await fitnessContract.getChallenge(i);
        if (c.isActive) {
          active++;
          const done = await fitnessContract.isChallengeCompleted(req.user.hederaAccountId, i);
          if (done) { completed++; rewards += c.reward; }
        }
      } catch (err) { console.error(`Stats ${i}:`, err.message); }
    }
    
    res.json({ success: true, data: { totalSteps: steps, completedChallenges: completed, activeChallenges: active, totalChallenges: count, totalRewards: rewards, level: Math.floor(completed / 3) + 1 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const c = await fitnessContract.getChallenge(id);
    let p = 0, done = false;
    
    if (req.user.hederaAccountId) {
      try {
        p = await fitnessContract.getChallengeProgress(req.user.hederaAccountId, id);
        done = await fitnessContract.isChallengeCompleted(req.user.hederaAccountId, id);
      } catch (err) { console.error(`Challenge ${id}:`, err.message); }
    }
    
    res.json({ success: true, data: { id: c.id, title: c.title, type: c.challengeType, target: c.target, reward: c.reward, level: c.level, isActive: c.isActive, progress: p, isCompleted: done, percentage: Math.min(100, Math.floor((p / c.target) * 100)) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;