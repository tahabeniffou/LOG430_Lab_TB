// Routes API simplifiées - Architecture DDD
const express = require('express');
const ApiController = require('./ApiController');

const router = express.Router();
const apiController = new ApiController();

// Routes Produits
router.get('/produits', (req, res, next) => apiController.listerProduits(req, res, next));
router.get('/produits/:id', (req, res, next) => apiController.obtenirProduit(req, res, next));
router.get('/produits/:produitId/stock', (req, res, next) => apiController.obtenirStock(req, res, next));

// Routes Ventes
router.get('/ventes', (req, res, next) => apiController.listerVentes(req, res, next));
router.get('/ventes/:id', (req, res, next) => apiController.obtenirVente(req, res, next)); // Ajout de la route
router.post('/ventes', (req, res, next) => apiController.creerVente(req, res, next));
router.post('/ventes/:id/annuler', (req, res, next) => apiController.annulerVente(req, res, next));

// Routes Magasins (via ApiController)
router.get('/magasins', (req, res, next) => apiController.listerMagasins(req, res, next));

// Routes Rapports (via ApiController)
router.get('/rapports', (req, res, next) => apiController.genererRapports(req, res, next));

// Routes Utilisateurs (via ApiController)
router.get('/utilisateurs', (req, res, next) => apiController.listerUtilisateurs(req, res, next));

// Route Health Check
router.get('/health', (req, res, next) => apiController.healthCheck(req, res, next));

module.exports = router;
