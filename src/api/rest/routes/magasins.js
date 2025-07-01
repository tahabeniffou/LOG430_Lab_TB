const express = require('express');
const router = express.Router();
const { getUtilisateursByMagasin } = require('../controllers/magasinController');
const Magasin = require('../../../models/Magasin');

router.get('/', async (req, res) => {
  try {
    const magasins = await Magasin.findAll();
    res.json(magasins);
  } catch (err) {
    console.error('Erreur /magasins:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/:id/utilisateurs', getUtilisateursByMagasin);
router.post('/', async (req, res) => {
  try {
    const { nom, adresse } = req.body;
    if (!nom || !adresse) {
      return res.status(400).json({ message: 'Nom et adresse requis' });
    }
    const magasin = await Magasin.create({ nom, adresse });
    res.status(201).json(magasin);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
