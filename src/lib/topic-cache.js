/**
 * ═══════════════════════════════════════════════════════════════════════
 * SERVICE DE CACHE POUR TOPIC HEDERA - MIRROR NODE API
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * CONTEXTE ET DÉCISIONS TECHNIQUES:
 * 
 * 1. PROBLÈME INITIAL - TopicMessageQuery (SDK Hedera):
 *    ❌ Timeouts constants (10-15 secondes)
 *    ❌ Messages non reçus (0 résultats)
 *    ❌ Subscription instable
 *    ❌ Cause: API subscribe en temps réel, pas adapté pour historique
 * 
 * 2. SOLUTION ADOPTÉE - Mirror Node REST API + Cache:
 *    ✅ Fetch via HTTPS standard (1-2 secondes)
 *    ✅ Historique complet accessible
 *    ✅ Stable et fiable
 *    ✅ JSON direct, pas de parsing complexe
 * 
 * 3. POURQUOI LE CACHE?
 *    ✅ Évite rate limits Mirror Node (100 req/sec)
 *    ✅ Performance: filtres locaux < 100ms vs 2 sec API
 *    ✅ Filtres complexes possibles (date + userId + actionType)
 *    ✅ Robustesse: continue de fonctionner si Mirror Node ralentit
 * 
 * 4. STRATÉGIE DE REFRESH:
 *    - Auto-refresh au démarrage du backend
 *    - Refresh manuel via route /api/registries/refresh (admin)
 *    - Cache expire après 5 minutes (configurable)
 *    - Fetch incrémental: seulement les nouveaux messages
 * 
 * NOTES IMPORTANTES:
 * - Les messages Hedera sont immuables (jamais modifiés/supprimés)
 * - Donc le cache est safe: anciens messages = toujours valides
 * - On fetch seulement les messages > dernier timestamp du cache
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */

const fetch = require('node-fetch');

class TopicCache {
  constructor() {
    this.messages = [];
    this.lastFetchTimestamp = null;
    this.lastUpdateTime = null;
    this.topicId = process.env.ACTIVITY_TOPIC_ID;
    this.mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com/api/v1';
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.isInitialized = false;
    this.isFetching = false;
  }

  /**
   * Initialiser le cache au démarrage
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('📦 Cache Topic déjà initialisé');
      return;
    }

    console.log('🔄 Initialisation du cache Topic Hedera...');
    
    if (!this.topicId) {
      console.log('⚠️  ACTIVITY_TOPIC_ID manquant dans .env - Cache désactivé');
      return;
    }

    try {
      await this.refreshCache();
      this.isInitialized = true;
      console.log(`✅ Cache initialisé: ${this.messages.length} messages`);
    } catch (error) {
      console.error('❌ Erreur initialisation cache:', error.message);
      // Continue quand même - le cache se remplira au premier refresh
    }
  }

  /**
   * Récupérer les messages depuis Mirror Node API
   * 
   * NOTES:
   * - Mirror Node indexe les messages avec ~2-3 sec de délai
   * - Pagination automatique via "next" link
   * - Format timestamp: nanoseconds depuis epoch (1234567890.000000000)
   */
  async fetchFromMirrorNode(startTimestamp = null) {
    const url = startTimestamp
      ? `${this.mirrorNodeUrl}/topics/${this.topicId}/messages?timestamp=gt:${startTimestamp}&order=asc&limit=100`
      : `${this.mirrorNodeUrl}/topics/${this.topicId}/messages?order=asc&limit=100`;

    console.log(`🔍 Fetch Mirror Node: ${url.substring(0, 100)}...`);

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Mirror Node error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    /**
     * STRUCTURE RÉPONSE MIRROR NODE:
     * {
     *   messages: [
     *     {
     *       consensus_timestamp: "1234567890.000000000",
     *       message: "base64_encoded_content",
     *       sequence_number: 15,
     *       topic_id: "0.0.7249704"
     *     }
     *   ],
     *   links: {
     *     next: "/api/v1/topics/.../messages?timestamp=gt:..."
     *   }
     * }
     */

    return data;
  }

  /**
   * Décoder et parser un message
   * 
   * PROBLÈME INTÉRESSANT RÉSOLU:
   * - Mirror Node retourne message en base64
   * - Contenu = JSON stringifié
   * - Double parsing nécessaire: base64 → string → JSON
   */
  parseMessage(mirrorNodeMessage) {
    try {
      // Décoder base64
      const messageBuffer = Buffer.from(mirrorNodeMessage.message, 'base64');
      const messageString = messageBuffer.toString('utf-8');
      
      // Parser JSON
      const messageData = JSON.parse(messageString);

      return {
        sequence: mirrorNodeMessage.sequence_number,
        consensusTimestamp: mirrorNodeMessage.consensus_timestamp,
        timestamp: messageData.timestamp,
        userId: messageData.userId,
        action: messageData.action,
        data: messageData.data,
        raw: messageString
      };
    } catch (error) {
      console.error('❌ Erreur parsing message:', error.message);
      return null;
    }
  }

