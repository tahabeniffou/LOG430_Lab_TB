const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 8000;

// Configuration des targets (instances)
const targets = [
  'http://localhost:3001',
  'http://localhost:3005', 
  'http://localhost:3006'
];

let currentTarget = 0;

// Middleware pour le round-robin load balancing
const loadBalancerMiddleware = (req, res, next) => {
  // Sélectionner le target suivant (round-robin)
  const target = targets[currentTarget];
  currentTarget = (currentTarget + 1) % targets.length;
  
  // Ajouter des headers informatifs
  res.setHeader('X-Load-Balanced', 'true');
  res.setHeader('X-Load-Balancer', 'Simple-Node-LB');
  res.setHeader('X-Target-Instance', target);
  res.setHeader('X-Round-Robin-Index', currentTarget);
  
  // Créer le proxy vers le target sélectionné
  const proxy = createProxyMiddleware({
    target: target,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req, res) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} → ${target}`);
      },
      error: (err, req, res) => {
        console.error(`[ERROR] Proxy vers ${target}:`, err.message);
        res.status(503).json({
          error: 'Service temporairement indisponible',
          target: target,
          message: err.message
        });
      }
    }
  });
  
  proxy(req, res, next);
};

// Routes avec load balancing
app.use('/api/produits-lb', loadBalancerMiddleware);
app.use('/health-lb', loadBalancerMiddleware);

// Route d'information sur le load balancer
app.get('/lb-status', (req, res) => {
  res.json({
    loadBalancer: 'Simple Node.js Load Balancer',
    algorithm: 'round-robin',
    targets: targets,
    currentTarget: currentTarget,
    totalTargets: targets.length,
    timestamp: new Date().toISOString()
  });
});

// Route d'accueil
app.get('/', (req, res) => {
  res.json({
    message: 'Load Balancer Simple Node.js',
    endpoints: {
      produits: '/api/produits-lb',
      health: '/health-lb', 
      status: '/lb-status'
    },
    targets: targets
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🔄 Load Balancer démarré sur http://localhost:${PORT}`);
  console.log(`📊 Algorithme: Round-Robin`);
  console.log(`🎯 Targets: ${targets.join(', ')}`);
  console.log(`🌐 Endpoints:`);
  console.log(`   • Status: http://localhost:${PORT}/lb-status`);
  console.log(`   • Health LB: http://localhost:${PORT}/health-lb`);
  console.log(`   • API LB: http://localhost:${PORT}/api/produits-lb`);
});

module.exports = app;
