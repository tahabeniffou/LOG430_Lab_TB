const redisService = require('./redisService');
const logger = require('../logger');

/**
 * Middleware de cache générique
 * @param {Object} options - Options de configuration
 * @param {string} options.keyPrefix - Préfixe pour les clés de cache
 * @param {number} options.ttl - Time to live en secondes
 * @param {Function} options.keyGenerator - Fonction pour générer la clé de cache
 * @param {Function} options.condition - Condition pour activer le cache
 */
function cacheMiddleware(options = {}) {
  const {
    keyPrefix = 'api',
    ttl = 300, // 5 minutes par défaut
    keyGenerator = null,
    condition = () => true
  } = options;

  return async (req, res, next) => {
    // Vérifier si le cache doit être utilisé
    if (!condition(req)) {
      return next();
    }

    // Générer la clé de cache
    let cacheKey;
    if (keyGenerator && typeof keyGenerator === 'function') {
      cacheKey = keyGenerator(req);
    } else {
      // Clé par défaut basée sur l'URL et les paramètres de requête
      const queryString = Object.keys(req.query).length > 0 
        ? ':' + Object.keys(req.query).sort().map(key => `${key}=${req.query[key]}`).join('&')
        : '';
      cacheKey = redisService.generateKey(keyPrefix, req.originalUrl + queryString);
    }

    try {
      // Tenter de récupérer la réponse depuis le cache
      const cachedData = await redisService.get(cacheKey);
      
      if (cachedData) {
        logger.debug(`Cache hit for ${cacheKey}`);
        res.set('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      logger.debug(`Cache miss for ${cacheKey}`);
      res.set('X-Cache', 'MISS');

      // Intercepter la méthode json pour cacher la réponse
      const originalJson = res.json;
      res.json = function(data) {
        // Cacher seulement les réponses de succès
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisService.set(cacheKey, data, ttl).catch(err => {
            logger.error('Failed to cache response:', err);
          });
        }
        
        // Appeler la méthode originale
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      // En cas d'erreur, continuer sans cache
      res.set('X-Cache', 'ERROR');
      next();
    }
  };
}

/**
 * Middleware pour invalider le cache après une opération de modification
 * @param {string|Array<string>} patterns - Pattern(s) de clés à invalider
 */
function invalidateCacheMiddleware(patterns) {
  const patternsArray = Array.isArray(patterns) ? patterns : [patterns];

  return async (req, res, next) => {
    // Exécuter l'action suivante d'abord
    const originalJson = res.json;
    res.json = function(data) {
      // Invalider le cache seulement pour les réponses de succès
      if (res.statusCode >= 200 && res.statusCode < 300) {
        Promise.all(
          patternsArray.map(pattern => {
            const resolvedPattern = typeof pattern === 'function' ? pattern(req, data) : pattern;
            return redisService.delPattern(resolvedPattern);
          })
        ).catch(err => {
          logger.error('Failed to invalidate cache:', err);
        });
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
}

module.exports = {
  cacheMiddleware,
  invalidateCacheMiddleware
};
