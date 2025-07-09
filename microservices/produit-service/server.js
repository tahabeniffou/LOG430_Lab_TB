const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const promClient = require('prom-client');
require('dotenv').config();

// Configuration des métriques Prometheus
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// Métriques personnalisées
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service']
});

const dbOperationsTotal = new promClient.Counter({
  name: 'db_operations_total',
  help: 'Total number of database operations',
  labelNames: ['operation', 'table', 'service']
});

// Import de la logique métier du microservice
const Produit = require('./src/domain/Produit');
const SequelizeProduitRepository = require('./src/infrastructure/SequelizeProduitRepository');
const { sequelize } = require('./src/infrastructure/database');

const app = express();
const PORT = process.env.PORT || 3001;
const INSTANCE_ID = process.env.INSTANCE_ID || 'produit-instance-default';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'Produit Service Default';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware pour ajouter l'ID d'instance dans les headers
app.use((req, res, next) => {
  res.setHeader('X-Instance-ID', INSTANCE_ID);
  res.setHeader('X-Instance-Name', INSTANCE_NAME);
  next();
});

// Middleware pour capturer les métriques
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode, 'produit-service')
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode, 'produit-service')
      .inc();
  });
  
  next();
});

// Initialisation de la base de données et du repository
let produitRepository;

async function initializeDatabase() {
  try {
    console.log('🔌 Tentative de connexion à la base de données...');
    
    // Test de connexion à la base de données
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie avec succès.');
    
    // Synchronisation des modèles
    await sequelize.sync({ alter: true });
    console.log('✅ Modèles synchronisés avec la base de données.');
    
    // Initialisation du repository
    produitRepository = new SequelizeProduitRepository();
    
    // Données de test si la base est vide
    await seedDatabase();
    
  } catch (error) {
    console.error('❌ Impossible de se connecter à la base de données:', error.message);
    console.log('⚠️  Fallback vers mode mémoire...');
    // Mode dégradé sans base de données - utiliser des données en mémoire
    initMockRepository();
  }
}

async function seedDatabase() {
  try {
    // Vérifier si des produits existent déjà
    const produitsExistants = await produitRepository.listerTous();
    
    if (produitsExistants.length === 0) {
      console.log('🌱 Ajout de données de test...');
      
      const produitsDeSeed = [
        new Produit(null, 'Ordinateur Portable', 899.99, 'Informatique'),
        new Produit(null, 'Souris Gaming', 45.50, 'Informatique'),
        new Produit(null, 'Clavier Mécanique', 120.00, 'Informatique'),
        new Produit(null, 'Livre JavaScript', 35.99, 'Livres'),
        new Produit(null, 'Casque Audio', 75.00, 'Audio'),
        new Produit(null, 'Smartphone', 599.99, 'Électronique'),
        new Produit(null, 'Tablet', 299.99, 'Électronique'),
        new Produit(null, 'Écran 24"', 199.99, 'Informatique')
      ];
      
      for (const produit of produitsDeSeed) {
        await produitRepository.sauvegarder(produit);
      }
      
      console.log(`✅ ${produitsDeSeed.length} produits de test ajoutés à la base de données.`);
    } else {
      console.log(`✅ Base de données déjà peuplée avec ${produitsExistants.length} produits.`);
    }
  } catch (error) {
    console.error('⚠️  Erreur lors du seed:', error.message);
  }
}

// Repository en mémoire pour mode dégradé
function initMockRepository() {
  const mockData = [
    new Produit(1, 'Ordinateur Portable', 899.99, 'Informatique'),
    new Produit(2, 'Souris Gaming', 45.50, 'Informatique'),
    new Produit(3, 'Clavier Mécanique', 120.00, 'Informatique'),
    new Produit(4, 'Livre JavaScript', 35.99, 'Livres'),
    new Produit(5, 'Casque Audio', 75.00, 'Audio'),
  ];
  
  produitRepository = {
    listerTous: async () => mockData,
    trouverParId: async (id) => mockData.find(p => p.id == id) || null,
    trouverParCategorie: async (categorie) => mockData.filter(p => p.categorie === categorie),
    rechercherParNom: async (nom) => mockData.filter(p => p.nom.toLowerCase().includes(nom.toLowerCase())),
    listerEnRupture: async () => mockData.filter(p => p.stock === 0),
    listerStockFaible: async (seuil) => mockData.filter(p => p.stock <= seuil),
    sauvegarder: async (produit) => {
      if (!produit.id) {
        produit.id = Math.max(...mockData.map(p => p.id)) + 1;
        mockData.push(produit);
      } else {
        const index = mockData.findIndex(p => p.id === produit.id);
        if (index !== -1) mockData[index] = produit;
      }
      return produit;
    },
    supprimer: async (id) => {
      const index = mockData.findIndex(p => p.id == id);
      if (index !== -1) mockData.splice(index, 1);
      return true;
    }
  };
  
  console.log('✅ Repository en mémoire initialisé avec données de test.');
}

// Routes API REST

