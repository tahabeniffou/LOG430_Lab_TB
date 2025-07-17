// Routes API simplifiées - Architecture DDD
// ⚠️  DOMAINES MIGRES VERS MICROSERVICES : 
// - Produits -> produit-service (port 3001)
// - Ventes -> vente-service (port 3004) 
// - Stock -> stock-service (port 3002)
// - Rapports -> reporting-service (port 3005)

const express = require('express');
const ApiController = require('./ApiController');

const router = express.Router();
const apiController = new ApiController();

// === ROUTES LEGACY DESACTIVEES - FONCTIONNALITÉS MIGRÉES ===
// Routes Produits -> MIGRÉ vers produit-service
// router.get('/produits', (req, res, next) => apiController.listerProduits(req, res, next));
// router.get('/produits/:id', (req, res, next) => apiController.obtenirProduit(req, res, next));
// router.get('/produits/:produitId/stock', (req, res, next) => apiController.obtenirStock(req, res, next));

// Routes Ventes -> MIGRÉ vers vente-service
// router.get('/ventes', (req, res, next) => apiController.listerVentes(req, res, next));
// router.get('/ventes/:id', (req, res, next) => apiController.obtenirVente(req, res, next));
// router.post('/ventes', (req, res, next) => apiController.creerVente(req, res, next));
// router.post('/ventes/:id/annuler', (req, res, next) => apiController.annulerVente(req, res, next));

// Routes Rapports -> MIGRÉ vers reporting-service
// router.get('/rapports', (req, res, next) => apiController.genererRapports(req, res, next));

// === ROUTES LEGACY ACTIVES - NON MIGRÉES ===

// Routes Utilisateurs (via ApiController)
router.get('/utilisateurs', (req, res, next) => apiController.listerUtilisateurs(req, res, next));

// Route Health Check
router.get('/health', (req, res, next) => apiController.healthCheck(req, res, next));

module.exports = router;
