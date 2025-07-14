const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const promClient = require('prom-client');
const createVenteRoutes = require('./src/api/routes');
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

const venteOperationsTotal = new promClient.Counter({
  name: 'vente_operations_total',
  help: 'Total number of vente operations',
  labelNames: ['operation', 'service']
});

const app = express();
const PORT = process.env.PORT || 3003;
const INSTANCE_ID = process.env.INSTANCE_ID || 'vente-instance-default';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'Vente Service Default';

// Configuration des autres microservices
const PRODUIT_SERVICE_URL = process.env.PRODUIT_SERVICE_URL || 'http://localhost:3001';
const STOCK_SERVICE_URL = process.env.STOCK_SERVICE_URL || 'http://localhost:3002';

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
      .labels(req.method, route, res.statusCode, 'vente-service')
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode, 'vente-service')
      .inc();
  });
  
  next();
});

// Repository en mémoire (en attendant la base de données)
let venteRepository;

function initMockRepository() {
  const mockData = new Map();
  let nextId = 1;
  
  // Données de test
  const vente1 = {
    id: 1,
    magasinId: 1,
    utilisateurId: 1,
    lignes: [
      { produitId: 1, nomProduit: 'Ordinateur Portable', quantite: 2, prixUnitaire: 899.99, sousTotal: 1799.98 },
      { produitId: 2, nomProduit: 'Souris Gaming', quantite: 1, prixUnitaire: 45.50, sousTotal: 45.50 }
    ],
    total: 1845.48,
    statut: 'terminee',
    dateCreation: new Date('2024-01-15T10:30:00Z').toISOString(),
    dateMiseAJour: new Date('2024-01-15T10:35:00Z').toISOString()
  };
  
  const vente2 = {
    id: 2,
    magasinId: 1,
    utilisateurId: 2,
    lignes: [
      { produitId: 3, nomProduit: 'Clavier Mécanique', quantite: 1, prixUnitaire: 120.00, sousTotal: 120.00 }
    ],
    total: 120.00,
    statut: 'en_cours',
    dateCreation: new Date('2024-01-15T14:20:00Z').toISOString(),
    dateMiseAJour: new Date('2024-01-15T14:20:00Z').toISOString()
  };
  
  mockData.set(1, vente1);
  mockData.set(2, vente2);
  nextId = 3;
  
  venteRepository = {
    listerToutes: async () => Array.from(mockData.values()),
    trouverParId: async (id) => mockData.get(parseInt(id)) || null,
    listerParMagasin: async (magasinId) => Array.from(mockData.values()).filter(vente => vente.magasinId == magasinId),
    listerParUtilisateur: async (utilisateurId) => Array.from(mockData.values()).filter(vente => vente.utilisateurId == utilisateurId),
    sauvegarder: async (vente) => {
      if (!vente.id) {
        vente.id = nextId++;
        vente.dateCreation = new Date().toISOString();
      }
      vente.dateMiseAJour = new Date().toISOString();
      mockData.set(vente.id, vente);
      return vente;
    },
    supprimer: async (id) => {
      return mockData.delete(parseInt(id));
    }
  };
  
  console.log('✅ Repository Vente en mémoire initialisé avec données de test.');
}

// Configuration des routes API
function setupRoutes() {
  // Utilisation du système de routes organisées
  const apiRoutes = createVenteRoutes(venteRepository);
  app.use('/api', apiRoutes);
  
  console.log('✅ Routes API Vente configurées');
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
app.get('/health', (req, res) => {
  res.json({
    service: 'vente-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    instanceId: INSTANCE_ID,
    instanceName: INSTANCE_NAME,
    database: 'memory',
    externalServices: {
      produitService: PRODUIT_SERVICE_URL,
      stockService: STOCK_SERVICE_URL
    },
    uptime: process.uptime()
  });
});

// Gestion d'arrêt propre
process.on('SIGTERM', async () => {
  console.log('⏹️  Signal SIGTERM reçu, arrêt du service...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⏹️  Signal SIGINT reçu, arrêt du service...');
  process.exit(0);
});

// Démarrage du serveur
async function startServer() {
  try {
    // Initialiser le repository
    initMockRepository();
    
    // Configurer les routes API
    setupRoutes();
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`🚀 Service Vente démarré:`);
      console.log(`   📡 Port: ${PORT}`);
      console.log(`   🏷️  Instance: ${INSTANCE_NAME} (${INSTANCE_ID})`);
      console.log(`   🔗 Health: http://localhost:${PORT}/health`);
      console.log(`   📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`   🛒 API: http://localhost:${PORT}/api/ventes`);
      console.log(`   🔗 Services externes:`);
      console.log(`      - Produit: ${PRODUIT_SERVICE_URL}`);
      console.log(`      - Stock: ${STOCK_SERVICE_URL}`);
    });
  } catch (error) {
    console.error('💥 Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Démarrage du service
startServer();
