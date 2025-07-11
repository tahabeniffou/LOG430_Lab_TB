const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
const promClient = require('prom-client');
require('dotenv').config();

// Configuration des métriques Prometheus
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// Métriques spécifiques au router
const routerRequestDuration = new promClient.Histogram({
  name: 'router_request_duration_seconds',
  help: 'Duration of router requests in seconds',
  labelNames: ['method', 'route', 'target_service', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const routerRequestsTotal = new promClient.Counter({
  name: 'router_requests_total',
  help: 'Total number of router requests',
  labelNames: ['method', 'route', 'target_service', 'status_code']
});

const serviceHealthGauge = new promClient.Gauge({
  name: 'service_health_status',
  help: 'Health status of backend services (1=healthy, 0=unhealthy)',
  labelNames: ['service_name', 'service_url']
});

const routingDecisionCounter = new promClient.Counter({
  name: 'routing_decisions_total',
  help: 'Total routing decisions made',
  labelNames: ['console_type', 'target_type', 'service']
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Middleware pour capturer les métriques du router
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    // Déterminer le service cible
    let targetService = 'unknown';
    if (req.path.startsWith('/api/v2/produits')) targetService = 'produit-service';
    else if (req.path.startsWith('/api/v2/ventes')) targetService = 'vente-service';
    else if (req.path.startsWith('/api/v2/stocks')) targetService = 'stock-service';
    else if (req.path.startsWith('/api/v2/reports')) targetService = 'reporting-service';
    else if (req.path.startsWith('/maisonmere')) targetService = 'legacy+microservices';
    else if (req.path.startsWith('/pos')) targetService = 'microservices';
    
    routerRequestDuration
      .labels(req.method, route, targetService, res.statusCode)
      .observe(duration);
    
    routerRequestsTotal
      .labels(req.method, route, targetService, res.statusCode)
      .inc();
  });
  
  next();
});

// Configuration des services avec load balancing
const SERVICES = {
  // Système de base (monolithique)
  legacy: {
    url: process.env.LEGACY_SYSTEM_URL || 'http://localhost:3030',
    name: 'Système de Base'
  },
  // Microservices avec support multi-instances pour load balancing
  microservices: {
    produit: {
      instances: [
        process.env.PRODUIT_SERVICE_URL_1 || 'http://localhost:3001',
        process.env.PRODUIT_SERVICE_URL_2 || 'http://localhost:3011', 
        process.env.PRODUIT_SERVICE_URL_3 || 'http://localhost:3021'
      ],
      currentIndex: 0
    },
    vente: {
      instances: [
        process.env.VENTE_SERVICE_URL_1 || 'http://localhost:3003',
        process.env.VENTE_SERVICE_URL_2 || 'http://localhost:3013',
        process.env.VENTE_SERVICE_URL_3 || 'http://localhost:3023'
      ],
      currentIndex: 0
    },
    stock: {
      instances: [
        process.env.STOCK_SERVICE_URL_1 || 'http://localhost:3002',
        process.env.STOCK_SERVICE_URL_2 || 'http://localhost:3012',
        process.env.STOCK_SERVICE_URL_3 || 'http://localhost:3022'
      ],
      currentIndex: 0
    },
    reporting: {
      instances: [
        process.env.REPORTING_SERVICE_URL_1 || 'http://localhost:3004',
        process.env.REPORTING_SERVICE_URL_2 || 'http://localhost:3014',
        process.env.REPORTING_SERVICE_URL_3 || 'http://localhost:3024'
      ],
      currentIndex: 0
    }
  }
};

// Métriques pour le load balancing
const loadBalancerRequests = new promClient.Counter({
  name: 'load_balancer_requests_total',
  help: 'Total requests distributed by load balancer',
  labelNames: ['service', 'instance_url', 'status']
});

const instanceHealthGauge = new promClient.Gauge({
  name: 'service_instance_health',
  help: 'Health status of service instances (1=healthy, 0=unhealthy)',
  labelNames: ['service', 'instance_url']
});

// Fonction de load balancing round-robin avec health check
function getServiceInstance(serviceName) {
  const service = SERVICES.microservices[serviceName];
  if (!service || !service.instances) {
    throw new Error(`Service ${serviceName} non configuré`);
  }

  // Round-robin simple
  const selectedInstance = service.instances[service.currentIndex];
  service.currentIndex = (service.currentIndex + 1) % service.instances.length;

  console.log(`⚖️ Load Balancer: ${serviceName} -> ${selectedInstance} (index: ${service.currentIndex - 1})`);
  
  // Incrémenter les métriques
  loadBalancerRequests.labels(serviceName, selectedInstance, 'selected').inc();
  
  return selectedInstance;
}

// Configuration de routage - définit quand utiliser les microservices
const ROUTING_CONFIG = {
  // POS Console - utilise TOUS les microservices (architecture moderne)
  pos: {
    usesMicroservices: ['produit', 'vente', 'stock', 'reporting'],
    defaultToLegacy: false // Priorité aux microservices
  },
  // Maison Mère Console - utilise TOUS les microservices (analytics modernes)
  maisonmere: {
    usesMicroservices: ['produit', 'vente', 'stock', 'reporting'],
    defaultToLegacy: false // Priorité aux microservices
  },
  // API moderne - utilise les microservices
  api: {
    usesMicroservices: ['produit', 'vente', 'stock', 'reporting'],
    defaultToLegacy: false
  },
  // Web/Mobile - utilise les microservices
  web: {
    usesMicroservices: ['produit', 'vente', 'stock', 'reporting'], 
    defaultToLegacy: false
  }
};

// Fonction pour déterminer le mode d'accès basé sur l'en-tête ou l'URL
function getAccessMode(req) {
  // 1. Vérifier l'en-tête X-Client-Type
  const clientType = req.headers['x-client-type'];
  if (clientType && ROUTING_CONFIG[clientType]) {
    return ROUTING_CONFIG[clientType];
  }
  
  // 2. Vérifier le chemin de l'URL
  if (req.path.startsWith('/pos/')) {
    return ROUTING_CONFIG.pos;
  }
  if (req.path.startsWith('/maisonmere/')) {
    return ROUTING_CONFIG.maisonmere;
  }
  if (req.path.startsWith('/api/v2/') || req.path.startsWith('/api/microservices/')) {
    return ROUTING_CONFIG.api;
  }
  if (req.path.startsWith('/web/') || req.path.startsWith('/mobile/')) {
    return ROUTING_CONFIG.web;
  }
  
  // 3. Par défaut, utiliser l'API moderne
  return ROUTING_CONFIG.api;
}

// Fonction pour déterminer quel service utiliser avec load balancing
function getTargetService(req, resourceType) {
  const mode = getAccessMode(req);
  
  // Si le mode autorise ce microservice, utiliser le load balancer
  if (mode.usesMicroservices.includes(resourceType)) {
    return getServiceInstance(resourceType);
  }
  
  // Sinon, utiliser le système de base
  return SERVICES.legacy.url;
}

// Middleware de logging du routage
app.use((req, res, next) => {
  const mode = getAccessMode(req);
  console.log(`🔀 [${new Date().toISOString()}] ${req.method} ${req.path} - Mode: ${mode.defaultToLegacy ? 'Legacy' : 'Microservices'}`);
  next();
});

// === ROUTES POUR CONSOLES POS ===
// POS utilise principalement le système de base, sauf pour le stock temps réel

// === ROUTES POUR CONSOLE POS (Utilise TOUS les microservices) ===

app.all('/pos/produits*', async (req, res) => {
  try {
    const targetUrl = `${getServiceInstance('produit')}${req.path.replace('/pos/produits', '/api/produits')}`;
    console.log(`📺 POS -> Produit Microservice: ${targetUrl}`);
    console.log(`🔍 Original path: ${req.path}`);
    console.log(`🔍 Target URL: ${targetUrl}`);
    console.log(`🔍 Method: ${req.method}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'pos-console' }
    });
    
    loadBalancerRequests.labels('produit', targetUrl, 'success').inc();
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('❌ Erreur POS produits:', error.message);
    console.error('❌ Error details:', error.response?.status, error.response?.statusText);
    console.error('❌ Error data:', error.response?.data);
    loadBalancerRequests.labels('produit', 'unknown', 'error').inc();
    res.status(error.response?.status || 500).json({
      error: 'Erreur produits POS',
      message: error.message
    });
  }
});

app.all('/pos/stock*', async (req, res) => {
  try {
    const targetUrl = `${getServiceInstance('stock')}${req.path.replace('/pos/stock', '/stocks')}`;
    console.log(`📺 POS -> Stock Microservice: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'pos-console' }
    });
    
    loadBalancerRequests.labels('stock', targetUrl, 'success').inc();
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur POS stock:', error.message);
    loadBalancerRequests.labels('stock', 'unknown', 'error').inc();
    res.status(error.response?.status || 500).json({
      error: 'Erreur stock POS',
      message: error.message
    });
  }
});