// GET /api/produits - Lister tous les produits
app.get('/api/produits', async (req, res) => {
  try {
    // Incrémenter la métrique DB
    dbOperationsTotal.labels('select', 'produits', 'produit-service').inc();
    
    const { categorie, recherche, stock_faible, rupture } = req.query;
    
    let produits;
    if (rupture === 'true') {
      produits = await produitRepository.listerEnRupture();
    } else if (stock_faible) {
      const seuil = parseInt(stock_faible) || 10;
      produits = await produitRepository.listerStockFaible(seuil);
    } else if (categorie) {
      produits = await produitRepository.trouverParCategorie(categorie);
    } else if (recherche) {
      produits = await produitRepository.rechercherParNom(recherche);
    } else {
      produits = await produitRepository.listerTous();
    }
    
    res.json({
      success: true,
      data: produits,
      message: 'Produits récupérés avec succès',
      count: produits.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des produits',
      error: error.message
    });
  }
});

// GET /api/produits/:id - Obtenir un produit par ID
app.get('/api/produits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const produit = await produitRepository.trouverParId(id);
    
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
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du produit',
      error: error.message
    });
  }
});

// POST /api/produits - Créer un nouveau produit
app.post('/api/produits', async (req, res) => {
  try {
    const { nom, prix, stock, categorie } = req.body;
    
    if (!nom || prix === undefined || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Le nom, le prix et le stock sont requis'
      });
    }

    const nouveauProduit = new Produit(null, nom, parseFloat(prix), parseInt(stock), categorie);
    const produitSauvegarde = await produitRepository.sauvegarder(nouveauProduit);

    res.status(201).json({
      success: true,
      data: produitSauvegarde,
      message: 'Produit créé avec succès'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erreur lors de la création du produit',
      error: error.message
    });
  }
});

// PUT /api/produits/:id - Mettre à jour un produit
app.put('/api/produits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prix, stock, categorie } = req.body;
    
    const produitExistant = await produitRepository.trouverParId(id);
    if (!produitExistant) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Mettre à jour les champs
    if (nom !== undefined) produitExistant.nom = nom;
    if (prix !== undefined) produitExistant.prix = parseFloat(prix);
    if (stock !== undefined) produitExistant.stock = parseInt(stock);
    if (categorie !== undefined) produitExistant.categorie = categorie;

    const produitMisAJour = await produitRepository.sauvegarder(produitExistant);

    res.json({
      success: true,
      data: produitMisAJour,
      message: 'Produit mis à jour avec succès'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erreur lors de la mise à jour du produit',
      error: error.message
    });
  }
});

// DELETE /api/produits/:id - Supprimer un produit
app.delete('/api/produits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const produitExistant = await produitRepository.trouverParId(id);
    if (!produitExistant) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    await produitRepository.supprimer(id);

    res.json({
      success: true,
      message: 'Produit supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du produit',
      error: error.message
    });
  }
});

// PUT /api/produits/:id/stock/decrementer - Décrémenter le stock
app.put('/api/produits/:id/stock/decrementer', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantite } = req.body;
    
    if (!quantite || quantite <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Une quantité positive est requise'
      });
    }

    const produit = await produitRepository.trouverParId(id);
    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    produit.decrementerStock(parseInt(quantite));
    const produitMisAJour = await produitRepository.sauvegarder(produit);

    res.json({
      success: true,
      data: produitMisAJour,
      message: 'Stock décrémenté avec succès'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erreur lors de la décrémentation du stock',
      error: error.message
    });
  }
});

// PUT /api/produits/:id/stock/incrementer - Incrémenter le stock
app.put('/api/produits/:id/stock/incrementer', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantite } = req.body;
    
    if (!quantite || quantite <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Une quantité positive est requise'
      });
    }

    const produit = await produitRepository.trouverParId(id);
    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    produit.incrementerStock(parseInt(quantite));
    const produitMisAJour = await produitRepository.sauvegarder(produit);

    res.json({
      success: true,
      data: produitMisAJour,
      message: 'Stock incrémenté avec succès'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erreur lors de l\'incrémentation du stock',
      error: error.message
    });
  }
});

// GET /api/produits/categories - Lister les catégories disponibles
app.get('/api/produits/categories', async (req, res) => {
  try {
    const produits = await produitRepository.listerTous();
    const categories = [...new Set(produits.map(p => p.categorie))];
    
    res.json({
      success: true,
      data: categories,
      message: 'Catégories récupérées avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories',
      error: error.message
    });
  }
});

// Route pour exposer les métriques Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// Route de santé
app.get('/health', async (req, res) => {
  res.json({
    service: 'produit-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    instanceId: INSTANCE_ID,
    instanceName: INSTANCE_NAME,
    database: 'memory',
    mode: 'memory',
    uptime: process.uptime()
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Gestionnaire d'erreurs global
app.use((error, req, res, next) => {
  console.error('Erreur non gérée:', error);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
  });
});

// Initialisation et démarrage du serveur
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🛍️ Produit Service démarré sur le port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📋 API Docs: http://localhost:${PORT}/api/produits`);
      console.log(`🗄️ Base de données: ${process.env.DB_NAME}`);
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Gestion de l'arrêt propre
process.on('SIGTERM', async () => {
  console.log('🛑 Arrêt du service demandé...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Arrêt du service demandé...');
  process.exit(0);
});

startServer();

