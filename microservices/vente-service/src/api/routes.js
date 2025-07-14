const express = require('express');
const VenteController = require('./controllers/VenteController');

function createVenteRoutes(venteRepository) {
  const router = express.Router();
  const venteController = new VenteController(venteRepository);

  // Routes pour les ventes
  router.get('/ventes', (req, res) => venteController.listerVentes(req, res));
  router.get('/ventes/statistiques/magasin/:magasinId', (req, res) => venteController.obtenirStatistiquesMagasin(req, res));
  router.get('/ventes/:id', (req, res) => venteController.obtenirVente(req, res));
  router.post('/ventes', (req, res) => venteController.creerVente(req, res));
  router.put('/ventes/:id', (req, res) => venteController.mettreAJourVente(req, res));
  router.delete('/ventes/:id', (req, res) => venteController.supprimerVente(req, res));
  
  // Routes pour la gestion des lignes de vente
  router.post('/ventes/:id/lignes', (req, res) => venteController.ajouterLigne(req, res));
  router.put('/ventes/:id/annuler', (req, res) => venteController.annulerVente(req, res));

  return router;
}

module.exports = createVenteRoutes;