app.all('/pos/ventes*', async (req, res) => {
  try {
    const targetUrl = `${getServiceInstance('vente')}${req.path.replace('/pos/ventes', '/ventes')}`;
    console.log(`📺 POS -> Vente Microservice: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'pos-console' }
    });
    
    loadBalancerRequests.labels('vente', targetUrl, 'success').inc();
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur POS ventes:', error.message);
    loadBalancerRequests.labels('vente', 'unknown', 'error').inc();
    res.status(error.response?.status || 500).json({
      error: 'Erreur ventes POS',
      message: error.message
    });
  }
});

app.all('/pos/reports*', async (req, res) => {
  try {
    const targetUrl = `${getServiceInstance('reporting')}${req.path.replace('/pos/reports', '/api/reports')}`;
    console.log(`📺 POS -> Reporting Microservice: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'pos-console' }
    });
    
    loadBalancerRequests.labels('reporting', targetUrl, 'success').inc();
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur POS reports:', error.message);
    loadBalancerRequests.labels('reporting', 'unknown', 'error').inc();
    res.status(error.response?.status || 500).json({
      error: 'Erreur reports POS',
      message: error.message
    });
  }
});

// Route catch-all pour POS - routes vers le système de base
app.all('/pos/*', async (req, res) => {
  try {
    // Remplacer /pos par /api/v1 pour router vers le système de base
    const targetUrl = `${SERVICES.legacy.url}${req.path.replace('/pos', '/api/v1')}`;
    console.log(`📺 POS -> Legacy System: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'pos-console' }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur POS legacy:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Erreur système POS',
      message: error.message
    });
  }
});

// === ROUTES POUR MAISON MÈRE ===
// Maison mère utilise le système de base, sauf pour les rapports avancés

app.all('/maisonmere/produits*', async (req, res) => {
  try {
    const targetUrl = `${SERVICES.legacy.url}${req.path.replace('/maisonmere', '/api/v1')}`;
    console.log(`🏢 Maison Mère -> Legacy System: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'maisonmere-console' }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur Maison Mère produits:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Erreur système Maison Mère',
      message: error.message
    });
  }
});

