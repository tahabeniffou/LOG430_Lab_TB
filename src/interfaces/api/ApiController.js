// Contrôleur unifié pour l'API - Architecture DDD
// ⚠️  DOMAINES MIGRES VERS MICROSERVICES :
// - Produits/Stock -> produit-service (port 3001)
// - Ventes -> vente-service (port 3004)
// - Rapports -> reporting-service (port 3005)

const ApplicationService = require('../../application/ApplicationService');
const db = require('../../models');

class ApiController {
  constructor() {
    this.applicationService = new ApplicationService(db);
  }

  // === MÉTHODES DÉSACTIVÉES - DOMAINES MIGRES ===
  
  // Produits -> MIGRÉ vers produit-service
  async listerProduits(req, res, next) {
    return res.status(410).json({
      error: 'LEGACY_DEACTIVATED',
      message: 'Fonctionnalité migrée vers produit-service',
      microservice: 'http://localhost:3001/api/produits',
      redirect_via: 'http://localhost:8000/api/v1/produits (Load Balancer)'
    });
  }

  async obtenirProduit(req, res, next) {
    return res.status(410).json({
      error: 'LEGACY_DEACTIVATED',
      message: 'Fonctionnalité migrée vers produit-service',
      microservice: `http://localhost:3001/api/produits/${req.params.id}`,
      redirect_via: `http://localhost:8000/api/v1/produits/${req.params.id} (Load Balancer)`
    });
  }

  async obtenirStock(req, res, next) {
    return res.status(410).json({
      error: 'LEGACY_DEACTIVATED',
      message: 'Fonctionnalité migrée vers stock-service via produit-service',
      microservice: `http://localhost:3001/api/produits/${req.params.produitId}/stock`,
      redirect_via: `http://localhost:8000/api/v1/produits/${req.params.produitId}/stock (Load Balancer)`
    });
  }

  // Ventes -> MIGRÉ vers vente-service
  async listerVentes(req, res, next) {
    const query = req.query.magasinId ? `?magasinId=${req.query.magasinId}` : '';
    return res.status(410).json({
      error: 'LEGACY_DEACTIVATED',
      message: 'Fonctionnalité migrée vers vente-service',
      microservice: `http://localhost:3004/api/ventes${query}`,
      redirect_via: `http://localhost:8000/api/v1/ventes${query} (Load Balancer)`
    });
  }

  async obtenirVente(req, res, next) {
    return res.status(410).json({
      error: 'LEGACY_DEACTIVATED',
      message: 'Fonctionnalité migrée vers vente-service',
      microservice: `http://localhost:3004/api/ventes/${req.params.id}`,
      redirect_via: `http://localhost:8000/api/v1/ventes/${req.params.id} (Load Balancer)`
    });
  }

  async creerVente(req, res, next) {
    return res.status(410).json({
      error: 'LEGACY_DEACTIVATED',
      message: 'Fonctionnalité migrée vers vente-service',
      microservice: 'http://localhost:3004/api/ventes',
      redirect_via: 'http://localhost:8000/api/v1/ventes (Load Balancer)',
      method: 'POST'
    });
  }

  async annulerVente(req, res, next) {
    return res.status(410).json({
      error: 'LEGACY_DEACTIVATED',
      message: 'Fonctionnalité migrée vers vente-service',
      microservice: `http://localhost:3004/api/ventes/${req.params.id}/annuler`,
      redirect_via: `http://localhost:8000/api/v1/ventes/${req.params.id}/annuler (Load Balancer)`,
      method: 'POST'
    });
  }

  // Rapports -> MIGRÉ vers reporting-service
  async genererRapports(req, res, next) {
    return res.status(410).json({
      error: 'LEGACY_DEACTIVATED',
      message: 'Fonctionnalité migrée vers reporting-service',
      microservice: 'http://localhost:3005/api/reports',
      redirect_via: 'http://localhost:8000/api/v1/reports (Load Balancer)'
    });
  }

  // === MÉTHODES ACTIVES - DOMAINES NON MIGRES ===

  // Health Check
  async healthCheck(req, res, next) {
    try {
      res.json({ status: 'OK', date: new Date() });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ApiController;
