const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const authMiddleware = require('../../auth/middleware');
const hederaService = require('../../lib/hedera');
const activityLogger = require('../../lib/activity-logger');

// ====================================================
// UTILITAIRES
// ====================================================

/**
 * Obtenir le niveau actuel de l'utilisateur
 */
async function getUserLevel(userId) {
  let level = await db.get(
    'SELECT * FROM user_challenge_levels WHERE userId = ?',
    [userId]
  );
  
  if (!level) {
    // Créer le niveau pour l'utilisateur
    await db.run(
      'INSERT INTO user_challenge_levels (userId, currentLevel) VALUES (?, 1)',
      [userId]
    );
    level = { userId, currentLevel: 1, totalChallengesCompleted: 0, totalRewardsEarned: 0 };
  }
  
  return level;
}

/**
 * Assigner 3 challenges à un utilisateur pour son niveau actuel
 */
async function assignChallengesForLevel(userId, level) {
  // Récupérer 3 challenges du niveau (1 de chaque type)
  const dailyChallenge = await db.get(
    'SELECT * FROM challenges WHERE level = ? AND type = "daily_steps" AND isActive = 1 LIMIT 1',
    [level]
  );
  
  const durationChallenge = await db.get(
    'SELECT * FROM challenges WHERE level = ? AND type = "duration_steps" AND isActive = 1 LIMIT 1',
    [level]
  );
  
  const socialChallenge = await db.get(
    'SELECT * FROM challenges WHERE level = ? AND type = "social" AND isActive = 1 LIMIT 1',
    [level]
  );
  
  const challenges = [dailyChallenge, durationChallenge, socialChallenge].filter(Boolean);
  
  // Assigner chaque challenge à l'utilisateur
  for (const challenge of challenges) {
    const existing = await db.get(
      'SELECT id FROM challenge_progress WHERE userId = ? AND challengeId = ? AND isCompleted = 0',
      [userId, challenge.id]
    );
    
    if (!existing) {
      await db.run(`
        INSERT INTO challenge_progress (userId, challengeId, progress, startedAt)
        VALUES (?, ?, 0, datetime('now'))
      `, [userId, challenge.id]);
      
      console.log(`✅ Challenge "${challenge.title}" assigné à user ${userId}`);
    }
  }
  
  return challenges.length;
}

// ====================================================
// ROUTES
// ====================================================

/**
 * GET /api/challenges/active
 * Récupérer les challenges actifs de l'utilisateur
 */
router.get('/active', authMiddleware, async (req, res) => {
  try {
    // Obtenir le niveau de l'utilisateur
    const userLevel = await getUserLevel(req.user.id);
    
    // Vérifier si l'utilisateur a des challenges actifs
    const activeCount = await db.get(
      'SELECT COUNT(*) as count FROM challenge_progress WHERE userId = ? AND isCompleted = 0',
      [req.user.id]
    );
    
    // Si l'utilisateur n'a pas de challenges, lui en assigner
    if (activeCount.count === 0) {
      await assignChallengesForLevel(req.user.id, userLevel.currentLevel);
    }
    
    // Récupérer les challenges actifs avec progression
    const challenges = await db.all(`
      SELECT 
        c.*,
        cp.id as progressId,
        cp.progress as currentProgress,
        cp.startedAt,
        cp.lastUpdated,
        CAST((cp.progress * 100.0 / c.target) AS INTEGER) as progressPercent,
        CASE 
          WHEN cp.progress >= c.target THEN 1
          ELSE 0
        END as canValidate
      FROM challenges c
      JOIN challenge_progress cp ON c.id = cp.challengeId
      WHERE cp.userId = ? AND cp.isCompleted = 0 AND c.isActive = 1
      ORDER BY c.level ASC, c.type ASC
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        challenges,
        userLevel: userLevel.currentLevel,
        totalCompleted: userLevel.totalChallengesCompleted,
        totalRewards: userLevel.totalRewardsEarned
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des challenges',
      error: error.message
    });
  }
});
/**
 * GET /api/challenges/my-progress
 */
router.get('/my-progress', authMiddleware, async (req, res) => {
  try {
    const progress = await db.all(`
      SELECT 
        cp.id as progressId,
        cp.challengeId,
        cp.progress as currentProgress,
        c.title as challengeTitle,
        c.type,
        c.target,
        CAST((cp.progress * 100.0 / c.target) AS INTEGER) as progressPercent
      FROM challenge_progress cp
      JOIN challenges c ON cp.challengeId = c.id
      WHERE cp.userId = ? AND cp.isCompleted = 0
    `, [req.user.id]);
    
    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/challenges/history
 * Historique des challenges complétés
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const history = await db.all(`
      SELECT * FROM challenge_completions
      WHERE userId = ?
      ORDER BY completedAt DESC
      LIMIT 50
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique',
      error: error.message
    });
  }
});

