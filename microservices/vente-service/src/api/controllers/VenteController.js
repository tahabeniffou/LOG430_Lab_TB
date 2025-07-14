const axios = require('axios');
const promClient = require('prom-client');

// Configuration des URLs des autres microservices
const PRODUIT_SERVICE_URL = process.env.PRODUIT_SERVICE_URL || 'http://localhost:3001';
const STOCK_SERVICE_URL = process.env.STOCK_SERVICE_URL || 'http://localhost:3002';

// Métriques personnalisées
const venteOperationsTotal = new promClient.Counter({
  name: 'vente_operations_total',
  help: 'Total number of vente operations',
  labelNames: ['operation', 'service']
});

class VenteController {
  constructor(venteRepository) {
    this.venteRepository = venteRepository;
  }

  // Fonctions utilitaires pour communiquer avec les autres microservices
  async verifierProduitExiste(produitId) {
    try {
      const response = await axios.get(`${PRODUIT_SERVICE_URL}/api/produits/${produitId}`);
      return response.data.success ? response.data.data : null;
    } catch (error) {
      console.error(`Erreur lors de la vérification du produit ${produitId}:`, error.message);
      return null;
    }
  }

  async decrementerStockProduit(produitId, quantite) {
    try {
      const response = await axios.put(`${STOCK_SERVICE_URL}/api/stocks/produit/${produitId}/ajuster`, {
        quantite: quantite,
        operation: 'subtract'
      });
      return response.data.success;
    } catch (error) {
      console.error(`Erreur lors de la décrémentation du stock pour produit ${produitId}:`, error.message);
      return false;
    }
  }

  // GET /api/ventes - Lister toutes les ventes
  async listerVentes(req, res) {
    try {
      const { magasinId, utilisateurId, statut } = req.query;
      
      venteOperationsTotal.labels('list', 'vente-service').inc();
      
      let ventes;
      if (magasinId) {
        ventes = await this.venteRepository.listerParMagasin(magasinId);
      } else if (utilisateurId) {
        ventes = await this.venteRepository.listerParUtilisateur(utilisateurId);
      } else {
        ventes = await this.venteRepository.listerToutes();
      }

      // Filtrer par statut si spécifié
      if (statut) {
        ventes = ventes.filter(vente => vente.statut === statut);
      }

      res.json({
        success: true,
        data: ventes,
        message: 'Ventes récupérées avec succès',
        count: ventes.length
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des ventes:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des ventes',
        error: error.message
      });
    }
  }

  // GET /api/ventes/:id - Obtenir une vente par ID
  async obtenirVente(req, res) {
    try {
      const { id } = req.params;
      venteOperationsTotal.labels('get', 'vente-service').inc();
      
      const vente = await this.venteRepository.trouverParId(id);
      
      if (!vente) {
        return res.status(404).json({
          success: false,
          message: 'Vente non trouvée'
        });
      }

      res.json({
        success: true,
        data: vente,
        message: 'Vente récupérée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de la vente:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la vente',
        error: error.message
      });
    }
  }

  // POST /api/ventes - Créer une nouvelle vente
  async creerVente(req, res) {
    try {
      const { magasinId, utilisateurId, lignes } = req.body;
      
      if (!magasinId || !utilisateurId || !lignes || !Array.isArray(lignes) || lignes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'magasinId, utilisateurId et lignes (non vide) sont requis'
        });
      }

      venteOperationsTotal.labels('create', 'vente-service').inc();

      // Vérifier et calculer les lignes de vente
      let total = 0;
      const lignesValidees = [];

      for (const ligne of lignes) {
        const { produitId, quantite, prixUnitaire } = ligne;

        if (!produitId || !quantite || !prixUnitaire) {
          return res.status(400).json({
            success: false,
            message: 'Chaque ligne doit avoir produitId, quantite et prixUnitaire'
          });
        }

        // Vérifier que le produit existe
        const produit = await this.verifierProduitExiste(produitId);
        if (!produit) {
          return res.status(400).json({
            success: false,
            message: `Produit avec ID ${produitId} non trouvé`
          });
        }

        const sousTotal = quantite * prixUnitaire;
        total += sousTotal;

        lignesValidees.push({
          produitId: parseInt(produitId),
          nomProduit: produit.nom,
          quantite: parseInt(quantite),
          prixUnitaire: parseFloat(prixUnitaire),
          sousTotal: sousTotal
        });
      }

      // Créer la vente
      const nouvelleVente = {
        magasinId: parseInt(magasinId),
        utilisateurId: parseInt(utilisateurId),
        lignes: lignesValidees,
        total: total,
        statut: 'en_cours',
        dateCreation: new Date().toISOString(),
        dateMiseAJour: new Date().toISOString()
      };

      const venteSauvegardee = await this.venteRepository.sauvegarder(nouvelleVente);

