/**
 * ═══════════════════════════════════════════════════════════════════════
 * ROUTES REGISTRIES - LECTURE TOPIC HEDERA VIA CACHE
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Ces routes utilisent le service de cache (topic-cache.js) au lieu de
 * lire directement le Topic Hedera.
 * 
 * AVANTAGES:
 * - Performance: filtres < 100ms au lieu de 2 sec
 * - Fiabilité: pas de timeout Mirror Node
 * - Flexibilité: filtres complexes possibles
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../../auth/middleware');
const adminMiddleware = require('../../auth/admin-middleware');
const topicCache = require('../../lib/topic-cache');

/**
 * GET /api/registries
 * Récupérer les activités du Topic Hedera (via cache) avec filtres
 * 
 * ADMIN UNIQUEMENT - Raison:
 * - Contient potentiellement données sensibles de tous les users
 * - Users peuvent voir leurs propres données via /api/registries/user/:userId
 */
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      userId,
      actionType,
      limit = 100,
      offset = 0
    } = req.query;

    console.log('📖 Lecture cache avec filtres:', {
      startDate, endDate, userId, actionType, limit, offset
    });

    /**
     * PROBLÈME INTÉRESSANT - Cache Expiry:
     * Si cache expiré, on refresh avant de retourner les résultats.
     * Cela ajoute ~1-2 sec à la première requête après expiry,
     * mais garantit que les données sont fraîches.
     * 
     * ALTERNATIVE CONSIDÉRÉE:
     * - Refresh en background, retourner ancien cache immédiatement
     * - Avantage: réponse toujours rapide
     * - Inconvénient: données potentiellement vieilles de 5 min
     * - Décision: refresh bloquant pour garantir fraîcheur
     */
    if (topicCache.isCacheExpired()) {
      console.log('⏰ Cache expiré, refresh...');
      await topicCache.refreshCache();
    }

    // Obtenir les messages filtrés depuis le cache
    const result = topicCache.getMessages({
      startDate,
      endDate,
      userId,
      actionType,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore
      },
      source: 'hedera_topic_cache',
      topicId: process.env.ACTIVITY_TOPIC_ID,
      cacheAge: topicCache.lastUpdateTime 
        ? `${Math.floor((Date.now() - topicCache.lastUpdateTime) / 1000)}s`
        : 'N/A'
    });

  } catch (error) {
    console.error('❌ Erreur lecture registries:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la lecture des registries',
      error: error.message
    });
  }
});

/**
 * GET /api/registries/types
 * Liste des types d'actions disponibles avec compteurs
 * 
 * Utilise les stats du cache (précalculées)
 */
router.get('/types', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const stats = topicCache.getStats();
    
    const types = Object.entries(stats.actionCounts).map(([action, count]) => ({
      type: action,
      count: count
    }));

    res.json({
      success: true,
      data: types
    });

  } catch (error) {
    console.error('❌ Erreur récupération types:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des types',
      error: error.message
    });
  }
});

/**
 * GET /api/registries/stats
 * Statistiques globales du cache
 */
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const stats = topicCache.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Erreur calcul stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des stats',
      error: error.message
    });
  }
});

/**
 * POST /api/registries/refresh
 * Forcer un refresh du cache (admin uniquement)
 * 
 * UTILITÉ:
 * - Debug: vérifier que les nouveaux messages arrivent
 * - Urgent: besoin de données fraîches immédiatement
 * - Normalement pas nécessaire (auto-refresh à l'expiry)
 */
router.post('/refresh', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('🔄 Refresh manuel du cache demandé');
    
    const before = topicCache.messages.length;
    await topicCache.refreshCache();
    const after = topicCache.messages.length;

    res.json({
      success: true,
      message: 'Cache refreshed',
      stats: {
        messagesBefore: before,
        messagesAfter: after,
        newMessages: after - before,
        totalMessages: after
      }
    });

  } catch (error) {
    console.error('❌ Erreur refresh cache:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du refresh',
      error: error.message
    });
  }
});

/**
 * GET /api/registries/user/:userId
 * Activités d'un utilisateur spécifique
 * 
 * SÉCURITÉ:
 * - User peut voir ses propres données (req.user.id === userId)
 * - Admin peut voir toutes les données
 * - Autres = 403 Forbidden
 * 
 * NOTE IMPORTANTE:
 * userId = Hedera Account ID (ex: "0.0.7269093")
 * req.user.id = ID SQL de la table users (ex: 41)
 * On doit récupérer le hederaAccountId depuis la DB pour comparer
 */
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params; // Hedera Account ID
    
    /**
     * PROBLÈME DE SÉCURITÉ RÉSOLU:
     * On ne peut pas directement comparer req.user.id (SQL ID) avec
     * userId (Hedera Account ID). Il faut récupérer le hederaAccountId
     * de l'user connecté depuis la DB.
     * 
     * Si admin: accès à tous les users
     * Si non-admin: seulement ses propres données
     */
    if (!req.user.isAdmin) {
      const db = require('../../lib/db');
      const user = await db.get(
        'SELECT hederaAccountId FROM users WHERE id = ?',
        [req.user.id]
      );
      
      if (user.hederaAccountId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé - vous ne pouvez voir que vos propres données'
        });
      }
    }

    // Refresh si nécessaire
    if (topicCache.isCacheExpired()) {
      await topicCache.refreshCache();
    }

    // Filtrer par userId
    const result = topicCache.getMessages({
      userId: userId,
      limit: 200 // Plus de résultats pour un user spécifique
    });

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      userId: userId
    });

  } catch (error) {
    console.error('❌ Erreur récupération activités user:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des activités',
      error: error.message
    });
  }
});

module.exports = router;