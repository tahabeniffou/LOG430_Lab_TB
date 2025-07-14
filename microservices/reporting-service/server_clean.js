const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const promClient = require('prom-client');
const createReportingRoutes = require('./src/api/routes');
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

const reportsGenerated = new promClient.Counter({
  name: 'reports_generated_total',
  help: 'Total number of reports generated',
  labelNames: ['type', 'service']
});

const app = express();
const PORT = process.env.PORT || 3004;
const INSTANCE_ID = process.env.INSTANCE_ID || 'reporting-instance-default';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'Reporting Service Default';

// Configuration des autres microservices
const VENTE_SERVICE_URL = process.env.VENTE_SERVICE_URL || 'http://localhost:3003';
const STOCK_SERVICE_URL = process.env.STOCK_SERVICE_URL || 'http://localhost:3002';
const PRODUIT_SERVICE_URL = process.env.PRODUIT_SERVICE_URL || 'http://localhost:3001';

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
      .labels(req.method, route, res.statusCode, 'reporting-service')
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode, 'reporting-service')
      .inc();
  });
  
  next();
});

// Configuration des routes API
function setupRoutes() {
  // Utilisation du système de routes organisées
  const apiRoutes = createReportingRoutes();
  app.use('/api', apiRoutes);
  
  console.log('✅ Routes API Reporting configurées');
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
    service: 'reporting-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    instanceId: INSTANCE_ID,
    instanceName: INSTANCE_NAME,
    externalServices: {
      venteService: VENTE_SERVICE_URL,
      stockService: STOCK_SERVICE_URL,
      produitService: PRODUIT_SERVICE_URL
    },
    uptime: process.uptime()
  });
});

// Route de test
app.get('/test', (req, res) => {
  res.json({
    service: 'reporting-service',
    message: 'Service de reporting opérationnel',
    timestamp: new Date().toISOString(),
    availableReports: [
      '/api/reports',
      '/api/reports/ventes',
      '/api/reports/stock',
      '/api/reports/mouvements',
      '/api/reports/finances'
    ]
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
    // Configurer les routes API
    setupRoutes();
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`🚀 Service Reporting démarré:`);
      console.log(`   📡 Port: ${PORT}`);
      console.log(`   🏷️  Instance: ${INSTANCE_NAME} (${INSTANCE_ID})`);
      console.log(`   🔗 Health: http://localhost:${PORT}/health`);
      console.log(`   📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`   📈 API: http://localhost:${PORT}/api/reports`);
      console.log(`   🔗 Services externes:`);
      console.log(`      - Vente: ${VENTE_SERVICE_URL}`);
      console.log(`      - Stock: ${STOCK_SERVICE_URL}`);
      console.log(`      - Produit: ${PRODUIT_SERVICE_URL}`);
    });
  } catch (error) {
    console.error('💥 Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Démarrage du service
startServer();
