const axios = require('axios');
const promClient = require('prom-client');

// Configuration des URLs des autres microservices
const VENTE_SERVICE_URL = process.env.VENTE_SERVICE_URL || 'http://localhost:3003';
const STOCK_SERVICE_URL = process.env.STOCK_SERVICE_URL || 'http://localhost:3002';
const PRODUIT_SERVICE_URL = process.env.PRODUIT_SERVICE_URL || 'http://localhost:3001';

// Métriques personnalisées
const reportsGenerated = new promClient.Counter({
  name: 'reports_generated_total',
  help: 'Total number of reports generated',
  labelNames: ['type', 'service']
});

class ReportingController {
  constructor() {
    // Le service de reporting n'a pas besoin de repository car il agrège des données
  }

  // Fonctions utilitaires pour récupérer les données des autres services
  async obtenirDonneesVentes(magasinId = null) {
    try {
      let url = `${VENTE_SERVICE_URL}/api/ventes`;
      if (magasinId) {
        url += `?magasinId=${magasinId}`;
      }
      const response = await axios.get(url);
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des ventes:', error.message);
      return [];
    }
  }

  async obtenirDonneesStocks() {
    try {
      const response = await axios.get(`${STOCK_SERVICE_URL}/api/stocks`);
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des stocks:', error.message);
      return [];
    }
  }

  async obtenirDonneesProduits() {
    try {
      const response = await axios.get(`${PRODUIT_SERVICE_URL}/api/produits`);
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des produits:', error.message);
      return [];
    }
  }

  // GET /api/reports - Liste des rapports disponibles
  async listerRapports(req, res) {
    try {
      const rapports = [
        {
          type: 'ventes',
          nom: 'Rapport des Ventes',
          description: 'Analyse des ventes par période, magasin et produit',
          endpoint: '/api/reports/ventes'
        },
        {
          type: 'stock',
          nom: 'Rapport de Stock',
          description: 'État du stock, ruptures et alertes de réapprovisionnement',
          endpoint: '/api/reports/stock'
        },
        {
          type: 'mouvements',
          nom: 'Rapport des Mouvements',
          description: 'Historique des mouvements de stock et transactions',
          endpoint: '/api/reports/mouvements'
        },
        {
          type: 'finances',
          nom: 'Rapport Financier',
          description: 'Chiffre d\'affaires, marges et performance financière',
          endpoint: '/api/reports/finances'
        }
      ];

      res.json({
        success: true,
        data: rapports,
        message: 'Liste des rapports disponibles récupérée avec succès',
        count: rapports.length
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des rapports:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des rapports',
        error: error.message
      });
    }
  }

  // GET /api/reports/ventes - Rapport des ventes
  async genererRapportVentes(req, res) {
    try {
      const { magasinId, dateDebut, dateFin } = req.query;
      
      reportsGenerated.labels('ventes', 'reporting-service').inc();
      
      // Récupérer les données des ventes
      const ventes = await this.obtenirDonneesVentes(magasinId);
      
      // Filtrer par date si spécifié
      let ventesFiltrees = ventes;
      if (dateDebut || dateFin) {
        ventesFiltrees = ventes.filter(vente => {
          const dateVente = new Date(vente.dateCreation);
          let inclure = true;
          
          if (dateDebut) {
            inclure = inclure && dateVente >= new Date(dateDebut);
          }
          if (dateFin) {
            inclure = inclure && dateVente <= new Date(dateFin);
          }
          
          return inclure;
        });
      }

      // Calculer les statistiques
      const stats = {
        nombreVentes: ventesFiltrees.length,
        chiffreAffaires: ventesFiltrees.reduce((sum, vente) => sum + vente.total, 0),
        panierMoyen: 0,
        ventesParStatut: {},
        ventesParJour: {},
        produitsLesPlusVendus: {}
      };

      // Panier moyen
      if (ventesFiltrees.length > 0) {
        stats.panierMoyen = stats.chiffreAffaires / ventesFiltrees.length;
      }

      // Ventes par statut
      ventesFiltrees.forEach(vente => {
        if (!stats.ventesParStatut[vente.statut]) {
          stats.ventesParStatut[vente.statut] = { nombre: 0, montant: 0 };
        }
        stats.ventesParStatut[vente.statut].nombre++;
        stats.ventesParStatut[vente.statut].montant += vente.total;
      });

      // Ventes par jour
      ventesFiltrees.forEach(vente => {
        const jour = new Date(vente.dateCreation).toISOString().split('T')[0];
        if (!stats.ventesParJour[jour]) {
          stats.ventesParJour[jour] = { nombre: 0, montant: 0 };
        }
        stats.ventesParJour[jour].nombre++;
        stats.ventesParJour[jour].montant += vente.total;
      });

      // Produits les plus vendus
      ventesFiltrees.forEach(vente => {
        vente.lignes.forEach(ligne => {
          if (!stats.produitsLesPlusVendus[ligne.produitId]) {
            stats.produitsLesPlusVendus[ligne.produitId] = {
              nom: ligne.nomProduit || `Produit ${ligne.produitId}`,
              quantiteVendue: 0,
              chiffreAffaires: 0
            };
          }
          stats.produitsLesPlusVendus[ligne.produitId].quantiteVendue += ligne.quantite;
          stats.produitsLesPlusVendus[ligne.produitId].chiffreAffaires += ligne.sousTotal;
        });
      });

      res.json({
        success: true,
        data: {
          type: 'ventes',
          periode: {
            debut: dateDebut || 'Non spécifié',
            fin: dateFin || 'Non spécifié'
          },
          magasinId: magasinId || 'Tous',
          statistiques: stats,
          ventes: ventesFiltrees
        },
        message: 'Rapport des ventes généré avec succès',
        genereLe: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur lors de la génération du rapport des ventes:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du rapport des ventes',
        error: error.message
      });
    }
  }