/**
 * POST /api/challenges/update-progress
 * Mettre à jour la progression d'un challenge
 * (appelé automatiquement lors du sync des pas)
 * ✅ AVEC AUTO-VALIDATION
 */
router.post('/update-progress', authMiddleware, async (req, res) => {
  try {
    const { steps } = req.body;
    
    if (!steps || steps <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de pas invalide'
      });
    }
    
    // Récupérer tous les challenges actifs de type "steps"
    const activeChallenges = await db.all(`
      SELECT 
        cp.id as progressId,
        cp.progress as currentProgress,
        cp.challengeId,
        c.type,
        c.target,
        c.duration,
        c.title,
        c.level,
        c.reward
      FROM challenge_progress cp
      JOIN challenges c ON cp.challengeId = c.id
      WHERE cp.userId = ? 
        AND cp.isCompleted = 0 
        AND (c.type = 'daily_steps' OR c.type = 'duration_steps')
    `, [req.user.id]);
    
    let updated = 0;
    const completedChallenges = [];
    
    for (const challenge of activeChallenges) {
      // Ajouter les pas à la progression
      const newProgress = challenge.currentProgress + steps;
      
      await db.run(`
        UPDATE challenge_progress 
        SET progress = ?, lastUpdated = datetime('now')
        WHERE id = ?
      `, [newProgress, challenge.progressId]);
      
      updated++;
      console.log(`📊 Challenge "${challenge.title}": ${newProgress}/${challenge.target} pas`);
      
      // ✅ AUTO-VALIDATION si l'objectif est atteint
      if (newProgress >= challenge.target) {
        console.log(`🎯 AUTO-VALIDATION: "${challenge.title}" complété!`);
        
        // Marquer comme complété
        await db.run(`
          UPDATE challenge_progress
          SET isCompleted = 1
          WHERE id = ?
        `, [challenge.progressId]);
        
        // Ajouter les récompenses en DB
        await db.run(`
          UPDATE users 
          SET fitBalance = fitBalance + ?
          WHERE id = ?
        `, [challenge.reward, req.user.id]);
        
        console.log(`💰 +${challenge.reward} FIT ajoutés en DB`);
        
        // Historique
        await db.run(`
          INSERT INTO challenge_completions 
          (userId, challengeId, challengeTitle, challengeLevel, reward)
          VALUES (?, ?, ?, ?, ?)
        `, [req.user.id, challenge.challengeId, challenge.title, challenge.level, challenge.reward]);
        
        // Transférer sur Hedera si wallet existe
        try {
          const user = await db.get(
            'SELECT hederaAccountId FROM users WHERE id = ?',
            [req.user.id]
          );
          
          if (user.hederaAccountId && process.env.FIT_TOKEN_ID) {
            if (!hederaService.client) {
              await hederaService.initialize();
              hederaService.setFitTokenId(process.env.FIT_TOKEN_ID);
            }
            
            const hederaResult = await hederaService.transferFitTokens(
              user.hederaAccountId,
              challenge.reward
            );
            
            if (hederaResult.success) {
              console.log(`✅ ${challenge.reward} FIT tokens Hedera transférés`);
            }
            
            // Logger dans le registry
            await activityLogger.log(user.hederaAccountId, 'challenge_completed', {
              challengeId: challenge.challengeId,
              challengeTitle: challenge.title,
              reward: challenge.reward
            });
            
            console.log('📝 Événement enregistré dans le registry');
          }
        } catch (hederaError) {
          console.log('⚠️ Erreur Hedera:', hederaError.message);
        }
        
        // Assigner le prochain challenge de cette catégorie
        const nextChallenge = await db.get(`
          SELECT * FROM challenges
          WHERE type = ? AND isActive = 1
          AND level >= ?
          AND id NOT IN (
            SELECT challengeId FROM challenge_progress 
            WHERE userId = ?
          )
          ORDER BY level ASC
          LIMIT 1
        `, [challenge.type, challenge.level, req.user.id]);
        
        if (nextChallenge) {
          await db.run(`
            INSERT INTO challenge_progress (userId, challengeId, progress, startedAt)
            VALUES (?, ?, 0, datetime('now'))
          `, [req.user.id, nextChallenge.id]);
          
          console.log(`✅ Nouveau challenge assigné: "${nextChallenge.title}" (Niveau ${nextChallenge.level})`);
        }
        
        completedChallenges.push({
          id: challenge.challengeId,
          title: challenge.title,
          reward: challenge.reward
        });
      }
    }
    
    res.json({
      success: true,
      message: completedChallenges.length > 0 
        ? `🎉 ${completedChallenges.length} challenge(s) complété(s)!` 
        : `${updated} challenge(s) mis à jour`,
      stepsAdded: steps,
      completedChallenges: completedChallenges
    });
    
  } catch (error) {
    console.error('❌ Erreur mise à jour progression:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message
    });
  }
});