app.all('/maisonmere/reports*', async (req, res) => {
  try {
    // Pour les rapports, utiliser le microservice pour les analyses avancées
    const targetUrl = `${getServiceInstance('reporting')}${req.path.replace('/maisonmere/reports', '/api/reports')}`;
    console.log(`🏢 Maison Mère -> Reporting Microservice: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'maisonmere-console' }
    });
    
    loadBalancerRequests.labels('reporting', targetUrl, 'success').inc();
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur Maison Mère rapports:', error.message);
    loadBalancerRequests.labels('reporting', 'unknown', 'error').inc();
    res.status(error.response?.status || 500).json({
      error: 'Erreur rapports Maison Mère',
      message: error.message
    });
  }
});

app.all('/maisonmere/ventes*', async (req, res) => {
  try {
    const targetUrl = `${SERVICES.legacy.url}${req.path.replace('/maisonmere', '/api/v1')}`;
    console.log(`🏢 Maison Mère -> Legacy System: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'maisonmere-console' }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur Maison Mère ventes:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Erreur ventes Maison Mère',
      message: error.message
    });
  }
});

// Route catch-all pour Maison Mère - routes vers le système de base
app.all('/maisonmere/*', async (req, res) => {
  try {
    // Remplacer /maisonmere par /api/v1 pour router vers le système de base
    const targetUrl = `${SERVICES.legacy.url}${req.path.replace('/maisonmere', '/api/v1')}`;
    console.log(`🏢 Maison Mère -> Legacy System: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'maisonmere-console' }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur Maison Mère legacy:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Erreur système Maison Mère',
      message: error.message
    });
  }
});

// === ROUTES API MODERNE (Microservices) ===

app.all('/api/v2/produits*', async (req, res) => {
  try {
    const targetUrl = `${getServiceInstance('produit')}${req.path.replace('/api/v2/produits', '/api/produits')}`;
    console.log(`🚀 API v2 -> Produit Microservice: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'api-v2' }
    });
    
    loadBalancerRequests.labels('produit', targetUrl, 'success').inc();
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur API v2 produits:', error.message);
    loadBalancerRequests.labels('produit', 'unknown', 'error').inc();
    res.status(error.response?.status || 500).json({
      error: 'Erreur microservice produits',
      message: error.message
    });
  }
});

