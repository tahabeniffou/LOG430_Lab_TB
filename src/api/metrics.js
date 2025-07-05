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

// Histogramme de latence HTTP
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

function metricsMiddleware(req, res, next) {
  // Exclure l'endpoint /metrics des métriques
  if (req.path === '/metrics') {
    return next();
  }
  const start = process.hrtime();
  res.on('finish', () => {
    // Tenter d'obtenir une route expressive (ex: /api/v1/produits/:id)
    let route = req.route && req.route.path ? req.baseUrl + req.route.path : req.baseUrl || req.path || 'unknown';
    httpRequestCounter.inc({
      method: req.method,
      route: route,
      code: res.statusCode
    });
    // Ajout de la latence
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9;
    httpRequestDuration.observe({
      method: req.method,
      route: route,
      code: res.statusCode
    }, duration);
  });
  next();
}

router.get('/metrics', async (req, res) => {
  console.log('Appel /metrics');
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

module.exports = { metricsMiddleware, metricsRouter: router };
