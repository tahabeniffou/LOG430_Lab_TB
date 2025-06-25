// src/api/rest/index.js
const express = require('express');
const produitsRoutes  = require('./routes/produit');
const rapportsRoutes  = require('./routes/rapport');


const router = express.Router();

router.use('/produits', produitsRoutes);
router.use('/rapports',  rapportsRoutes);
router.use('/magasins', require('./routes/magasins'));


module.exports = router; 
