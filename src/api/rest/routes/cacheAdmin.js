const express = require('express');
const router = express.Router();
const redisService = require('../../cache/redisService');
const logger = require('../../logger');

/**
 * @openapi
 * tags:
 *   - name: Cache Admin
 *     description: Administration du cache Redis
 */

/**
 * @openapi
 * /admin/cache/status:
 *   get:
 *     tags:
 *       - Cache Admin
 *     summary: Vérifie le statut de la connexion Redis
 *     responses:
 *       200:
 *         description: Statut du cache
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.get('/status', (req, res) => {
  const connected = redisService.isConnected();
  res.json({
    connected,
    message: connected ? 'Redis connecté' : 'Redis déconnecté'
  });
});

/**
 * @openapi
 * /admin/cache/clear:
 *   delete:
 *     tags:
 *       - Cache Admin
 *     summary: Vide tout le cache
 *     responses:
 *       200:
 *         description: Cache vidé
 *       500:
 *         description: Erreur lors du vidage
 */
router.delete('/clear', async (req, res) => {
  try {
    if (!redisService.isConnected()) {
      return res.status(503).json({ message: 'Redis non connecté' });
    }

    const deleted = await redisService.delPattern('*');
    logger.info(`Cache cleared: ${deleted} keys deleted`);
    res.json({ 
      message: 'Cache vidé', 
      deletedKeys: deleted 
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({ message: 'Erreur lors du vidage du cache' });
  }
});

/**
 * @openapi
 * /admin/cache/clear/{pattern}:
 *   delete:
 *     tags:
 *       - Cache Admin
 *     summary: Vide le cache pour un pattern spécifique
 *     parameters:
 *       - in: path
 *         name: pattern
 *         required: true
 *         schema:
 *           type: string
 *         description: Pattern des clés à supprimer (ex. produits:*)
 *     responses:
 *       200:
 *         description: Cache vidé pour le pattern
 *       500:
 *         description: Erreur lors du vidage
 */
router.delete('/clear/:pattern', async (req, res) => {
  try {
    if (!redisService.isConnected()) {
      return res.status(503).json({ message: 'Redis non connecté' });
    }

    const pattern = req.params.pattern;
    const deleted = await redisService.delPattern(pattern);
    logger.info(`Cache cleared for pattern ${pattern}: ${deleted} keys deleted`);
    res.json({ 
      message: `Cache vidé pour le pattern: ${pattern}`, 
      deletedKeys: deleted 
    });
  } catch (error) {
    logger.error(`Error clearing cache for pattern ${req.params.pattern}:`, error);
    res.status(500).json({ message: 'Erreur lors du vidage du cache' });
  }
});

/**
 * @openapi
 * /admin/cache/stats:
 *   get:
 *     tags:
 *       - Cache Admin
 *     summary: Obtient des statistiques sur le cache
 *     responses:
 *       200:
 *         description: Statistiques du cache
 *       503:
 *         description: Redis non connecté
 */
router.get('/stats', async (req, res) => {
  try {
    if (!redisService.isConnected()) {
      return res.status(503).json({ message: 'Redis non connecté' });
    }

    // Compter les clés par préfixe
    const allKeys = await redisService.client.keys('*');
    const stats = {
      totalKeys: allKeys.length,
      prefixes: {}
    };

    // Analyser les préfixes
    allKeys.forEach(key => {
      const prefix = key.split(':')[0];
      stats.prefixes[prefix] = (stats.prefixes[prefix] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

/**
 * @openapi
 * /admin/cache/keys:
 *   get:
 *     tags:
 *       - Cache Admin
 *     summary: Liste toutes les clés du cache
 *     parameters:
 *       - in: query
 *         name: pattern
 *         schema:
 *           type: string
 *         description: Pattern pour filtrer les clés (défaut *)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limite du nombre de clés à retourner (défaut 100)
 *     responses:
 *       200:
 *         description: Liste des clés du cache
 *       503:
 *         description: Redis non connecté
 */
router.get('/keys', async (req, res) => {
  try {
    if (!redisService.isConnected()) {
      return res.status(503).json({ message: 'Redis non connecté' });
    }

    const pattern = req.query.pattern || '*';
    const limit = parseInt(req.query.limit) || 100;
    
    const keys = await redisService.client.keys(pattern);
    const limitedKeys = keys.slice(0, limit);
    
    res.json({
      pattern,
      totalFound: keys.length,
      returned: limitedKeys.length,
      keys: limitedKeys
    });
  } catch (error) {
    logger.error('Error listing cache keys:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des clés' });
  }
});

module.exports = router;
