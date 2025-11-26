const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const authMiddleware = require('../../auth/middleware');
const hederaTopicsService = require('../../lib/hedera-topics-service');

/**
 * GET /api/topics
 * Get all topics with message counts
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const topics = await db.all(`
      SELECT 
        t.*,
        u.name as creatorName,
        (SELECT COUNT(*) FROM topic_members WHERE topicId = t.id) as memberCount,
        EXISTS(SELECT 1 FROM topic_members WHERE topicId = t.id AND userId = ?) as isMember
      FROM topics t
      LEFT JOIN users u ON t.creatorId = u.id
      ORDER BY t.createdAt DESC
    `, [req.user.id]);

        // Get message counts from blockchain
        for (const topic of topics) {
            if (topic.hederaTopicId) {
                topic.messageCount = await hederaTopicsService.getMessageCount(topic.hederaTopicId);
            } else {
                topic.messageCount = 0;
            }
        }

        res.json({
            success: true,
            data: topics
        });

    } catch (error) {
        console.error('❌ Error fetching topics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/topics/:id/messages
 * Get messages from blockchain for a topic
 */
router.get('/:id/messages', authMiddleware, async (req, res) => {
    try {
        const topic = await db.get('SELECT * FROM topics WHERE id = ?', [req.params.id]);

        if (!topic) {
            return res.status(404).json({
                success: false,
                message: 'Topic not found'
            });
        }

        if (!topic.hederaTopicId) {
            return res.json({
                success: true,
                data: [],
                message: 'This topic is not linked to Hedera blockchain'
            });
        }

        // Check if user is member
        const isMember = await db.get(
            'SELECT 1 FROM topic_members WHERE topicId = ? AND userId = ?',
            [req.params.id, req.user.id]
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'You must be a member to view messages'
            });
        }

        // Get messages from blockchain
        const messages = await hederaTopicsService.getMessages(topic.hederaTopicId, 100);

        res.json({
            success: true,
            data: messages,
            topic: {
                id: topic.id,
                name: topic.name,
                hederaTopicId: topic.hederaTopicId
            }
        });

    } catch (error) {
        console.error('❌ Error fetching messages:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/topics/:id/messages
 * Submit a message to the blockchain topic (operator pays gas)
 */
router.post('/:id/messages', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty'
            });
        }

        if (message.length > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Message too long (max 1000 characters)'
            });
        }

        const topic = await db.get('SELECT * FROM topics WHERE id = ?', [req.params.id]);

        if (!topic) {
            return res.status(404).json({
                success: false,
                message: 'Topic not found'
            });
        }

        if (!topic.hederaTopicId) {
            return res.status(400).json({
                success: false,
                message: 'This topic is not linked to Hedera blockchain'
            });
        }

        // Check if user is member
        const isMember = await db.get(
            'SELECT 1 FROM topic_members WHERE topicId = ? AND userId = ?',
            [req.params.id, req.user.id]
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'You must be a member to post messages'
            });
        }

        // Get user info
        const user = await db.get('SELECT name FROM users WHERE id = ?', [req.user.id]);

        // Submit message to blockchain (operator pays gas)
        const result = await hederaTopicsService.submitMessage(
            topic.hederaTopicId,
            req.user.id,
            user.name,
            message.trim()
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to submit message to blockchain',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Message posted successfully',
            data: {
                sequenceNumber: result.sequenceNumber,
                transactionId: result.transactionId,
                explorerUrl: result.explorerUrl
            }
        });

    } catch (error) {
        console.error('❌ Error posting message:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/topics/:id/join
 * Join a topic
 */
router.post('/:id/join', authMiddleware, async (req, res) => {
    try {
        const topic = await db.get('SELECT * FROM topics WHERE id = ?', [req.params.id]);

        if (!topic) {
            return res.status(404).json({
                success: false,
                message: 'Topic not found'
            });
        }

        // Check if already member
        const existing = await db.get(
            'SELECT 1 FROM topic_members WHERE topicId = ? AND userId = ?',
            [req.params.id, req.user.id]
        );

        if (existing) {
            return res.json({
                success: true,
                message: 'Already a member'
            });
        }

        // Add member
        await db.run(`
      INSERT INTO topic_members (topicId, userId, joinedAt)
      VALUES (?, ?, datetime('now'))
    `, [req.params.id, req.user.id]);

        res.json({
            success: true,
            message: 'Successfully joined topic'
        });

    } catch (error) {
        console.error('❌ Error joining topic:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/topics/:id/leave
 * Leave a topic
 */
router.post('/:id/leave', authMiddleware, async (req, res) => {
    try {
        await db.run(
            'DELETE FROM topic_members WHERE topicId = ? AND userId = ?',
            [req.params.id, req.user.id]
        );

        res.json({
            success: true,
            message: 'Successfully left topic'
        });

    } catch (error) {
        console.error('❌ Error leaving topic:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
