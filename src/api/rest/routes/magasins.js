const express = require('express');
const router = express.Router();
const { getUtilisateursByMagasin, creerMagasin } = require('../controllers/magasinController');
const { cacheMiddleware, invalidateCacheMiddleware } = require('../../cache/cacheMiddleware');
const { cacheConfig, invalidationPatterns } = require('../../cache/cacheConfig');
const Magasin = require('../../../models/Magasin');

router.get('/', cacheMiddleware(cacheConfig.magasins.list), async (req, res) => {
  try {
    const magasins = await Magasin.findAll();
    res.json(magasins);
  } catch (err) {
    console.error('Erreur /magasins:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/:id/utilisateurs', cacheMiddleware(cacheConfig.magasins.utilisateurs), getUtilisateursByMagasin);
router.post('/', invalidateCacheMiddleware(invalidationPatterns.magasins.create), creerMagasin);

module.exports = router;
