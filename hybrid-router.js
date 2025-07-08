const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 9000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Configuration des services
const SERVICES = {
  // Système de base (monolithique)
  legacy: {
    url: process.env.LEGACY_SYSTEM_URL || 'http://localhost:3000',
    name: 'Système de Base'
  },
  // Microservices
  microservices: {
    produit: process.env.PRODUIT_SERVICE_URL || 'http://localhost:3001',
    vente: process.env.VENTE_SERVICE_URL || 'http://localhost:3004',
    stock: process.env.STOCK_SERVICE_URL || 'http://localhost:3007',
    reporting: process.env.REPORTING_SERVICE_URL || 'http://localhost:3008'
  }
};

// Configuration de routage - définit quand utiliser les microservices
const ROUTING_CONFIG = {
  // POS Console - utilise principalement le système de base
  pos: {
    usesMicroservices: ['stock'], // Seulement le stock en temps réel
    defaultToLegacy: true
  },
  // Maison Mère Console - utilise principalement le système de base 
  maisonmere: {
    usesMicroservices: ['reporting'], // Seulement les rapports avancés
    defaultToLegacy: true
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

// Fonction pour déterminer quel service utiliser
function getTargetService(req, resourceType) {
  const mode = getAccessMode(req);
  
  // Si le mode autorise ce microservice
  if (mode.usesMicroservices.includes(resourceType)) {
    return SERVICES.microservices[resourceType];
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

app.all('/pos/produits*', async (req, res) => {
  try {
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
    console.error('Erreur POS produits:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Erreur système POS',
      message: error.message
    });
  }
});

app.all('/pos/stock*', async (req, res) => {
  try {
    // Pour le stock, utiliser le microservice pour les données temps réel
    const targetUrl = `${SERVICES.microservices.stock}${req.path.replace('/pos/stock', '/stocks')}`;
    console.log(`📺 POS -> Stock Microservice: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'pos-console' }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur POS stock:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Erreur stock POS',
      message: error.message
    });
  }
});

app.all('/pos/ventes*', async (req, res) => {
  try {
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
    console.error('Erreur POS ventes:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Erreur ventes POS',
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
    const targetUrl = `${SERVICES.microservices.reporting}${req.path.replace('/maisonmere/reports', '/api/reports')}`;
    console.log(`🏢 Maison Mère -> Reporting Microservice: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'maisonmere-console' }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur Maison Mère rapports:', error.message);
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

// === ROUTES API MODERNE (Microservices) ===

app.all('/api/v2/produits*', async (req, res) => {
  try {
    const targetUrl = `${SERVICES.microservices.produit}${req.path.replace('/api/v2/produits', '/produits')}`;
    console.log(`🚀 API v2 -> Produit Microservice: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'api-v2' }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur API v2 produits:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Erreur microservice produits',
      message: error.message
    });
  }
});

app.all('/api/v2/ventes*', async (req, res) => {
  try {
    const targetUrl = `${SERVICES.microservices.vente}${req.path.replace('/api/v2/ventes', '/ventes')}`;
    console.log(`🚀 API v2 -> Vente Microservice: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'api-v2' }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur API v2 ventes:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Erreur microservice ventes',
      message: error.message
    });
  }
});

app.all('/api/v2/stocks*', async (req, res) => {
  try {
    const targetUrl = `${SERVICES.microservices.stock}${req.path.replace('/api/v2/stocks', '/stocks')}`;
    console.log(`🚀 API v2 -> Stock Microservice: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'api-v2' }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur API v2 stocks:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Erreur microservice stocks',
      message: error.message
    });
  }
});

app.all('/api/v2/reports*', async (req, res) => {
  try {
    const targetUrl = `${SERVICES.microservices.reporting}${req.path.replace('/api/v2/reports', '/api/reports')}`;
    console.log(`🚀 API v2 -> Reporting Microservice: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { ...req.headers, 'x-source': 'api-v2' }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erreur API v2 reports:', error.message);
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

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Hybrid Router',
    timestamp: new Date().toISOString(),
    port: PORT,
    routing: {
      legacy: SERVICES.legacy.url,
      microservices: SERVICES.microservices
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
  console.log(`🔀 Hybrid Router démarré sur le port ${PORT}`);
  console.log(`📋 Routing Info: http://localhost:${PORT}/routing-info`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('🎯 Modes de routage configurés:');
  console.log('   📺 POS Console: /pos/* -> Système de base + Stock microservice');
  console.log('   🏢 Maison Mère: /maisonmere/* -> Système de base + Reporting microservice');
  console.log('   🚀 API v2: /api/v2/* -> Tous les microservices');
  console.log('   🔄 API v1: /api/v1/* -> Système de base');
});

module.exports = app;
