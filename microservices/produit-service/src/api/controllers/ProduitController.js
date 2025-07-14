const Produit = require('../../domain/Produit');
const { dbOperationsTotal, httpRequestsTotal, httpRequestDuration } = require('../../utils/metrics');

class ProduitController {
  constructor(produitRepository) {
    this.produitRepository = produitRepository;
  }

  // GET /api/produits - Lister tous les produits
  async listerProduits(req, res) {
    try {
      // Incrémenter la métrique DB
      dbOperationsTotal.labels('select', 'produits', 'produit-service').inc();
      
      const { categorie, recherche, stock_faible, rupture } = req.query;
      
      let produits;
      if (rupture === 'true') {
        produits = await this.produitRepository.listerEnRupture();
      } else if (stock_faible) {
        const seuil = parseInt(stock_faible) || 10;
        produits = await this.produitRepository.listerStockFaible(seuil);
      } else if (categorie) {
        produits = await this.produitRepository.trouverParCategorie(categorie);
      } else if (recherche) {
        produits = await this.produitRepository.rechercherParNom(recherche);
      } else {
        produits = await this.produitRepository.listerTous();
      }
      
      res.json({
        success: true,
        data: produits,
        message: 'Produits récupérés avec succès',
        count: produits.length
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des produits:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des produits',
        error: error.message
      });
    }
  }

  // GET /api/produits/:id - Obtenir un produit par ID
  async obtenirProduit(req, res) {
    try {
      const { id } = req.params;
      dbOperationsTotal.labels('select', 'produits', 'produit-service').inc();
      
      const produit = await this.produitRepository.trouverParId(id);
      
      if (!produit) {
        return res.status(404).json({
          success: false,
          message: 'Produit non trouvé'
        });
      }

      res.json({
        success: true,
        data: produit,
        message: 'Produit récupéré avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du produit:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du produit',
        error: error.message
      });
    }
  }

  // POST /api/produits - Créer un nouveau produit
  async creerProduit(req, res) {
    try {
      const { nom, prix, stock, categorie } = req.body;
      
      if (!nom || prix === undefined || stock === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Le nom, le prix et le stock sont requis'
        });
      }

      dbOperationsTotal.labels('insert', 'produits', 'produit-service').inc();
      
      const nouveauProduit = new Produit(null, nom, parseFloat(prix), parseInt(stock), categorie);
      const produitSauvegarde = await this.produitRepository.sauvegarder(nouveauProduit);

      res.status(201).json({
        success: true,
        data: produitSauvegarde,
        message: 'Produit créé avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la création du produit:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du produit',
        error: error.message
      });
    }
  }

  // PUT /api/produits/:id - Mettre à jour un produit
  async mettreAJourProduit(req, res) {
    try {
      const { id } = req.params;
      const { nom, prix, stock, categorie } = req.body;

      // Vérifier si le produit existe
      const produitExistant = await this.produitRepository.trouverParId(id);
      if (!produitExistant) {
        return res.status(404).json({
          success: false,
          message: 'Produit non trouvé'
        });
      }

      dbOperationsTotal.labels('update', 'produits', 'produit-service').inc();

      // Créer le produit mis à jour
      const produitMisAJour = new Produit(
        id,
        nom || produitExistant.nom,
        prix !== undefined ? parseFloat(prix) : produitExistant.prix,
        stock !== undefined ? parseInt(stock) : produitExistant.stock,
        categorie || produitExistant.categorie
      );

      const produitSauvegarde = await this.produitRepository.sauvegarder(produitMisAJour);

      res.json({
        success: true,
        data: produitSauvegarde,
        message: 'Produit mis à jour avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du produit',
        error: error.message
      });
    }
  }

  // DELETE /api/produits/:id - Supprimer un produit
  async supprimerProduit(req, res) {
    try {
      const { id } = req.params;

      // Vérifier si le produit existe
      const produitExistant = await this.produitRepository.trouverParId(id);
      if (!produitExistant) {
        return res.status(404).json({
          success: false,
          message: 'Produit non trouvé'
        });
      }

      dbOperationsTotal.labels('delete', 'produits', 'produit-service').inc();
      
      await this.produitRepository.supprimer(id);

      res.json({
        success: true,
        message: 'Produit supprimé avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du produit:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du produit',
        error: error.message
      });
    }
  }

  // GET /api/produits/categories - Lister les catégories
  async listerCategories(req, res) {
    try {
      dbOperationsTotal.labels('select', 'produits', 'produit-service').inc();
      
      const produits = await this.produitRepository.listerTous();
      const categories = [...new Set(produits.map(p => p.categorie).filter(Boolean))];

      res.json({
        success: true,
        data: categories,
        message: 'Catégories récupérées avec succès',
        count: categories.length
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des catégories',
        error: error.message
      });
    }
  }

  // PUT /api/produits/:id/stock/decrementer - Décrémenter le stock
  async decrementerStock(req, res) {
    try {
      const { id } = req.params;
      const { quantite = 1 } = req.body;

      // Vérifier si le produit existe
      const produitExistant = await this.produitRepository.trouverParId(id);
      if (!produitExistant) {
        return res.status(404).json({
          success: false,
          message: 'Produit non trouvé'
        });
      }

      // Vérifier le stock disponible
      if (produitExistant.stock < quantite) {
        return res.status(400).json({
          success: false,
          message: 'Stock insuffisant',
          stockDisponible: produitExistant.stock,
          quantiteDemandee: quantite
        });
      }

      dbOperationsTotal.labels('update', 'produits', 'produit-service').inc();

      // Décrémenter le stock
      const produitMisAJour = new Produit(
        id,
        produitExistant.nom,
        produitExistant.prix,
        produitExistant.stock - quantite,
        produitExistant.categorie
      );

      const produitSauvegarde = await this.produitRepository.sauvegarder(produitMisAJour);

      res.json({
        success: true,
        data: produitSauvegarde,
        message: 'Stock décrémenté avec succès',
        quantiteDecrementee: quantite
      });
    } catch (error) {
      console.error('Erreur lors de la décrémentation du stock:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la décrémentation du stock',
        error: error.message
      });
    }
  }

  // PUT /api/produits/:id/stock/incrementer - Incrémenter le stock
  async incrementerStock(req, res) {
    try {
      const { id } = req.params;
      const { quantite = 1 } = req.body;

      // Vérifier si le produit existe
      const produitExistant = await this.produitRepository.trouverParId(id);
      if (!produitExistant) {
        return res.status(404).json({
          success: false,
          message: 'Produit non trouvé'
        });
      }

      dbOperationsTotal.labels('update', 'produits', 'produit-service').inc();

      // Incrémenter le stock
      const produitMisAJour = new Produit(
        id,
        produitExistant.nom,
        produitExistant.prix,
        produitExistant.stock + quantite,
        produitExistant.categorie
      );

      const produitSauvegarde = await this.produitRepository.sauvegarder(produitMisAJour);

      res.json({
        success: true,
        data: produitSauvegarde,
        message: 'Stock incrémenté avec succès',
        quantiteIncrementee: quantite
      });
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation du stock:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'incrémentation du stock',
        error: error.message
      });
    }
  }
}

module.exports = ProduitController;
