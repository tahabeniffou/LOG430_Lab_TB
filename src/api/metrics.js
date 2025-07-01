// Instrumentation Prometheus pour Express
const client = require('prom-client');
const express = require('express');
const router = express.Router({ mergeParams: true });

// Collecte par défaut
client.collectDefaultMetrics();

// Compteur de requêtes HTTP
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requêtes HTTP',
  labelNames: ['method', 'route', 'code']
});

function metricsMiddleware(req, res, next) {
  // Exclure l'endpoint /metrics des métriques
  if (req.path === '/metrics') {
    return next();
  }
  res.on('finish', () => {
    // Tenter d'obtenir une route expressive (ex: /api/v1/produits/:id)
    let route = req.route && req.route.path ? req.baseUrl + req.route.path : req.baseUrl || req.path || 'unknown';
    httpRequestCounter.inc({
      method: req.method,
      route: route,
      code: res.statusCode
    });
  });
  next();
}

router.get('/metrics', async (req, res) => {
  console.log('Appel /metrics');
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

module.exports = { metricsMiddleware, metricsRouter: router };
