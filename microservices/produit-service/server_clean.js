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
const createProduitRoutes = require('./src/api/routes');

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
        new Produit(null, 'Ordinateur Portable', 899.99, 50, 'Informatique'),
        new Produit(null, 'Souris Gaming', 45.50, 100, 'Informatique'),
        new Produit(null, 'Clavier Mécanique', 120.00, 25, 'Informatique'),
        new Produit(null, 'Livre JavaScript', 35.99, 15, 'Livres'),
        new Produit(null, 'Casque Audio', 75.00, 30, 'Audio'),
        new Produit(null, 'Smartphone', 599.99, 20, 'Électronique'),
        new Produit(null, 'Tablet', 299.99, 35, 'Électronique'),
        new Produit(null, 'Écran 24"', 199.99, 40, 'Informatique')
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
    new Produit(1, 'Ordinateur Portable', 899.99, 50, 'Informatique'),
    new Produit(2, 'Souris Gaming', 45.50, 100, 'Informatique'),
    new Produit(3, 'Clavier Mécanique', 120.00, 25, 'Informatique'),
    new Produit(4, 'Livre JavaScript', 35.99, 15, 'Livres'),
    new Produit(5, 'Casque Audio', 75.00, 30, 'Audio'),
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

// Configuration des routes API après initialisation du repository
function setupRoutes() {
  // Utilisation du système de routes organisées
  const apiRoutes = createProduitRoutes(produitRepository);
  app.use('/api', apiRoutes);
  
  console.log('✅ Routes API configurées');
}

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
    database: produitRepository ? 'connected' : 'memory',
    uptime: process.uptime()
  });
});

// Gestion d'arrêt propre
process.on('SIGTERM', async () => {
  console.log('⏹️  Signal SIGTERM reçu, arrêt du service...');
  if (sequelize) {
    await sequelize.close();
    console.log('✅ Connexion à la base de données fermée.');
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⏹️  Signal SIGINT reçu, arrêt du service...');
  if (sequelize) {
    await sequelize.close();
    console.log('✅ Connexion à la base de données fermée.');
  }
  process.exit(0);
});

// Démarrage du serveur
async function startServer() {
  try {
    // Initialiser la base de données et le repository
    await initializeDatabase();
    
    // Configurer les routes API
    setupRoutes();
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`🚀 Service Produit démarré:`);
      console.log(`   📡 Port: ${PORT}`);
      console.log(`   🏷️  Instance: ${INSTANCE_NAME} (${INSTANCE_ID})`);
      console.log(`   🔗 Health: http://localhost:${PORT}/health`);
      console.log(`   📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`   🛒 API: http://localhost:${PORT}/api/produits`);
    });
  } catch (error) {
    console.error('💥 Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Démarrage du service
startServer();
