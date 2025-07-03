const redis = require('redis');
const logger = require('../logger');

class RedisService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.defaultTTL = 300; // 5 minutes par défaut
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.warn('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.connected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis Client Ready');
        this.connected = true;
      });

      this.client.on('end', () => {
        logger.warn('Redis Client Connection Ended');
        this.connected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.connected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
    }
  }

  isConnected() {
    return this.connected && this.client && this.client.isReady;
  }

  /**
   * Récupère une valeur du cache
   * @param {string} key - La clé du cache
   * @returns {any|null} - La valeur désérialisée ou null si non trouvée/erreur
   */
  async get(key) {
    if (!this.isConnected()) {
      logger.warn('Redis not connected, cache miss for key:', key);
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug(`Cache HIT for key: ${key}`);
        return JSON.parse(value);
      }
      logger.debug(`Cache MISS for key: ${key}`);
      return null;
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Stocke une valeur dans le cache
   * @param {string} key - La clé du cache
   * @param {any} value - La valeur à stocker
   * @param {number} ttl - Time to live en secondes (optionnel)
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected()) {
      logger.warn('Redis not connected, cannot cache key:', key);
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      logger.debug(`Cache SET for key: ${key}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  /**
   * Supprime une clé du cache
   * @param {string} key - La clé à supprimer
   */
  async del(key) {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const result = await this.client.del(key);
      logger.debug(`Cache DEL for key: ${key}, deleted: ${result}`);
      return result > 0;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }

  /**
   * Supprime toutes les clés correspondant à un pattern
   * @param {string} pattern - Le pattern de clés à supprimer
   */
  async delPattern(pattern) {
    if (!this.isConnected()) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        const deleted = await this.client.del(keys);
        logger.debug(`Cache DEL pattern: ${pattern}, deleted: ${deleted} keys`);
        return deleted;
      }
      return 0;
    } catch (error) {
      logger.error('Redis DEL pattern error:', error);
      return 0;
    }
  }

  /**
   * Vérifie si une clé existe
   * @param {string} key - La clé à vérifier
   */
  async exists(key) {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }

  /**
   * Génère une clé de cache standardisée
   * @param {string} prefix - Préfixe de la clé
   * @param {...any} parts - Parties de la clé
   * @returns {string} - Clé formatée
   */
  generateKey(prefix, ...parts) {
    return `${prefix}:${parts.filter(p => p !== undefined && p !== null).join(':')}`;
  }
}

// Instance singleton
const redisService = new RedisService();

module.exports = redisService;
