const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const authMiddleware = require('../../auth/middleware');
const fitnessContract = require('../../lib/fitness-contract');
const cacheSync = require('../../lib/cache-sync');

/**
 * POST /api/workouts/steps
 * Enregistrer manuellement des pas (avec smart contract)
 * 
 * MODIFIÉ: Appelle FitnessContract au lieu d'écrire directement dans SQLite
 * Cache sync automatique via cache-sync.js
 */
router.post('/steps', authMiddleware, async (req, res) => {
  try {
    const { steps, distance, calories } = req.body;

    if (!steps || steps <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de pas invalide'
      });
    }

    // ====================================================
    // NOUVEAU: Récupérer le compte Hedera de l'utilisateur
    // ====================================================
    const user = await db.get(
      'SELECT hederaAccountId FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user.hederaAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Aucun wallet Hedera associé. Créez un wallet d\'abord.'
      });
    }

    // ====================================================
    // NOUVEAU: Appeler le smart contract
    // ====================================================
    console.log(`📊 Calling FitnessContract.updateSteps(${user.hederaAccountId}, ${steps})`);
    
    const contractResult = await fitnessContract.updateSteps(
      user.hederaAccountId,
      steps
    );

    if (!contractResult.success) {
      throw new Error('Contract call failed');
    }

    console.log(`✅ Contract updated! TX: ${contractResult.transactionId}`);

    // ====================================================
    // NOUVEAU: Cache sync manuel (au lieu d'attendre listener)
    // ====================================================
    await cacheSync.onWorkoutLogged(
      req.user.id,
      user.hederaAccountId,
      steps,
      contractResult.transactionId
    );

    // ====================================================
    // Réponse (format identique pour compatibilité frontend)
    // ====================================================
    res.status(201).json({
      success: true,
      message: 'Activité enregistrée on-chain! 🎉',
      data: {
        steps,
        distance: distance || 0,
        calories: calories || 0,
        blockchain: {
          transactionId: contractResult.transactionId,
          explorerUrl: `https://hashscan.io/testnet/transaction/${contractResult.transactionId}`
        }
      }
    });

  } catch (error) {
    console.error('❌ Error recording workout:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement',
      error: error.message
    });
  }
});

/**
 * GET /api/workouts/history
 * Historique des workouts
 * 
 * INCHANGÉ: Lit depuis cache SQLite
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { limit = 30, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const workouts = await db.all(`
      SELECT * FROM workouts
      WHERE userId = ?
      ORDER BY workoutDate DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, parseInt(limit), parseInt(offset)]);

    // Stats totales
    const stats = await db.get(`
      SELECT 
        SUM(steps) as totalSteps,
        SUM(distance) as totalDistance,
        SUM(calories) as totalCalories,
        COUNT(*) as totalWorkouts
      FROM workouts
      WHERE userId = ?
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        workouts,
        stats
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message
    });
  }
});

/**
 * GET /api/workouts/today
 * Statistiques du jour
 * 
 * INCHANGÉ: Lit depuis cache SQLite
 */
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const todayStats = await db.get(`
      SELECT 
        SUM(steps) as steps,
        SUM(distance) as distance,
        SUM(calories) as calories
      FROM workouts
      WHERE userId = ?
      AND DATE(workoutDate) = ?
    `, [req.user.id, today]);

    res.json({
      success: true,
      data: todayStats || { steps: 0, distance: 0, calories: 0 }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur',
      error: error.message
    });
  }
});

module.exports = router;