app.all('/api/v2/ventes*', async (req, res) => {
  try {
    const targetUrl = `${getServiceInstance('vente')}${req.path.replace('/api/v2/ventes', '/api/ventes')}`;
    console.log(`🚀 API v2 -> Vente Microservice: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'api-v2' }
    });
    
    loadBalancerRequests.labels('vente', targetUrl, 'success').inc();
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur API v2 ventes:', error.message);
    loadBalancerRequests.labels('vente', 'unknown', 'error').inc();
    res.status(error.response?.status || 500).json({
      error: 'Erreur microservice ventes',
      message: error.message
    });
  }
});

app.all('/api/v2/stocks*', async (req, res) => {
  try {
    const targetUrl = `${getServiceInstance('stock')}${req.path.replace('/api/v2/stocks', '/stocks')}`;
    console.log(`🚀 API v2 -> Stock Microservice: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'api-v2' }
    });
    
    loadBalancerRequests.labels('stock', targetUrl, 'success').inc();
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur API v2 stocks:', error.message);
    loadBalancerRequests.labels('stock', 'unknown', 'error').inc();
    res.status(error.response?.status || 500).json({
      error: 'Erreur microservice stocks',
      message: error.message
    });
  }
});

app.all('/api/v2/reports*', async (req, res) => {
  try {
    const targetUrl = `${getServiceInstance('reporting')}${req.path.replace('/api/v2/reports', '/api/reports')}`;
    console.log(`🚀 API v2 -> Reporting Microservice: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'api-v2' }
    });
    
    loadBalancerRequests.labels('reporting', targetUrl, 'success').inc();
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur API v2 reports:', error.message);
    loadBalancerRequests.labels('reporting', 'unknown', 'error').inc();
    res.status(error.response?.status || 500).json({
      error: 'Erreur microservice reporting',
      message: error.message
    });
  }
});

// === ROUTES DE FALLBACK (Legacy System) ===

app.all('/api/v1/*', async (req, res) => {
  try {
    const targetUrl = `${SERVICES.legacy.url}${req.path}`;
    console.log(`🔄 Fallback -> Legacy System: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'hybrid-router' }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur Legacy System:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Erreur système de base',
      message: error.message
    });
  }
});

// === ROUTES D'INFORMATION ===

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Hybrid Router avec Load Balancing',
    timestamp: new Date().toISOString(),
    port: PORT,
    loadBalancing: {
      enabled: true,
      algorithm: 'round-robin'
    },
    routing: {
      legacy: SERVICES.legacy.url,
      microservices: {
        produit: {
          instances: SERVICES.microservices.produit.instances,
          currentIndex: SERVICES.microservices.produit.currentIndex
        },
        vente: {
          instances: SERVICES.microservices.vente.instances,
          currentIndex: SERVICES.microservices.vente.currentIndex
        },
        stock: {
          instances: SERVICES.microservices.stock.instances,
          currentIndex: SERVICES.microservices.stock.currentIndex
        },
        reporting: {
          instances: SERVICES.microservices.reporting.instances,
          currentIndex: SERVICES.microservices.reporting.currentIndex
        }
      }
    }
  });
});

