const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const promClient = require('prom-client');
const createStockRoutes = require('./src/api/routes');
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

const stockOperationsTotal = new promClient.Counter({
  name: 'stock_operations_total',
  help: 'Total number of stock operations',
  labelNames: ['operation', 'service']
});

const app = express();
const PORT = process.env.PORT || 3002;
const INSTANCE_ID = process.env.INSTANCE_ID || 'stock-instance-default';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'Stock Service Default';

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
      .labels(req.method, route, res.statusCode, 'stock-service')
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode, 'stock-service')
      .inc();
  });
  
  next();
});

// Repository en mémoire (en attendant la base de données)
let stockRepository;

function initMockRepository() {
  const mockData = [
    { id: 1, produitId: 1, quantite: 100, seuilMinimum: 10, magasinId: 1, derniereMiseAJour: new Date().toISOString() },
    { id: 2, produitId: 2, quantite: 50, seuilMinimum: 5, magasinId: 1, derniereMiseAJour: new Date().toISOString() },
    { id: 3, produitId: 3, quantite: 75, seuilMinimum: 15, magasinId: 1, derniereMiseAJour: new Date().toISOString() },
    { id: 4, produitId: 4, quantite: 30, seuilMinimum: 8, magasinId: 1, derniereMiseAJour: new Date().toISOString() },
    { id: 5, produitId: 5, quantite: 120, seuilMinimum: 20, magasinId: 1, derniereMiseAJour: new Date().toISOString() }
  ];
  
  let stockCounter = 6;
  
  stockRepository = {
    listerTous: async () => mockData,
    trouverParId: async (id) => mockData.find(s => s.id == id) || null,
    trouverParProduitId: async (produitId) => mockData.find(s => s.produitId == produitId) || null,
    sauvegarder: async (stock) => {
      if (!stock.id) {
        stock.id = stockCounter++;
        mockData.push(stock);
      } else {
        const index = mockData.findIndex(s => s.id === stock.id);
        if (index !== -1) mockData[index] = stock;
      }
      return stock;
    },
    supprimer: async (id) => {
      const index = mockData.findIndex(s => s.id == id);
      if (index !== -1) mockData.splice(index, 1);
      return true;
    }
  };
  
  console.log('✅ Repository Stock en mémoire initialisé avec données de test.');
}

// Configuration des routes API
function setupRoutes() {
  // Utilisation du système de routes organisées
  const apiRoutes = createStockRoutes(stockRepository);
  app.use('/api', apiRoutes);
  
  console.log('✅ Routes API Stock configurées');
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
    service: 'stock-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    instanceId: INSTANCE_ID,
    instanceName: INSTANCE_NAME,
    database: 'memory',
    uptime: process.uptime()
  });
});

// Route par défaut
app.get('/', (req, res) => {
  res.json({
    service: 'stock-service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      api: '/api/stocks'
    }
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
      console.log(`🚀 Service Stock démarré:`);
      console.log(`   📡 Port: ${PORT}`);
      console.log(`   🏷️  Instance: ${INSTANCE_NAME} (${INSTANCE_ID})`);
      console.log(`   🔗 Health: http://localhost:${PORT}/health`);
      console.log(`   📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`   📦 API: http://localhost:${PORT}/api/stocks`);
    });
  } catch (error) {
    console.error('💥 Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Démarrage du service
startServer();
