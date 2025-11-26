require('dotenv').config();
const {
    Client,
    TopicMessageSubmitTransaction,
    PrivateKey,
    AccountId
} = require('@hashgraph/sdk');
const axios = require('axios');

/**
 * Service for Hedera HCS Topics
 * - Submit messages (operator pays gas)
 * - Read messages from Mirror Node (free)
 */

class HederaTopicsService {
    constructor() {
        this.client = null;
        this.initialized = false;
        this.mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com';
    }

    async initialize() {
        if (this.initialized) return;

        const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
        const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

        this.client = Client.forTestnet();
        this.client.setOperator(operatorId, operatorKey);
        this.initialized = true;

        console.log('✅ Hedera Topics Service initialized');
    }

    /**
     * Submit a message to a Hedera HCS Topic
     * Operator pays the gas fee (~$0.0001 HBAR)
     */
    async submitMessage(hederaTopicId, userId, userName, message) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const messageData = JSON.stringify({
                userId,
                userName,
                message,
                timestamp: new Date().toISOString()
            });

            const transaction = await new TopicMessageSubmitTransaction()
                .setTopicId(hederaTopicId)
                .setMessage(messageData)
                .execute(this.client);

            const receipt = await transaction.getReceipt(this.client);
            const sequenceNumber = receipt.topicSequenceNumber;

            console.log(`📝 Message submitted to topic ${hederaTopicId} (seq: ${sequenceNumber})`);

            return {
                success: true,
                sequenceNumber: sequenceNumber.toString(),
                transactionId: transaction.transactionId.toString(),
                explorerUrl: `https://hashscan.io/testnet/transaction/${transaction.transactionId.toString()}`
            };

        } catch (error) {
            console.error('❌ Error submitting message:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get messages from a Hedera HCS Topic via Mirror Node API
     * FREE - no gas cost
     */
    async getMessages(hederaTopicId, limit = 50) {
        try {
            const url = `${this.mirrorNodeUrl}/api/v1/topics/${hederaTopicId}/messages?limit=${limit}&order=desc`;

            const response = await axios.get(url);

            if (!response.data || !response.data.messages) {
                return [];
            }

            // Parse and decode messages
            const messages = response.data.messages.map(msg => {
                try {
                    // Decode base64 message
                    const messageBuffer = Buffer.from(msg.message, 'base64');
                    const messageText = messageBuffer.toString('utf8');
                    const messageData = JSON.parse(messageText);

                    return {
                        sequenceNumber: msg.sequence_number,
                        timestamp: msg.consensus_timestamp,
                        userId: messageData.userId,
                        userName: messageData.userName,
                        message: messageData.message,
                        messageTimestamp: messageData.timestamp
                    };
                } catch (parseError) {
                    console.warn('⚠️  Could not parse message:', parseError.message);
                    return null;
                }
            }).filter(msg => msg !== null);

            // Reverse to get chronological order (oldest first)
            return messages.reverse();

        } catch (error) {
            console.error('❌ Error fetching messages from Mirror Node:', error.message);
            return [];
        }
    }

    /**
     * Get message count for a topic
     */
    async getMessageCount(hederaTopicId) {
        try {
            const url = `${this.mirrorNodeUrl}/api/v1/topics/${hederaTopicId}`;
            const response = await axios.get(url);

            return response.data?.message_count || 0;
        } catch (error) {
            console.error('❌ Error fetching message count:', error.message);
            return 0;
        }
    }

    close() {
        if (this.client) {
            this.client.close();
            this.initialized = false;
        }
    }
}

// Export singleton instance
const hederaTopicsService = new HederaTopicsService();

module.exports = hederaTopicsService;
