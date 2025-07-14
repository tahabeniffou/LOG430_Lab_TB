const promClient = require('prom-client');

// Métrique pour les opérations de stock
const stockOperationsTotal = new promClient.Counter({
  name: 'stock_operations_total',
  help: 'Total number of stock operations',
  labelNames: ['operation', 'service']
});

class StockController {
  constructor(stockRepository) {
    this.stockRepository = stockRepository;
  }

  // GET /api/stocks - Obtenir tous les stocks
  async listerStocks(req, res) {
    try {
      stockOperationsTotal.labels('list', 'stock-service').inc();
      
      const stocks = await this.stockRepository.listerTous();
      
      res.json({
        success: true,
        data: stocks,
        message: 'Stocks récupérés avec succès',
        count: stocks.length
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des stocks:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des stocks',
        error: error.message
      });
    }
  }

  // GET /api/stocks/:id - Obtenir un stock par ID
  async obtenirStock(req, res) {
    try {
      const { id } = req.params;
      stockOperationsTotal.labels('get', 'stock-service').inc();
      
      const stock = await this.stockRepository.trouverParId(id);
      
      if (!stock) {
        return res.status(404).json({
          success: false,
          message: 'Stock non trouvé'
        });
      }

      res.json({
        success: true,
        data: stock,
        message: 'Stock récupéré avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du stock:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du stock',
        error: error.message
      });
    }
  }

  // GET /api/stocks/produit/:produitId - Obtenir le stock d'un produit
  async obtenirStockProduit(req, res) {
    try {
      const { produitId } = req.params;
      stockOperationsTotal.labels('get-by-product', 'stock-service').inc();
      
      const stock = await this.stockRepository.trouverParProduitId(produitId);
      
      if (!stock) {
        return res.status(404).json({
          success: false,
          message: 'Stock non trouvé pour ce produit'
        });
      }

      res.json({
        success: true,
        data: stock,
        message: 'Stock du produit récupéré avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du stock produit:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du stock produit',
        error: error.message
      });
    }
  }

  // POST /api/stocks - Créer un nouveau stock
  async creerStock(req, res) {
    try {
      const { produitId, quantite, seuilMinimum, magasinId } = req.body;
      
      if (!produitId || quantite === undefined || !magasinId) {
        return res.status(400).json({
          success: false,
          message: 'produitId, quantite et magasinId sont requis'
        });
      }

      stockOperationsTotal.labels('create', 'stock-service').inc();
      
      const nouveauStock = {
        produitId: parseInt(produitId),
        quantite: parseInt(quantite),
        seuilMinimum: parseInt(seuilMinimum) || 10,
        magasinId: parseInt(magasinId),
        derniereMiseAJour: new Date().toISOString()
      };

      const stockSauvegarde = await this.stockRepository.sauvegarder(nouveauStock);

      res.status(201).json({
        success: true,
        data: stockSauvegarde,
        message: 'Stock créé avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la création du stock:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du stock',
        error: error.message
      });
    }
  }

  // PUT /api/stocks/:id - Mettre à jour un stock
  async mettreAJourStock(req, res) {
    try {
      const { id } = req.params;
      const { quantite, seuilMinimum } = req.body;

      // Vérifier si le stock existe
      const stockExistant = await this.stockRepository.trouverParId(id);
      if (!stockExistant) {
        return res.status(404).json({
          success: false,
          message: 'Stock non trouvé'
        });
      }

      stockOperationsTotal.labels('update', 'stock-service').inc();

      // Créer le stock mis à jour
      const stockMisAJour = {
        ...stockExistant,
        quantite: quantite !== undefined ? parseInt(quantite) : stockExistant.quantite,
        seuilMinimum: seuilMinimum !== undefined ? parseInt(seuilMinimum) : stockExistant.seuilMinimum,
        derniereMiseAJour: new Date().toISOString()
      };

      const stockSauvegarde = await this.stockRepository.sauvegarder(stockMisAJour);

      res.json({
        success: true,
        data: stockSauvegarde,
        message: 'Stock mis à jour avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du stock:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du stock',
        error: error.message
      });
    }
  }

  // PUT /api/stocks/produit/:produitId/ajuster - Ajuster le stock d'un produit
  async ajusterStock(req, res) {
    try {
      const { produitId } = req.params;
      const { quantite, operation = 'set' } = req.body;

      if (quantite === undefined) {
        return res.status(400).json({
          success: false,
          message: 'La quantité est requise'
        });
      }

      // Vérifier si le stock existe
      const stockExistant = await this.stockRepository.trouverParProduitId(produitId);
      if (!stockExistant) {
        return res.status(404).json({
          success: false,
          message: 'Stock non trouvé pour ce produit'
        });
      }

      stockOperationsTotal.labels('adjust', 'stock-service').inc();

      let nouvelleQuantite;
      switch (operation) {
        case 'add':
          nouvelleQuantite = stockExistant.quantite + parseInt(quantite);
          break;
        case 'subtract':
          nouvelleQuantite = Math.max(0, stockExistant.quantite - parseInt(quantite));
          break;
        case 'set':
        default:
          nouvelleQuantite = parseInt(quantite);
          break;
      }

      const stockMisAJour = {
        ...stockExistant,
        quantite: nouvelleQuantite,
        derniereMiseAJour: new Date().toISOString()
      };

      const stockSauvegarde = await this.stockRepository.sauvegarder(stockMisAJour);

      res.json({
        success: true,
        data: stockSauvegarde,
        message: `Stock ajusté avec succès (${operation})`,
        ancienneQuantite: stockExistant.quantite,
        nouvelleQuantite: nouvelleQuantite
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajustement du stock:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'ajustement du stock',
        error: error.message
      });
    }
  }

  // DELETE /api/stocks/:id - Supprimer un stock
  async supprimerStock(req, res) {
    try {
      const { id } = req.params;

      // Vérifier si le stock existe
      const stockExistant = await this.stockRepository.trouverParId(id);
      if (!stockExistant) {
        return res.status(404).json({
          success: false,
          message: 'Stock non trouvé'
        });
      }

      stockOperationsTotal.labels('delete', 'stock-service').inc();
      
      await this.stockRepository.supprimer(id);

      res.json({
        success: true,
        message: 'Stock supprimé avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du stock:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du stock',
        error: error.message
      });
    }
  }
}

module.exports = StockController;