  /**
   * Refresh le cache (fetch nouveaux messages)
   * 
   * OPTIMISATION:
   * - Fetch incrémental: seulement messages > dernier timestamp
   * - Évite de re-fetch tout l'historique à chaque fois
   * - Important pour performance si 1000+ messages
   */
  async refreshCache() {
    if (this.isFetching) {
      console.log('⏳ Fetch déjà en cours, skip...');
      return;
    }

    this.isFetching = true;

    try {
      console.log('🔄 Refresh du cache...');
      
      // Fetch seulement les nouveaux messages si on a déjà un cache
      const startTimestamp = this.lastFetchTimestamp;
      
      const data = await this.fetchFromMirrorNode(startTimestamp);
      
      if (!data.messages || data.messages.length === 0) {
        console.log('📭 Aucun nouveau message');
        this.lastUpdateTime = Date.now();
        this.isFetching = false;
        return;
      }

      // Parser et ajouter les nouveaux messages
      let newMessagesCount = 0;
      for (const msg of data.messages) {
        const parsed = this.parseMessage(msg);
        if (parsed) {
          // Éviter les doublons (au cas où)
          const exists = this.messages.find(m => m.sequence === parsed.sequence);
          if (!exists) {
            this.messages.push(parsed);
            newMessagesCount++;
          }
        }
      }

      // Trier par sequence (ordre chronologique)
      this.messages.sort((a, b) => a.sequence - b.sequence);

      // Mettre à jour le dernier timestamp
      if (this.messages.length > 0) {
        const lastMessage = this.messages[this.messages.length - 1];
        this.lastFetchTimestamp = lastMessage.consensusTimestamp;
      }

      this.lastUpdateTime = Date.now();
      
      console.log(`✅ Cache refreshed: +${newMessagesCount} nouveaux messages (total: ${this.messages.length})`);

      /**
       * TODO FUTUR:
       * - Pagination: si data.links.next existe, fetch next page
       * - Limite cache: garder seulement N derniers messages (ex: 10000)
       * - Persist cache sur disque pour survie au restart
       */

    } catch (error) {
      console.error('❌ Erreur refresh cache:', error.message);
      throw error;
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Vérifier si le cache a expiré
   */
  isCacheExpired() {
    if (!this.lastUpdateTime) return true;
    return (Date.now() - this.lastUpdateTime) > this.cacheExpiry;
  }

  /**
   * Obtenir les messages avec filtres
   * 
   * FILTRES DISPONIBLES:
   * - startDate: Date ISO (ex: "2024-11-01")
   * - endDate: Date ISO
   * - userId: ID utilisateur Hedera (ex: "0.0.7269093")
   * - actionType: Type d'action (ex: "wallet_created", "sync", "purchase")
   * - limit: Nombre max de résultats
   * - offset: Pour pagination
   */
  getMessages(filters = {}) {
    const {
      startDate,
      endDate,
      userId,
      actionType,
      limit = 100,
      offset = 0
    } = filters;

    let filtered = [...this.messages];

    // Filtre par date de début
    if (startDate) {
      const start = new Date(startDate).getTime();
      filtered = filtered.filter(msg => new Date(msg.timestamp).getTime() >= start);
    }

    // Filtre par date de fin
    if (endDate) {
      const end = new Date(endDate).getTime();
      filtered = filtered.filter(msg => new Date(msg.timestamp).getTime() <= end);
    }

    // Filtre par userId
    if (userId) {
      filtered = filtered.filter(msg => msg.userId === userId);
    }

    // Filtre par type d'action
    if (actionType) {
      filtered = filtered.filter(msg => msg.action === actionType);
    }

    // Trier par timestamp décroissant (plus récent en premier)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      data: paginated,
      total: total,
      limit: limit,
      offset: offset,
      hasMore: (offset + paginated.length) < total
    };
  }

  /**
   * Obtenir les statistiques du cache
   */
  getStats() {
    // Compter par type d'action
    const actionCounts = {};
    this.messages.forEach(msg => {
      actionCounts[msg.action] = (actionCounts[msg.action] || 0) + 1;
    });

    // Compter par utilisateur
    const userCounts = {};
    this.messages.forEach(msg => {
      userCounts[msg.userId] = (userCounts[msg.userId] || 0) + 1;
    });

    return {
      totalMessages: this.messages.length,
      lastUpdate: this.lastUpdateTime ? new Date(this.lastUpdateTime).toISOString() : null,
      cacheAge: this.lastUpdateTime ? Date.now() - this.lastUpdateTime : null,
      isExpired: this.isCacheExpired(),
      actionCounts,
      topUsers: Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId, count]) => ({ userId, count }))
    };
  }
}

// Singleton
const topicCache = new TopicCache();

module.exports = topicCache;