  // GET /api/reports/stock - Rapport de stock
  async genererRapportStock(req, res) {
    try {
      reportsGenerated.labels('stock', 'reporting-service').inc();
      
      // Récupérer les données de stock
      const stocks = await this.obtenirDonneesStocks();
      
      // Calculer les statistiques
      const stats = {
        nombreProduits: stocks.length,
        valeurTotaleStock: 0,
        produitsEnRupture: [],
        produitsStockFaible: [],
        seuilAlerte: 10
      };

      // Analyser chaque stock
      for (const stock of stocks) {
        // Calculer la valeur du stock (il faudrait le prix du produit)
        // stats.valeurTotaleStock += stock.quantite * prixProduit;
        
        // Produits en rupture
        if (stock.quantite === 0) {
          stats.produitsEnRupture.push(stock);
        }
        
        // Produits avec stock faible
        if (stock.quantite > 0 && stock.quantite <= (stock.seuilMinimum || stats.seuilAlerte)) {
          stats.produitsStockFaible.push(stock);
        }
      }

      // Créer le rapport
      const rapport = {
        type: 'stock',
        statistiques: stats,
        stocks: stocks,
        alertes: {
          rupturesStock: stats.produitsEnRupture.length,
          stocksFaibles: stats.produitsStockFaible.length
        }
      };

      res.json({
        success: true,
        data: rapport,
        message: 'Rapport de stock généré avec succès',
        genereLe: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur lors de la génération du rapport de stock:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du rapport de stock',
        error: error.message
      });
    }
  }