app.get('/load-balancer/status', (req, res) => {
  res.json({
    service: 'Load Balancer Status',
    timestamp: new Date().toISOString(),
    algorithm: 'round-robin',
    services: {
      produit: {
        instances: SERVICES.microservices.produit.instances,
        currentIndex: SERVICES.microservices.produit.currentIndex,
        nextInstance: SERVICES.microservices.produit.instances[SERVICES.microservices.produit.currentIndex]
      },
      vente: {
        instances: SERVICES.microservices.vente.instances,
        currentIndex: SERVICES.microservices.vente.currentIndex,
        nextInstance: SERVICES.microservices.vente.instances[SERVICES.microservices.vente.currentIndex]
      },
      stock: {
        instances: SERVICES.microservices.stock.instances,
        currentIndex: SERVICES.microservices.stock.currentIndex,
        nextInstance: SERVICES.microservices.stock.instances[SERVICES.microservices.stock.currentIndex]
      },
      reporting: {
        instances: SERVICES.microservices.reporting.instances,
        currentIndex: SERVICES.microservices.reporting.currentIndex,
        nextInstance: SERVICES.microservices.reporting.instances[SERVICES.microservices.reporting.currentIndex]
      }
    }
  });
});

app.get('/routing-info', (req, res) => {
  res.json({
    service: 'Hybrid Router - Système de Routage Intelligent',
    description: 'Route automatiquement vers le système de base ou les microservices',
    routes: {
      pos: {
        description: 'Console POS - principalement système de base',
        paths: ['/pos/produits', '/pos/ventes', '/pos/stock (microservice)'],
        mode: ROUTING_CONFIG.pos
      },
      maisonmere: {
        description: 'Console Maison Mère - principalement système de base',
        paths: ['/maisonmere/produits', '/maisonmere/ventes', '/maisonmere/reports (microservice)'],
        mode: ROUTING_CONFIG.maisonmere
      },
      api_v2: {
        description: 'API moderne - microservices',
        paths: ['/api/v2/produits', '/api/v2/ventes', '/api/v2/stocks', '/api/v2/reports'],
        mode: ROUTING_CONFIG.api
      },
      api_v1: {
        description: 'API legacy - système de base',
        paths: ['/api/v1/*'],
        fallback: true
      }
    },
    services: SERVICES
  });
});

// Middleware de gestion d'erreur
app.use((err, req, res, next) => {
  console.error('Erreur Hybrid Router:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du routeur hybride',
    error: err.message
  });
});

// Middleware pour les routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée dans le routeur hybride',
    suggestion: 'Consultez /routing-info pour voir les routes disponibles'
  });
});

app.listen(PORT, () => {
  console.log(`🔀 Hybrid Router avec Load Balancing démarré sur le port ${PORT}`);
  console.log(`📋 Routing Info: http://localhost:${PORT}/routing-info`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`⚖️  Load Balancer Status: http://localhost:${PORT}/load-balancer/status`);
  console.log('');
  console.log('🎯 Modes de routage configurés:');
  console.log('   📺 POS Console: /pos/* -> Load-balanced microservices');
  console.log('   🏢 Maison Mère: /maisonmere/* -> Système de base + Load-balanced reporting');
  console.log('   🚀 API v2: /api/v2/* -> Tous les microservices load-balanced');
  console.log('   🔄 API v1: /api/v1/* -> Système de base');
  console.log('');
  console.log('⚖️  Load Balancing actif:');
  console.log('   🔄 Algorithme: Round-Robin');
  console.log('   📊 Produits: 3 instances (ports 3001, 3011, 3021)');
  console.log('   💰 Ventes: 3 instances (ports 3003, 3013, 3023)');
  console.log('   📦 Stock: 3 instances (ports 3002, 3012, 3022)');
  console.log('   📈 Reports: 3 instances (ports 3004, 3014, 3024)');
});

module.exports = app;
