const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const client = require('prom-client');
require('dotenv').config();

// Import de la logique métier du microservice
const Vente = require('./src/domain/Vente');
const LigneVente = require('./src/domain/LigneVente');
const VenteRepository = require('./src/domain/VenteRepository');
const SequelizeVenteRepository = require('./src/infrastructure/SequelizeVenteRepository');
const { sequelize } = require('./src/infrastructure/database');

const app = express();
const PORT = process.env.PORT || 3003;

// Configuration des autres microservices
const PRODUIT_SERVICE_URL = process.env.PRODUIT_SERVICE_URL || 'http://localhost:3001';
const UTILISATEUR_SERVICE_URL = process.env.UTILISATEUR_SERVICE_URL || 'http://localhost:3003';
const MAGASIN_SERVICE_URL = process.env.MAGASIN_SERVICE_URL || 'http://localhost:3002';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Repository implementation temporaire (en mémoire)
class InMemoryVenteRepository extends VenteRepository {
  constructor() {
    super();
    this.ventes = new Map();
    this.nextId = 1;
    
    // Données de test
    this.initializeTestData();
  }

  initializeTestData() {
    const vente1 = new Vente(1, 1, 1, [
      { produitId: 1, quantite: 2, prixUnitaire: 10.99, prixTotal: 21.98 },
      { produitId: 2, quantite: 1, prixUnitaire: 15.50, prixTotal: 15.50 }
    ], 'terminee', 37.48);
    
    const vente2 = new Vente(2, 1, 2, [
      { produitId: 1, quantite: 1, prixUnitaire: 10.99, prixTotal: 10.99 }
    ], 'en_cours', 10.99);
    
    this.ventes.set(1, vente1);
    this.ventes.set(2, vente2);
    this.nextId = 3;
  }

  async sauvegarder(vente) {
    if (!vente.id) {
      vente.id = this.nextId++;
    }
    vente.updateTimestamp();
    this.ventes.set(vente.id, vente);
    return vente;
  }

  async trouverParId(id) {
    return this.ventes.get(parseInt(id)) || null;
  }

  async listerParMagasin(magasinId) {
    return Array.from(this.ventes.values()).filter(vente => vente.magasinId == magasinId);
  }

  async listerToutes() {
    return Array.from(this.ventes.values());
  }

  async supprimer(id) {
    return this.ventes.delete(parseInt(id));
  }

  async listerParUtilisateur(utilisateurId) {
    return Array.from(this.ventes.values()).filter(vente => vente.utilisateurId == utilisateurId);
  }
}

const venteRepository = new InMemoryVenteRepository();

// Fonctions utilitaires pour communiquer avec les autres microservices
async function verifierProduitExiste(produitId) {
  try {
    const response = await axios.get(`${PRODUIT_SERVICE_URL}/api/produits/${produitId}`);
    return response.data.success ? response.data.data : null;
  } catch (error) {
    console.error(`Erreur lors de la vérification du produit ${produitId}:`, error.message);
    return null;
  }
}

async function verifierUtilisateurExiste(utilisateurId) {
  try {
    const response = await axios.get(`${UTILISATEUR_SERVICE_URL}/api/utilisateurs/${utilisateurId}`);
    return response.data.success ? response.data.data : null;
  } catch (error) {
    console.error(`Erreur lors de la vérification de l'utilisateur ${utilisateurId}:`, error.message);
    return null;
  }
}

async function verifierMagasinExiste(magasinId) {
  try {
    const response = await axios.get(`${MAGASIN_SERVICE_URL}/api/magasins/${magasinId}`);
    return response.data.success ? response.data.data : null;
  } catch (error) {
    console.error(`Erreur lors de la vérification du magasin ${magasinId}:`, error.message);
    return null;
  }
}

// Création d'un registre de métriques
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Exemple de compteur HTTP
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requêtes HTTP',
  labelNames: ['method', 'route', 'status'],
});
register.registerMetric(httpRequestCounter);

// Middleware pour incrémenter le compteur
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, route: req.path, status: res.statusCode });
  });
  next();
});