      res.status(201).json({
        success: true,
        data: venteSauvegardee,
        message: 'Vente créée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la création de la vente:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la vente',
        error: error.message
      });
    }
  }

  // PUT /api/ventes/:id - Mettre à jour une vente
  async mettreAJourVente(req, res) {
    try {
      const { id } = req.params;
      const { statut, lignes } = req.body;

      // Vérifier si la vente existe
      const venteExistante = await this.venteRepository.trouverParId(id);
      if (!venteExistante) {
        return res.status(404).json({
          success: false,
          message: 'Vente non trouvée'
        });
      }

      venteOperationsTotal.labels('update', 'vente-service').inc();

      // Mise à jour du statut si fourni
      if (statut) {
        venteExistante.statut = statut;
      }

      // Mise à jour des lignes si fournies
      if (lignes && Array.isArray(lignes)) {
        let total = 0;
        const lignesValidees = [];

        for (const ligne of lignes) {
          const { produitId, quantite, prixUnitaire } = ligne;
          const sousTotal = quantite * prixUnitaire;
          total += sousTotal;

          lignesValidees.push({
            produitId: parseInt(produitId),
            quantite: parseInt(quantite),
            prixUnitaire: parseFloat(prixUnitaire),
            sousTotal: sousTotal
          });
        }

        venteExistante.lignes = lignesValidees;
        venteExistante.total = total;
      }

      venteExistante.dateMiseAJour = new Date().toISOString();

      const venteSauvegardee = await this.venteRepository.sauvegarder(venteExistante);

      res.json({
        success: true,
        data: venteSauvegardee,
        message: 'Vente mise à jour avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la vente:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour de la vente',
        error: error.message
      });
    }
  }

  // DELETE /api/ventes/:id - Supprimer une vente
  async supprimerVente(req, res) {
    try {
      const { id } = req.params;

      // Vérifier si la vente existe
      const venteExistante = await this.venteRepository.trouverParId(id);
      if (!venteExistante) {
        return res.status(404).json({
          success: false,
          message: 'Vente non trouvée'
        });
      }

      venteOperationsTotal.labels('delete', 'vente-service').inc();
      
      await this.venteRepository.supprimer(id);

      res.json({
        success: true,
        message: 'Vente supprimée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de la vente:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression de la vente',
        error: error.message
      });
    }
  }

  // POST /api/ventes/:id/lignes - Ajouter une ligne à une vente
  async ajouterLigne(req, res) {
    try {
      const { id } = req.params;
      const { produitId, quantite, prixUnitaire } = req.body;

      if (!produitId || !quantite || !prixUnitaire) {
        return res.status(400).json({
          success: false,
          message: 'produitId, quantite et prixUnitaire sont requis'
        });
      }

      // Vérifier si la vente existe
      const venteExistante = await this.venteRepository.trouverParId(id);
      if (!venteExistante) {
        return res.status(404).json({
          success: false,
          message: 'Vente non trouvée'
        });
      }

      // Vérifier que le produit existe
      const produit = await this.verifierProduitExiste(produitId);
      if (!produit) {
        return res.status(400).json({
          success: false,
          message: `Produit avec ID ${produitId} non trouvé`
        });
      }

      venteOperationsTotal.labels('add-line', 'vente-service').inc();

      const sousTotal = quantite * prixUnitaire;

      // Ajouter la nouvelle ligne
      const nouvelleLigne = {
        produitId: parseInt(produitId),
        nomProduit: produit.nom,
        quantite: parseInt(quantite),
        prixUnitaire: parseFloat(prixUnitaire),
        sousTotal: sousTotal
      };

      venteExistante.lignes.push(nouvelleLigne);
      venteExistante.total += sousTotal;
      venteExistante.dateMiseAJour = new Date().toISOString();

      const venteSauvegardee = await this.venteRepository.sauvegarder(venteExistante);

      res.json({
        success: true,
        data: venteSauvegardee,
        message: 'Ligne ajoutée à la vente avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de ligne à la vente:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'ajout de ligne à la vente',
        error: error.message
      });
    }
  }

  // PUT /api/ventes/:id/annuler - Annuler une vente
  async annulerVente(req, res) {
    try {
      const { id } = req.params;

      // Vérifier si la vente existe
      const venteExistante = await this.venteRepository.trouverParId(id);
      if (!venteExistante) {
        return res.status(404).json({
          success: false,
          message: 'Vente non trouvée'
        });
      }

      if (venteExistante.statut === 'annulee') {
        return res.status(400).json({
          success: false,
          message: 'La vente est déjà annulée'
        });
      }

      venteOperationsTotal.labels('cancel', 'vente-service').inc();

      venteExistante.statut = 'annulee';
      venteExistante.dateMiseAJour = new Date().toISOString();

      const venteSauvegardee = await this.venteRepository.sauvegarder(venteExistante);

      res.json({
        success: true,
        data: venteSauvegardee,
        message: 'Vente annulée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de l\'annulation de la vente:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'annulation de la vente',
        error: error.message
      });
    }
  }

  // GET /api/ventes/statistiques/magasin/:magasinId - Statistiques des ventes d'un magasin
  async obtenirStatistiquesMagasin(req, res) {
    try {
      const { magasinId } = req.params;
      
      venteOperationsTotal.labels('stats', 'vente-service').inc();
      
      const ventes = await this.venteRepository.listerParMagasin(magasinId);
      
      const stats = {
        nombreVentes: ventes.length,
        chiffreAffaires: ventes.reduce((sum, vente) => sum + vente.total, 0),
        ventesParStatut: {},
        panierMoyen: 0
      };

      // Calculer les ventes par statut
      ventes.forEach(vente => {
        if (!stats.ventesParStatut[vente.statut]) {
          stats.ventesParStatut[vente.statut] = 0;
        }
        stats.ventesParStatut[vente.statut]++;
      });

      // Calculer le panier moyen
      if (ventes.length > 0) {
        stats.panierMoyen = stats.chiffreAffaires / ventes.length;
      }

      res.json({
        success: true,
        data: stats,
        message: 'Statistiques du magasin récupérées avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      });
    }
  }
}

module.exports = VenteController;