/**
 * POST /api/challenges/:id/validate
 * Valider un challenge complété
 * ✅ AUTOMATISATIONS:
 * - Tokens DB
 * - Tokens Hedera
 * - Registry Hedera
 * - Historique
 * - Nouveau challenge
 * - Level up si nécessaire
 */
router.post('/:id/validate', authMiddleware, async (req, res) => {
  try {
    const challengeId = req.params.id;
    
    // Récupérer la progression du challenge
    const progress = await db.get(`
      SELECT 
        cp.*,
        c.title,
        c.description,
        c.type,
        c.level,
        c.target,
        c.reward
      FROM challenge_progress cp
      JOIN challenges c ON cp.challengeId = c.id
      WHERE cp.challengeId = ? AND cp.userId = ? AND cp.isCompleted = 0
    `, [challengeId, req.user.id]);
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Challenge non trouvé ou déjà complété'
      });
    }
    
    // Vérifier si le challenge est vraiment terminé
    if (progress.progress < progress.target) {
      return res.status(400).json({
        success: false,
        message: `Challenge incomplet: ${progress.progress}/${progress.target}`,
        data: {
          current: progress.progress,
          target: progress.target,
          remaining: progress.target - progress.progress
        }
      });
    }
    
    console.log(`\n🎯 Validation du challenge: "${progress.title}" par user ${req.user.id}`);
    console.log(`📊 Progression: ${progress.progress}/${progress.target}`);
    console.log(`💰 Récompense: ${progress.reward} FIT`);
    
    // ====================================================
    // 1️⃣ MARQUER COMME COMPLÉTÉ
    // ====================================================
    await db.run(`
      UPDATE challenge_progress 
      SET isCompleted = 1, lastUpdated = datetime('now')
      WHERE id = ?
    `, [progress.id]);
    
    console.log('✅ Challenge marqué comme complété');
    
    // ====================================================
    // 2️⃣ RÉCOMPENSES - TOKENS DB
    // ====================================================
    await db.run(`
      UPDATE users 
      SET fitBalance = fitBalance + ? 
      WHERE id = ?
    `, [progress.reward, req.user.id]);
    
    console.log(`✅ ${progress.reward} FIT tokens ajoutés à la DB`);
    
    // ====================================================
    // 3️⃣ RÉCOMPENSES - TOKENS HEDERA
    // ====================================================
    let hederaTransferResult = null;
    
    const user = await db.get(
      'SELECT hederaAccountId, fitBalance FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (user && user.hederaAccountId && process.env.FIT_TOKEN_ID) {
      try {
        // Initialiser Hedera si nécessaire
        if (!hederaService.client) {
          await hederaService.initialize();
          hederaService.setFitTokenId(process.env.FIT_TOKEN_ID);
        }
        
        // Transférer les tokens
        hederaTransferResult = await hederaService.transferFitTokens(
          user.hederaAccountId,
          progress.reward
        );
        
        if (hederaTransferResult.success) {
          console.log(`✅ ${progress.reward} FIT tokens Hedera transférés à ${user.hederaAccountId}`);
        } else {
          console.error('⚠️ Échec transfert Hedera:', hederaTransferResult.error);
        }
      } catch (hederaError) {
        console.error('⚠️ Erreur transfert Hedera (récompense DB déjà donnée):', hederaError.message);
      }
    } else {
      console.log('⚠️ Pas de wallet Hedera ou FIT_TOKEN_ID manquant');
    }
    
    // ====================================================
    // 4️⃣ REGISTRY HEDERA
    // ====================================================
    try {
      console.log('🔍 [DEBUG] Début du logging challenge_completed dans Hedera...');
      
      const userId = user?.hederaAccountId || `user_${req.user.id}`;
      console.log(`🔍 [DEBUG] User ID pour logging: ${userId}`);
      
      // Initialiser le logger si nécessaire
      if (!activityLogger.initialized) {
        console.log('🔍 [DEBUG] Initialisation du activity logger...');
        await activityLogger.initialize();
      }
      
      console.log('🔍 [DEBUG] Appel de activityLogger.log...');
      const logResult = await activityLogger.log(userId, 'challenge_completed', {
        challengeId: challengeId,
        challengeTitle: progress.title,
        challengeType: progress.type,
        challengeLevel: progress.level,
        progress: progress.progress,
        target: progress.target,
        reward: progress.reward,
        hederaTransactionId: hederaTransferResult?.transactionId?.toString() || null,
        hederaTransferSuccess: hederaTransferResult?.success || false
      });
      
      if (logResult && logResult.success) {
        console.log(`✅ Événement "challenge_completed" enregistré dans le registry Hedera (seq: ${logResult.sequenceNumber})`);
      } else {
        console.error('⚠️ Logging challenge échoué:', logResult?.error || 'Raison inconnue');
      }
    } catch (logError) {
      console.error('❌ ERREUR logging challenge registry:', logError.message);
      console.error('Stack:', logError.stack);
    }
    
    // ====================================================
    // 5️⃣ HISTORIQUE
    // ====================================================
    await db.run(`
      INSERT INTO challenge_completions 
      (userId, challengeId, challengeTitle, challengeLevel, reward, hederaTxId, completedAt)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      req.user.id,
      challengeId,
      progress.title,
      progress.level,
      progress.reward,
      hederaTransferResult?.transactionId?.toString() || null
    ]);
    
    console.log('✅ Challenge ajouté à l\'historique');
    
    // ====================================================
    // 6️⃣ METTRE À JOUR LES STATS UTILISATEUR
    // ====================================================
    await db.run(`
      UPDATE user_challenge_levels
      SET 
        totalChallengesCompleted = totalChallengesCompleted + 1,
        totalRewardsEarned = totalRewardsEarned + ?
      WHERE userId = ?
    `, [progress.reward, req.user.id]);
    
    // ====================================================
    // 7️⃣ VÉRIFIER SI LEVEL UP
    // ====================================================
    const userLevel = await getUserLevel(req.user.id);
    let leveledUp = false;
    let newLevel = userLevel.currentLevel;
    
    // Compter combien de challenges du niveau actuel ont été complétés
    const completedAtLevel = await db.get(`
      SELECT COUNT(*) as count
      FROM challenge_completions
      WHERE userId = ? AND challengeLevel = ?
    `, [req.user.id, userLevel.currentLevel]);
    
    // Si les 3 challenges du niveau sont complétés, level up !
    if (completedAtLevel.count >= 3 && userLevel.currentLevel < 5) {
      newLevel = userLevel.currentLevel + 1;
      
      await db.run(`
        UPDATE user_challenge_levels
        SET currentLevel = ?, lastLevelUpAt = datetime('now')
        WHERE userId = ?
      `, [newLevel, req.user.id]);
      
      leveledUp = true;
      console.log(`🎉 LEVEL UP ! User ${req.user.id} passe au niveau ${newLevel}`);
    }
    
    // ====================================================
    // 8️⃣ ASSIGNER LE PROCHAIN CHALLENGE DE LA MÊME CATÉGORIE
    // ====================================================
    // Trouver le prochain challenge de cette catégorie (niveau suivant)
    const newChallenge = await db.get(`
      SELECT * FROM challenges
      WHERE type = ? AND isActive = 1
      AND level >= ?
      AND id NOT IN (
        SELECT challengeId FROM challenge_progress 
        WHERE userId = ?
      )
      ORDER BY level ASC
      LIMIT 1
    `, [progress.type, progress.level, req.user.id]);
    
    if (newChallenge) {
      await db.run(`
        INSERT INTO challenge_progress (userId, challengeId, progress, startedAt)
        VALUES (?, ?, 0, datetime('now'))
      `, [req.user.id, newChallenge.id]);
      
      console.log(`✅ Nouveau challenge assigné: "${newChallenge.title}" (Niveau ${newChallenge.level})`);
    } else {
      console.log('⚠️ Aucun nouveau challenge disponible pour ce type (tous complétés!)');
    }
    
    // ====================================================
    // RÉPONSE FINALE
    // ====================================================
    const response = {
      success: true,
      message: `🎉 Challenge "${progress.title}" complété! +${progress.reward} FIT`,
      data: {
        challengeCompleted: progress.title,
        reward: progress.reward,
        newBalance: user.fitBalance + progress.reward,
        hederaTransfer: {
          success: hederaTransferResult?.success || false,
          transactionId: hederaTransferResult?.transactionId?.toString() || null
        },
        levelUp: leveledUp ? {
          oldLevel: userLevel.currentLevel,
          newLevel: newLevel,
          message: `🎉 Félicitations ! Tu passes au niveau ${newLevel} !`
        } : null,
        newChallenge: newChallenge ? {
          id: newChallenge.id,
          title: newChallenge.title,
          description: newChallenge.description,
          target: newChallenge.target,
          reward: newChallenge.reward
        } : null
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Erreur validation challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation',
      error: error.message
    });
  }
});

/**
 * GET /api/challenges/my-stats
 * Statistiques détaillées de l'utilisateur
 */
router.get('/my-stats', authMiddleware, async (req, res) => {
  try {
    const userLevel = await getUserLevel(req.user.id);
    
    const stats = {
      currentLevel: userLevel.currentLevel,
      totalChallengesCompleted: userLevel.totalChallengesCompleted,
      totalRewardsEarned: userLevel.totalRewardsEarned,
      lastLevelUp: userLevel.lastLevelUpAt
    };
    
    // Compter les challenges complétés par niveau
    const byLevel = await db.all(`
      SELECT challengeLevel, COUNT(*) as count, SUM(reward) as totalRewards
      FROM challenge_completions
      WHERE userId = ?
      GROUP BY challengeLevel
      ORDER BY challengeLevel ASC
    `, [req.user.id]);
    
    stats.byLevel = byLevel;
    
    // Compter les challenges complétés par type
    const byType = await db.all(`
      SELECT 
        c.type,
        COUNT(*) as count,
        SUM(cc.reward) as totalRewards
      FROM challenge_completions cc
      JOIN challenges c ON cc.challengeId = c.id
      WHERE cc.userId = ?
      GROUP BY c.type
    `, [req.user.id]);
    
    stats.byType = byType;
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des stats',
      error: error.message
    });
  }
});

/**
 * POST /api/challenges/admin/reset
 * [ADMIN ONLY] Réinitialiser tous les challenges (pour beta testing)
 */
router.post('/admin/reset', authMiddleware, async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin
    const user = await db.get('SELECT isAdmin FROM users WHERE id = ?', [req.user.id]);
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Admin seulement'
      });
    }
    
    console.log('🔄 RESET COMPLET DES CHALLENGES...');
    
    // Supprimer toutes les progressions
    await db.run('DELETE FROM challenge_progress');
    console.log('✅ Progressions supprimées');
    
    // Supprimer tout l'historique
    await db.run('DELETE FROM challenge_completions');
    console.log('✅ Historique supprimé');
    
    // Reset les niveaux utilisateurs
    await db.run('UPDATE user_challenge_levels SET currentLevel = 1, totalChallengesCompleted = 0, totalRewardsEarned = 0, lastLevelUpAt = NULL');
    console.log('✅ Niveaux utilisateurs réinitialisés');
    
    res.json({
      success: true,
      message: '🔄 Reset complet effectué! Tous les utilisateurs sont au niveau 1.'
    });
    
  } catch (error) {
    console.error('❌ Erreur reset:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du reset',
      error: error.message
    });
  }
});

module.exports = router;