// Routes API REST

// GET /api/ventes - Lister toutes les ventes
app.get('/api/ventes', async (req, res) => {
  try {
    const { magasinId, utilisateurId, statut } = req.query;
    
    let ventes;
    if (magasinId) {
      ventes = await venteRepository.listerParMagasin(magasinId);
    } else if (utilisateurId) {
      ventes = await venteRepository.listerParUtilisateur(utilisateurId);
    } else {
      ventes = await venteRepository.listerToutes();
    }
    
    // Filtrer par statut si fourni
    if (statut) {
      ventes = ventes.filter(vente => vente.statut === statut);
    }
    
    res.json({
      success: true,
      data: ventes,
      message: 'Ventes récupérées avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des ventes',
      error: error.message
    });
  }
});

// GET /api/ventes/:id - Obtenir une vente par ID
app.get('/api/ventes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vente = await venteRepository.trouverParId(id);
    
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
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la vente',
      error: error.message
    });
  }
});

// POST /api/ventes - Créer une nouvelle vente
app.post('/api/ventes', async (req, res) => {
  try {
    const { magasinId, utilisateurId, lignes, statut } = req.body;
    
    if (!magasinId || !utilisateurId) {
      return res.status(400).json({
        success: false,
        message: 'ID du magasin et de l\'utilisateur sont requis'
      });
    }

    // Vérifier que l'utilisateur et le magasin existent (appels aux autres microservices)
    const utilisateur = await verifierUtilisateurExiste(utilisateurId);
    if (!utilisateur) {
      return res.status(400).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const magasin = await verifierMagasinExiste(magasinId);
    if (!magasin) {
      return res.status(400).json({
        success: false,
        message: 'Magasin non trouvé'
      });
    }

    // Valider les lignes de vente si fournies
    const lignesValidees = [];
    if (lignes && Array.isArray(lignes)) {
      for (const ligne of lignes) {
        if (!ligne.produitId || !ligne.quantite || ligne.quantite <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Chaque ligne doit avoir un produitId et une quantité positive'
          });
        }

        const produit = await verifierProduitExiste(ligne.produitId);
        if (!produit) {
          return res.status(400).json({
            success: false,
            message: `Produit ${ligne.produitId} non trouvé`
          });
        }

        lignesValidees.push({
          produitId: ligne.produitId,
          quantite: ligne.quantite,
          prixUnitaire: produit.prix,
          prixTotal: produit.prix * ligne.quantite
        });
      }
    }

    const nouvelleVente = new Vente(null, magasinId, utilisateurId, lignesValidees, statut);
    const venteSauvegardee = await venteRepository.sauvegarder(nouvelleVente);

    res.status(201).json({
      success: true,
      data: venteSauvegardee,
      message: 'Vente créée avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la vente',
      error: error.message
    });
  }
});

// PUT /api/ventes/:id - Mettre à jour une vente
app.put('/api/ventes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, lignes } = req.body;
    
    const venteExistante = await venteRepository.trouverParId(id);
    if (!venteExistante) {
      return res.status(404).json({
        success: false,
        message: 'Vente non trouvée'
      });
    }

    // Mettre à jour le statut
    if (statut) {
      venteExistante.statut = statut;
    }

    // Mettre à jour les lignes si fournies
    if (lignes && Array.isArray(lignes)) {
      const lignesValidees = [];
      for (const ligne of lignes) {
        if (!ligne.produitId || !ligne.quantite || ligne.quantite <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Chaque ligne doit avoir un produitId et une quantité positive'
          });
        }

        const produit = await verifierProduitExiste(ligne.produitId);
        if (!produit) {
          return res.status(400).json({
            success: false,
            message: `Produit ${ligne.produitId} non trouvé`
          });
        }

        lignesValidees.push({
          produitId: ligne.produitId,
          quantite: ligne.quantite,
          prixUnitaire: produit.prix,
          prixTotal: produit.prix * ligne.quantite
        });
      }
      
      venteExistante.lignes = lignesValidees;
      venteExistante._recalculerTotal();
    }

    const venteMiseAJour = await venteRepository.sauvegarder(venteExistante);

    res.json({
      success: true,
      data: venteMiseAJour,
      message: 'Vente mise à jour avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la vente',
      error: error.message
    });
  }
});

