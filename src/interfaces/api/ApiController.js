// Contrôleur unifié pour l'API - Architecture DDD
const ApplicationService = require('../../application/ApplicationService');

class ApiController {
  constructor() {
    this.applicationService = new ApplicationService();
  }

  // Produits
  async listerProduits(req, res, next) {
    try {
      const { categorie, nom } = req.query;
      const produits = await this.applicationService.listerProduits({ categorie, nom });
      res.json(produits);
    } catch (error) {
      next(error);
    }
  }

  async obtenirProduit(req, res, next) {
    try {
      const produit = await this.applicationService.obtenirProduit(req.params.id);
      if (!produit) {
        return res.status(404).json({ message: 'Produit non trouvé' });
      }
      res.json(produit);
    } catch (error) {
      next(error);
    }
  }

  // Ventes
  async listerVentes(req, res, next) {
    try {
      const { magasinId } = req.query;
      const ventes = await this.applicationService.consulterVentes(magasinId);
      res.json(ventes);
    } catch (error) {
      next(error);
    }
  }

  async creerVente(req, res, next) {
    try {
      const vente = await this.applicationService.creerVente(req.body);
      res.status(201).json(vente);
    } catch (error) {
      next(error);
    }
  }

  async annulerVente(req, res, next) {
    try {
      const vente = await this.applicationService.annulerVente(req.params.id);
      res.json(vente);
    } catch (error) {
      next(error);
    }
  }

  // Stock
  async obtenirStock(req, res, next) {
    try {
      const stock = await this.applicationService.obtenirStock(req.params.produitId);
      res.json({ stock });
    } catch (error) {
      next(error);
    }
  }

  // Magasins
  async listerMagasins(req, res, next) {
    try {
      const { Magasin } = require('../../models');
      const magasins = await Magasin.findAll();
      res.json(magasins);
    } catch (error) {
      next(error);
    }
  }

  // Utilisateurs
  async listerUtilisateurs(req, res, next) {
    try {
      const { Utilisateur } = require('../../models');
      const { magasinId } = req.query;
      const where = magasinId ? { magasinId } : {};
      const utilisateurs = await Utilisateur.findAll({ where });
      res.json(utilisateurs);
    } catch (error) {
      next(error);
    }
  }

  // Rapports
  async genererRapports(req, res, next) {
    try {
      const { Vente, Magasin, Utilisateur } = require('../../models');
      
      // Rapport simple des ventes par magasin
      const ventesParMagasin = await Vente.findAll({
        include: [
          { model: Magasin, attributes: ['nom'] },
          { model: Utilisateur, attributes: ['nom', 'prenom'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      const resume = {
        totalVentes: ventesParMagasin.length,
        chiffreAffaireTotal: ventesParMagasin.reduce((sum, v) => sum + parseFloat(v.total), 0),
        ventes: ventesParMagasin
      };

      res.json(resume);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ApiController;
