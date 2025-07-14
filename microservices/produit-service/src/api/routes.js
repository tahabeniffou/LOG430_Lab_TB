const express = require('express');
const ProduitController = require('./controllers/ProduitController');

function createProduitRoutes(produitRepository) {
  const router = express.Router();
  const produitController = new ProduitController(produitRepository);

  // Routes pour les produits
  router.get('/produits', (req, res) => produitController.listerProduits(req, res));
  router.get('/produits/categories', (req, res) => produitController.listerCategories(req, res));
  router.get('/produits/:id', (req, res) => produitController.obtenirProduit(req, res));
  router.post('/produits', (req, res) => produitController.creerProduit(req, res));
  router.put('/produits/:id', (req, res) => produitController.mettreAJourProduit(req, res));
  router.delete('/produits/:id', (req, res) => produitController.supprimerProduit(req, res));
  
  // Routes pour la gestion du stock
  router.put('/produits/:id/stock/decrementer', (req, res) => produitController.decrementerStock(req, res));
  router.put('/produits/:id/stock/incrementer', (req, res) => produitController.incrementerStock(req, res));

  return router;
}

module.exports = createProduitRoutes;