// DELETE /api/ventes/:id - Supprimer une vente
app.delete('/api/ventes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const venteExistante = await venteRepository.trouverParId(id);
    if (!venteExistante) {
      return res.status(404).json({
        success: false,
        message: 'Vente non trouvée'
      });
    }

    await venteRepository.supprimer(id);

    res.json({
      success: true,
      message: 'Vente supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la vente',
      error: error.message
    });
  }
});

// POST /api/ventes/:id/lignes - Ajouter une ligne à une vente
app.post('/api/ventes/:id/lignes', async (req, res) => {
  try {
    const { id } = req.params;
    const { produitId, quantite } = req.body;
    
    if (!produitId || !quantite || quantite <= 0) {
      return res.status(400).json({
        success: false,
        message: 'produitId et quantite (positive) sont requis'
      });
    }

    const vente = await venteRepository.trouverParId(id);
    if (!vente) {
      return res.status(404).json({
        success: false,
        message: 'Vente non trouvée'
      });
    }

    if (vente.statut === 'terminee') {
      return res.status(400).json({
        success: false,
        message: 'Impossible d\'ajouter une ligne à une vente terminée'
      });
    }

    const produit = await verifierProduitExiste(produitId);
    if (!produit) {
      return res.status(400).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    vente.ajouterLigne(produit, quantite);
    const venteMiseAJour = await venteRepository.sauvegarder(vente);

    res.json({
      success: true,
      data: venteMiseAJour,
      message: 'Ligne ajoutée à la vente avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout de la ligne à la vente',
      error: error.message
    });
  }
});

// PUT /api/ventes/:id/annuler - Annuler une vente
app.put('/api/ventes/:id/annuler', async (req, res) => {
  try {
    const { id } = req.params;
    
    const vente = await venteRepository.trouverParId(id);
    if (!vente) {
      return res.status(404).json({
        success: false,
        message: 'Vente non trouvée'
      });
    }

    vente.annuler();
    const venteMiseAJour = await venteRepository.sauvegarder(vente);

    res.json({
      success: true,
      data: venteMiseAJour,
      message: 'Vente annulée avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation de la vente',
      error: error.message
    });
  }
});

// GET /api/ventes/statistiques/magasin/:magasinId - Statistiques des ventes par magasin
app.get('/api/ventes/statistiques/magasin/:magasinId', async (req, res) => {
  try {
    const { magasinId } = req.params;
    const ventes = await venteRepository.listerParMagasin(magasinId);
    
    const statistiques = {
      totalVentes: ventes.length,
      ventesTerminees: ventes.filter(v => v.statut === 'terminee').length,
      ventesEnCours: ventes.filter(v => v.statut === 'en_cours').length,
      ventesAnnulees: ventes.filter(v => v.statut === 'annulee').length,
      chiffreAffaires: ventes
        .filter(v => v.statut === 'terminee')
        .reduce((total, vente) => total + vente.montantTotal, 0)
    };

    res.json({
      success: true,
      data: statistiques,
      message: 'Statistiques des ventes récupérées avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    service: 'vente-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    dependencies: {
      produitService: PRODUIT_SERVICE_URL,
      utilisateurService: UTILISATEUR_SERVICE_URL,
      magasinService: MAGASIN_SERVICE_URL
    }
  });
});

// Endpoint Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`💰 Vente Service démarré sur le port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API Docs: http://localhost:${PORT}/api/ventes`);
  console.log(`🔗 Dépendances:`);
  console.log(`   - Produit Service: ${PRODUIT_SERVICE_URL}`);
  console.log(`   - Utilisateur Service: ${UTILISATEUR_SERVICE_URL}`);
  console.log(`   - Magasin Service: ${MAGASIN_SERVICE_URL}`);
});

module.exports = app;
