const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const authMiddleware = require('../../auth/middleware');

/**
 * GET /api/leaderboard
 * Classement des utilisateurs
 * Query params: sort (badges|tokens|steps), limit
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { sort = 'badges', limit = 100 } = req.query;
    
    let query = '';
    let orderBy = '';
    
    switch(sort) {
      case 'tokens':
        query = `
          SELECT 
            u.id,
            u.name,
            u.fitBalance,
            u.totalSteps,
            COUNT(b.id) as totalBadges,
            COUNT(CASE WHEN b.rarity = 'legendary' THEN 1 END) as legendaryBadges,
            COUNT(CASE WHEN b.rarity = 'epic' THEN 1 END) as epicBadges,
            COUNT(CASE WHEN b.rarity = 'rare' THEN 1 END) as rareBadges,
            COUNT(CASE WHEN b.rarity = 'common' THEN 1 END) as commonBadges
          FROM users u
          LEFT JOIN badges b ON u.id = b.user_id
          GROUP BY u.id
          ORDER BY u.fitBalance DESC
          LIMIT ?
        `;
        break;
        
      case 'steps':
        query = `
          SELECT 
            u.id,
            u.name,
            u.fitBalance,
            u.totalSteps,
            COUNT(b.id) as totalBadges,
            COUNT(CASE WHEN b.rarity = 'legendary' THEN 1 END) as legendaryBadges,
            COUNT(CASE WHEN b.rarity = 'epic' THEN 1 END) as epicBadges,
            COUNT(CASE WHEN b.rarity = 'rare' THEN 1 END) as rareBadges,
            COUNT(CASE WHEN b.rarity = 'common' THEN 1 END) as commonBadges
          FROM users u
          LEFT JOIN badges b ON u.id = b.user_id
          GROUP BY u.id
          ORDER BY u.totalSteps DESC
          LIMIT ?
        `;
        break;
        
      case 'badges':
      default:
        // Utiliser la vue badge_leaderboard déjà existante
        query = `
          SELECT * FROM badge_leaderboard
          LIMIT ?
        `;
        break;
    }
    
    const leaderboard = await db.all(query, [parseInt(limit)]);
    
    // Ajouter le rang
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      rank: index + 1,
      ...user
    }));
    
    res.json({
      success: true,
      data: rankedLeaderboard,
      meta: {
        sortBy: sort,
        total: rankedLeaderboard.length
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur récupération leaderboard',
      error: error.message
    });
  }
});

/**
 * GET /api/leaderboard/user/:id
 * Position d'un utilisateur dans le leaderboard
 */
router.get('/user/:id', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Récupérer tous les utilisateurs triés par badges
    const allUsers = await db.all(`
      SELECT * FROM badge_leaderboard
    `);
    
    // Trouver la position de l'utilisateur
    const userRank = allUsers.findIndex(u => u.user_id === userId) + 1;
    const userStats = allUsers.find(u => u.user_id === userId);
    
    if (!userStats) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Top 3 pour comparaison
    const top3 = allUsers.slice(0, 3);
    
    res.json({
      success: true,
      data: {
        rank: userRank,
        stats: userStats,
        top3: top3,
        totalUsers: allUsers.length
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur récupération position',
      error: error.message
    });
  }
});

module.exports = router;