  // GET /api/reports/mouvements - Rapport des mouvements
  async genererRapportMouvements(req, res) {
    try {
      const { dateDebut, dateFin, type } = req.query;
      
      reportsGenerated.labels('mouvements', 'reporting-service').inc();
      
      // Pour ce rapport, nous aurions besoin d'un service de mouvements de stock
      // Pour l'instant, nous simulons avec des données basées sur les ventes
      const ventes = await this.obtenirDonneesVentes();
      
      const mouvements = [];
      
      // Transformer les ventes en mouvements de sortie de stock
      ventes.forEach(vente => {
        vente.lignes.forEach(ligne => {
          mouvements.push({
            id: `vente-${vente.id}-${ligne.produitId}`,
            type: 'sortie',
            produitId: ligne.produitId,
            nomProduit: ligne.nomProduit,
            quantite: ligne.quantite,
            motif: 'Vente',
            date: vente.dateCreation,
            reference: `Vente #${vente.id}`
          });
        });
      });

      // Filtrer par date si spécifié
      let mouvementsFiltres = mouvements;
      if (dateDebut || dateFin) {
        mouvementsFiltres = mouvements.filter(mouvement => {
          const dateMouvement = new Date(mouvement.date);
          let inclure = true;
          
          if (dateDebut) {
            inclure = inclure && dateMouvement >= new Date(dateDebut);
          }
          if (dateFin) {
            inclure = inclure && dateMouvement <= new Date(dateFin);
          }
          
          return inclure;
        });
      }

      // Filtrer par type si spécifié
      if (type) {
        mouvementsFiltres = mouvementsFiltres.filter(mouvement => mouvement.type === type);
      }

      // Calculer les statistiques
      const stats = {
        nombreMouvements: mouvementsFiltres.length,
        mouvementsParType: {},
        mouvementsParJour: {}
      };

      mouvementsFiltres.forEach(mouvement => {
        // Par type
        if (!stats.mouvementsParType[mouvement.type]) {
          stats.mouvementsParType[mouvement.type] = 0;
        }
        stats.mouvementsParType[mouvement.type]++;

        // Par jour
        const jour = new Date(mouvement.date).toISOString().split('T')[0];
        if (!stats.mouvementsParJour[jour]) {
          stats.mouvementsParJour[jour] = 0;
        }
        stats.mouvementsParJour[jour]++;
      });

      res.json({
        success: true,
        data: {
          type: 'mouvements',
          periode: {
            debut: dateDebut || 'Non spécifié',
            fin: dateFin || 'Non spécifié'
          },
          statistiques: stats,
          mouvements: mouvementsFiltres
        },
        message: 'Rapport des mouvements généré avec succès',
        genereLe: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur lors de la génération du rapport des mouvements:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du rapport des mouvements',
        error: error.message
      });
    }
  }

  // GET /api/reports/finances - Rapport financier
  async genererRapportFinances(req, res) {
    try {
      const { magasinId, dateDebut, dateFin } = req.query;
      
      reportsGenerated.labels('finances', 'reporting-service').inc();
      
      // Récupérer les données
      const ventes = await this.obtenirDonneesVentes(magasinId);
      
      // Filtrer par date si spécifié
      let ventesFiltrees = ventes;
      if (dateDebut || dateFin) {
        ventesFiltrees = ventes.filter(vente => {
          const dateVente = new Date(vente.dateCreation);
          let inclure = true;
          
          if (dateDebut) {
            inclure = inclure && dateVente >= new Date(dateDebut);
          }
          if (dateFin) {
            inclure = inclure && dateVente <= new Date(dateFin);
          }
          
          return inclure;
        });
      }

      // Calculer les indicateurs financiers
      const finances = {
        chiffreAffaires: 0,
        nombreTransactions: ventesFiltrees.length,
        panierMoyen: 0,
        evolutionParMois: {},
        repartitionParStatut: {}
      };

      // Chiffre d'affaires total
      finances.chiffreAffaires = ventesFiltrees.reduce((sum, vente) => sum + vente.total, 0);

      // Panier moyen
      if (ventesFiltrees.length > 0) {
        finances.panierMoyen = finances.chiffreAffaires / ventesFiltrees.length;
      }

      // Évolution par mois
      ventesFiltrees.forEach(vente => {
        const mois = new Date(vente.dateCreation).toISOString().substring(0, 7); // YYYY-MM
        if (!finances.evolutionParMois[mois]) {
          finances.evolutionParMois[mois] = { chiffreAffaires: 0, nombreVentes: 0 };
        }
        finances.evolutionParMois[mois].chiffreAffaires += vente.total;
        finances.evolutionParMois[mois].nombreVentes++;
      });

      // Répartition par statut
      ventesFiltrees.forEach(vente => {
        if (!finances.repartitionParStatut[vente.statut]) {
          finances.repartitionParStatut[vente.statut] = { montant: 0, pourcentage: 0 };
        }
        finances.repartitionParStatut[vente.statut].montant += vente.total;
      });

      // Calculer les pourcentages
      Object.keys(finances.repartitionParStatut).forEach(statut => {
        const montant = finances.repartitionParStatut[statut].montant;
        finances.repartitionParStatut[statut].pourcentage = 
          finances.chiffreAffaires > 0 ? (montant / finances.chiffreAffaires) * 100 : 0;
      });

      res.json({
        success: true,
        data: {
          type: 'finances',
          periode: {
            debut: dateDebut || 'Non spécifié',
            fin: dateFin || 'Non spécifié'
          },
          magasinId: magasinId || 'Tous',
          indicateurs: finances
        },
        message: 'Rapport financier généré avec succès',
        genereLe: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur lors de la génération du rapport financier:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du rapport financier',
        error: error.message
      });
    }
  }
}

module.exports = ReportingController;
