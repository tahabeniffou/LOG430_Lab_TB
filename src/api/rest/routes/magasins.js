const express = require('express');
const router = express.Router();
const { getUtilisateursByMagasin, creerMagasin } = require('../controllers/magasinController');
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
router.post('/', creerMagasin);

module.exports = router;
