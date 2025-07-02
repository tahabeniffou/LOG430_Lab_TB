// src/api/rest/index.js
const express = require('express');
const produitsRoutes  = require('./routes/produit');
const rapportsRoutes  = require('./routes/rapport');
const ventesRoutes = require('./routes/vente');
const utilisateursRoutes = require('./routes/utilisateur');
const logistiqueRoutes = require('./routes/logistique');


const router = express.Router();

router.use('/produits', produitsRoutes);
router.use('/rapports',  rapportsRoutes);
router.use('/magasins', require('./routes/magasins'));
router.use('/ventes', ventesRoutes);
router.use('/utilisateurs', utilisateursRoutes);
router.use('/logistique', logistiqueRoutes);


module.exports = router;
