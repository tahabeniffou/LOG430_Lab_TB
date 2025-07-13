const { Router } = require('express');
const { Produit, Vente, Utilisateur, Magasin } = require('../models');
const { Op } = require('sequelize');

const router = Router();

// Endpoint pour lister les produits d'un magasin
router.get('/produits', async (req, res, next) => {
  try {
    const { magasinId } = req.query;
    if (!magasinId) {
      return res.status(400).json({ error: 'magasinId est requis' });
    }
    const produits = await Produit.findAll({ where: { MagasinId: magasinId } });
    res.json(produits);
  } catch (error) {
    next(error);
  }
});

// ... (d'autres endpoints peuvent être ajoutés ici)

module.exports = router;
