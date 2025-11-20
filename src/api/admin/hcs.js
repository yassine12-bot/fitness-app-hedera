const express = require('express');
const router = express.Router();
const authMiddleware = require('../../auth/middleware');
const adminMiddleware = require('../../auth/admin-middleware');
const hcsReader = require('../../lib/hcs-reader');
const hederaService = require('../../lib/hedera');

/**
 * GET /api/admin/hcs/topics
 * Liste des topics HCS utilisés
 */
router.get('/topics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Topics définis dans le système
    const topics = [
      {
        id: process.env.ACTIVITY_TOPIC_ID || 'Non configuré',
        name: 'User Activities',
        description: 'Logs de toutes les activités utilisateurs'
      }
    ];
    
    res.json({
      success: true,
      data: topics
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur récupération topics',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/hcs/messages/:topicId
 * Récupérer les messages d'un topic avec filtres
 * Query params: type, userId, startDate, endDate, limit
 */
router.get('/messages/:topicId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { topicId } = req.params;
    const { type, userId, startDate, endDate, limit = 50 } = req.query;
    
    // Vérifier que le topic ID est valide
    if (!topicId || topicId === 'Non configuré') {
      return res.status(400).json({
        success: false,
        message: 'Topic ID non configuré. Vérifie ACTIVITY_TOPIC_ID dans .env'
      });
    }
    
    // Initialiser le reader avec le client Hedera
    if (!hcsReader.client && hederaService.client) {
      hcsReader.setClient(hederaService.client);
    }
    
    // Lire les messages du topic
    let messages = await hcsReader.readTopicMessages(topicId, {
      limit: parseInt(limit) || 50,
      startTime: startDate,
      endTime: endDate
    });
    
    // Appliquer les filtres
    if (type) {
      messages = hcsReader.filterByType(messages, type);
    }
    
    if (userId) {
      messages = hcsReader.filterByUser(messages, parseInt(userId));
    }
    
    // Statistiques par type
    const stats = messages.reduce((acc, msg) => {
      const msgType = msg.content.type || 'unknown';
      acc[msgType] = (acc[msgType] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        messages,
        count: messages.length,
        stats,
        filters: { type, userId, startDate, endDate, limit }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur lecture HCS:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lecture messages HCS',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/hcs/stats
 * Statistiques globales des topics
 */
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const topicId = process.env.ACTIVITY_TOPIC_ID;
    
    if (!topicId) {
      return res.status(400).json({
        success: false,
        message: 'ACTIVITY_TOPIC_ID non configuré'
      });
    }
    
    // Initialiser le reader
    if (!hcsReader.client && hederaService.client) {
      hcsReader.setClient(hederaService.client);
    }
    
    // Récupérer les 100 derniers messages pour statistiques
    const messages = await hcsReader.readTopicMessages(topicId, { limit: 100 });
    
    // Calculer les stats
    const stats = {
      totalMessages: messages.length,
      byType: messages.reduce((acc, msg) => {
        const type = msg.content.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      lastMessage: messages[messages.length - 1] || null,
      timeRange: {
        first: messages[0]?.timestamp || null,
        last: messages[messages.length - 1]?.timestamp || null
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Erreur stats HCS:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur récupération stats',
      error: error.message
    });
  }
});

module.exports = router;