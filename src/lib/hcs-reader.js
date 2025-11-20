const { TopicMessageQuery, TopicId } = require("@hashgraph/sdk");

class HCSReader {
  constructor() {
    this.client = null;
  }

  /**
   * Initialiser avec le client Hedera
   */
  setClient(client) {
    this.client = client;
  }

  /**
   * Lire les messages d'un topic HCS avec filtres
   */
  async readTopicMessages(topicId, options = {}) {
    if (!this.client) {
      throw new Error('Client Hedera non initialisé');
    }

    const {
      limit = 50,
      startTime = null,
      endTime = null
    } = options;

    const messages = [];

    try {
      const query = new TopicMessageQuery()
        .setTopicId(TopicId.fromString(topicId))
        .setLimit(limit);

      // Note: La query HCS est asynchrone et utilise un callback
      // On va collecter les messages de manière synchrone pour simplifier
      
      return new Promise((resolve, reject) => {
        const subscription = query.subscribe(
          this.client,
          (message) => {
            try {
              const content = Buffer.from(message.contents).toString('utf-8');
              const timestamp = message.consensusTimestamp.toDate();

              // Appliquer filtres de temps si fournis
              if (startTime && timestamp < new Date(startTime)) return;
              if (endTime && timestamp > new Date(endTime)) return;

              messages.push({
                sequenceNumber: message.sequenceNumber.toString(),
                timestamp: timestamp.toISOString(),
                consensusTimestamp: message.consensusTimestamp.toString(),
                content: JSON.parse(content)
              });

              // Arrêter après limit messages
              if (messages.length >= limit) {
                subscription.unsubscribe();
                resolve(messages);
              }
            } catch (error) {
              console.error('Erreur parsing message HCS:', error);
            }
          },
          (error) => {
            console.error('Erreur subscription HCS:', error);
            reject(error);
          }
        );

        // Timeout de sécurité (10 secondes)
        setTimeout(() => {
          subscription.unsubscribe();
          resolve(messages);
        }, 10000);
      });

    } catch (error) {
      console.error('Erreur lecture topic HCS:', error);
      throw error;
    }
  }

  /**
   * Filtrer les messages par type
   */
  filterByType(messages, type) {
    return messages.filter(msg => msg.content.type === type);
  }

  /**
   * Filtrer les messages par userId
   */
  filterByUser(messages, userId) {
    return messages.filter(msg => 
      msg.content.userId === userId || 
      msg.content.accountId?.includes(`user-${userId}`)
    );
  }

  /**
   * Filtrer les messages par date
   */
  filterByDateRange(messages, startDate, endDate) {
    return messages.filter(msg => {
      const msgDate = new Date(msg.timestamp);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      return msgDate >= start && msgDate <= end;
    });
  }
}

module.exports = new HCSReader();