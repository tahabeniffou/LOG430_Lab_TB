// src/api/rest/index.js
const express = require('express');
const produitsRoutes  = require('./routes/produit');
const rapportsRoutes  = require('./routes/rapport');
const ventesRoutes = require('./routes/vente');
const utilisateursRoutes = require('./routes/utilisateur');


const router = express.Router();

router.use('/produits', produitsRoutes);
router.use('/rapports',  rapportsRoutes);
router.use('/magasins', require('./routes/magasins'));
router.use('/ventes', ventesRoutes);
router.use('/utilisateurs', utilisateursRoutes);


module.exports = router;
