const express = require('express');
const StockController = require('./controllers/StockController');

function createStockRoutes(stockRepository) {
  const router = express.Router();
  const stockController = new StockController(stockRepository);

  // Routes pour les stocks
  router.get('/stocks', (req, res) => stockController.listerStocks(req, res));
  router.get('/stocks/:id', (req, res) => stockController.obtenirStock(req, res));
  router.get('/stocks/produit/:produitId', (req, res) => stockController.obtenirStockProduit(req, res));
  router.post('/stocks', (req, res) => stockController.creerStock(req, res));
  router.put('/stocks/:id', (req, res) => stockController.mettreAJourStock(req, res));
  router.put('/stocks/produit/:produitId/ajuster', (req, res) => stockController.ajusterStock(req, res));
  router.delete('/stocks/:id', (req, res) => stockController.supprimerStock(req, res));

  return router;
}

module.exports = createStockRoutes;
